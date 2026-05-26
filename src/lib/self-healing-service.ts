/**
 * SelfHealingService – Singleton-Hintergrund-Runner für die ConsistencyEngine.
 * Startet alle 10min einen kompletten Check-Lauf, pausiert bei inaktivem Tab,
 * batched die Ergebnisse an die Server-Function zum Loggen.
 */
import type { QueryClient } from "@tanstack/react-query";
import { consistencyEngine, type ExecutedCheck } from "./consistency-engine";
import { registerBuiltinChecks } from "./self-healing-checks";
import { logHealingActions } from "./self-healing.functions";
import { supabase } from "@/integrations/supabase/client";

const RUN_INTERVAL_MS = 10 * 60_000;
const INITIAL_DELAY_MS = 20_000;

let timer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;
let running = false;
let lastEscalationToastAt = 0;

function shouldRun(): boolean {
  if (typeof document === "undefined") return false;
  if (document.hidden) return false;
  return true;
}

async function runOnce(ctx: { queryClient: QueryClient; getUserId: () => string | null }) {
  if (running) return;
  running = true;
  try {
    const userId = ctx.getUserId();
    const results = await consistencyEngine.runAll({
      queryClient: ctx.queryClient,
      userId,
    });
    if (results.length === 0) return;

    // dezente User-Notiz bei kritischen Eskalationen (max 1x/Stunde)
    const critical = results.filter((r) => r.status === "escalated");
    if (
      critical.length > 0 &&
      userId &&
      Date.now() - lastEscalationToastAt > 60 * 60_000
    ) {
      lastEscalationToastAt = Date.now();
      try {
        const { toast } = await import("sonner");
        toast.info("Daten wurden im Hintergrund aktualisiert", {
          duration: 3500,
        });
      } catch {
        // sonner nicht verfügbar – egal, läuft silent weiter
      }
    }

    // Logs senden – nur wenn User authentifiziert UND Session-Token verfügbar
    // (sonst 401 vom requireSupabaseAuth-Middleware vor dem RLS-Check)
    if (userId) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session?.access_token) return;
        await logHealingActions({ data: { actions: toLoggable(results) } });
      } catch (e) {
        // silent – Logging-Fehler darf User nie stören
        if (typeof console !== "undefined") {
          console.warn("[self-healing] log failed", e);
        }
      }
    }
  } finally {
    running = false;
  }
}

function toLoggable(results: ExecutedCheck[]) {
  return results.map((r) => ({
    check_name: r.check_name,
    category: r.category,
    severity: r.severity,
    status: r.status,
    details: r.details ?? {},
    auto_healed: r.auto_healed,
    error_message: r.error_message,
  }));
}

export type StartOptions = {
  queryClient: QueryClient;
  getUserId: () => string | null;
};

export function startSelfHealing(opts: StartOptions) {
  if (timer) return; // bereits gestartet
  registerBuiltinChecks();

  const tick = () => {
    if (shouldRun()) void runOnce(opts);
  };

  // Initialer Lauf nach kurzer Verzögerung (App soll erstmal rendern)
  const initial = setTimeout(tick, INITIAL_DELAY_MS);
  timer = setInterval(tick, RUN_INTERVAL_MS);

  if (typeof document !== "undefined") {
    visibilityHandler = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }

  // Cleanup-Hook
  return () => {
    clearTimeout(initial);
    if (timer) clearInterval(timer);
    timer = null;
    if (visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", visibilityHandler);
    }
  };
}

/** Manueller Trigger (z.B. nach kritischen Navigations-Events). */
export function triggerSelfHealing(opts: StartOptions) {
  if (shouldRun()) void runOnce(opts);
}
