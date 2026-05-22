import { createFileRoute } from "@tanstack/react-router";
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function buildQuote(j: any, symbol: string) {
  const r = j?.chart?.result?.[0];
  if (!r) return null;
  const meta = r.meta || {};
  const c = Number(meta.regularMarketPrice);
  const pc = Number(meta.chartPreviousClose ?? meta.previousClose);
  const closes: number[] = (r.indicators?.quote?.[0]?.close || []).filter((x: any) => x != null && Number.isFinite(Number(x)));
  const lastClose = closes.length ? Number(closes[closes.length - 1]) : c;
  const price = Number.isFinite(c) ? c : lastClose;
  if (!Number.isFinite(price)) return null;
  const safePc = Number.isFinite(pc) ? pc : price;
  const num = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : undefined);
  return {
    c: price,
    pc: safePc,
    d: price - safePc,
    dp: safePc ? ((price - safePc) / safePc) * 100 : 0,
    h: Number.isFinite(Number(meta.regularMarketDayHigh)) ? Number(meta.regularMarketDayHigh) : price,
    l: Number.isFinite(Number(meta.regularMarketDayLow)) ? Number(meta.regularMarketDayLow) : price,
    o: Number(r.indicators?.quote?.[0]?.open?.[0] ?? price),
    t: Math.floor(Date.now() / 1000),
    v: num(meta.regularMarketVolume),
    h52: num(meta.fiftyTwoWeekHigh),
    l52: num(meta.fiftyTwoWeekLow),
    currency: meta.currency,
    exchange: meta.exchangeName,
    name: meta.longName || meta.shortName || symbol,
  };
}

// Best-effort marketCap via Yahoo v7 quote endpoint. Fails silently.
async function fetchMarketCap(symbol: string): Promise<number | undefined> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=marketCap`,
      { headers: { "User-Agent": "Mozilla/5.0 ApexMarkets" } }
    );
    if (!res.ok) return undefined;
    const j: any = await res.json();
    const mc = j?.quoteResponse?.result?.[0]?.marketCap;
    return Number.isFinite(Number(mc)) ? Number(mc) : undefined;
  } catch { return undefined; }
}

export const Route = createFileRoute("/api/public/quote")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
          if (!symbol || symbol.length > 16 || !/^[A-Z0-9.\-^]+$/i.test(symbol)) {
            return new Response(JSON.stringify({ status: "invalid", message: "Ungültiges Symbol" }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const [cached, marketCap] = await Promise.all([
            fetchYahooChartCached(symbol, "1d", "5d", 60),
            fetchMarketCap(symbol),
          ]);
          const data = cached.value ? buildQuote(cached.value, symbol) : null;
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
            marketCap,
            stale: cached.stale,
            lastUpdated: cached.lastUpdated,
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, s-maxage=60",
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
