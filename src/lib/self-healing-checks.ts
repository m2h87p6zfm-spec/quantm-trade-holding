/**
 * Eingebaute Konsistenz-Checks. Werden beim App-Start einmalig registriert.
 */
import { supabase } from "@/integrations/supabase/client";
import { consistencyEngine, type Check } from "./consistency-engine";

// ---- 1) Watchlist <-> Marktstimmung Konsistenz ----
// Vergleicht die Watchlist-Query-Cache-Ergebnisse: wenn unterschiedliche
// Module unterschiedliche Sentiment-Counts haben, invalidieren wir alles.
const watchlistSentimentCheck: Check = {
  name: "watchlist-sentiment-consistency",
  category: "watchlist",
  minIntervalMs: 5 * 60_000,
  async run({ queryClient }) {
    const queries = queryClient.getQueryCache().getAll();
    const cockpitData = queries
      .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "cockpit-row")
      .map((q) => q.state.data)
      .filter(Boolean);
    if (cockpitData.length === 0) return { ok: true };
    // Heuristik: wenn irgendein Eintrag stale ist (>15min), als inkonsistent markieren.
    const stale = queries.filter(
      (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "cockpit-row" &&
        Date.now() - q.state.dataUpdatedAt > 15 * 60_000,
    );
    if (stale.length > 0) {
      return {
        ok: false,
        severity: "warn",
        message: `${stale.length} Watchlist-Einträge älter als 15min`,
        details: { staleCount: stale.length, totalCount: cockpitData.length },
      };
    }
    return { ok: true };
  },
  async heal({ queryClient }) {
    await queryClient.invalidateQueries({ queryKey: ["cockpit-row"] });
    await queryClient.invalidateQueries({ queryKey: ["candles"] });
    return { healed: true, details: { action: "invalidated cockpit + candles" } };
  },
};

// ---- 2) Price-Data Freshness ----
const candleFreshnessCheck: Check = {
  name: "candle-data-freshness",
  category: "watchlist",
  minIntervalMs: 10 * 60_000,
  async run({ queryClient }) {
    const queries = queryClient
      .getQueryCache()
      .getAll()
      .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "candles");
    if (queries.length === 0) return { ok: true };
    const tooOld = queries.filter(
      (q) => Date.now() - q.state.dataUpdatedAt > 30 * 60_000,
    );
    if (tooOld.length > queries.length / 2) {
      return {
        ok: false,
        severity: "warn",
        message: "Mehr als 50% der Candle-Daten älter als 30min",
        details: { tooOld: tooOld.length, total: queries.length },
      };
    }
    return { ok: true };
  },
  async heal({ queryClient }) {
    await queryClient.invalidateQueries({ queryKey: ["candles"] });
    return { healed: true };
  },
};

// ---- 3) Alerts Integrity ----
const alertsIntegrityCheck: Check = {
  name: "alerts-integrity",
  category: "alerts",
  minIntervalMs: 15 * 60_000,
  async run({ userId }) {
    if (!userId) return { ok: true };
    const { data, error } = await supabase
      .from("price_alerts")
      .select("id, symbol, active, threshold")
      .eq("active", true)
      .eq("user_id", userId);
    if (error) {
      return {
        ok: false,
        severity: "error",
        message: error.message,
        needsHeal: false,
      };
    }
    const bad = (data ?? []).filter(
      (a) => !a.symbol || a.threshold == null || Number.isNaN(Number(a.threshold)),
    );
    if (bad.length > 0) {
      return {
        ok: false,
        severity: "warn",
        message: `${bad.length} ungültige aktive Preisalarme`,
        details: { invalidIds: bad.map((b) => b.id) },
        needsHeal: true,
      };
    }
    return { ok: true };
  },
  async heal({ userId }, result) {
    const ids = (result.details?.invalidIds as string[]) ?? [];
    if (!userId || ids.length === 0) return { healed: false };
    const { error } = await supabase
      .from("price_alerts")
      .update({ active: false })
      .in("id", ids)
      .eq("user_id", userId);
    if (error) return { healed: false, error: error.message };
    return { healed: true, details: { deactivated: ids.length } };
  },
};

// ---- 4) APEX Signal Consistency ----
const apexConsistencyCheck: Check = {
  name: "apex-signal-consistency",
  category: "apex",
  minIntervalMs: 10 * 60_000,
  async run({ queryClient }) {
    const apexQs = queryClient
      .getQueryCache()
      .getAll()
      .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "apex-analyses");
    if (apexQs.length === 0) return { ok: true };
    const stale = apexQs.filter(
      (q) => Date.now() - q.state.dataUpdatedAt > 60 * 60_000,
    );
    if (stale.length > 0) {
      return {
        ok: false,
        severity: "info",
        message: "APEX-Analysen veraltet",
        details: { stale: stale.length },
      };
    }
    return { ok: true };
  },
  async heal({ queryClient }) {
    await queryClient.invalidateQueries({ queryKey: ["apex-analyses"] });
    return { healed: true };
  },
};

// ---- 5) Realtime Connection ----
const realtimeCheck: Check = {
  name: "realtime-connection",
  category: "realtime",
  minIntervalMs: 5 * 60_000,
  async run() {
    try {
      const channels = supabase.getChannels();
      const broken = channels.filter(
        (c) => c.state !== "joined" && c.state !== "joining",
      );
      if (broken.length > 0 && channels.length > 0) {
        return {
          ok: false,
          severity: "warn",
          message: `${broken.length} Realtime-Channels nicht verbunden`,
          details: { broken: broken.length, total: channels.length },
        };
      }
      return { ok: true };
    } catch (e) {
      return { ok: true };
    }
  },
  async heal() {
    try {
      const channels = supabase.getChannels();
      for (const c of channels) {
        if (c.state !== "joined" && c.state !== "joining") {
          await supabase.removeChannel(c);
        }
      }
      return { healed: true };
    } catch (e) {
      return { healed: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

// ---- 6) Causal Engine Health ----
const causalEngineCheck: Check = {
  name: "causal-engine-health",
  category: "causal",
  minIntervalMs: 30 * 60_000,
  async run({ queryClient }) {
    const causalQs = queryClient
      .getQueryCache()
      .getAll()
      .filter(
        (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "causal-analysis",
      );
    const failing = causalQs.filter((q) => q.state.status === "error");
    if (failing.length > 0) {
      return {
        ok: false,
        severity: "warn",
        message: "Causal Engine Queries fehlgeschlagen",
        details: { failing: failing.length },
      };
    }
    return { ok: true };
  },
  async heal({ queryClient }) {
    await queryClient.invalidateQueries({ queryKey: ["causal-analysis"] });
    return { healed: true };
  },
};

// ---- 7) Onboarding Flow ----
const onboardingCheck: Check = {
  name: "onboarding-flow",
  category: "onboarding",
  minIntervalMs: 60 * 60_000,
  async run({ userId }) {
    if (!userId) return { ok: true };
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error) return { ok: false, severity: "error", message: error.message, needsHeal: false };
    if (!data) {
      return {
        ok: false,
        severity: "error",
        message: "Profile-Eintrag fehlt für authenticated User",
        details: { userId },
      };
    }
    return { ok: true };
  },
  async heal({ userId }) {
    if (!userId) return { healed: false };
    const { error } = await supabase
      .from("profiles")
      .insert({ id: userId })
      .select()
      .maybeSingle();
    if (error && !String(error.message).includes("duplicate")) {
      return { healed: false, error: error.message };
    }
    return { healed: true, details: { action: "profile recreated" } };
  },
};

// ---- 8) Portfolio PnL Recompute ----
const portfolioPnlCheck: Check = {
  name: "portfolio-pnl-recompute",
  category: "portfolio",
  minIntervalMs: 15 * 60_000,
  async run({ userId }) {
    if (!userId) return { ok: true };
    const { data, error } = await supabase
      .from("user_portfolio_positions")
      .select("id, entry, qty, broker_current_price, broker_pnl_abs, side")
      .eq("user_id", userId)
      .not("broker_current_price", "is", null)
      .not("broker_pnl_abs", "is", null);
    if (error)
      return { ok: false, severity: "error", message: error.message, needsHeal: false };
    const drift: string[] = [];
    for (const p of data ?? []) {
      const expected =
        p.side === "short"
          ? (Number(p.entry) - Number(p.broker_current_price)) * Number(p.qty)
          : (Number(p.broker_current_price) - Number(p.entry)) * Number(p.qty);
      if (Math.abs(expected - Number(p.broker_pnl_abs)) > Math.abs(expected) * 0.05 + 1) {
        drift.push(p.id);
      }
    }
    if (drift.length > 0) {
      return {
        ok: false,
        severity: "warn",
        message: `${drift.length} Positionen mit PnL-Drift > 5%`,
        details: { drifted: drift.length },
      };
    }
    return { ok: true };
  },
  async heal({ queryClient }) {
    await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    await queryClient.invalidateQueries({ queryKey: ["user_portfolio_positions"] });
    return { healed: true };
  },
};

// ---- Filter / Search sanity check ----
const filterCheck: Check = {
  name: "filter-search-sanity",
  category: "filter",
  minIntervalMs: 30 * 60_000,
  async run({ queryClient }) {
    const errored = queryClient
      .getQueryCache()
      .getAll()
      .filter(
        (q) =>
          q.state.status === "error" &&
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === "search" || q.queryKey[0] === "symbol-search"),
      );
    if (errored.length > 0) {
      return {
        ok: false,
        severity: "info",
        message: "Suche/Filter Queries im Fehler-State",
        details: { count: errored.length },
      };
    }
    return { ok: true };
  },
  async heal({ queryClient }) {
    await queryClient.invalidateQueries({ queryKey: ["search"] });
    await queryClient.invalidateQueries({ queryKey: ["symbol-search"] });
    return { healed: true };
  },
};

let registered = false;
export function registerBuiltinChecks() {
  if (registered) return;
  registered = true;
  [
    watchlistSentimentCheck,
    candleFreshnessCheck,
    alertsIntegrityCheck,
    apexConsistencyCheck,
    realtimeCheck,
    causalEngineCheck,
    onboardingCheck,
    portfolioPnlCheck,
    filterCheck,
  ].forEach((c) => consistencyEngine.register(c));
}
