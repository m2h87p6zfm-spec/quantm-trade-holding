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

async function fetchYahooChart(symbol: string, interval: string, range: string) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const hosts = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
  let lastErr = "";
  for (const host of hosts) {
    try {
      const res = await fetch(host + path, { headers: HEADERS });
      if (res.ok) return await res.json();
      lastErr = `${host.replace("https://", "")} → ${res.status}`;
    } catch (e: any) {
      lastErr = `${host}: ${e?.message || "fetch failed"}`;
    }
  }
  throw new Error(`Yahoo nicht erreichbar (${lastErr})`);
}

async function fetchYahooQuote(symbol: string) {
  const j: any = await fetchYahooChart(symbol, "1d", "5d");
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error("Kein Ergebnis");
  const meta = r.meta || {};
  const c = Number(meta.regularMarketPrice);
  const pc = Number(meta.chartPreviousClose ?? meta.previousClose);
  const closes: number[] = (r.indicators?.quote?.[0]?.close || []).filter((x: any) => x != null);
  const lastClose = closes.length ? Number(closes[closes.length - 1]) : c;
  const price = Number.isFinite(c) ? c : lastClose;
  return {
    c: price,
    pc,
    d: price - pc,
    dp: pc ? ((price - pc) / pc) * 100 : 0,
    h: Number(meta.regularMarketDayHigh ?? price),
    l: Number(meta.regularMarketDayLow ?? price),
    o: Number(r.indicators?.quote?.[0]?.open?.[0] ?? price),
    t: Math.floor(Date.now() / 1000),
    currency: meta.currency,
    exchange: meta.exchangeName,
    name: meta.longName || meta.shortName || symbol,
  };
}

export const Route = createFileRoute("/api/public/quote")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
        if (!symbol || symbol.length > 16 || !/^[A-Z0-9.\-^]+$/i.test(symbol)) {
          return new Response(JSON.stringify({ error: "Ungültiges Symbol" }), {
            status: 400, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        try {
          const data = await fetchYahooQuote(symbol);
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, s-maxage=60",
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
