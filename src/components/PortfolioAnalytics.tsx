import { useMemo } from "react";
import { Brain, Sparkles, AlertTriangle, TrendingUp, Shield, Activity } from "lucide-react";
import type { Position } from "@/lib/portfolio";
import { pnl } from "@/lib/portfolio";
import type { CockpitRow } from "@/lib/cockpit";
import { findProduct } from "@/lib/products";

type Metrics = {
  totalValue: number;
  totalPnl: number;
  totalBasis: number;
  weightedVol: number; // annualized %
  hhi: number; // 0..1 concentration
  conflicts: number;
  bullish: number;
  bearish: number;
  longExposure: number;
  shortExposure: number;
  sectors: { name: string; value: number; pct: number }[];
  topHolding: { symbol: string; pct: number } | null;
  riskScore: number; // 0..100 (higher = riskier)
  riskBand: "Niedrig" | "Mittel" | "Erhöht" | "Hoch" | "Sehr hoch";
};

function computeMetrics(positions: Position[], rowMap: Map<string, CockpitRow>): Metrics {
  let totalValue = 0;
  let totalPnl = 0;
  let totalBasis = 0;
  let longExposure = 0;
  let shortExposure = 0;
  let bullish = 0;
  let bearish = 0;
  let conflicts = 0;

  const symbolValue = new Map<string, number>();
  const sectorValue = new Map<string, number>();
  let volSumWeighted = 0;
  let volWeights = 0;

  for (const pos of positions) {
    const row = rowMap.get(pos.symbol);
    const price = row?.last ?? pos.entry;
    const { abs, value } = pnl(pos, price);
    totalValue += value;
    totalPnl += abs;
    totalBasis += pos.entry * pos.qty;

    if (pos.side === "LONG") longExposure += value;
    else shortExposure += value;

    symbolValue.set(pos.symbol, (symbolValue.get(pos.symbol) ?? 0) + value);

    const prod = findProduct(pos.symbol);
    const sector = prod?.sector ?? "Sonstige";
    sectorValue.set(sector, (sectorValue.get(sector) ?? 0) + value);

    if (row) {
      const v = row.sig.verdict;
      if (v === "LONG") bullish++;
      else if (v === "SHORT") bearish++;
      if (
        (pos.side === "LONG" && v === "SHORT") ||
        (pos.side === "SHORT" && v === "LONG")
      ) conflicts++;

      const vol = (row.ind.volatility ?? 0) * 100;
      volSumWeighted += vol * value;
      volWeights += value;
    }
  }

  const weightedVol = volWeights > 0 ? volSumWeighted / volWeights : 0;

  // HHI concentration (0..1)
  let hhi = 0;
  if (totalValue > 0) {
    for (const v of symbolValue.values()) {
      const w = v / totalValue;
      hhi += w * w;
    }
  }

  const sectors = Array.from(sectorValue.entries())
    .map(([name, value]) => ({ name, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  let topHolding: Metrics["topHolding"] = null;
  if (totalValue > 0) {
    const top = [...symbolValue.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) topHolding = { symbol: top[0], pct: (top[1] / totalValue) * 100 };
  }

  // Risk Score: volatility component (0..60) + concentration (0..25) + conflict (0..15)
  const volComponent = Math.min(60, (weightedVol / 60) * 60);
  const concComponent = Math.min(25, hhi * 50);
  const conflictComponent = positions.length > 0 ? Math.min(15, (conflicts / positions.length) * 15) : 0;
  const riskScore = Math.round(volComponent + concComponent + conflictComponent);

  const riskBand: Metrics["riskBand"] =
    riskScore < 20 ? "Niedrig" :
    riskScore < 40 ? "Mittel" :
    riskScore < 60 ? "Erhöht" :
    riskScore < 80 ? "Hoch" : "Sehr hoch";

  return {
    totalValue, totalPnl, totalBasis, weightedVol, hhi, conflicts,
    bullish, bearish, longExposure, shortExposure, sectors, topHolding,
    riskScore, riskBand,
  };
}

const SECTOR_COLORS: Record<string, string> = {
  Technologie: "hsl(220 90% 60%)",
  Finanzen: "hsl(160 70% 45%)",
  Gesundheit: "hsl(340 70% 55%)",
  Energie: "hsl(30 90% 55%)",
  Konsum: "hsl(280 70% 60%)",
  Industrie: "hsl(200 50% 50%)",
  Rohstoffe: "hsl(40 60% 50%)",
  Index: "hsl(260 60% 65%)",
  Sonstige: "hsl(0 0% 50%)",
};

export function PortfolioAnalytics({ positions, rowMap }: { positions: Position[]; rowMap: Map<string, CockpitRow> }) {
  const m = useMemo(() => computeMetrics(positions, rowMap), [positions, rowMap]);

  if (positions.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RiskScoreCard m={m} />
      <SectorBreakdownCard m={m} />
      <PortfolioRiskCard m={m} />
      <div className="lg:col-span-3">
        <AiPortfolioInsight positions={positions} rowMap={rowMap} m={m} />
      </div>
    </div>
  );
}

function RiskScoreCard({ m }: { m: Metrics }) {
  const color =
    m.riskScore < 40 ? "text-emerald-400" :
    m.riskScore < 60 ? "text-amber-400" :
    m.riskScore < 80 ? "text-orange-400" : "text-rose-400";
  const ringColor =
    m.riskScore < 40 ? "stroke-emerald-400" :
    m.riskScore < 60 ? "stroke-amber-400" :
    m.riskScore < 80 ? "stroke-orange-400" : "stroke-rose-400";
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (m.riskScore / 100) * circumference;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Shield className="h-3.5 w-3.5" /> Portfolio Risk Score
      </div>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" strokeWidth="8" className="fill-none stroke-muted/40" />
            <circle
              cx="50" cy="50" r="42" strokeWidth="8" strokeLinecap="round"
              className={`fill-none ${ringColor} transition-all duration-700`}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-3xl font-bold tabular-nums ${color}`}>{m.riskScore}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${color}`}>{m.riskBand}</div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Setzt sich zusammen aus Vola (σ ann.), Konzentration (HHI) und Signal-Konflikten.
          </p>
          <div className="mt-2 space-y-1 text-[10px]">
            <RiskBar label="Volatilität" value={Math.min(100, (m.weightedVol / 60) * 100)} display={`${m.weightedVol.toFixed(1)}%`} />
            <RiskBar label="Konzentration" value={Math.min(100, m.hhi * 200)} display={`HHI ${(m.hhi * 10000).toFixed(0)}`} />
            <RiskBar label="Signal-Konflikt" value={Math.min(100, (m.conflicts / Math.max(1, m.bullish + m.bearish + m.conflicts)) * 100)} display={`${m.conflicts}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskBar({ label, value, display }: { label: string; value: number; display: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary/60 to-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-16 text-right tabular-nums text-foreground/80">{display}</span>
    </div>
  );
}

function SectorBreakdownCard({ m }: { m: Metrics }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Activity className="h-3.5 w-3.5" /> Sektor-Allokation
      </div>
      {m.sectors.length === 0 ? (
        <div className="mt-4 text-xs text-muted-foreground">Keine Daten.</div>
      ) : (
        <>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
            {m.sectors.map((s) => (
              <div
                key={s.name}
                title={`${s.name} · ${s.pct.toFixed(1)}%`}
                style={{ width: `${s.pct}%`, background: SECTOR_COLORS[s.name] ?? "hsl(0 0% 50%)" }}
              />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5 text-[11px]">
            {m.sectors.slice(0, 6).map((s) => (
              <li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: SECTOR_COLORS[s.name] ?? "hsl(0 0% 50%)" }} />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="tabular-nums text-muted-foreground">{s.pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PortfolioRiskCard({ m }: { m: Metrics }) {
  const netExposure = m.longExposure - m.shortExposure;
  const grossExposure = m.longExposure + m.shortExposure;
  const longPct = grossExposure > 0 ? (m.longExposure / grossExposure) * 100 : 0;
  // 1-day 95% VaR ≈ value * σ_daily * 1.65; σ_daily = vol_ann / sqrt(252)
  const dailySigma = m.weightedVol / 100 / Math.sqrt(252);
  const var95 = m.totalValue * dailySigma * 1.65;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" /> Portfolio-Risiko
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <Metric label="Gross Exposure" value={fmtMoney(grossExposure)} />
        <Metric label="Net Exposure" value={fmtMoney(netExposure)} />
        <Metric label="Long / Short" value={`${longPct.toFixed(0)}% / ${(100 - longPct).toFixed(0)}%`} />
        <Metric label="σ ann. (gew.)" value={`${m.weightedVol.toFixed(1)}%`} />
        <Metric label="VaR 95% (1T)" value={fmtMoney(var95)} tone="warn" />
        <Metric
          label="Top-Position"
          value={m.topHolding ? `${m.topHolding.symbol} · ${m.topHolding.pct.toFixed(0)}%` : "—"}
          tone={m.topHolding && m.topHolding.pct > 30 ? "warn" : undefined}
        />
      </div>
      {m.topHolding && m.topHolding.pct > 30 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-2 text-[10px] text-amber-400/90">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Klumpenrisiko: {m.topHolding.symbol} {">"} 30 % des Portfolios. Diversifikation prüfen.</span>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-semibold tabular-nums ${tone === "warn" ? "text-amber-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

export function AiPortfolioInsight({
  positions, rowMap, m,
}: {
  positions: Position[];
  rowMap: Map<string, CockpitRow>;
  m?: Metrics;
}) {
  const metrics = m ?? computeMetrics(positions, rowMap);
  const insights = useMemo(() => buildInsights(positions, rowMap, metrics), [positions, rowMap, metrics]);

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-violet-accent/[0.05] p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <Brain className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            QUANT-X · Portfolio Insight
            <Sparkles className="h-3 w-3 text-gold" />
          </div>
          <div className="text-[10px] text-muted-foreground">
            Datenbasierte Einschätzung — keine Anlageempfehlung
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {insights.map((ins, i) => (
          <InsightLine key={i} tone={ins.tone} title={ins.title} body={ins.body} />
        ))}
      </div>
    </div>
  );
}

type Insight = { tone: "good" | "warn" | "bad" | "info"; title: string; body: string };

function buildInsights(positions: Position[], rowMap: Map<string, CockpitRow>, m: Metrics): Insight[] {
  const out: Insight[] = [];
  if (positions.length === 0) {
    return [{ tone: "info", title: "Noch keine Daten.", body: "Lege oben deine erste Position an — QUANT-X erstellt automatisch eine Risiko- und Diversifikationsanalyse." }];
  }

  // Risk band
  if (m.riskScore >= 70) {
    out.push({ tone: "bad", title: `Hohes Gesamtrisiko (Score ${m.riskScore}/100)`,
      body: `Die gewichtete Vola liegt bei ~${m.weightedVol.toFixed(1)}%. Erwäge Reduktion der gehebelten oder besonders volatilen Positionen.` });
  } else if (m.riskScore >= 50) {
    out.push({ tone: "warn", title: `Mittleres Risiko (Score ${m.riskScore}/100)`,
      body: `σ ann. ≈ ${m.weightedVol.toFixed(1)}%. Im Rahmen — auf Korrelationen zwischen Top-Positionen achten.` });
  } else {
    out.push({ tone: "good", title: `Risiko im grünen Bereich (Score ${m.riskScore}/100)`,
      body: `σ ann. ≈ ${m.weightedVol.toFixed(1)}%. Risikoprofil entspricht einem ausgewogenen Portfolio.` });
  }

  // Concentration
  if (m.topHolding && m.topHolding.pct > 30) {
    out.push({ tone: "warn", title: `Klumpenrisiko: ${m.topHolding.symbol}`,
      body: `${m.topHolding.symbol} macht ${m.topHolding.pct.toFixed(0)} % des Portfolios aus. Eine Korrektur dieser Position trifft den Gesamtwert überproportional.` });
  } else if (positions.length < 5) {
    out.push({ tone: "info", title: "Geringe Diversifikation",
      body: `Nur ${positions.length} Positionen — Studien zeigen, dass Diversifikationseffekte vor allem zwischen 8–15 Werten greifen.` });
  }

  // Sector concentration
  const topSector = m.sectors[0];
  if (topSector && topSector.pct > 50) {
    out.push({ tone: "warn", title: `Sektor-Klumpen: ${topSector.name}`,
      body: `${topSector.pct.toFixed(0)} % des Kapitals in ${topSector.name}. Ein sektorweiter Drawdown würde das Portfolio voll treffen.` });
  }

  // Signal conflicts
  if (m.conflicts > 0) {
    const conflictNames = positions
      .filter((p) => {
        const r = rowMap.get(p.symbol);
        if (!r) return false;
        const v = r.sig.verdict;
        return (p.side === "LONG" && v === "SHORT") || (p.side === "SHORT" && v === "LONG");
      })
      .map((p) => p.symbol)
      .slice(0, 4)
      .join(", ");
    out.push({ tone: "bad", title: `${m.conflicts} ${m.conflicts === 1 ? "Position widerspricht" : "Positionen widersprechen"} dem Signal`,
      body: `${conflictNames} — die Quant-Engine sieht aktuell die Gegenrichtung. Stop-Loss prüfen.` });
  } else if (m.bullish > m.bearish && m.bullish > 0) {
    out.push({ tone: "good", title: "Positionen sind Signal-aligned",
      body: `${m.bullish} bullishe, ${m.bearish} bearishe Signale stimmen mit deiner Ausrichtung überein.` });
  }

  // Performance
  if (m.totalBasis > 0) {
    const pct = (m.totalPnl / m.totalBasis) * 100;
    if (pct > 10) {
      out.push({ tone: "good", title: `Performance +${pct.toFixed(1)} %`,
        body: `Unrealisierter Gewinn von ${fmtMoney(m.totalPnl)}. Teilgewinne sichern (Trailing-Stop) ist statistisch optimal.` });
    } else if (pct < -10) {
      out.push({ tone: "bad", title: `Drawdown ${pct.toFixed(1)} %`,
        body: `Unrealisierter Verlust von ${fmtMoney(m.totalPnl)}. Position-Sizing und Stop-Loss-Disziplin überprüfen.` });
    }
  }

  return out;
}

function InsightLine({ tone, title, body }: { tone: Insight["tone"]; title: string; body: string }) {
  const style =
    tone === "good" ? "border-emerald-500/30 bg-emerald-500/[0.05]" :
    tone === "warn" ? "border-amber-500/30 bg-amber-500/[0.05]" :
    tone === "bad" ? "border-rose-500/30 bg-rose-500/[0.05]" :
    "border-border/60 bg-muted/20";
  const dot =
    tone === "good" ? "bg-emerald-400" :
    tone === "warn" ? "bg-amber-400" :
    tone === "bad" ? "bg-rose-400" : "bg-muted-foreground";
  return (
    <div className={`rounded-md border p-3 ${style}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <p className="mt-1 ml-3.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
    </div>
  );
}

function fmtMoney(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}k`;
  return `${sign}${abs.toFixed(2)}`;
}
