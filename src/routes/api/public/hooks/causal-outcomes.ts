import { createFileRoute } from "@tanstack/react-router";
import { backfillOutcomes } from "@/lib/causal-engine.server";

export const Route = createFileRoute("/api/public/hooks/causal-outcomes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!expected || apikey !== expected) {
          return new Response(
            JSON.stringify({ ok: false, error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        try {
          const result = await backfillOutcomes();
          return new Response(
            JSON.stringify({ ok: true, ...result, ts: new Date().toISOString() }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          console.error("[causal-outcomes hook]", err);
          return new Response(
            JSON.stringify({
              ok: false,
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
