import { useMemo } from "react";
import { Sigma } from "lucide-react";
import { apexAnalyze, type Candle } from "@/lib/quant";

type Signal = "pos" | "neg" | "neu";

function fmt(n: number | undefined | null, d = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number | undefined | null, d = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
}

function SignalDot({ s }: { s: Signal }) {
  const cls = s === "pos" ? "bg-emerald-500" : s === "neg" ? "bg-rose-500" : "bg-amber-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function Row({ label, value, sub, signal }: { label: string; value: string; sub?: string; signal: Signal }) {
  const textColor = signal === "pos" ? "text-emerald-400" : signal === "neg" ? "text-rose-400" : "text-amber-300";
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-b-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SignalDot s={signal} />
        <span>{label}</span>
      </div>
      <div className="text-right">
        <div className={`font-mono text-base font-semibold ${textColor}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

export function QuantFinancePanel({
  symbol,
  candleObjs,
  price,
}: {
  symbol: string;
  candleObjs: Candle[];
  price: number;
}) {
  // Run the full Apex quant engine client-side (pure math, no server deps).
  // Memoized per candle set so this only recomputes when new data arrives.
  const report = useMemo(() => {
    try {
      if (!candleObjs || candleObjs.length < 30) return null;
      return apexAnalyze(symbol, candleObjs);
    } catch {
      return null;
    }
  }, [symbol, candleObjs]);

  if (!report) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Sigma className="h-4 w-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">🧮 Quantitative Finance & Monte Carlo</h3>
        </div>
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Nicht genügend Kursdaten für ein Quant-Modell ({candleObjs?.length ?? 0} Kerzen, ≥ 30 nötig).
        </div>
      </div>
    );
  }

  const m = report.modules;
  const mc = m.D.mc30;

  const mcMedianPct = ((mc.p50 - price) / price) * 100;
  const mcLowPct = ((mc.p05 - price) / price) * 100;
  const mcHighPct = ((mc.p95 - price) / price) * 100;

  // Monte Carlo rows (P05/P10/P25/P50/P75/P90/P95) with % vs. spot
  const mcRows: Array<{ label: string; value: string; sub: string; signal: Signal }> = [
    { label: "Worst-Case (P05)", value: fmt(mc.p05), sub: fmtPct(mcLowPct), signal: "neg" },
    { label: "Bearish (P10)", value: fmt(mc.p10), sub: fmtPct(((mc.p10 - price) / price) * 100), signal: "neg" },
    { label: "Untere Quartile (P25)", value: fmt(mc.p25), sub: fmtPct(((mc.p25 - price) / price) * 100), signal: "neu" },
    {
      label: "Median (P50)",
      value: fmt(mc.p50),
      sub: fmtPct(mcMedianPct),
      signal: mcMedianPct > 1 ? "pos" : mcMedianPct < -1 ? "neg" : "neu",
    },
    { label: "Obere Quartile (P75)", value: fmt(mc.p75), sub: fmtPct(((mc.p75 - price) / price) * 100), signal: "neu" },
    { label: "Bullish (P90)", value: fmt(mc.p90), sub: fmtPct(((mc.p90 - price) / price) * 100), signal: "pos" },
    { label: "Best-Case (P95)", value: fmt(mc.p95), sub: fmtPct(mcHighPct), signal: "pos" },
  ];

  // Risk / quant finance metrics
  const riskRows: Array<{ label: string; value: string; sub?: string; signal: Signal }> = [
    {
      label: "VaR (95 %, 1 Tag)",
      value: `${fmt(m.C.var95, 2)} %`,
      sub: "Parametric — max. erwarteter Tagesverlust",
      signal: m.C.var95 > 3 ? "neg" : m.C.var95 > 1.5 ? "neu" : "pos",
    },
    {
      label: "VaR (99 %, 1 Tag)",
      value: `${fmt(m.C.var99, 2)} %`,
      sub: "Stress-Szenario",
      signal: m.C.var99 > 5 ? "neg" : m.C.var99 > 2.5 ? "neu" : "pos",
    },
    {
      label: "CVaR (95 %)",
      value: `${fmt(m.C.cvar95, 2)} %`,
      sub: "Expected Shortfall im Tail",
      signal: m.C.cvar95 > 4 ? "neg" : m.C.cvar95 > 2 ? "neu" : "pos",
    },
    {
      label: "GARCH(1,1) σ nächster Tag",
      value: `${fmt(m.C.garchSigmaNext, 2)} %`,
      sub: `σ annualisiert: ${fmt(m.C.garchAnnual, 1)} %`,
      signal: m.C.garchAnnual > 50 ? "neg" : m.C.garchAnnual < 25 ? "pos" : "neu",
    },
    {
      label: "Hist. Vol. (annualisiert)",
      value: `${fmt(m.C.histVol * 100, 1)} %`,
      signal: m.C.histVol > 0.5 ? "neg" : m.C.histVol < 0.2 ? "pos" : "neu",
    },
  ];

  // Forecast & quality metrics
  const forecastRows: Array<{ label: string; value: string; sub?: string; signal: Signal }> = [
    {
      label: "Linear-Regression (90 T)",
      value: fmt(m.D.regForecast),
      sub: `R² = ${fmt(m.D.regR2, 3)} · Slope = ${fmt(m.D.regSlope, 4)}`,
      signal: m.D.regSlope > 0 && m.D.regR2 > 0.3 ? "pos" : m.D.regSlope < 0 && m.D.regR2 > 0.3 ? "neg" : "neu",
    },
    {
      label: "Mean-Reversion Halbwertszeit",
      value: Number.isFinite(m.D.halfLife) ? `${fmt(m.D.halfLife, 1)} T` : "—",
      sub: "Tage bis Rückkehr zur Hälfte der Abweichung",
      signal: "neu",
    },
    {
      label: "Sortino Ratio",
      value: fmt(m.F.sortino, 2),
      sub: "Downside-bereinigte Rendite",
      signal: m.F.sortino > 1 ? "pos" : m.F.sortino < 0 ? "neg" : "neu",
    },
    {
      label: "Calmar Ratio",
      value: fmt(m.F.calmar, 2),
      sub: "Rendite / Max-Drawdown",
      signal: m.F.calmar > 0.5 ? "pos" : m.F.calmar < 0 ? "neg" : "neu",
    },
    {
      label: "Max Drawdown",
      value: `${fmt(m.F.maxDD, 1)} %`,
      signal: m.F.maxDD < -40 ? "neg" : m.F.maxDD < -20 ? "neu" : "pos",
    },
    {
      label: "Kelly-Fraktion (½)",
      value: `${fmt(m.F.kellyHalf, 1)} %`,
      sub: `Voll: ${fmt(m.F.kellyFull, 1)} %`,
      signal: m.F.kellyHalf > 5 ? "pos" : m.F.kellyHalf < 0 ? "neg" : "neu",
    },
    {
      label: "Treynor Ratio",
      value: fmt(m.F.treynor, 2),
      sub: "Überrendite je Beta-Einheit",
      signal: m.F.treynor > 0.1 ? "pos" : m.F.treynor < 0 ? "neg" : "neu",
    },
    {
      label: "Beta (Blume-adj.)",
      value: fmt(m.C.betaAdj, 2),
      sub: `Raw β = ${fmt(m.C.beta, 2)} · ρ = ${fmt(m.C.corrSPY, 2)}`,
      signal: m.C.betaAdj > 1.3 ? "neg" : m.C.betaAdj < 0.8 ? "pos" : "neu",
    },
    {
      label: "Rel. Stärke (90 T vs. Bench)",
      value: fmt(m.G.relStrength, 3),
      sub: m.G.relStrength > 1 ? "Outperformance" : "Underperformance",
      signal: m.G.relStrength > 1.05 ? "pos" : m.G.relStrength < 0.95 ? "neg" : "neu",
    },
  ];

  const mcVerdict: Signal = mcMedianPct > 2 ? "pos" : mcMedianPct < -2 ? "neg" : "neu";

  return (
    <div className="rounded-2xl border border-border bg-card/60 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Sigma className="h-4 w-4" />
        <h3 className="text-sm font-bold uppercase tracking-wider">🧮 Quantitative Finance & Monte Carlo</h3>
      </div>

      {/* Monte Carlo */}
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Monte-Carlo-Simulation · GBM · 4 000 Pfade · 30 Handelstage
      </div>
      <div className="divide-y divide-border/40">
        {mcRows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} sub={r.sub} signal={r.signal} />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border/60 bg-background/30 px-4 py-2 text-[11px]">
        <span className="text-muted-foreground">95 %-Konfidenzintervall</span>
        <span className="font-mono font-semibold">
          {fmt(mc.p05)} – {fmt(mc.p95)}
          <span className={`ml-2 ${mcVerdict === "pos" ? "text-emerald-400" : mcVerdict === "neg" ? "text-rose-400" : "text-amber-300"}`}>
            (Median {fmtPct(mcMedianPct)})
          </span>
        </span>
      </div>

      {/* Risk Metrics */}
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Risikomaße · VaR / CVaR / GARCH
      </div>
      <div className="divide-y divide-border/40">
        {riskRows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} sub={r.sub} signal={r.signal} />
        ))}
      </div>

      {/* Forecast & Quality */}
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Prognose, Qualität & Sizing
      </div>
      <div className="divide-y divide-border/40">
        {forecastRows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} sub={r.sub} signal={r.signal} />
        ))}
      </div>

      <div className="border-t border-border/60 bg-background/30 px-4 py-2 text-[10px] text-muted-foreground">
        Apex-Score: <span className="font-mono font-semibold text-foreground/80">{fmt(report.score, 1)}/100</span>
        {" · "}Konfidenz: <span className="font-mono font-semibold text-foreground/80">{fmt(report.confidence, 1)} %</span>
        {" · "}Verdict (Quant): <span className="font-semibold text-foreground/80">{report.verdict}</span>
      </div>
    </div>
  );
}
