import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ArrowRight, Download } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getTrackRecord, type TrackRecordPayload } from "@/lib/trackrecord.functions";
import { ApexLogo } from "@/components/ApexLogo";
import { MiniSpark } from "@/components/MiniSpark";
import { MetricCard } from "@/components/beginner/MetricCard";
import { TrustPillars } from "@/components/beginner/TrustPillars";
import { ThresholdGate } from "@/components/beginner/ThresholdGate";
import { AdvancedCollapsible } from "@/components/beginner/AdvancedCollapsible";
import { InfoTooltip } from "@/components/beginner/InfoTooltip";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/track-record")({
  head: () => ({
    meta: [
      { title: "Track Record — Echte Ergebnisse, ehrlich dokumentiert" },
      {
        name: "description",
        content:
          "Vollständig transparenter Track Record: Alle Quantm-Empfehlungen mit Datum, Einstieg, Ausstieg und Rendite. Keine Backtests, keine Schönrechnerei.",
      },
      { property: "og:title", content: "Quantm Track Record" },
      { property: "og:description", content: "Alle unsere Empfehlungen — gute wie schlechte." },
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <ApexLogo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">Quantm Trade</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link to="/picks" className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Picks</Link>
            <Link to="/wie-es-funktioniert" className="hidden sm:inline-flex px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Wie es funktioniert</Link>
            <Link to="/login" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Anmelden</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">{children}</main>
      <footer className="border-t border-border/40 py-6 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Quantm Trade — Keine Anlageberatung.
      </footer>
    </div>
  );
}

function Content({ data }: { data: TrackRecordPayload }) {
  // Days of evaluated data = days since earliest analysis that has an outcome.
  const evaluated = data.analyses.filter((a) => a.outcome?.is_correct != null);
  const earliestEvaluated = evaluated
    .map((a) => new Date(a.analyzed_at).getTime())
    .reduce<number | null>((min, t) => (min == null || t < min ? t : min), null);
  const daysOfData = earliestEvaluated
    ? Math.floor((Date.now() - earliestEvaluated) / 86_400_000)
    : 0;

  const showMetrics = daysOfData >= 30;
  const showBenchmarks = daysOfData >= 90;
  const showAdvanced = daysOfData >= 180;

  return (
    <PageShell>
      <PageHero daysOfData={daysOfData} />

      {!showMetrics ? (
        <ThresholdGate daysOfData={daysOfData} threshold={30} />
      ) : (
        <TopMetrics analyses={evaluated} />
      )}

      {showBenchmarks && <BenchmarkBlock benchmarks={data.benchmarks} analyses={evaluated} />}

      <PicksHistory analyses={data.analyses} />

      <TrustPillars />

      {showAdvanced && <AdvancedStats analyses={evaluated} />}
    </PageShell>
  );
}

/* -------------------- Hero -------------------- */

function PageHero({ daysOfData }: { daysOfData: number }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Quantm Track Record</div>
      <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
        Was unsere Empfehlungen wirklich gebracht haben.
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
        Jede Empfehlung wird automatisch nach 7, 30, 60 und 90 Tagen ausgewertet. Wir zeigen alles — auch die Trades, die nicht aufgegangen sind.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Live-Daten · Bisher <span className="font-semibold text-foreground">{daysOfData}</span> Tage öffentlich dokumentiert
      </p>
    </section>
  );
}

/* -------------------- Top Metrics -------------------- */

function TopMetrics({ analyses }: { analyses: Analysis[] }) {
  const total = analyses.length;
  const wins = analyses.filter((a) => a.outcome?.is_correct === true).length;
  const winRate = total ? (wins / total) * 100 : 0;

  const returns = analyses
    .map((a) => a.outcome?.return_30d ?? a.outcome?.return_7d)
    .filter((x): x is number => x != null);
  const avgReturn = returns.length ? returns.reduce((s, x) => s + x, 0) / returns.length : 0;

  const best = analyses
    .filter((a) => (a.outcome?.return_30d ?? a.outcome?.return_7d) != null)
    .sort((a, b) =>
      (b.outcome?.return_30d ?? b.outcome?.return_7d ?? -Infinity) -
      (a.outcome?.return_30d ?? a.outcome?.return_7d ?? -Infinity),
    )[0];
  const bestRet = best ? best.outcome?.return_30d ?? best.outcome?.return_7d ?? 0 : 0;

  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight">So lief es bisher</h2>
      <p className="mt-1 text-sm text-muted-foreground">Die wichtigsten Zahlen auf einen Blick.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          value={`${winRate.toFixed(0)} %`}
          label="Trefferquote"
          explanation={`Von 10 Empfehlungen lagen ${(winRate / 10).toFixed(1)} im Plus.`}
          tooltip="Anteil der Empfehlungen, die nach Auswertung in die richtige Richtung gelaufen sind."
          tone={winRate >= 55 ? "positive" : winRate >= 45 ? "neutral" : "negative"}
        />
        <MetricCard
          value={`${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)} %`}
          label="Ø Rendite pro Empfehlung"
          explanation="Durchschnittlicher Kursgewinn pro abgeschlossener Empfehlung."
          tooltip="Mittelwert aller einzelnen Trade-Renditen im Auswertungszeitraum."
          tone={avgReturn >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          value={best ? `${bestRet >= 0 ? "+" : ""}${bestRet.toFixed(1)} %` : "—"}
          label="Bester Trade"
          explanation={best ? `${best.name} (${best.ticker})` : "Noch keine Daten."}
          tone="positive"
        />
        <MetricCard
          value={String(total)}
          label="Ausgewertete Empfehlungen"
          explanation="So viele Empfehlungen haben wir bisher öffentlich nachgeprüft."
        />
      </div>
    </section>
  );
}

/* -------------------- Benchmark chart (≥90d) -------------------- */

const PERIODS = [
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1J", label: "1J", days: 365 },
  { key: "Gesamt", label: "Gesamt", days: Infinity },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

function avgReturnAtHorizon(analyses: Analysis[], field: "return_7d" | "return_30d" | "return_60d" | "return_90d") {
  const vals = analyses.map((a) => a.outcome?.[field]).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

function BenchmarkBlock({
  benchmarks,
  analyses,
}: {
  benchmarks: TrackRecordPayload["benchmarks"];
  analyses: Analysis[];
}) {
  // Build Quantm cumulative returns at known horizons
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

  // Merge into chart rows keyed by days
  const allDays = Array.from(
    new Set([
      ...quantmPoints.map((p) => p.days),
      ...spSeries.map((p) => p.days),
      ...daxSeries.map((p) => p.days),
    ]),
  )
    .filter((d) => d <= cutoffDays)
    .sort((a, b) => a - b);

  const today = Date.now();
  const data = allDays.map((d) => {
    const date = new Date(today - (maxAvailableDays - d) * 86_400_000);
    return {
      days: d,
      date: date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
      quantm: quantmPoints.find((p) => p.days === d)?.value,
      sp500: spSeries.find((p) => p.days === d)?.value,
      dax: daxSeries.find((p) => p.days === d)?.value,
    };
  });

  // Summary sentence
  const lastQuantm = [...quantmPoints].filter((p) => p.days <= cutoffDays).pop()?.value ?? null;
  const lastSp = [...spSeries].filter((p) => p.days <= cutoffDays).pop()?.value ?? null;
  const diff = lastQuantm != null && lastSp != null ? lastQuantm - lastSp : null;
  const periodLabel =
    currentPeriod.key === "3M" ? "3 Monaten"
      : currentPeriod.key === "6M" ? "6 Monaten"
      : currentPeriod.key === "1J" ? "12 Monaten"
      : "Gesamtzeit";
  const summary =
    diff == null
      ? null
      : `In den letzten ${periodLabel} hat Quantm Picks den S&P 500 um ${Math.abs(diff).toFixed(1)} % ${diff >= 0 ? "übertroffen" : "unterschritten"}.`;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">So entwickeln sich unsere Empfehlungen im Marktvergleich</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kumulierte Rendite (%) gegenüber den wichtigsten Indizes.
          </p>
        </div>
        <div className="flex gap-1.5">
          {availablePeriods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                period === p.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklab, var(--border) 40%, transparent)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(0)} %`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)} %`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="quantm" name="Quantm Picks" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="sp500" name="S&P 500" stroke="oklch(0.65 0.01 260)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="dax" name="DAX" stroke="oklch(0.65 0.13 240)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {summary && (
        <p className="mt-4 text-center text-sm text-foreground/80">{summary}</p>
      )}
    </section>
  );
}

/* -------------------- Picks history -------------------- */

const HISTORY_FILTERS = ["Alle", "Gewinner", "Verlierer", "Offen"] as const;

function buildSparkData(a: Analysis): number[] {
  const points = [
    a.price_at_analysis,
    a.outcome?.price_after_7d,
    a.outcome?.price_after_30d,
    a.outcome?.price_after_60d,
    a.outcome?.price_after_90d,
  ];
  return points.filter((v): v is number => v != null && Number.isFinite(v));
}

function exportCsv(analyses: Analysis[]) {
  const header = ["Ticker", "Unternehmen", "Datum", "Einstiegskurs", "Ausstiegskurs", "Rendite_7d", "Rendite_30d", "Status"];
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = analyses.map((a) => {
    const exitPrice = a.outcome?.price_after_30d ?? a.outcome?.price_after_7d ?? null;
    const status = a.outcome?.is_correct == null ? "Läuft" : a.outcome.is_correct ? "Treffer" : "Fehlschuss";
    return [
      a.ticker,
      a.name,
      new Date(a.analyzed_at).toISOString().slice(0, 10),
      a.price_at_analysis,
      exitPrice,
      a.outcome?.return_7d ?? null,
      a.outcome?.return_30d ?? null,
      status,
    ].map(escape).join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `quantm-track-record-${new Date().toISOString().slice(0, 10)}.csv`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function PicksHistory({ analyses }: { analyses: Analysis[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof HISTORY_FILTERS)[number]>("Alle");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return analyses
      .filter((a) => {
        if (term && !a.name.toLowerCase().includes(term) && !a.ticker.toLowerCase().includes(term)) return false;
        const ret = a.outcome?.return_30d ?? a.outcome?.return_7d;
        if (filter === "Gewinner") return a.outcome?.is_correct === true && ret != null && ret > 0;
        if (filter === "Verlierer") return a.outcome?.is_correct === false || (ret != null && ret < 0);
        if (filter === "Offen") return a.outcome?.is_correct == null;
        return true;
      })
      .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())
      .slice(0, 200);
  }, [analyses, q, filter]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Alle Empfehlungen im Überblick</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sortiert nach Datum, neueste zuerst.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nach Unternehmen suchen…"
              className="h-9 w-56 pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => exportCsv(analyses)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 text-xs font-medium text-foreground/90 transition hover:border-primary/40"
          >
            <Download className="h-3.5 w-3.5" />
            Exportieren
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Unternehmen</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Verlauf</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Datum</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Einstieg</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Ausstieg</th>
              <th className="px-4 py-3 text-right font-medium">Rendite</th>
              <th className="px-4 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Keine Einträge gefunden.
                </td>
              </tr>
            )}
            {filtered.map((a) => {
              const ret = a.outcome?.return_30d ?? a.outcome?.return_7d;
              const entry = a.price_at_analysis;
              const exitPrice = a.outcome?.price_after_30d ?? a.outcome?.price_after_7d;
              const status =
                a.outcome?.is_correct == null
                  ? { label: "Läuft", tone: "text-muted-foreground bg-muted/40" }
                  : a.outcome.is_correct
                    ? { label: "Treffer", tone: "text-bull bg-bull/10" }
                    : { label: "Fehlschuss", tone: "text-bear bg-bear/10" };
              const sparkData = buildSparkData(a);
              const sparkColor =
                ret == null
                  ? "oklch(0.6 0.01 260)"
                  : ret >= 0
                    ? "var(--bull)"
                    : "var(--bear)";
              return (
                <tr key={a.id} className="hover:bg-background/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{a.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{a.ticker}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {sparkData.length >= 2 ? (
                      <MiniSpark data={sparkData} color={sparkColor} strokeWidth={2} className="h-8 w-20" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground tabular-nums">
                    {new Date(a.analyzed_at).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right font-mono tabular-nums">
                    {entry ? entry.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right font-mono tabular-nums text-muted-foreground">
                    {exitPrice != null ? exitPrice.toFixed(2) : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                      ret == null ? "text-muted-foreground" : ret >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {ret == null ? "—" : `${ret >= 0 ? "+" : ""}${ret.toFixed(2)} %`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.tone}`}>
                      {status.label}
                    </span>
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


/* -------------------- Advanced statistics (≥180d) -------------------- */

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

  // Max drawdown over chronological cumulative return
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
    { label: "Sharpe Ratio", value: sharpe.toFixed(2), tooltip: "Gibt an, wie viel Rendite wir pro Einheit Risiko erzielen. Höher ist besser." },
    { label: "Max Drawdown", value: `-${maxDD.toFixed(1)} %`, tooltip: "Der größte zwischenzeitliche Verlust ab einem vorherigen Hoch — wie tief wir maximal im Minus waren." },
    { label: "Volatilität", value: `${vol.toFixed(2)} %`, tooltip: "Wie stark die Renditen schwanken. Niedriger = ruhiger Verlauf." },
    { label: "Win / Loss Ratio", value: winLoss, tooltip: "Verhältnis Gewinner zu Verlierer. >1 bedeutet mehr Treffer als Fehler." },
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
