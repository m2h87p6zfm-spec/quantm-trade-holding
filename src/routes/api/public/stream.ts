// Server-Sent Events Stream — pusht Quote-Updates alle 3 Sekunden.
// Eine einzige TD-Batch-Anfrage pro Tick versorgt beliebig viele Symbole.
// Robuste Alternative zur WebSocket-Bridge auf Cloudflare Workers (kein DO nötig).
import { createFileRoute } from "@tanstack/react-router";
import { getQuotesBatch } from "@/lib/twelvedata.server";
import { requireUserId } from "@/lib/api-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// Adaptive Tick-Frequenz:
//   - US-Markt offen (13:30–20:00 UTC, Mo–Fr) → 10 s
//   - Sonst (Nachts/Wochenende) → 60 s
// Spart außerhalb der Handelszeit ~85 % der TD-Credits, ohne
// dass User es bemerken (Kurse bewegen sich nachts kaum).
const TICK_FAST_MS = 10_000;
const TICK_SLOW_MS = 60_000;

function isUsMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = So, 6 = Sa
  if (day === 0 || day === 6) return false;
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  // 13:30 UTC = 9:30 ET (EST), 20:00 UTC = 16:00 ET
  // Bei Sommerzeit (EDT) verschiebt sich das um 1h; wir nehmen die weitere
  // Fenster-Definition, um auch EDT abzudecken: 12:30–21:00 UTC.
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
