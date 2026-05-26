import { createFileRoute } from "@tanstack/react-router";
import { getCandlesCached, adaptiveCandleTtl } from "@/lib/twelvedata.server";
import { requireUserId } from "@/lib/api-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const VALID_INTERVAL = new Set(["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"]);
const VALID_RANGE = new Set(["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "2y", "5y", "10y", "max"]);

export const Route = createFileRoute("/api/public/candles")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUserId(request);
        if (auth instanceof Response) return auth;
        try {
          const url = new URL(request.url);
          const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
          const interval = url.searchParams.get("interval") || "1d";
          const range = url.searchParams.get("range") || "1y";
          if (!symbol || symbol.length > 20 || !/^[A-Z0-9.\-^:/=]+$/i.test(symbol)) {
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
          // Intraday: 60 s. Daily/Weekly: 1 h wenn Markt offen, 12 h wenn zu.
          // Bei geschlossenem Markt ändert sich die letzte Tageskerze nicht
          // mehr — 12 h TTL spart ~4× Credits gegenüber dem alten 6h-Wert
          // ohne dass User eine Veränderung sehen.
          const ttl = isIntraday ? 60 : adaptiveCandleTtl(60 * 60);
          const r = await getCandlesCached(symbol, interval, range, ttl);
          if (!r.value) {
            return new Response(JSON.stringify({
              status: "reconnecting",
              stale: true,
              lastUpdated: r.lastUpdated,
              message: "Live-Daten werden aktualisiert…",
            }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          return new Response(JSON.stringify({
            ...r.value,
            stale: r.stale,
            lastUpdated: r.lastUpdated,
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
