import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept": "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
} as const;

const VALID_INTERVAL = new Set(["1d", "1h", "1wk", "1mo"]);
const VALID_RANGE = new Set(["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"]);

async function fetchYahooCandles(symbol: string, interval: string, range: string) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const hosts = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
  let j: any = null;
  let lastErr = "";
  for (const host of hosts) {
    try {
      const res = await fetch(host + path, { headers: HEADERS });
      if (res.ok) { j = await res.json(); break; }
      lastErr = `${host.replace("https://", "")} → ${res.status}`;
    } catch (e: any) {
      lastErr = `${host}: ${e?.message || "fetch failed"}`;
    }
  }
  if (!j) throw new Error(`Yahoo nicht erreichbar (${lastErr})`);
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error("Kein Ergebnis");
  const ts: number[] = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const c: number[] = []; const h: number[] = []; const l: number[] = []; const o: number[] = []; const v: number[] = []; const t: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close == null) continue;
    c.push(Number(close));
    h.push(Number(q.high?.[i] ?? close));
    l.push(Number(q.low?.[i] ?? close));
    o.push(Number(q.open?.[i] ?? close));
    v.push(Number(q.volume?.[i] ?? 0));
    t.push(Number(ts[i]));
  }
  return { c, h, l, o, v, t, s: "ok" as const };
}

export const Route = createFileRoute("/api/public/candles")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
        const interval = url.searchParams.get("interval") || "1d";
        const range = url.searchParams.get("range") || "1y";
        if (!symbol || symbol.length > 16 || !/^[A-Z0-9.\-^]+$/i.test(symbol)) {
          return new Response(JSON.stringify({ error: "Ungültiges Symbol" }), {
            status: 400, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        if (!VALID_INTERVAL.has(interval) || !VALID_RANGE.has(range)) {
          return new Response(JSON.stringify({ error: "Ungültige Parameter" }), {
            status: 400, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        try {
          const data = await fetchYahooCandles(symbol, interval, range);
          // Tageskerzen ändern sich erst nach Marktschluss → 1h Cache. Intraday → 5 min.
          const maxAge = interval === "1d" || interval === "1wk" || interval === "1mo" ? 3600 : 300;
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
              ...CORS,
            },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message || "Fehler" }), {
            status: 502, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
