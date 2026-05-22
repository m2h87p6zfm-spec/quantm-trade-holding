import { createFileRoute } from "@tanstack/react-router";
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const VALID_INTERVAL = new Set(["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"]);
const VALID_RANGE = new Set(["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "2y", "5y", "10y", "max"]);

function transform(j: any) {
  const r = j?.chart?.result?.[0];
  if (!r) return null;
  const ts: number[] = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const c: number[] = []; const h: number[] = []; const l: number[] = []; const o: number[] = []; const v: number[] = []; const t: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close == null || !Number.isFinite(Number(close))) continue;
    c.push(Number(close));
    h.push(Number(q.high?.[i] ?? close));
    l.push(Number(q.low?.[i] ?? close));
    o.push(Number(q.open?.[i] ?? close));
    v.push(Number(q.volume?.[i] ?? 0));
    t.push(Number(ts[i]));
  }
  if (!c.length) return null;
  return { c, h, l, o, v, t, s: "ok" as const };
}

export const Route = createFileRoute("/api/public/candles")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
          const interval = url.searchParams.get("interval") || "1d";
          const range = url.searchParams.get("range") || "1y";
          if (!symbol || symbol.length > 16 || !/^[A-Z0-9.\-^]+$/i.test(symbol)) {
            return new Response(JSON.stringify({ status: "invalid", message: "Ungültiges Symbol" }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          if (!VALID_INTERVAL.has(interval) || !VALID_RANGE.has(range)) {
            return new Response(JSON.stringify({ status: "invalid", message: "Ungültige Parameter" }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const isIntraday = !["1d", "5d", "1wk", "1mo", "3mo"].includes(interval);
          const ttl = isIntraday ? 60 : 3600;
          const cached = await fetchYahooChartCached(symbol, interval, range, ttl);
          const data = cached.value ? transform(cached.value) : null;
          if (!data) {
            return new Response(JSON.stringify({
              status: "reconnecting",
              stale: true,
              lastUpdated: 0,
              message: "Live-Daten werden aktualisiert…",
            }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          return new Response(JSON.stringify({
            ...data,
            stale: cached.stale,
            lastUpdated: cached.lastUpdated,
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
              ...CORS,
            },
          });
        } catch {
          return new Response(JSON.stringify({
            status: "reconnecting",
            stale: true,
            lastUpdated: 0,
            message: "Live-Daten werden aktualisiert…",
          }), {
            status: 200, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
