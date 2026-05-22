import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchCandles, getApiKey } from "@/lib/finnhub";
import { findProduct } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, buildDecision, stabilizeDecision, whyNow, type Decision } from "@/lib/analysis";
import { detectRegime, regimeLabel, type MarketRegime } from "@/lib/ai-learning";
import { useSettings } from "@/lib/settings";
import { SignalChat } from "@/components/SignalChat";

export const Route = createFileRoute("/signale")({ component: SignalsPage });

type SortKey = "confidence" | "zscore" | "rsi" | "volatility";

const decisionStyle: Record<Decision, string> = {
  BUY: "bg-bull/15 text-bull border-bull/40",
  SELL: "bg-bear/15 text-bear border-bear/40",
  HOLD: "bg-muted text-muted-foreground border-border",
};

const regimeStyle: Record<MarketRegime, string> = {
  bull: "bg-bull/10 text-bull border-bull/30",
  bear: "bg-bear/10 text-bear border-bear/30",
  chop: "bg-muted text-muted-foreground border-border",
  high_vol: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  low_vol: "bg-sky-500/10 text-sky-500 border-sky-500/30",
};

function SignalsPage() {
  const { settings } = useSettings();
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [decisionFilter, setDecisionFilter] = useState<"all" | Decision>("all");
  const [regimeFilter, setRegimeFilter] = useState<"all" | MarketRegime>("all");
  const scanSymbols = settings.watchlist;

  const candleQs = useQueries({
    queries: scanSymbols.map((symbol) => ({
      queryKey: ["candles", symbol],
      queryFn: () => fetchCandles(symbol, "D", 260),
      enabled: !!getApiKey(),
      staleTime: 12 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const rows = useMemo(() => {
    return scanSymbols.map((symbol, i) => {
      const p = findProduct(symbol) ?? { symbol, name: "Freier Ticker" };
      const c = candleQs[i].data;
      if (!c) return null;
      const ind = computeAll(c.c);
      const sig = scoreIndicators(ind, settings.risk);
      const regime = detectRegime(ind);
      const raw = buildDecision(p.symbol, p.name, ind, sig, regime);
      const stable = stabilizeDecision(p.symbol, raw.decision, raw.confidence);
      const report = stable.decision === raw.decision ? raw : { ...raw, decision: stable.decision };
      const last = c.c.at(-1) ?? 0;
      const prev = c.c.at(-2) ?? last;
      const change = prev ? ((last - prev) / prev) * 100 : 0;
      return { p, ind, sig, regime, report, change };
    }).filter(Boolean) as {
      p: { symbol: string; name: string };
      ind: ReturnType<typeof computeAll>;
      sig: ReturnType<typeof scoreIndicators>;
      regime: MarketRegime;
      report: ReturnType<typeof buildDecision>;
      change: number;
    }[];
  }, [candleQs, scanSymbols, settings.risk]);

  // Aggregiertes Markt-Regime (Mehrheit aus Watchlist)
  const aggRegime = useMemo<MarketRegime | null>(() => {
    if (rows.length === 0) return null;
    const counts: Record<MarketRegime, number> = { bull: 0, bear: 0, chop: 0, high_vol: 0, low_vol: 0 };
    rows.forEach((r) => counts[r.regime]++);
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as MarketRegime);
  }, [rows]);

  const filtered = rows
    .filter((r) => decisionFilter === "all" || r.report.decision === decisionFilter)
    .filter((r) => regimeFilter === "all" || r.regime === regimeFilter)
    .sort((a, b) => {
      switch (sortKey) {
        case "zscore": return Math.abs(b.ind.zScore) - Math.abs(a.ind.zScore);
        case "rsi": return Math.abs(b.ind.rsi - 50) - Math.abs(a.ind.rsi - 50);
        case "volatility": return b.ind.volatility - a.ind.volatility;
        default: return b.report.confidence - a.report.confidence;
      }
    });

  const loading = candleQs.some((q) => q.isLoading);

  const counts = useMemo(() => {
    const c = { BUY: 0, SELL: 0, HOLD: 0 } as Record<Decision, number>;
    rows.forEach((r) => c[r.report.decision]++);
    return c;
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trends & Signale</h1>
          <p className="text-sm text-muted-foreground">Institutional Decision Engine — jedes Signal regime- und smart-money-gefiltert. Konfidenz &lt; 60 % wird konsequent zu HOLD downgegradet.</p>
        </div>
        {aggRegime && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${regimeStyle[aggRegime]}`}>
            <span className="font-semibold uppercase tracking-wider">Markt-Regime</span>
            <span className="font-bold">{regimeLabel(aggRegime)}</span>
          </div>
        )}
      </div>

      {/* Decision Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["BUY", "HOLD", "SELL"] as const).map((d) => (
          <div key={d} className={`rounded-lg border px-4 py-3 ${decisionStyle[d]}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{d}</div>
            <div className="text-2xl font-bold tabular-nums">{counts[d]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Entscheidung:</span>
          {(["all", "BUY", "SELL", "HOLD"] as const).map((s) => (
            <button key={s} onClick={() => setDecisionFilter(s)} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${decisionFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-accent"}`}>
              {s === "all" ? "Alle" : s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Regime:</span>
          {(["all", "bull", "bear", "chop", "high_vol", "low_vol"] as const).map((r) => (
            <button key={r} onClick={() => setRegimeFilter(r)} className={`rounded-md border px-2.5 py-1 text-xs ${regimeFilter === r ? "border-primary text-primary" : "border-border"}`}>
              {r === "all" ? "Alle" : regimeLabel(r)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Sortieren:</span>
          {(["confidence", "zscore", "rsi", "volatility"] as SortKey[]).map((k) => (
            <button key={k} onClick={() => setSortKey(k)} className={`rounded-md border px-2 py-1 ${sortKey === k ? "border-primary text-primary" : "border-border"}`}>
              {k === "confidence" ? "Konfidenz" : k === "zscore" ? "Z-Score" : k === "rsi" ? "RSI" : "Vola"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Symbol</div>
          <div className="col-span-2">Regime</div>
          <div className="col-span-1 text-right">Z</div>
          <div className="col-span-1 text-right">RSI</div>
          <div className="col-span-1 text-right">Vola</div>
          <div className="col-span-1 text-right">Tag Δ</div>
          <div className="col-span-3 text-right">Decision · Konfidenz</div>
        </div>
        {loading && <div className="p-6 text-center text-sm text-muted-foreground">Berechne Decision-Reports für {scanSymbols.length} Watchlist-Werte…</div>}
        {!loading && filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Keine Signale erfüllen die Filter.</div>}
        {filtered.map(({ p, ind, sig, regime, report, change }) => {
          const delta = report.confidence - report.rawConfidence;
          const trigger = whyNow(ind, sig);
          return (
            <Link
              key={p.symbol}
              to="/produkte/$symbol"
              params={{ symbol: p.symbol }}
              className="grid grid-cols-12 gap-2 border-b border-border px-4 py-3 hover:bg-accent/40 text-sm items-center"
            >
              <div className="col-span-3">
                <div className="font-semibold">{p.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">{p.name}</div>
                <div className={`mt-1 flex items-start gap-1 text-[11px] leading-snug ${report.decision === "BUY" ? "text-bull/90" : report.decision === "SELL" ? "text-bear/90" : "text-muted-foreground"}`}>
                  <span className="mt-0.5">⚡</span>
                  <span className="truncate" title={trigger}>{trigger}</span>
                </div>
              </div>
              <div className="col-span-2">
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${regimeStyle[regime]}`}>
                  {regimeLabel(regime)}
                </span>
              </div>
              <div className={`col-span-1 text-right font-mono tabular-nums ${Math.abs(ind.zScore) > 2 ? (ind.zScore > 0 ? "text-bear" : "text-bull") : ""}`}>{ind.zScore.toFixed(2)}</div>
              <div className={`col-span-1 text-right font-mono tabular-nums ${ind.rsi > 70 ? "text-bear" : ind.rsi < 30 ? "text-bull" : ""}`}>{ind.rsi.toFixed(0)}</div>
              <div className="col-span-1 text-right font-mono tabular-nums text-muted-foreground">{(ind.volatility * 100).toFixed(0)}%</div>
              <div className={`col-span-1 text-right font-mono tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</div>
              <div className="col-span-3 flex items-center justify-end gap-2">
                <div className="text-right">
                  <div className="font-mono tabular-nums text-sm">
                    <span className="font-semibold">{report.confidence}%</span>
                    {delta !== 0 && (
                      <span className={`ml-1 text-[10px] ${delta > 0 ? "text-bull" : "text-bear"}`}>
                        ({delta > 0 ? "+" : ""}{delta})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">vs. raw {report.rawConfidence}%</div>
                </div>
                <span className={`inline-flex min-w-[60px] justify-center rounded-md border px-2.5 py-1 text-xs font-bold ${decisionStyle[report.decision]}`}>
                  {report.decision}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <SignalChat />


      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p><span className="font-semibold text-foreground">Smart Money Filter:</span> Momentum ohne Volumen-Confirm, High-Beta-Longs in Bärenmärkten und Counter-Trend-Setups werden gedämpft. Trend- und Sharpe-Bestätigung heben die Konfidenz.</p>
        <p><span className="font-semibold text-foreground">Regime Awareness:</span> In Hochvolatilität und Seitwärtsmärkten gilt ein HOLD-Bias. Long-Setups in Bullen-, Short-Setups in Bärenmärkten erhalten Rückenwind.</p>
        <p><span className="font-semibold text-foreground">No False Precision:</span> Jede adjustierte Konfidenz &lt; 60 % wird als HOLD klassifiziert — kein Trade ohne klaren Edge.</p>
      </div>
    </div>
  );
}
