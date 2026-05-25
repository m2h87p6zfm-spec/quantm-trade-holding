import { createFileRoute } from "@tanstack/react-router";
import { getQuoteCached } from "@/lib/twelvedata.server";
import { requireUserId } from "@/lib/api-auth.server";


const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/quote")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUserId(request);
        if (auth instanceof Response) return auth;
        try {
          const url = new URL(request.url);
          const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
          if (!symbol || symbol.length > 20 || !/^[A-Z0-9.\-^:/=]+$/i.test(symbol)) {
            return new Response(JSON.stringify({ status: "invalid", message: "Ungültiges Symbol" }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const r = await getQuoteCached(symbol, 60);
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
