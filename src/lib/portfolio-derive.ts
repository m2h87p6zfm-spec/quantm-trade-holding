// Pure client-side derivation: turns the immutable apex_analyses + apex_outcomes
// stream into a "model portfolio" view (positions, equity curve, audit log,
// allocation) without any new DB writes. The apex_* tables are anon-read +
// service-role-write (RLS-locked), which is the auditability guarantee.
import type { TrackRecordPayload } from "@/lib/trackrecord.functions";
import type { DerivedPosition, ConvictionTier, ExitKind } from "@/components/track-record/PickDetailDrawer";


type Analysis = TrackRecordPayload["analyses"][number];

const STARTING_EQUITY = 100_000;
// Minimum confidence required for the model portfolio to actually buy a pick.
// Picks below this threshold are tracked (audit log keeps everything) but NOT
// invested in — that's how we lift the hit-rate of the deployed portfolio.
const MIN_CONFIDENCE_TO_INVEST = 70;

// Pyramiding / Position-Scaling (Quant-Standard):
// Bei sehr hoher Konfidenz darf die Engine eine Aktie über mehrere Signaltage
// in 2–3 Tranchen aufbauen, statt fix 5.000 € auf einmal. Jede weitere
// Tranche braucht mindestens N Tage Abstand zur vorherigen UND eine
// weiterhin starke Konfidenz.
const TRANCHE_MIN_GAP_DAYS = 5;

// Automatisches Risiko-Management für offene Positionen. Genau wie ein
// echter Quant-Fonds hat das Modellportfolio harte Exit-Regeln, damit
// nicht endlos gekauft und nie verkauft wird:
//   Stop-Loss    → −8 % seit Kauf  → sofortiger Verkauf
//   Take-Profit  → +25 % seit Kauf → Gewinn mitnehmen
//   Zeit-Exit    → 90 Handelstage  → Kapital freimachen für neue Signale
const AUTO_STOP_LOSS_PCT = -8;
const AUTO_TAKE_PROFIT_PCT = 25;

// Erste Tranche pro Konfidenz-Stufe und Anzahl maximaler Tranchen.
function trancheRulesFor(confidence: number): {
  notionalPerTranche: number;
  maxTranches: number;
  tier: ConvictionTier;
} {
  if (confidence >= 90) return { notionalPerTranche: 2_667, maxTranches: 3, tier: "high" };   // 3× ≈ 8.000 €
  if (confidence >= 80) return { notionalPerTranche: 2_500, maxTranches: 2, tier: "high" };   // 2× = 5.000 €
  if (confidence >= 75) return { notionalPerTranche: 5_000, maxTranches: 1, tier: "medium" }; // einmalig
  return { notionalPerTranche: 3_000, maxTranches: 1, tier: "base" };                          // 70–74
}

export const TIER_LABEL: Record<ConvictionTier, string> = {
  high: "Hohe Konfidenz",
  medium: "Mittlere Konfidenz",
  base: "Basis-Konfidenz",
};

export const EXIT_KIND_LABEL: Record<ExitKind, string> = {
  signal: "Engine-Verkauf",
  stop_loss: "Stop-Loss (Auto)",
  take_profit: "Take-Profit (Auto)",
  time_exit: "Zeit-Exit 90 Tage",
};

export type PortfolioMetrics = {
  totalEquity: number;
  totalReturnPct: number;
  totalReturnAbs: number;
  realizedPnl: number;
  unrealizedPnl: number;
  /** Freies Cash im Modellportfolio (Start 100.000 € minus offene Käufe plus geschlossene Erlöse). */
  cash: number;
  /** Aktuell in offenen Positionen gebundenes Kapital zu Marktpreisen. */
  investedValue: number;
  /** Wie viele Käufe die Engine wegen Cash-Limit nicht durchführen konnte. */
  skippedForCash: number;
  /** Wie viele Positionen automatisch geschlossen wurden (Stop-Loss / Take-Profit / Zeit-Exit). */
  numAutoClosed: number;
  numOpen: number;
  numClosed: number;
  winRate: number;
  wins: number;
  losses: number;
  avgGainPct: number;
  avgLossPct: number;
  avgHoldingDays: number;
  bestTradePct: number;
  worstTradePct: number;
  bestTradeTicker: string | null;
  worstTradeTicker: string | null;
};


export type EquityPoint = { date: string; equity: number; iso: string };

export type AuditEntry = {
  id: string;
  ts: string;
  action: "buy" | "outcome_update" | "close";
  ticker: string;
  description: string;
};

export type DerivedTrackRecord = {
  positions: DerivedPosition[];
  metrics: PortfolioMetrics;
  equityCurve: EquityPoint[];
  audit: AuditEntry[];
  monthlyReturns: Array<{ month: string; returnPct: number }>;
  winLossBuckets: Array<{ bucket: string; count: number; tone: "win" | "loss" | "neutral" }>;
};

/** Picks a "current" price for an open position from the most recent measured outcome. */
function latestKnownPrice(a: Analysis): { price: number; daysSinceEntry: number } {
  const o = a.outcome;
  const points: Array<[number, number | null | undefined]> = [
    [90, o?.price_after_90d],
    [60, o?.price_after_60d],
    [30, o?.price_after_30d],
    [7, o?.price_after_7d],
  ];
  for (const [d, p] of points) {
    if (p != null) return { price: Number(p), daysSinceEntry: d };
  }
  return { price: a.price_at_analysis, daysSinceEntry: 0 };
}

export function derivePortfolio(payload: TrackRecordPayload): DerivedTrackRecord {
  const analyses = payload.analyses;

  // Group analyses by ticker chronologically so we can detect a SELL = next VERKAUFEN.
  const byTicker = new Map<string, Analysis[]>();
  for (const a of analyses) {
    const arr = byTicker.get(a.ticker) ?? [];
    arr.push(a);
    byTicker.set(a.ticker, arr);
  }
  for (const arr of byTicker.values()) {
    arr.sort((x, y) => new Date(x.analyzed_at).getTime() - new Date(y.analyzed_at).getTime());
  }

  const positions: DerivedPosition[] = [];
  const now = Date.now();

  // Per-Ticker-Counter für Tranchen-Vergabe (Pyramiding).
  // Wir laufen alle Analysen in chronologischer Reihenfolge durch und vergeben
  // Tranche 1/2/3 nur, wenn (a) max-Tranchen der Konfidenz nicht überschritten,
  // (b) mindestens TRANCHE_MIN_GAP_DAYS seit letzter Tranche vergangen sind und
  // (c) Konfidenz weiter mindestens auf dem Tier der ersten Tranche liegt.
  const trancheState = new Map<
    string,
    { lastEntryTime: number; tranches: number; firstTier: ConvictionTier }
  >();

  const chronological = [...analyses].sort(
    (x, y) => new Date(x.analyzed_at).getTime() - new Date(y.analyzed_at).getTime(),
  );

  for (const a of chronological) {
    if (a.verdict !== "KAUF") continue;
    if (a.confidence_score < MIN_CONFIDENCE_TO_INVEST) continue;

    const entryTime = new Date(a.analyzed_at).getTime();
    const rules = trancheRulesFor(a.confidence_score);

    // Bestehende offene Tranchen für diesen Ticker? (alle KAUF-Analysen vor
    // diesem Zeitpunkt, die noch nicht durch ein VERKAUFEN geschlossen wurden)
    const tArr = byTicker.get(a.ticker) ?? [];
    const lastSellBefore = tArr
      .filter((x) => x.verdict === "VERKAUFEN" && new Date(x.analyzed_at).getTime() < entryTime)
      .sort((x, y) => new Date(y.analyzed_at).getTime() - new Date(x.analyzed_at).getTime())[0];
    const lastSellTime = lastSellBefore ? new Date(lastSellBefore.analyzed_at).getTime() : 0;

    const st = trancheState.get(a.ticker);
    // Wenn zwischenzeitlich ein VERKAUFEN lag, Tranchen-Counter resetten.
    const effective = st && st.lastEntryTime > lastSellTime ? st : undefined;

    let trancheNum = 1;
    if (effective) {
      const gapDays = (entryTime - effective.lastEntryTime) / 86_400_000;
      if (effective.tranches >= rules.maxTranches) continue;        // Cap erreicht
      if (gapDays < TRANCHE_MIN_GAP_DAYS) continue;                  // Zu schnell
      trancheNum = effective.tranches + 1;
    }

    trancheState.set(a.ticker, {
      lastEntryTime: entryTime,
      tranches: trancheNum,
      firstTier: effective?.firstTier ?? rules.tier,
    });

    const entryAt = a.analyzed_at;
    const entryPrice = a.price_at_analysis;

    // VERKAUFEN nach diesem Eintritt schließt die Tranche.
    const sellAnalysis = tArr.find(
      (x) => x.verdict === "VERKAUFEN" && new Date(x.analyzed_at).getTime() > entryTime,
    );

    const ageDays = Math.max(0, Math.floor((now - entryTime) / 86_400_000));
    const has90d = a.outcome?.price_after_90d != null;
    const hasAnyOutcomePrice =
      a.outcome?.price_after_7d != null ||
      a.outcome?.price_after_30d != null ||
      a.outcome?.price_after_60d != null ||
      a.outcome?.price_after_90d != null;

    let status: "open" | "closed" = "open";
    let exitAt: string | null = null;
    let exitPrice: number | null = null;
    let exitReason: string | null = null;
    let holdingDays = ageDays;
    let currentPrice = latestKnownPrice(a).price;

    if (sellAnalysis) {
      status = "closed";
      exitAt = sellAnalysis.analyzed_at;
      exitPrice = sellAnalysis.price_at_analysis;
      exitReason = `Engine-Verdict wechselte am ${new Date(exitAt).toLocaleDateString("de-DE")} auf VERKAUFEN.`;
      holdingDays = Math.max(0, Math.floor((new Date(exitAt).getTime() - entryTime) / 86_400_000));
      currentPrice = exitPrice;
    } else if (has90d && ageDays >= 90) {
      status = "closed";
      exitAt = new Date(entryTime + 90 * 86_400_000).toISOString();
      exitPrice = Number(a.outcome!.price_after_90d);
      exitReason = "Zeit-Exit: 90-Tage-Auswertungsfenster abgeschlossen.";
      holdingDays = 90;
      currentPrice = exitPrice;
    }

    const hasMeasurement = status === "closed" || hasAnyOutcomePrice;

    const notional = rules.notionalPerTranche;
    const tier = rules.tier;
    const shares = entryPrice > 0 ? notional / entryPrice : 0;
    const returnPct =
      entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
    const returnAbs = shares * (currentPrice - entryPrice);

    positions.push({
      analysis: a,
      status,
      entryAt,
      entryPrice,
      exitAt,
      exitPrice,
      exitReason,
      currentPrice,
      returnPct,
      returnAbs,
      holdingDays,
      hasMeasurement,
      notional,
      shares,
      tier,
      trancheNum,
      trancheTotal: rules.maxTranches,
    });
  }


  // Sort newest first for display
  positions.sort((a, b) => new Date(b.entryAt).getTime() - new Date(a.entryAt).getTime());

  // Metrics
  const closed = positions.filter((p) => p.status === "closed");
  const open = positions.filter((p) => p.status === "open");
  const wins = closed.filter((p) => p.returnPct > 0);
  const losses = closed.filter((p) => p.returnPct < 0);
  const realizedPnl = closed.reduce((s, p) => s + p.returnAbs, 0);
  const unrealizedPnl = open.reduce((s, p) => s + p.returnAbs, 0);
  const totalEquity = STARTING_EQUITY + realizedPnl + unrealizedPnl;
  const totalReturnAbs = totalEquity - STARTING_EQUITY;
  const totalReturnPct = (totalReturnAbs / STARTING_EQUITY) * 100;

  // Best/worst trade: only count positions with a real measurement, otherwise
  // brand-new open picks (returnPct = 0 fallback) would pollute the leaderboard.
  const measured = positions.filter((p) => p.hasMeasurement);
  const best = [...measured].sort((a, b) => b.returnPct - a.returnPct)[0];
  const worst = [...measured].sort((a, b) => a.returnPct - b.returnPct)[0];

  const metrics: PortfolioMetrics = {
    totalEquity,
    totalReturnPct,
    totalReturnAbs,
    realizedPnl,
    unrealizedPnl,
    numOpen: open.length,
    numClosed: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    wins: wins.length,
    losses: losses.length,
    avgGainPct: wins.length ? wins.reduce((s, p) => s + p.returnPct, 0) / wins.length : 0,
    avgLossPct: losses.length ? losses.reduce((s, p) => s + p.returnPct, 0) / losses.length : 0,
    avgHoldingDays: closed.length
      ? closed.reduce((s, p) => s + p.holdingDays, 0) / closed.length
      : 0,
    bestTradePct: best?.returnPct ?? 0,
    worstTradePct: worst?.returnPct ?? 0,
    bestTradeTicker: best?.analysis.ticker ?? null,
    worstTradeTicker: worst?.analysis.ticker ?? null,
  };

  // Equity curve: walk through closed positions chronologically by exit date.
  // Each closed trade adds its € P&L to equity at exit time. Plus today's unrealized.
  const closedByExit = [...closed]
    .filter((p) => p.exitAt)
    .sort((a, b) => new Date(a.exitAt!).getTime() - new Date(b.exitAt!).getTime());

  const equityCurve: EquityPoint[] = [];
  if (closedByExit.length > 0 || open.length > 0) {
    const firstEntry = positions
      .map((p) => new Date(p.entryAt).getTime())
      .sort((a, b) => a - b)[0];
    equityCurve.push({
      iso: new Date(firstEntry).toISOString(),
      date: new Date(firstEntry).toLocaleDateString("de-DE"),
      equity: STARTING_EQUITY,
    });
    let running = STARTING_EQUITY;
    for (const p of closedByExit) {
      running += p.returnAbs;
      equityCurve.push({
        iso: p.exitAt!,
        date: new Date(p.exitAt!).toLocaleDateString("de-DE"),
        equity: running,
      });
    }
    // Today's snapshot incl. unrealized
    equityCurve.push({
      iso: new Date().toISOString(),
      date: "Heute",
      equity: totalEquity,
    });
  }

  // Audit log: every analysis insert is one audit entry; every outcome measurement another.
  const audit: AuditEntry[] = [];
  for (const a of analyses) {
    audit.push({
      id: `${a.id}-buy`,
      ts: a.analyzed_at,
      action: a.verdict === "VERKAUFEN" ? "close" : "buy",
      ticker: a.ticker,
      description:
        a.verdict === "KAUF"
          ? `Kauf-Empfehlung für ${a.name} (${a.ticker}) bei ${a.price_at_analysis.toFixed(2)} dokumentiert · Konfidenz ${a.confidence_score.toFixed(0)}/100`
          : a.verdict === "VERKAUFEN"
            ? `Verkaufs-Empfehlung für ${a.name} (${a.ticker}) bei ${a.price_at_analysis.toFixed(2)} dokumentiert`
            : `Halten-Empfehlung für ${a.name} (${a.ticker}) dokumentiert`,
    });
    const o = a.outcome;
    if (!o) continue;
    const stamp = (days: number, price: number | null, ret: number | null) => {
      if (price == null || ret == null) return;
      const ts = new Date(new Date(a.analyzed_at).getTime() + days * 86_400_000).toISOString();
      audit.push({
        id: `${a.id}-${days}`,
        ts,
        action: "outcome_update",
        ticker: a.ticker,
        description: `${a.ticker}: ${days}-Tage-Auswertung — Kurs ${price.toFixed(2)}, Rendite ${ret >= 0 ? "+" : ""}${ret.toFixed(2)} %`,
      });
    };
    stamp(7, o.price_after_7d, o.return_7d);
    stamp(30, o.price_after_30d, o.return_30d);
    stamp(60, o.price_after_60d, o.return_60d);
    stamp(90, o.price_after_90d, o.return_90d);
  }
  audit.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  // Monthly returns (sum of trade returns by exit/entry month)
  const monthBuckets = new Map<string, number>();
  for (const p of positions) {
    const refDate = p.exitAt ?? p.entryAt;
    const d = new Date(refDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + p.returnPct);
  }
  const monthlyReturns = Array.from(monthBuckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, returnPct]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("de-DE", {
        month: "short",
        year: "2-digit",
      });
      return { month: label, returnPct };
    });

  // Win/loss histogram bins
  const bins = [
    { min: -Infinity, max: -10, label: "< −10 %", tone: "loss" as const, count: 0 },
    { min: -10, max: -5, label: "−10 bis −5 %", tone: "loss" as const, count: 0 },
    { min: -5, max: 0, label: "−5 bis 0 %", tone: "loss" as const, count: 0 },
    { min: 0, max: 5, label: "0 bis +5 %", tone: "win" as const, count: 0 },
    { min: 5, max: 10, label: "+5 bis +10 %", tone: "win" as const, count: 0 },
    { min: 10, max: Infinity, label: "> +10 %", tone: "win" as const, count: 0 },
  ];
  for (const p of positions) {
    if (!p.hasMeasurement) continue; // skip "no-data" picks so 0 % doesn't pile up in 0..5 bin
    const r = p.returnPct;
    const bin = bins.find((b) => r >= b.min && r < b.max);
    if (bin) bin.count++;
  }
  const winLossBuckets = bins.map((b) => ({ bucket: b.label, count: b.count, tone: b.tone }));

  return {
    positions,
    metrics,
    equityCurve,
    audit,
    monthlyReturns,
    winLossBuckets,
  };
}

export const PORTFOLIO_STARTING_EQUITY = STARTING_EQUITY;
export const PORTFOLIO_MIN_CONFIDENCE = MIN_CONFIDENCE_TO_INVEST;

/**
 * Overlay a set of live prices (ticker → last trade) onto the derived portfolio.
 * Recomputes currentPrice/returnPct/returnAbs for OPEN positions and rolls the
 * change up into unrealizedPnl / totalEquity / totalReturn* / best-worst so
 * that the hero KPIs, allocation %, and per-row P&L all use the SAME numbers.
 * Closed positions are untouched (exit price is the truth of record).
 */
export function applyLiveOverlay(
  derived: DerivedTrackRecord,
  livePrices: Record<string, number | undefined>,
): DerivedTrackRecord {
  let changed = false;
  const positions = derived.positions.map((p) => {
    if (p.status !== "open") return p;
    const live = livePrices[p.analysis.ticker];
    if (!live || !Number.isFinite(live) || live <= 0) return p;
    if (Math.abs(live - p.currentPrice) < 1e-6) return p;
    changed = true;
    const returnPct = p.entryPrice > 0 ? ((live - p.entryPrice) / p.entryPrice) * 100 : 0;
    const returnAbs = p.shares * (live - p.entryPrice);
    return {
      ...p,
      currentPrice: live,
      returnPct,
      returnAbs,
      hasMeasurement: true, // live price counts as a measurement for aggregates
    };
  });
  if (!changed) return derived;

  const closed = positions.filter((p) => p.status === "closed");
  const open = positions.filter((p) => p.status === "open");
  const realizedPnl = closed.reduce((s, p) => s + p.returnAbs, 0);
  const unrealizedPnl = open.reduce((s, p) => s + p.returnAbs, 0);
  const totalEquity = STARTING_EQUITY + realizedPnl + unrealizedPnl;
  const totalReturnAbs = totalEquity - STARTING_EQUITY;
  const totalReturnPct = (totalReturnAbs / STARTING_EQUITY) * 100;

  const measured = positions.filter((p) => p.hasMeasurement);
  const best = [...measured].sort((a, b) => b.returnPct - a.returnPct)[0];
  const worst = [...measured].sort((a, b) => a.returnPct - b.returnPct)[0];

  const metrics: PortfolioMetrics = {
    ...derived.metrics,
    realizedPnl,
    unrealizedPnl,
    totalEquity,
    totalReturnAbs,
    totalReturnPct,
    bestTradePct: best?.returnPct ?? derived.metrics.bestTradePct,
    worstTradePct: worst?.returnPct ?? derived.metrics.worstTradePct,
    bestTradeTicker: best?.analysis.ticker ?? derived.metrics.bestTradeTicker,
    worstTradeTicker: worst?.analysis.ticker ?? derived.metrics.worstTradeTicker,
  };

  return { ...derived, positions, metrics };
}
