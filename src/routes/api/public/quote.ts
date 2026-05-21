import { createFileRoute } from "@tanstack/react-router";
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

async function buildQuote(symbol: string) {
  // 60s TTL für Quotes
  const j: any = await fetchYahooChartCached(symbol, "1d", "5d", 60);
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
          const data = await buildQuote(symbol);
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
