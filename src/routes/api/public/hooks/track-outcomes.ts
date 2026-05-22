import { createFileRoute } from "@tanstack/react-router";
import { trackPendingOutcomes } from "@/lib/track-record.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, authorization",
} as const;

async function run() {
  try {
    const result = await trackPendingOutcomes();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}

export const Route = createFileRoute("/api/public/hooks/track-outcomes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: run,
      GET: run,
    },
  },
});
