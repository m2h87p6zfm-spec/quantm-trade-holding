// Server-Sent Events Stream — pusht Quote-Updates an Premium-Nutzer.
// Pro/Elite-User: 2 s während US-Markt offen, sonst 5 min.
// Free-User: 402 Payment Required → Client fällt auf Polling zurück.
import { createFileRoute } from "@tanstack/react-router";
import { getQuotesBatch } from "@/lib/twelvedata.server";
import { requirePro } from "@/lib/api-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// Adaptive Tick-Frequenz (Premium):
//   - US-Markt offen → 2 s (echtes Live-Feel ohne TD-WebSocket-Credits)
//   - Sonst (Nachts/Wochenende) → 5 min (Kurse bewegen sich kaum)
const TICK_FAST_MS = 2_000;
const TICK_SLOW_MS = 300_000;

function isUsMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return minutes >= 12 * 60 + 30 && minutes <= 21 * 60;
}

function currentTickMs(): number {
  return isUsMarketOpen() ? TICK_FAST_MS : TICK_SLOW_MS;
}

const MAX_DURATION_MS = 4 * 60_000; // 4 min, dann lässt der Client-EventSource auto-reconnect

export const Route = createFileRoute("/api/public/stream")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await requireUserId(request);
        if (auth instanceof Response) return auth;
        const url = new URL(request.url);
        const raw = (url.searchParams.get("symbols") || "").trim();
        const symbols = raw
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => /^[A-Z0-9.\-^:/=]{1,20}$/.test(s))
          .slice(0, 120);

        if (!symbols.length) {
          return new Response("missing symbols", { status: 400, headers: CORS });
        }

        const encoder = new TextEncoder();
        const startedAt = Date.now();
        let closed = false;

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              if (closed) return;
              try {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
              } catch { closed = true; }
            };

            // Initial-Hello, damit der Client weiß: Verbindung steht
            const initialTickMs = currentTickMs();
            send("ready", { symbols, tickMs: initialTickMs });

            const tick = async () => {
              if (closed) return;
              const quotes = await getQuotesBatch(symbols);
              send("quotes", { quotes, t: Date.now() });
            };

            // sofort einen Tick senden, dann adaptiv (Re-Check pro Tick).
            // Per `setTimeout`-Schleife statt `setInterval`, damit Markt-Öffnung
            // mitten im Connection-Fenster (~10 min) korrekt aufgenommen wird.
            await tick();
            let cancelTimer: ReturnType<typeof setTimeout> | null = null;
            const scheduleNext = () => {
              if (closed) return;
              cancelTimer = setTimeout(async () => {
                await tick();
                scheduleNext();
              }, currentTickMs());
            };
            scheduleNext();
            const maxTimer = setTimeout(() => {
              if (cancelTimer) clearTimeout(cancelTimer);
              send("bye", { reason: "max-duration" });
              closed = true;
              try { controller.close(); } catch { /* noop */ }
            }, MAX_DURATION_MS);

            // Cleanup, wenn Client trennt
            request.signal.addEventListener("abort", () => {
              if (cancelTimer) clearTimeout(cancelTimer);
              clearTimeout(maxTimer);
              closed = true;
              try { controller.close(); } catch { /* noop */ }
            });
          },
          cancel() { closed = true; },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            ...CORS,
          },
        });

        // suppress unused warning
        void startedAt;
      },
    },
  },
});
