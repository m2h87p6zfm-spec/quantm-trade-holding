/**
 * ConsistencyEngine
 * Registriert Konsistenz-Checks für die App. Jeder Check liefert ein Ergebnis,
 * optional eine Heal-Action. Alle Checks werden vom SelfHealingService getriggert.
 */
import type { QueryClient } from "@tanstack/react-query";

export type Severity = "info" | "warn" | "error" | "critical";
export type CheckStatus = "ok" | "detected" | "healed" | "failed" | "escalated";
export type CheckCategory =
  | "watchlist"
  | "alerts"
  | "apex"
  | "realtime"
  | "causal"
  | "onboarding"
  | "filter"
  | "portfolio";

export type CheckContext = {
  queryClient: QueryClient;
  userId: string | null;
};

export type CheckResult = {
  ok: boolean;
  severity?: Severity;
  details?: Record<string, unknown>;
  needsHeal?: boolean;
  message?: string;
};

export type HealResult = {
  healed: boolean;
  details?: Record<string, unknown>;
  error?: string;
};

export type Check = {
  name: string;
  category: CheckCategory;
  /** Mindest-Intervall in ms zwischen zwei Runs. */
  minIntervalMs?: number;
  run: (ctx: CheckContext) => Promise<CheckResult>;
  heal?: (ctx: CheckContext, result: CheckResult) => Promise<HealResult>;
};

export type ExecutedCheck = {
  check_name: string;
  category: CheckCategory;
  severity: Severity;
  status: CheckStatus;
  details: Record<string, unknown>;
  auto_healed: boolean;
  error_message: string | null;
};

class Engine {
  private checks = new Map<string, Check>();
  private lastRun = new Map<string, number>();
  private failureStreak = new Map<string, number>();

  register(c: Check) {
    this.checks.set(c.name, c);
  }

  list(): Check[] {
    return Array.from(this.checks.values());
  }

  async runAll(ctx: CheckContext): Promise<ExecutedCheck[]> {
    const now = Date.now();
    const results: ExecutedCheck[] = [];
    for (const c of this.checks.values()) {
      const minIv = c.minIntervalMs ?? 120_000;
      const last = this.lastRun.get(c.name) ?? 0;
      if (now - last < minIv) continue;
      this.lastRun.set(c.name, now);

      let res: CheckResult;
      try {
        res = await c.run(ctx);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.bumpFailure(c.name);
        results.push({
          check_name: c.name,
          category: c.category,
          severity: "error",
          status: "failed",
          details: {},
          auto_healed: false,
          error_message: msg,
        });
        continue;
      }

      if (res.ok) {
        this.failureStreak.delete(c.name);
        // OK ist normal – wir loggen nur stichprobenartig (1/10) um Tabellen schlank zu halten.
        if (Math.random() < 0.1) {
          results.push({
            check_name: c.name,
            category: c.category,
            severity: "info",
            status: "ok",
            details: res.details ?? {},
            auto_healed: false,
            error_message: null,
          });
        }
        continue;
      }

      // Inkonsistenz erkannt → Heilung versuchen
      let healed = false;
      let healError: string | null = null;
      let healDetails: Record<string, unknown> = {};
      if (res.needsHeal !== false && c.heal) {
        try {
          const h = await c.heal(ctx, res);
          healed = h.healed;
          healDetails = h.details ?? {};
          if (!h.healed && h.error) healError = h.error;
        } catch (e) {
          healError = e instanceof Error ? e.message : String(e);
        }
      }

      const streak = healed ? 0 : this.bumpFailure(c.name);
      const status: CheckStatus = healed
        ? "healed"
        : streak >= 3
          ? "escalated"
          : "detected";
      const severity: Severity = healed
        ? "warn"
        : streak >= 3
          ? "critical"
          : (res.severity ?? "warn");

      results.push({
        check_name: c.name,
        category: c.category,
        severity,
        status,
        details: { ...res.details, ...healDetails, message: res.message, streak },
        auto_healed: healed,
        error_message: healError,
      });
    }
    return results;
  }

  private bumpFailure(name: string): number {
    const next = (this.failureStreak.get(name) ?? 0) + 1;
    this.failureStreak.set(name, next);
    return next;
  }

  resetThrottle() {
    this.lastRun.clear();
  }
}

export const consistencyEngine = new Engine();
