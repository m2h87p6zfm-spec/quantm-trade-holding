import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Search, ArrowRight, Download, ShieldCheck, Lock } from "lucide-react";
import { getTrackRecord, type TrackRecordPayload } from "@/lib/trackrecord.functions";
import { ApexLogo } from "@/components/ApexLogo";
import { AuthNavButton } from "@/components/AuthNavButton";
import { MiniSpark } from "@/components/MiniSpark";
import { MetricCard } from "@/components/beginner/MetricCard";

function KpiTile({
  value,
  label,
  tone = "neutral",
}: {
  value: string;
  label: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const cls =
    tone === "positive" ? "text-bull" : tone === "negative" ? "text-bear" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className={`font-mono text-lg font-semibold tabular-nums ${cls}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
import { TrustPillars } from "@/components/beginner/TrustPillars";
import { ThresholdGate } from "@/components/beginner/ThresholdGate";
import { AdvancedCollapsible } from "@/components/beginner/AdvancedCollapsible";
import { InfoTooltip } from "@/components/beginner/InfoTooltip";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PickDetailDrawer,
  type DerivedPosition,
} from "@/components/track-record/PickDetailDrawer";
import {
  derivePortfolio,
  PORTFOLIO_STARTING_EQUITY,
  PORTFOLIO_SLOT_NOTIONAL,
  type DerivedTrackRecord,
  type PortfolioMetrics,
} from "@/lib/portfolio-derive";

export const Route = createFileRoute("/track-record")({
  head: () => ({
    meta: [
      { title: "Track Record — Echte Ergebnisse, ehrlich dokumentiert" },
      {
        name: "description",
        content:
          "Vollständig transparenter Track Record: Alle Quantm-Empfehlungen mit Buy/Sell-Signal, Portfolio-Sicht, Audit-Log und Performance-Charts. Keine Backtests, keine Schönrechnerei.",
      },
      { property: "og:title", content: "Quantm Track Record" },
      { property: "og:description", content: "Alle unsere Empfehlungen — gute wie schlechte." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      {
        "script:ld+json": JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Quantm Trade Pick Performance Record",
          description:
            "Real track record of all stock recommendations with 30, 60, and 90-day outcome tracking, portfolio view, and immutable audit log.",
          url: "https://quantmtrade.com/track-record",
          creator: { "@type": "Organization", name: "Quantm Trade" },
        }),
      },
    ],
  }),
  component: TrackRecordPage,
});

type Analysis = TrackRecordPayload["analyses"][number];

function TrackRecordPage() {
  const fetchTr = useServerFn(getTrackRecord);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["track-record"],
    queryFn: () => fetchTr(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-32">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </PageShell>
    );
  }
  if (isError || !data) {
    return (
      <PageShell>
        <p className="py-32 text-center text-sm text-muted-foreground">
          Daten konnten gerade nicht geladen werden. Bitte später erneut versuchen.
        </p>
      </PageShell>
    );
  }

  return <Content data={data} />;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <ApexLogo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">Quantm Trade</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link to="/picks" className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Picks</Link>
            <Link to="/wie-es-funktioniert" className="hidden sm:inline-flex px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Wie es funktioniert</Link>
            <AuthNavButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">{children}</main>
      <footer className="border-t border-border/40 py-6 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Quantm Trade — Keine Anlageberatung.
      </footer>
    </div>
  );
}

function Content({ data }: { data: TrackRecordPayload }) {
  const derived = useMemo(() => derivePortfolio(data), [data]);

  const evaluated = data.analyses.filter((a) => a.outcome?.is_correct != null);
  const earliestEvaluated = evaluated
    .map((a) => new Date(a.analyzed_at).getTime())
    .reduce<number | null>((min, t) => (min == null || t < min ? t : min), null);
  const daysOfData = earliestEvaluated
    ? Math.floor((Date.now() - earliestEvaluated) / 86_400_000)
    : 0;

  const showBenchmarks = daysOfData >= 90;
  const showAdvanced = daysOfData >= 180;

  const [selectedPos, setSelectedPos] = useState<DerivedPosition | null>(null);

  return (
    <PageShell>
      <PageHero daysOfData={daysOfData} metrics={derived.metrics} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="picks">Empfehlungen</TabsTrigger>
          <TabsTrigger value="audit">Audit-Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-6">
          <TransparencyDashboard derived={derived} />
          <EquityCurveCard derived={derived} />
          <div className="grid gap-6 lg:grid-cols-2">
            <WinLossHistogram derived={derived} />
            <MonthlyReturnsChart derived={derived} />
          </div>
          <EvaluationExplainer
            daysOfData={daysOfData}
            totalPicks={data.analyses.length}
            evaluatedPicks={evaluated.length}
          />
          {showBenchmarks && <BenchmarkBlock benchmarks={data.benchmarks} analyses={evaluated} />}
          <TrustPillars />
          {showAdvanced && <AdvancedStats analyses={evaluated} />}
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6 mt-6">
          <PortfolioOverview derived={derived} onSelect={setSelectedPos} />
        </TabsContent>

        <TabsContent value="picks" className="space-y-6 mt-6">
          <PicksHistory derived={derived} onSelect={setSelectedPos} />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6 mt-6">
          <AuditLogView derived={derived} />
        </TabsContent>
      </Tabs>

      <PickDetailDrawer
        position={selectedPos}
        open={selectedPos !== null}
        onOpenChange={(v) => !v && setSelectedPos(null)}
      />
    </PageShell>
  );
}

/* -------------------- Hero -------------------- */

function PageHero({ daysOfData, metrics }: { daysOfData: number; metrics: PortfolioMetrics }) {
  const ret = metrics.totalReturnPct;
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Quantm Track Record</div>
      <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
        Was unsere Empfehlungen wirklich gebracht haben.
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
        Jede Empfehlung ist mit Datum, Kurs und Begründung dokumentiert — und bleibt sichtbar, auch wenn sie nicht aufgegangen ist.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs">
        <Stat label="Modellportfolio" value={`${fmtMoney(metrics.totalEquity)} €`} />
        <Stat
          label="Gesamt-Rendite"
          value={`${ret >= 0 ? "+" : ""}${ret.toFixed(2)} %`}
          tone={ret >= 0 ? "positive" : "negative"}
        />
        <Stat label="Trefferquote" value={`${metrics.winRate.toFixed(0)} %`} />
        <Stat label="Trades (offen / geschlossen)" value={`${metrics.numOpen} / ${metrics.numClosed}`} />
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Live-Daten · Bisher <span className="font-semibold text-foreground">{daysOfData}</span> Tage öffentlich dokumentiert
      </p>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  const cls = tone === "positive" ? "text-bull" : tone === "negative" ? "text-bear" : "text-foreground";
  return (
    <div>
      <div className={`font-mono text-lg font-semibold tabular-nums ${cls}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function fmtMoney(v: number) {
  return v.toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

/* -------------------- Transparency Dashboard -------------------- */

function TransparencyDashboard({ derived }: { derived: DerivedTrackRecord }) {
  const m = derived.metrics;
  return (
    <section>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Transparenz-Dashboard</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Jeder Trade — gewonnen oder verloren — bleibt sichtbar. Manuelles Ausblenden ist technisch nicht möglich.
      </p>
      <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard value={String(m.numClosed + m.numOpen)} label="Trades gesamt" />
        <MetricCard value={String(m.wins)} label="Gewinner" tone="positive" />
        <MetricCard value={String(m.losses)} label="Verlierer" tone="negative" />
        <MetricCard
          value={`${m.winRate.toFixed(0)} %`}
          label="Trefferquote"
          tone={m.winRate >= 55 ? "positive" : m.winRate >= 45 ? "neutral" : "negative"}
        />
        <MetricCard
          value={`${m.bestTradePct >= 0 ? "+" : ""}${m.bestTradePct.toFixed(1)} %`}
          label={`Bester Trade${m.bestTradeTicker ? ` (${m.bestTradeTicker})` : ""}`}
          tone="positive"
        />
        <MetricCard
          value={`${m.worstTradePct.toFixed(1)} %`}
          label={`Schlechtester Trade${m.worstTradeTicker ? ` (${m.worstTradeTicker})` : ""}`}
          tone="negative"
        />
        <MetricCard value={String(m.numOpen)} label="Aktuell offen" />
        <MetricCard value={String(m.numClosed)} label="Geschlossen" />
      </div>
    </section>
  );
}

/* -------------------- Equity Curve -------------------- */

function EquityCurveCard({ derived }: { derived: DerivedTrackRecord }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (derived.equityCurve.length < 2) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <h3 className="text-base font-semibold">Equity-Kurve</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Noch nicht genug abgeschlossene Trades, um eine sinnvolle Kurve zu zeichnen.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Equity-Kurve des Modellportfolios</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Start: {fmtMoney(PORTFOLIO_STARTING_EQUITY)} € · Gleichgewichtetes Portfolio mit{" "}
            {fmtMoney(PORTFOLIO_SLOT_NOTIONAL)} € pro Position
          </p>
        </div>
      </div>
      <div className="mt-4 h-64 sm:h-72 w-full">
        {!mounted ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-muted/30" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={derived.equityCurve} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={48}
                domain={["dataMin - 1000", "dataMax + 1000"]}
              />
              <Tooltip
                formatter={(v: number) => [`${fmtMoney(v)} €`, "Equity"]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

/* -------------------- Win/Loss Histogram -------------------- */

function WinLossHistogram({ derived }: { derived: DerivedTrackRecord }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <h3 className="text-base font-bold tracking-tight">Verteilung der Renditen</h3>
      <p className="mt-1 text-xs text-muted-foreground">Wie viele Trades fallen in welche Renditeklasse?</p>
      <div className="mt-4 h-56 w-full">
        {!mounted ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-muted/30" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={derived.winLossBuckets} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                formatter={(v: number) => [`${v} Trades`, "Anzahl"]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {derived.winLossBuckets.map((b, i) => (
                  <Cell key={i} fill={b.tone === "win" ? "var(--bull)" : "var(--bear)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

/* -------------------- Monthly Returns -------------------- */

function MonthlyReturnsChart({ derived }: { derived: DerivedTrackRecord }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <h3 className="text-base font-bold tracking-tight">Monatliche Renditen</h3>
      <p className="mt-1 text-xs text-muted-foreground">Summe der Trade-Renditen pro Kalendermonat.</p>
      <div className="mt-4 h-56 w-full">
        {!mounted ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-muted/30" />
        ) : derived.monthlyReturns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Monatsdaten.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={derived.monthlyReturns} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip
                formatter={(v: number) => [`${v >= 0 ? "+" : ""}${v.toFixed(2)} %`, "Rendite"]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="returnPct" radius={[6, 6, 0, 0]}>
                {derived.monthlyReturns.map((m, i) => (
                  <Cell key={i} fill={m.returnPct >= 0 ? "var(--bull)" : "var(--bear)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

/* -------------------- Portfolio Overview -------------------- */

function PortfolioOverview({
  derived,
  onSelect,
}: {
  derived: DerivedTrackRecord;
  onSelect: (p: DerivedPosition) => void;
}) {
  const m = derived.metrics;
  const open = derived.positions.filter((p) => p.status === "open");
  // Allocation = current value of each open position / total open value
  const openValue = open.reduce((s, p) => s + PORTFOLIO_SLOT_NOTIONAL + p.returnAbs, 0);
  const allocation = open
    .map((p) => {
      const value = PORTFOLIO_SLOT_NOTIONAL + p.returnAbs;
      return {
        ticker: p.analysis.ticker,
        name: p.analysis.name,
        value,
        pct: openValue > 0 ? (value / openValue) * 100 : 0,
        returnPct: p.returnPct,
        position: p,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Palette of CSS tokens for the donut
  const palette = [
    "var(--primary)",
    "var(--bull)",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#06b6d4",
    "#ec4899",
    "#10b981",
    "#f97316",
    "#a855f7",
  ];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <section>
        <h2 className="text-xl font-bold tracking-tight">Portfolio-Übersicht</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modellportfolio mit gleichgewichteten {fmtMoney(PORTFOLIO_SLOT_NOTIONAL)} € pro Empfehlung.
        </p>
        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard value={`${fmtMoney(m.totalEquity)} €`} label="Portfoliowert" />
          <MetricCard
            value={`${m.totalReturnPct >= 0 ? "+" : ""}${m.totalReturnPct.toFixed(2)} %`}
            label="Gesamt-Rendite"
            tone={m.totalReturnPct >= 0 ? "positive" : "negative"}
          />
          <MetricCard
            value={`${m.totalReturnAbs >= 0 ? "+" : ""}${fmtMoney(m.totalReturnAbs)} €`}
            label="Gesamt-P&L"
            tone={m.totalReturnAbs >= 0 ? "positive" : "negative"}
          />
          <MetricCard
            value={`${m.winRate.toFixed(0)} %`}
            label="Trefferquote"
            tone={m.winRate >= 55 ? "positive" : m.winRate >= 45 ? "neutral" : "negative"}
          />
          <MetricCard value={String(m.numOpen)} label="Offene Positionen" />
          <MetricCard value={String(m.numClosed)} label="Geschlossene" />
          <MetricCard
            value={`${m.avgGainPct >= 0 ? "+" : ""}${m.avgGainPct.toFixed(2)} %`}
            label="Ø Gewinn"
            tone="positive"
          />
          <MetricCard
            value={`${m.avgLossPct.toFixed(2)} %`}
            label="Ø Verlust"
            tone="negative"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Ø Haltedauer: {m.avgHoldingDays.toFixed(0)} Tage · Realisiert{" "}
          <span className={m.realizedPnl >= 0 ? "text-bull" : "text-bear"}>
            {m.realizedPnl >= 0 ? "+" : ""}
            {fmtMoney(m.realizedPnl)} €
          </span>{" "}
          · Unrealisiert{" "}
          <span className={m.unrealizedPnl >= 0 ? "text-bull" : "text-bear"}>
            {m.unrealizedPnl >= 0 ? "+" : ""}
            {fmtMoney(m.unrealizedPnl)} €
          </span>
        </p>
      </section>

      {/* Allocation donut + Holdings table */}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
          <h3 className="text-base font-bold tracking-tight">Allokation</h3>
          <p className="mt-1 text-xs text-muted-foreground">Anteil der offenen Positionen am investierten Kapital.</p>
          <div className="mt-4 h-64">
            {!mounted ? (
              <div className="h-full w-full animate-pulse rounded-lg bg-muted/30" />
            ) : allocation.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offenen Positionen.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="pct"
                    nameKey="ticker"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, _n, e) => [
                      `${v.toFixed(1)} %`,
                      (e?.payload as { ticker?: string })?.ticker ?? "",
                    ]}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          <div className="p-5 sm:p-6 pb-3">
            <h3 className="text-base font-bold tracking-tight">Aktuelle Holdings</h3>
            <p className="mt-1 text-xs text-muted-foreground">Alle offenen Positionen mit P&L.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-background/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Aktie</th>
                  <th className="px-4 py-2 text-right font-medium">Anteile</th>
                  <th className="px-4 py-2 text-right font-medium">Entry</th>
                  <th className="px-4 py-2 text-right font-medium">Aktuell</th>
                  <th className="px-4 py-2 text-right font-medium">P&L</th>
                  <th className="px-4 py-2 text-right font-medium">Allok.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {allocation.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Keine offenen Positionen.</td></tr>
                )}
                {allocation.map((a) => {
                  const p = a.position;
                  const shares = PORTFOLIO_SLOT_NOTIONAL / p.entryPrice;
                  return (
                    <tr
                      key={p.analysis.id}
                      onClick={() => onSelect(p)}
                      className="hover:bg-background/40 transition cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.analysis.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{p.analysis.ticker}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                        {shares.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{p.entryPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{p.currentPrice.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${p.returnPct >= 0 ? "text-bull" : "text-bear"}`}>
                        {p.returnPct >= 0 ? "+" : ""}{p.returnPct.toFixed(2)} %
                        <div className="text-[10px] font-normal opacity-80">
                          {p.returnAbs >= 0 ? "+" : ""}{fmtMoney(p.returnAbs)} €
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{a.pct.toFixed(1)} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

/* -------------------- Evaluation Explainer (unchanged) -------------------- */

function EvaluationExplainer({
  daysOfData,
  totalPicks,
  evaluatedPicks,
}: {
  daysOfData: number;
  totalPicks: number;
  evaluatedPicks: number;
}) {
  const pct = totalPicks ? Math.round((evaluatedPicks / totalPicks) * 100) : 0;
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        So funktioniert die Auswertung
      </div>
      <h2 className="mt-2 text-xl font-bold tracking-tight">Wann werden Empfehlungen bewertet?</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-background/60 p-4">
          <div className="text-xs font-semibold text-muted-foreground">Tag 0</div>
          <div className="mt-1 text-sm font-semibold">Buy-Signal erscheint</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Pick wird mit Datum, Kurs, Kursziel und Begründung öffentlich dokumentiert.
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/60 p-4">
          <div className="text-xs font-semibold text-muted-foreground">+30 / 60 / 90 Tage</div>
          <div className="mt-1 text-sm font-semibold">Finale Bewertung</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Vollständige Rendite-Auswertung gegen Markt-Benchmark. Nach 90 Tagen automatischer Zeit-Exit.
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/60 p-4">
          <div className="text-xs font-semibold text-muted-foreground">Laufend</div>
          <div className="mt-1 text-sm font-semibold">Sell-Signal möglich</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Wechselt die Engine auf VERKAUFEN, schließt die Position vorzeitig.
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground leading-relaxed">
        <p>
          <span className="font-semibold text-foreground">Aktueller Stand:</span>{" "}
          {totalPicks} Empfehlungen insgesamt, davon {evaluatedPicks} bereits ausgewertet ({pct}%).
          Die übrigen befinden sich noch im laufenden 30- bis 90-Tage-Fenster.
        </p>
        <p className="mt-2">
          Historische Picks werden <span className="font-semibold text-foreground">nie</span> nachträglich
          verändert oder entfernt — auch Verluste bleiben sichtbar. Datenbank-Policies erlauben kein
          Editieren durch Anwender (Read-only RLS).
        </p>
        {daysOfData < 30 && (
          <p className="mt-2 text-amber-500 dark:text-amber-400">
            Hinweis: Vollständige Performance-Kennzahlen werden erst freigeschaltet, sobald mindestens
            30 Tage öffentlich dokumentierter Daten vorliegen.
          </p>
        )}
      </div>
    </section>
  );
}

/* -------------------- Benchmark chart (≥90d) — unchanged structure -------------------- */

function avgReturnAtHorizon(analyses: Analysis[], field: "return_7d" | "return_30d" | "return_60d" | "return_90d") {
  const vals = analyses.map((a) => a.outcome?.[field]).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

const PERIODS = [
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1J", label: "1J", days: 365 },
  { key: "Gesamt", label: "Gesamt", days: Infinity },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

function BenchmarkBlock({
  benchmarks,
  analyses,
}: {
  benchmarks: TrackRecordPayload["benchmarks"];
  analyses: Analysis[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const quantmPoints = useMemo(() => {
    const horizons: Array<{ days: number; field: "return_7d" | "return_30d" | "return_60d" | "return_90d" }> = [
      { days: 7, field: "return_7d" },
      { days: 30, field: "return_30d" },
      { days: 60, field: "return_60d" },
      { days: 90, field: "return_90d" },
    ];
    const pts: Array<{ days: number; value: number }> = [{ days: 0, value: 0 }];
    for (const h of horizons) {
      const v = avgReturnAtHorizon(analyses, h.field);
      if (v != null) pts.push({ days: h.days, value: v });
    }
    return pts;
  }, [analyses]);

  const sp = benchmarks["S&P 500"];
  const dax = benchmarks["DAX"];

  const maxQuantmDays = quantmPoints[quantmPoints.length - 1]?.days ?? 0;
  const maxBenchDays = Math.max(
    sp?.return90d != null ? 90 : 0,
    sp?.return1y != null ? 365 : 0,
    dax?.return90d != null ? 90 : 0,
    dax?.return1y != null ? 365 : 0,
  );
  const maxAvailableDays = Math.max(maxQuantmDays, maxBenchDays);
  const availablePeriods = PERIODS.filter((p) => p.days === Infinity || p.days <= maxAvailableDays + 30);
  const [period, setPeriod] = useState<PeriodKey>(availablePeriods[0]?.key ?? "Gesamt");
  const currentPeriod = PERIODS.find((p) => p.key === period) ?? PERIODS[0];
  const cutoffDays = currentPeriod.days === Infinity ? maxAvailableDays : currentPeriod.days;

  function buildBenchSeries(b?: { return90d: number | null; return1y: number | null }) {
    if (!b) return [] as Array<{ days: number; value: number }>;
    const pts: Array<{ days: number; value: number }> = [{ days: 0, value: 0 }];
    if (b.return90d != null) pts.push({ days: 90, value: b.return90d });
    if (b.return1y != null) pts.push({ days: 365, value: b.return1y });
    return pts;
  }
  const spSeries = buildBenchSeries(sp);
  const daxSeries = buildBenchSeries(dax);

  const allDays = Array.from(new Set([
    ...quantmPoints.map((p) => p.days),
    ...spSeries.map((p) => p.days),
    ...daxSeries.map((p) => p.days),
  ])).filter((d) => d <= cutoffDays).sort((a, b) => a - b);

  const today = Date.now();
  const chartData = allDays.map((d) => {
    const date = new Date(today - (maxAvailableDays - d) * 86_400_000);
    return {
      days: d,
      date: date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
      quantm: quantmPoints.find((p) => p.days === d)?.value,
      sp500: spSeries.find((p) => p.days === d)?.value,
      dax: daxSeries.find((p) => p.days === d)?.value,
    };
  });

  const lastQuantm = [...quantmPoints].filter((p) => p.days <= cutoffDays).pop()?.value ?? null;
  const lastSp = [...spSeries].filter((p) => p.days <= cutoffDays).pop()?.value ?? null;
  const diff = lastQuantm != null && lastSp != null ? lastQuantm - lastSp : null;
  const periodLabel = currentPeriod.days === Infinity ? "seit Beginn" : `in den letzten ${currentPeriod.label}`;
  const summary = diff != null
    ? `Quantm Picks hat den S&P 500 ${periodLabel} um ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} % ${diff >= 0 ? "übertroffen" : "unterschritten"}.`
    : null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">So entwickeln sich unsere Empfehlungen im Marktvergleich</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kumulierte Rendite gegenüber den wichtigsten Indizes.</p>
        </div>
        {availablePeriods.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {availablePeriods.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${period === p.key ? "bg-primary text-primary-foreground" : "border border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-5 h-64 sm:h-72 w-full">
        {!mounted ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-muted/30" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)} %`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value >= 0 ? "+" : ""}${value.toFixed(2)} %`, name === "quantm" ? "Quantm Picks" : name === "sp500" ? "S&P 500" : "DAX"]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
              />
              <Legend formatter={(v: string) => v === "quantm" ? "Quantm Picks" : v === "sp500" ? "S&P 500" : "DAX"} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="quantm" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="sp500" stroke="var(--muted-foreground)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="dax" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {summary && <p className="mt-4 text-sm text-muted-foreground">{summary}</p>}
    </section>
  );
}

/* -------------------- Picks History (rebuilt: position-aware) -------------------- */

const HISTORY_FILTERS = ["Alle", "Offen", "Geschlossen", "Gewinner", "Verlierer"] as const;

function exportCsv(positions: DerivedPosition[]) {
  const header = [
    "Ticker", "Unternehmen", "Status", "BuyDate", "BuyPrice",
    "SellDate", "SellPrice", "CurrentPrice", "ReturnPct", "ReturnAbs", "HoldingDays", "Confidence",
  ];
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = positions.map((p) => [
    p.analysis.ticker, p.analysis.name, p.status,
    new Date(p.entryAt).toISOString().slice(0, 10), p.entryPrice,
    p.exitAt ? new Date(p.exitAt).toISOString().slice(0, 10) : "",
    p.exitPrice ?? "", p.currentPrice, p.returnPct.toFixed(2), p.returnAbs.toFixed(2),
    p.holdingDays, p.analysis.confidence_score,
  ].map(escape).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `quantm-track-record-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function PicksHistory({
  derived,
  onSelect,
}: {
  derived: DerivedTrackRecord;
  onSelect: (p: DerivedPosition) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof HISTORY_FILTERS)[number]>("Alle");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return derived.positions
      .filter((p) => {
        if (term && !p.analysis.name.toLowerCase().includes(term) && !p.analysis.ticker.toLowerCase().includes(term)) return false;
        if (filter === "Offen") return p.status === "open";
        if (filter === "Geschlossen") return p.status === "closed";
        if (filter === "Gewinner") return p.returnPct > 0;
        if (filter === "Verlierer") return p.returnPct < 0;
        return true;
      })
      .slice(0, 300);
  }, [derived.positions, q, filter]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Alle Empfehlungen — Buy & Sell Signale</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Klick auf eine Zeile öffnet das Detail-Profil mit Begründung & Chart.
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nach Unternehmen suchen…"
              className="h-9 w-full sm:w-56 pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => exportCsv(derived.positions)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 text-xs font-medium text-foreground/90 transition hover:border-primary/40"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f ? "bg-primary text-primary-foreground" : "border border-border/60 text-muted-foreground hover:text-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-background/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Unternehmen</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Verlauf</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Buy</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Sell</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Entry</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Aktuell / Exit</th>
              <th className="px-4 py-3 text-right font-medium">Rendite</th>
              <th className="px-4 py-3 text-right font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">Keine Einträge gefunden.</td></tr>
            )}
            {filtered.map((p) => {
              const sparkData = [
                p.entryPrice,
                p.analysis.outcome?.price_after_7d,
                p.analysis.outcome?.price_after_30d,
                p.analysis.outcome?.price_after_60d,
                p.analysis.outcome?.price_after_90d,
                p.exitPrice ?? undefined,
              ].filter((v): v is number => v != null && Number.isFinite(v));
              const ret = p.returnPct;
              const sparkColor = ret == null ? "oklch(0.6 0.01 260)" : ret >= 0 ? "var(--bull)" : "var(--bear)";
              const status = p.status === "open"
                ? { label: "Offen", tone: "text-primary bg-primary/10" }
                : ret >= 0
                  ? { label: "Treffer", tone: "text-bull bg-bull/10" }
                  : { label: "Fehlschuss", tone: "text-bear bg-bear/10" };
              return (
                <tr
                  key={p.analysis.id}
                  onClick={() => onSelect(p)}
                  className="hover:bg-background/40 transition cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{p.analysis.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {p.analysis.ticker} · Konfidenz {p.analysis.confidence_score.toFixed(0)}/100
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {sparkData.length >= 2 ? (
                      <MiniSpark data={sparkData} color={sparkColor} strokeWidth={2} className="h-8 w-20" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground tabular-nums">
                    {new Date(p.entryAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground tabular-nums">
                    {p.exitAt ? new Date(p.exitAt).toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right font-mono tabular-nums">
                    {p.entryPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right font-mono tabular-nums">
                    {(p.exitPrice ?? p.currentPrice).toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${ret >= 0 ? "text-bull" : "text-bear"}`}>
                    {ret >= 0 ? "+" : ""}{ret.toFixed(2)} %
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.tone}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    <ArrowRight className="inline h-3.5 w-3.5" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* -------------------- Audit Log -------------------- */

function AuditLogView({ derived }: { derived: DerivedTrackRecord }) {
  const [limit, setLimit] = useState(100);
  const items = derived.audit.slice(0, limit);
  return (
    <section>
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Audit-Log</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Jede Veröffentlichung und jede Auswertung wird mit Zeitstempel in unserer Datenbank festgehalten.
        Schreib- und Update-Policies sind für Nutzer und Anwendungen deaktiviert — Änderungen sind technisch
        nicht möglich.
      </p>

      <div className="mt-4 rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <ul className="divide-y divide-border/40">
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Noch keine Einträge.</li>
          )}
          {items.map((e) => {
            const icon =
              e.action === "buy" ? "🟢" : e.action === "close" ? "🔴" : "📊";
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span className="text-base mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">{e.description}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                    {new Date(e.ts).toLocaleString("de-DE")} · Quelle: Cron-Scan · Read-only
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {derived.audit.length > limit && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + 100)}
            className="rounded-md border border-border/60 bg-card/40 px-4 py-2 text-xs font-medium text-foreground/90 hover:border-primary/40 transition"
          >
            Weitere laden ({derived.audit.length - limit} verbleiben)
          </button>
        </div>
      )}
    </section>
  );
}

/* -------------------- Advanced statistics (unchanged) -------------------- */

function AdvancedStats({ analyses }: { analyses: Analysis[] }) {
  const returns = analyses
    .map((a) => a.outcome?.return_30d ?? a.outcome?.return_7d)
    .filter((x): x is number => x != null);
  const wins = analyses.filter((a) => a.outcome?.is_correct === true).length;
  const losses = analyses.filter((a) => a.outcome?.is_correct === false).length;
  const winLoss = losses > 0 ? (wins / losses).toFixed(2) : "—";
  const mean = returns.length ? returns.reduce((s, x) => s + x, 0) / returns.length : 0;
  const variance = returns.length
    ? returns.reduce((s, x) => s + (x - mean) ** 2, 0) / returns.length
    : 0;
  const vol = Math.sqrt(variance);
  const sharpe = vol > 0 ? mean / vol : 0;

  const chrono = [...analyses]
    .filter((a) => a.outcome?.return_30d != null || a.outcome?.return_7d != null)
    .sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime());
  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  for (const a of chrono) {
    cum += a.outcome?.return_30d ?? a.outcome?.return_7d ?? 0;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDD) maxDD = dd;
  }

  const rows = [
    { label: "Sharpe Ratio", value: sharpe.toFixed(2), tooltip: "Rendite pro Einheit Risiko. Höher = besser." },
    { label: "Max Drawdown", value: `-${maxDD.toFixed(1)} %`, tooltip: "Größter zwischenzeitlicher Verlust ab einem Hoch." },
    { label: "Volatilität", value: `${vol.toFixed(2)} %`, tooltip: "Schwankungsbreite der Renditen." },
    { label: "Win / Loss Ratio", value: winLoss, tooltip: "Verhältnis Gewinner zu Verlierer." },
    { label: "Stichprobe", value: String(analyses.length), tooltip: "Anzahl ausgewerteter Empfehlungen." },
  ];

  return (
    <AdvancedCollapsible title="Erweiterte Statistiken (für Profis)">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {r.label}
              {r.tooltip && <InfoTooltip text={r.tooltip} />}
            </div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{r.value}</div>
          </div>
        ))}
      </div>
    </AdvancedCollapsible>
  );
}
