import { createFileRoute } from "@tanstack/react-router";
import { backfillOutcomes } from "@/lib/causal-engine.server";
import { requireCronSecret } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/hooks/causal-outcomes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronSecret(request);
        if (denied) return denied;
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
