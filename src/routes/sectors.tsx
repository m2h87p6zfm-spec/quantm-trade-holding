import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchCandles } from "@/lib/finnhub";
import { TrendingUp, TrendingDown, Layers, Compass, Activity, Shield, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ExplainAiButton } from "@/components/ExplainAiButton";
import { PageExplainer } from "@/components/PageExplainer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/sectors")({ component: SectorRotationPage });

// SPDR Sektor-ETFs + SPY-Benchmark
const SECTORS: { symbol: string; name: string; type: "cyclical" | "defensive" | "rate" | "growth" }[] = [
  { symbol: "XLK", name: "Technology", type: "growth" },
  { symbol: "XLC", name: "Communication Services", type: "growth" },
  { symbol: "XLY", name: "Consumer Discretionary", type: "cyclical" },
  { symbol: "XLF", name: "Financials", type: "rate" },
  { symbol: "XLI", name: "Industrials", type: "cyclical" },
  { symbol: "XLB", name: "Materials", type: "cyclical" },
  { symbol: "XLE", name: "Energy", type: "cyclical" },
  { symbol: "XLV", name: "Health Care", type: "defensive" },
  { symbol: "XLP", name: "Consumer Staples", type: "defensive" },
  { symbol: "XLU", name: "Utilities", type: "defensive" },
  { symbol: "XLRE", name: "Real Estate", type: "rate" },
];
const BENCH = "SPY";
const ALL = [...SECTORS.map((s) => s.symbol), BENCH];

function pctChange(c: number[], lookback: number): number | null {
  if (!c || c.length < lookback + 1) return null;
  const last = c[c.length - 1];
  const prev = c[c.length - 1 - lookback];
  if (!prev) return null;
  return ((last - prev) / prev) * 100;
}

function colorBg(pct: number | null): string {
  if (pct == null) return "color-mix(in oklab, var(--muted) 40%, transparent)";
  const v = Math.max(-8, Math.min(8, pct));
  const a = 0.18 + (Math.abs(v) / 8) * 0.62;
  const c = v >= 0 ? "var(--bull)" : "var(--bear)";
  return `color-mix(in oklab, ${c} ${Math.round(a * 100)}%, transparent)`;
}

function SectorRotationPage() {
  const queries = useQueries({
    queries: ALL.map((s) => ({
      queryKey: ["sector-candles", s],
      queryFn: () => fetchCandles(s, "D", 200),
      staleTime: 60 * 60 * 1000,
      gcTime: 2 * 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const data = useMemo(() => {
    const bench = queries[ALL.length - 1];
    const benchC = bench.data?.c ?? [];
    const bench1d = pctChange(benchC, 1);
    const bench1w = pctChange(benchC, 5);
    const bench1m = pctChange(benchC, 21);
    const bench3m = pctChange(benchC, 63);

    const rows = SECTORS.map((sec, i) => {
      const q = queries[i];
      const c = q.data?.c ?? [];
      const r1d = pctChange(c, 1);
      const r1w = pctChange(c, 5);
      const r1m = pctChange(c, 21);
      const r3m = pctChange(c, 63);
      // Relative Stärke = Sektor-Return − SPY-Return (in % p.p.)
      const rs1m = r1m != null && bench1m != null ? r1m - bench1m : null;
      const rs3m = r3m != null && bench3m != null ? r3m - bench3m : null;
      // Momentum-Score: gewichteter Mix aus 1W/1M/3M (kurz vor lang)
      const mom =
        (r1w != null ? r1w * 0.5 : 0) +
        (r1m != null ? r1m * 0.3 : 0) +
        (r3m != null ? r3m * 0.2 : 0);
      return {
        ...sec,
        r1d, r1w, r1m, r3m, rs1m, rs3m, mom,
        loading: q.isLoading,
        error: q.isError,
      };
    });

    // Regime: Differenz Ø cyclical+growth vs defensive 1M-Performance
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const cyc = rows.filter((r) => r.type === "cyclical" || r.type === "growth").map((r) => r.r1m).filter((x): x is number => x != null);
    const def = rows.filter((r) => r.type === "defensive").map((r) => r.r1m).filter((x): x is number => x != null);
    const spread = avg(cyc) - avg(def);
    let regime: "Risk-On" | "Risk-Off" | "Neutral" = "Neutral";
    if (spread > 1.5) regime = "Risk-On";
    else if (spread < -1.5) regime = "Risk-Off";

    const sorted = [...rows].sort((a, b) => (b.mom ?? -99) - (a.mom ?? -99));
    return { rows: sorted, regime, spread, bench1d, bench1w, bench1m, bench3m };
  }, [queries]);

  const regimeMeta =
    data.regime === "Risk-On"
      ? { icon: <Zap className="h-4 w-4" />, color: "text-bull", bg: "bg-bull/10 border-bull/30", desc: "Zykliker & Growth führen — institutionelle Money-Flows in Wachstum & Rohstoffe." }
      : data.regime === "Risk-Off"
      ? { icon: <Shield className="h-4 w-4" />, color: "text-bear", bg: "bg-bear/10 border-bear/30", desc: "Defensive Sektoren (Health, Staples, Utilities) führen — Kapital sucht Sicherheit." }
      : { icon: <Activity className="h-4 w-4" />, color: "text-muted-foreground", bg: "bg-muted/20 border-border", desc: "Kein klares Regime — Zykliker und Defensive bewegen sich auf ähnlichem Niveau." };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Compass className="h-3 w-3 text-primary" /> Sektor-Rotation · S&amp;P 500
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Welche Sektoren führen den Markt?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Relative Stärke der 11 SPDR-Sektor-ETFs gegenüber SPY. Zeigt, wo institutionelles Kapital fließt
          und ob der Markt im <span className="text-bull font-medium">Risk-On</span>- oder{" "}
          <span className="text-bear font-medium">Risk-Off</span>-Modus läuft.
        </p>
      </div>

      <PageExplainer
        title="Was ist Sektor-Rotation und warum interessiert mich das?"
        intro="Die US-Wirtschaft ist in 11 Sektoren aufgeteilt (z.B. Tech, Banken, Energie). Großanleger schichten ständig Kapital zwischen ihnen um — je nachdem, wo sie die nächste Phase erwarten. Diese Seite zeigt dir live, wer aktuell führt und wer abgehängt wird. So weißt du, wo das große Geld gerade hinfließt."
        points={[
          { q: "Risk-On vs. Risk-Off", a: "Risk-On = Anleger nehmen Risiko, kaufen Tech & Zykliker. Risk-Off = sie flüchten in Defensive (Health, Staples, Utilities)." },
          { q: "Relative Stärke (RS)", a: "Wie stark ein Sektor gegen SPY läuft. Positiv = besser als der Markt. Profis kaufen, was Relative Stärke zeigt." },
          { q: "Momentum-Score", a: "Gewichteter Mix aus 1W/1M/3M-Performance. Hoher Wert = klarer Aufwärtstrend, Trader steigen ein." },
          { q: "Wie nutze ich das?", a: "Konzentriere dich auf Aktien aus den Top-3-Sektoren. Vermeide Aktien aus den unteren 3 — sie kämpfen gegen den Strom." },
        ]}
        cta="Klick auf einen Sektor in der Tabelle, um die enthaltenen Aktien zu sehen. Oder nutze den AI-Analyst-Button für eine ausführliche Markterklärung."
      />

      {/* Regime-Hero */}
      <div className={`card-glow rounded-2xl border p-5 ${regimeMeta.bg}`}>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-border/60 ${regimeMeta.color}`}>
              {regimeMeta.icon}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Aktuelles Marktregime</div>
              <div className={`mt-1 text-3xl font-bold ${regimeMeta.color}`}>{data.regime}</div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{regimeMeta.desc}</p>
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <StatMini label="Cyc − Def (1M)" value={`${data.spread >= 0 ? "+" : ""}${data.spread.toFixed(2)}%`} tone={data.spread >= 0 ? "bull" : "bear"} />
            <StatMini label="SPY 1M" value={data.bench1m != null ? `${data.bench1m >= 0 ? "+" : ""}${data.bench1m.toFixed(2)}%` : "—"} tone={(data.bench1m ?? 0) >= 0 ? "bull" : "bear"} />
          </div>
          <ExplainAiButton topic="Sektor-Rotation & Marktregime" context={`Aktuelles Regime: ${data.regime}. Cyclical-Defensive-Spread (1M): ${data.spread.toFixed(2)}%. SPY 1M: ${data.bench1m?.toFixed(2)}%. Erkläre dem User, was Sektor-Rotation für seine Trading-Entscheidungen bedeutet, welche Sektoren in diesem Regime typischerweise outperformen, und wie professionelle Anleger darauf reagieren.`} variant="chip" />
        </div>
      </div>

      {/* Leaders & Laggards — die Kernaussage auf einen Blick */}
      <div className="grid gap-4 md:grid-cols-2">
        <LeaderLaggardCard
          title="Sektor-Leader"
          subtitle="Wo Geld aktuell hinfließt"
          tone="bull"
          icon={<ArrowUpRight className="h-4 w-4" />}
          items={data.rows.slice(0, 3)}
        />
        <LeaderLaggardCard
          title="Sektor-Nachzügler"
          subtitle="Wo Trader Risiko meiden"
          tone="bear"
          icon={<ArrowDownRight className="h-4 w-4" />}
          items={[...data.rows].slice(-3).reverse()}
        />
      </div>

      {/* Sektor-Tabelle */}
      <div className="card-glow rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Sektor-Performance & Relative Stärke</h2>
          </div>
          <div className="text-[10px] text-muted-foreground">Benchmark: SPY · Sortiert nach Momentum</div>
        </div>

        <TooltipProvider delayDuration={200}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-2 py-2 text-left">Sektor</th>
                <th className="px-2 py-2 text-right">1T</th>
                <th className="px-2 py-2 text-right hidden sm:table-cell">1W</th>
                <th className="px-2 py-2 text-right">1M</th>
                <th className="px-2 py-2 text-right hidden md:table-cell">3M</th>
                <ThWithTip label="RS 1M" tip="Relative Stärke (1 Monat): Sektor-Return minus SPY-Return. Positiv = besser als der Markt." />
                <ThWithTip label="RS 3M" tip="Relative Stärke (3 Monate). Anhaltend positive Werte deuten auf institutionellen Kapitalzufluss." className="hidden lg:table-cell" />
                <ThWithTip label="Momentum" tip="Gewichteter Trend-Score: 1W (50%) + 1M (30%) + 3M (20%). Höher = stärkerer Aufwärtstrend." />
              </tr>
            </thead>

            <tbody>
              {data.rows.map((r, idx) => (
                <tr key={r.symbol} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-2 py-2.5">
                    <Link to="/produkte/$symbol" params={{ symbol: r.symbol }} className="flex items-center gap-2 hover:text-primary">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold bg-muted/40">{idx + 1}</span>
                      <span className="font-mono font-bold">{r.symbol}</span>
                      <span className="text-xs text-muted-foreground hidden md:inline">{r.name}</span>
                      <TypeBadge type={r.type} />
                    </Link>
                  </td>
                  <PctCell pct={r.r1d} />
                  <PctCell pct={r.r1w} />
                  <PctCell pct={r.r1m} colored />
                  <PctCell pct={r.r3m} />
                  <RsCell pct={r.rs1m} />
                  <RsCell pct={r.rs3m} />
                  <td className="px-2 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="h-1.5 w-16 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.min(100, Math.abs(r.mom) * 8)}%`,
                            background: r.mom >= 0 ? "var(--bull)" : "var(--bear)",
                            marginLeft: r.mom >= 0 ? "0" : "auto",
                          }}
                        />
                      </div>
                      <span className={`font-mono text-xs tabular-nums ${r.mom >= 0 ? "text-bull" : "text-bear"}`}>
                        {r.mom >= 0 ? "+" : ""}{r.mom.toFixed(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <Legend label="Growth" desc="Tech, Communication" />
          <Legend label="Zyklisch" desc="Discretionary, Industrials, Energy, Materials" />
          <Legend label="Defensiv" desc="Health, Staples, Utilities" />
          <Legend label="Zinssensitiv" desc="Financials, Real Estate" />
        </div>
      </div>
    </div>
  );
}

function PctCell({ pct, colored }: { pct: number | null; colored?: boolean }) {
  if (pct == null) return <td className="px-2 py-2.5 text-right text-muted-foreground font-mono">—</td>;
  const cls = pct >= 0 ? "text-bull" : "text-bear";
  return (
    <td className="px-2 py-2.5 text-right">
      <span
        className={`font-mono text-xs tabular-nums ${cls} ${colored ? "rounded px-1.5 py-0.5" : ""}`}
        style={colored ? { background: colorBg(pct) } : undefined}
      >
        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
      </span>
    </td>
  );
}

function RsCell({ pct }: { pct: number | null }) {
  if (pct == null) return <td className="px-2 py-2.5 text-right text-muted-foreground font-mono">—</td>;
  const Icon = pct >= 0 ? TrendingUp : TrendingDown;
  const cls = pct >= 0 ? "text-bull" : "text-bear";
  return (
    <td className="px-2 py-2.5 text-right">
      <span className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${cls}`}>
        <Icon className="h-3 w-3" />
        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}
      </span>
    </td>
  );
}

function TypeBadge({ type }: { type: "cyclical" | "defensive" | "rate" | "growth" }) {
  const map = {
    growth: { label: "Growth", cls: "bg-primary/15 text-primary" },
    cyclical: { label: "Zyklisch", cls: "bg-gold/15 text-gold" },
    defensive: { label: "Defensiv", cls: "bg-violet-accent/15 text-violet-accent" },
    rate: { label: "Zinssens.", cls: "bg-muted/40 text-muted-foreground" },
  } as const;
  const m = map[type];
  return <span className={`hidden sm:inline-flex rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${m.cls}`}>{m.label}</span>;
}

function StatMini({ label, value, tone }: { label: string; value: string; tone: "bull" | "bear" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-lg font-bold ${tone === "bull" ? "text-bull" : "text-bear"}`}>{value}</div>
    </div>
  );
}

function Legend({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/10 px-2 py-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">{desc}</div>
    </div>
  );
}
