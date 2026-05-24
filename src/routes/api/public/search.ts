// Globale Symbol-Suche über Twelve Data (70+ Börsen weltweit + FX + Crypto).
import { createFileRoute } from "@tanstack/react-router";
import { searchSymbolsTd } from "@/lib/twelvedata.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const q = (url.searchParams.get("q") || "").trim();
          if (q.length < 1 || q.length > 64) {
            return new Response(JSON.stringify({ results: [] }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const results = await searchSymbolsTd(q);
          return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
              ...CORS,
            },
          });
        } catch {
          return new Response(JSON.stringify({ results: [] }), {
            status: 200, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
