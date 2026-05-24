// Batch-Quote-Endpoint: bis zu 120 Symbole in einer einzigen TD-Anfrage.
// Spart Rate-Limit massiv für Watchlists, TickerBand und Screener.
import { createFileRoute } from "@tanstack/react-router";
import { getQuotesBatch } from "@/lib/twelvedata.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/quotes-batch")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const raw = (url.searchParams.get("symbols") || "").trim();
          if (!raw) {
            return new Response(JSON.stringify({ quotes: {} }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const symbols = raw.split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z0-9.\-^:/=]{1,20}$/.test(s));
          const quotes = await getQuotesBatch(symbols);
          return new Response(JSON.stringify({ quotes, lastUpdated: Date.now() }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=5, s-maxage=5",
              ...CORS,
            },
          });
        } catch {
          return new Response(JSON.stringify({ quotes: {} }), {
            status: 200, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
