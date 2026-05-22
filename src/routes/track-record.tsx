import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { getTrackRecord, type TrackRecordPayload } from "@/lib/track-record.functions";
import { ApexLogo } from "@/components/ApexLogo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Search, TrendingUp, TrendingDown, Trophy, AlertTriangle, ArrowUpDown } from "lucide-react";
import { formatPercent, formatNumber, formatPrice } from "@/lib/format";
import { IndicatorInfoButton } from "@/components/IndicatorInfo";

export const Route = createFileRoute("/track-record")({
  head: () => ({
    meta: [
      { title: "APEX Track Record — Beweisbare Genauigkeit der APEX-Analysen" },
      {
        name: "description",
        content:
          "Vollständig transparenter Track Record: Alle abgeschlossenen APEX-Analysen, ihre Vorhersagen und tatsächlichen Renditen nach 30/60/90 Tagen — live aus der Datenbank berechnet.",
      },
      { property: "og:title", content: "APEX Track Record" },
      { property: "og:description", content: "Echte Trefferquote aller APEX-Analysen — transparent und live." },
    ],
  }),
  component: TrackRecordPage,
});

const PERIODS = [
  { id: "30d", label: "30 Tage", days: 30 },
  { id: "90d", label: "90 Tage", days: 90 },
  { id: "6m", label: "6 Monate", days: 182 },
  { id: "1y", label: "1 Jahr", days: 365 },
  { id: "all", label: "Gesamt", days: 99999 },
] as const;

const VERDICTS = ["Alle", "KAUF", "HALTEN", "VERKAUFEN"] as const;
const SECTORS = ["Alle", "Technologie", "Quantencomputing", "Energie", "Gesundheit", "Finanzen", "Konsum", "Industrie", "Rohstoffe"] as const;
const ASSET_TYPES = ["Alle", "Aktie", "ETF"] as const;
const RESULTS = ["Alle", "Korrekt", "Falsch"] as const;

type Analysis = TrackRecordPayload["analyses"][number];

function verdictColor(v: string) {
  if (v === "KAUF") return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (v === "VERKAUFEN") return "text-red-400 border-red-500/40 bg-red-500/10";
  return "text-amber-300 border-amber-500/40 bg-amber-500/10";
}

function TrackRecordPage() {
  const fetchTr = useServerFn(getTrackRecord);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["track-record"],
    queryFn: () => fetchTr(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="text-sm text-muted-foreground tracking-widest uppercase">APEX lädt Track Record-Daten…</p>
        </div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  return <TrackRecordContent data={data} />;
}

function TrackRecordContent({ data }: { data: TrackRecordPayload }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("all");
  const [verdict, setVerdict] = useState<(typeof VERDICTS)[number]>("Alle");
  const [sector, setSector] = useState<(typeof SECTORS)[number]>("Alle");
  const [assetType, setAssetType] = useState<(typeof ASSET_TYPES)[number]>("Alle");
  const [result, setResult] = useState<(typeof RESULTS)[number]>("Alle");

  const filtered = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - PERIODS.find((p) => p.id === period)!.days * 86400_000;
    return data.analyses.filter((a) => {
      if (new Date(a.analyzed_at).getTime() < cutoff) return false;
      if (verdict !== "Alle" && a.verdict !== verdict) return false;
      if (sector !== "Alle" && a.sector !== sector) return false;
      if (assetType !== "Alle" && a.asset_type !== assetType) return false;
      if (result === "Korrekt" && a.outcome?.is_correct !== true) return false;
      if (result === "Falsch" && a.outcome?.is_correct !== false) return false;
      return true;
    });
  }, [data.analyses, period, verdict, sector, assetType, result]);

  const completed = filtered.filter((a) => a.outcome?.is_correct != null);
  const correct = completed.filter((a) => a.outcome!.is_correct === true).length;
  const accuracy = completed.length ? (correct / completed.length) * 100 : 0;

  const buyAnalyses = completed.filter((a) => a.verdict === "KAUF");
  const avgBuyReturn90 = avg(buyAnalyses.map((a) => a.outcome?.return_90d ?? a.outcome?.return_30d).filter((x): x is number => x != null));

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-foreground">
      <PublicHeader />
      <Hero correct={correct} total={completed.length} accuracy={accuracy} avgBuyReturn={avgBuyReturn90} />
      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-20 space-y-10">
        <FilterBar
          period={period} setPeriod={setPeriod}
          verdict={verdict} setVerdict={setVerdict}
          sector={sector} setSector={setSector}
          assetType={assetType} setAssetType={setAssetType}
          result={result} setResult={setResult}
        />
        <IndicatorAccuracy analyses={completed} />
        <PerformanceChart analyses={completed} />
        <BenchmarkTable buyAnalyses={buyAnalyses} benchmarks={data.benchmarks} />
        <AnalysisTable analyses={filtered} />
        <SectorHeatmap analyses={completed} onPick={(s) => setSector(s as (typeof SECTORS)[number])} />
        <BestWorst analyses={completed} />
        <Methodology />
        <CTA />
      </main>
      <PublicFooter />
    </div>
  );
}

/* -------------------- Header / Footer -------------------- */

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[#0d0d0d]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <ApexLogo className="h-7 w-7" />
          <span className="font-semibold tracking-tight">APEX Markets</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-3 text-sm">
          <Link to="/analyse" className="text-muted-foreground hover:text-foreground transition">Analyse</Link>
          <Link to="/preise" className="text-muted-foreground hover:text-foreground transition">Preise</Link>
          <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-black">
            <Link to="/login">Anmelden</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} APEX Markets. Keine Anlageberatung.
    </footer>
  );
}

/* -------------------- Hero -------------------- */

function Hero({ correct, total, accuracy, avgBuyReturn }: { correct: number; total: number; accuracy: number; avgBuyReturn: number | null }) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/5 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20 relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">Live Track Record</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight max-w-4xl">
          APEX hat <span className="text-cyan-400 tabular-nums">{formatNumber(correct)}</span> von{" "}
          <span className="text-cyan-400 tabular-nums">{formatNumber(total)}</span> Analysen korrekt vorhergesagt.
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <KpiCard label="Gesamtgenauigkeit" value={`${formatNumber(accuracy, 1)} %`} accent="cyan">
            <AccuracyDonut value={accuracy} />
          </KpiCard>
          <KpiCard label="Analysen abgeschlossen" value={formatNumber(total)} accent="emerald">
            <p className="text-xs text-muted-foreground mt-2">Mit mindestens 30 Tagen Bewertungszeitraum</p>
          </KpiCard>
          <KpiCard
            label="Ø Rendite bei KAUF-Signal"
            value={avgBuyReturn != null ? formatPercent(avgBuyReturn, 2) : "—"}
            accent={avgBuyReturn != null && avgBuyReturn >= 0 ? "emerald" : "red"}
          >
            <p className="text-xs text-muted-foreground mt-2">Hypothetische Rendite nach 90 Tagen</p>
          </KpiCard>
        </div>
        <p className="text-xs text-muted-foreground mt-8 max-w-3xl">
          Alle Daten basieren auf abgeschlossenen APEX-Analysen mit einem Bewertungszeitraum von mindestens 30 Tagen. Keine Anlageberatung.
        </p>
      </div>
    </section>
  );
}

function KpiCard({ label, value, accent, children }: { label: string; value: string; accent: "cyan" | "emerald" | "red"; children?: React.ReactNode }) {
  const color = accent === "cyan" ? "text-cyan-400" : accent === "emerald" ? "text-emerald-400" : "text-red-400";
  return (
    <Card className="bg-white/[0.03] border-white/10 p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-4xl md:text-5xl font-bold tabular-nums mt-2 ${color}`}>{value}</p>
      {children}
    </Card>
  );
}

function AccuracyDonut({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20 mt-3 -rotate-90">
      <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
      <circle cx="40" cy="40" r={r} stroke="currentColor" className="text-cyan-400" strokeWidth="8" fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
    </svg>
  );
}

/* -------------------- Filter -------------------- */

function FilterBar(props: {
  period: (typeof PERIODS)[number]["id"]; setPeriod: (v: (typeof PERIODS)[number]["id"]) => void;
  verdict: (typeof VERDICTS)[number]; setVerdict: (v: (typeof VERDICTS)[number]) => void;
  sector: (typeof SECTORS)[number]; setSector: (v: (typeof SECTORS)[number]) => void;
  assetType: (typeof ASSET_TYPES)[number]; setAssetType: (v: (typeof ASSET_TYPES)[number]) => void;
  result: (typeof RESULTS)[number]; setResult: (v: (typeof RESULTS)[number]) => void;
}) {
  return (
    <Card className="bg-white/[0.03] border-white/10 p-4 space-y-3">
      <FilterRow label="Zeitraum">
        {PERIODS.map((p) => <Chip key={p.id} active={props.period === p.id} onClick={() => props.setPeriod(p.id)}>{p.label}</Chip>)}
      </FilterRow>
      <FilterRow label="Urteil">
        {VERDICTS.map((v) => <Chip key={v} active={props.verdict === v} onClick={() => props.setVerdict(v)}>{v}</Chip>)}
      </FilterRow>
      <FilterRow label="Sektor">
        {SECTORS.map((s) => <Chip key={s} active={props.sector === s} onClick={() => props.setSector(s)}>{s}</Chip>)}
      </FilterRow>
      <FilterRow label="Finanzart">
        {ASSET_TYPES.map((a) => <Chip key={a} active={props.assetType === a} onClick={() => props.setAssetType(a)}>{a}</Chip>)}
      </FilterRow>
      <FilterRow label="Ergebnis">
        {RESULTS.map((r) => <Chip key={r} active={props.result === r} onClick={() => props.setResult(r)}>{r}</Chip>)}
      </FilterRow>
    </Card>
  );
}
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 flex-wrap">
      <span className="text-xs uppercase tracking-widest text-muted-foreground w-24 pt-1.5 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs border transition ${
        active ? "bg-cyan-500 text-black border-cyan-400 font-semibold" : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------- Indicator Accuracy -------------------- */

function IndicatorAccuracy({ analyses }: { analyses: Analysis[] }) {
  const stats = useMemo(() => {
    type S = { name: string; hits: number; total: number };
    const m: Record<string, S> = {
      RSI: { name: "RSI", hits: 0, total: 0 },
      MACD: { name: "MACD", hits: 0, total: 0 },
      "Z-Faktor": { name: "Z-Faktor", hits: 0, total: 0 },
      "Bollinger Bänder": { name: "Bollinger Bänder", hits: 0, total: 0 },
      Momentum: { name: "Momentum", hits: 0, total: 0 },
      "SMA-Trend": { name: "SMA-Trend", hits: 0, total: 0 },
    };
    for (const a of analyses) {
      if (a.outcome?.is_correct == null) continue;
      const ind = a.indicators as Record<string, any>;
      const correct = a.outcome.is_correct;
      // RSI signal: <30 bullish, >70 bearish
      if (typeof ind.rsi === "number") {
        const sig = ind.rsi < 30 ? "KAUF" : ind.rsi > 70 ? "VERKAUFEN" : null;
        if (sig) { m.RSI.total++; if (sig === a.verdict && correct) m.RSI.hits++; }
      }
      if (ind.macd && typeof ind.macd.histogram === "number") {
        const sig = ind.macd.histogram > 0 ? "KAUF" : "VERKAUFEN";
        m.MACD.total++; if (sig === a.verdict && correct) m.MACD.hits++;
      }
      if (typeof ind.zScore === "number") {
        const sig = ind.zScore < -1 ? "KAUF" : ind.zScore > 1 ? "VERKAUFEN" : null;
        if (sig) { m["Z-Faktor"].total++; if (sig === a.verdict && correct) m["Z-Faktor"].hits++; }
      }
      if (ind.bollinger && typeof ind.bollinger.width === "number") {
        m["Bollinger Bänder"].total++;
        if (correct) m["Bollinger Bänder"].hits++;
      }
      if (typeof ind.momentum === "number") {
        const sig = ind.momentum > 0.02 ? "KAUF" : ind.momentum < -0.02 ? "VERKAUFEN" : null;
        if (sig) { m.Momentum.total++; if (sig === a.verdict && correct) m.Momentum.hits++; }
      }
      if (typeof ind.sma50 === "number" && typeof ind.sma200 === "number") {
        const sig = ind.sma50 > ind.sma200 ? "KAUF" : "VERKAUFEN";
        m["SMA-Trend"].total++; if (sig === a.verdict && correct) m["SMA-Trend"].hits++;
      }
    }
    return Object.values(m).filter((s) => s.total > 0);
  }, [analyses]);

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Genauigkeit nach Indikator</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Noch keine bewerteten Indikatoren.</p>}
        {stats.map((s) => {
          const pct = (s.hits / s.total) * 100;
          const border = pct >= 65 ? "border-emerald-500/50" : pct >= 50 ? "border-amber-500/50" : "border-red-500/50";
          const color = pct >= 65 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400";
          const infoKeyMap: Record<string, string> = { RSI: "rsi", MACD: "macd", "Z-Faktor": "zScore", "Bollinger Bänder": "bollinger", Momentum: "momentum", "SMA-Trend": "smaTrend" };
          return (
            <Card key={s.name} className={`bg-white/[0.03] p-4 border-2 ${border}`}>
              <div className="flex items-center gap-1.5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.name}</p>
                <IndicatorInfoButton infoKey={infoKeyMap[s.name] ?? "generic"} />
              </div>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{formatNumber(pct, 1)} %</p>
              <Progress value={pct} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-2">{s.total} Analysen</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------- Performance Chart -------------------- */

function PerformanceChart({ analyses }: { analyses: Analysis[] }) {
  const series = useMemo(() => {
    const sorted = [...analyses].sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime());
    const acc: Record<string, { date: string; KAUF: number | null; HALTEN: number | null; VERKAUFEN: number | null }> = {};
    const counters = { KAUF: { h: 0, t: 0 }, HALTEN: { h: 0, t: 0 }, VERKAUFEN: { h: 0, t: 0 } };
    for (const a of sorted) {
      if (a.outcome?.is_correct == null) continue;
      const c = counters[a.verdict];
      c.t++; if (a.outcome.is_correct) c.h++;
      const day = a.analyzed_at.slice(0, 10);
      acc[day] = acc[day] ?? { date: day, KAUF: null, HALTEN: null, VERKAUFEN: null };
      acc[day].KAUF = counters.KAUF.t ? (counters.KAUF.h / counters.KAUF.t) * 100 : null;
      acc[day].HALTEN = counters.HALTEN.t ? (counters.HALTEN.h / counters.HALTEN.t) * 100 : null;
      acc[day].VERKAUFEN = counters.VERKAUFEN.t ? (counters.VERKAUFEN.h / counters.VERKAUFEN.t) * 100 : null;
    }
    return Object.values(acc);
  }, [analyses]);

  const last90 = analyses.filter((a) => a.verdict === "KAUF" && a.outcome?.is_correct != null && new Date(a.analyzed_at).getTime() > Date.now() - 90 * 86400_000);
  const buyHits = last90.filter((a) => a.outcome!.is_correct).length;
  const buyAcc = last90.length ? (buyHits / last90.length) * 100 : null;

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Performance über Zeit</h2>
      <Card className="bg-white/[0.03] border-white/10 p-4">
        <div className="h-80">
          {series.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Noch keine ausreichenden Daten.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="KAUF" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="HALTEN" stroke="#fbbf24" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="VERKAUFEN" stroke="#f87171" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {buyAcc != null && (
          <p className="text-sm text-muted-foreground mt-3">
            APEX KAUF-Signale hatten in den letzten 90 Tagen eine Trefferquote von{" "}
            <span className="text-emerald-400 font-semibold">{formatNumber(buyAcc, 1)} %</span> — das entspricht {buyHits} von {last90.length} Vorhersagen.
          </p>
        )}
      </Card>
    </section>
  );
}

/* -------------------- Benchmark Table -------------------- */

function BenchmarkTable({ buyAnalyses, benchmarks }: { buyAnalyses: Analysis[]; benchmarks: TrackRecordPayload["benchmarks"] }) {
  const apex90 = avg(buyAnalyses.map((a) => a.outcome?.return_90d).filter((x): x is number => x != null));
  const apex1y = avg(
    buyAnalyses
      .filter((a) => Date.now() - new Date(a.analyzed_at).getTime() > 365 * 86400_000)
      .map((a) => a.outcome?.return_90d) // best available proxy
      .filter((x): x is number => x != null),
  );

  const rows = [
    { label: "🏆 APEX KAUF-Signale", r90: apex90, r1y: apex1y, hl: true },
    ...Object.entries(benchmarks).map(([label, b]) => ({ label: `📊 ${label}`, r90: b.return90d, r1y: b.return1y, hl: false })),
  ];

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">APEX vs. Markt</h2>
      <Card className="bg-white/[0.03] border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Strategie</th>
              <th className="text-right px-4 py-3">Rendite 90 Tage</th>
              <th className="text-right px-4 py-3">Rendite 1 Jahr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.label} className={r.hl ? "bg-cyan-500/5" : ""}>
                <td className="px-4 py-3 font-medium">{r.label}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${returnColor(r.r90)}`}>{r.r90 != null ? formatPercent(r.r90, 2) : "—"}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${returnColor(r.r1y)}`}>{r.r1y != null ? formatPercent(r.r1y, 2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground mt-2">
        Renditen basieren auf hypothetischen Investments zum Zeitpunkt des jeweiligen APEX-Signals. Transaktionskosten nicht berücksichtigt.
      </p>
    </section>
  );
}

/* -------------------- Analysis Table -------------------- */

type SortKey = "analyzed_at" | "ticker" | "verdict" | "return_30d" | "confidence_score";

function AnalysisTable({ analyses }: { analyses: Analysis[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("analyzed_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    const list = lc ? analyses.filter((a) => a.name.toLowerCase().includes(lc) || a.ticker.toLowerCase().includes(lc)) : analyses;
    const sorted = [...list].sort((a, b) => {
      const av = sortVal(a, sortKey);
      const bv = sortVal(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [analyses, q, sortKey, sortDir]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Alle Vorhersagen</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Suche Aktie oder Ticker…" className="pl-9 w-64 bg-white/[0.03] border-white/10" />
        </div>
      </div>
      <Card className="bg-white/[0.03] border-white/10 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <Th onClick={() => toggleSort("ticker")}>Asset</Th>
                <Th onClick={() => toggleSort("analyzed_at")}>Datum</Th>
                <Th onClick={() => toggleSort("verdict")}>Urteil</Th>
                <Th className="text-right">Kurs</Th>
                <Th className="text-right">30d / 60d / 90d</Th>
                <Th onClick={() => toggleSort("return_30d")} className="text-right">Rendite</Th>
                <Th className="text-center">Ergebnis</Th>
                <Th onClick={() => toggleSort("confidence_score")} className="text-right">Confidence</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {slice.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Keine Analysen mit diesen Filtern.</td></tr>}
              {slice.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.ticker}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(a.analyzed_at).toLocaleDateString("de-DE")}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={verdictColor(a.verdict)}>{a.verdict}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(a.price_at_analysis)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs">
                    <span className="text-muted-foreground">{fmtOpt(a.outcome?.price_after_30d)} / {fmtOpt(a.outcome?.price_after_60d)} / {fmtOpt(a.outcome?.price_after_90d)}</span>
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${returnColor(a.outcome?.return_30d ?? null)}`}>
                    {a.outcome?.return_30d != null ? formatPercent(a.outcome.return_30d, 2) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.outcome?.is_correct == null ? <span className="text-muted-foreground text-xs">offen</span> : a.outcome.is_correct ? "✅" : "❌"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(a.confidence_score, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="md:hidden divide-y divide-white/5">
          {slice.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">Keine Analysen.</p>}
          {slice.map((a) => (
            <div key={a.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.ticker} · {new Date(a.analyzed_at).toLocaleDateString("de-DE")}</div>
                </div>
                <Badge variant="outline" className={verdictColor(a.verdict)}>{a.verdict}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rendite 30d</span>
                <span className={`tabular-nums font-medium ${returnColor(a.outcome?.return_30d ?? null)}`}>
                  {a.outcome?.return_30d != null ? formatPercent(a.outcome.return_30d, 2) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ergebnis</span>
                <span>{a.outcome?.is_correct == null ? "—" : a.outcome.is_correct ? "✅ Korrekt" : "❌ Falsch"}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted-foreground">Seite {page + 1} von {pageCount}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Zurück</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Weiter</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Th({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left font-semibold ${className ?? ""} ${onClick ? "cursor-pointer select-none" : ""}`} onClick={onClick}>
      <span className="inline-flex items-center gap-1">{children}{onClick && <ArrowUpDown className="h-3 w-3 opacity-50" />}</span>
    </th>
  );
}

/* -------------------- Sector Heatmap -------------------- */

function SectorHeatmap({ analyses, onPick }: { analyses: Analysis[]; onPick: (sector: string) => void }) {
  const stats = useMemo(() => {
    const m: Record<string, { count: number; correct: number }> = {};
    for (const a of analyses) {
      const s = a.sector ?? "Unbekannt";
      m[s] = m[s] ?? { count: 0, correct: 0 };
      m[s].count++;
      if (a.outcome?.is_correct) m[s].correct++;
    }
    return Object.entries(m).map(([sector, v]) => ({ sector, count: v.count, accuracy: (v.correct / v.count) * 100 }));
  }, [analyses]);

  const maxCount = Math.max(1, ...stats.map((s) => s.count));

  const colorFor = (acc: number) => {
    if (acc >= 75) return "bg-emerald-500/80 hover:bg-emerald-500";
    if (acc >= 65) return "bg-emerald-400/60 hover:bg-emerald-400/80";
    if (acc >= 55) return "bg-amber-400/60 hover:bg-amber-400/80";
    if (acc >= 45) return "bg-orange-500/60 hover:bg-orange-500/80";
    return "bg-red-500/70 hover:bg-red-500/90";
  };

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Stärken nach Sektor</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Noch keine Sektor-Daten.</p>}
        {stats.map((s) => {
          const sizeClass = s.count / maxCount > 0.66 ? "h-32" : s.count / maxCount > 0.33 ? "h-24" : "h-20";
          return (
            <button
              key={s.sector}
              onClick={() => onPick(s.sector)}
              className={`${colorFor(s.accuracy)} ${sizeClass} rounded-lg p-3 text-left transition text-white`}
            >
              <p className="text-xs uppercase tracking-widest opacity-80">{s.sector}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{formatNumber(s.accuracy, 0)} %</p>
              <p className="text-xs opacity-80 mt-1">{s.count} Analysen</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------- Best / Worst -------------------- */

function BestWorst({ analyses }: { analyses: Analysis[] }) {
  const scored = analyses
    .filter((a) => a.outcome?.return_30d != null)
    .map((a) => ({ a, score: a.verdict === "VERKAUFEN" ? -(a.outcome!.return_30d as number) : (a.outcome!.return_30d as number) }));
  const best = [...scored].sort((x, y) => y.score - x.score).slice(0, 5);
  const worst = [...scored].sort((x, y) => x.score - y.score).slice(0, 5);

  return (
    <section className="grid md:grid-cols-2 gap-6">
      <Card className="bg-white/[0.03] border-emerald-500/20 p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Trophy className="h-4 w-4 text-emerald-400" /> Beste APEX Vorhersagen</h3>
        <ul className="space-y-3">
          {best.length === 0 && <li className="text-sm text-muted-foreground">Noch keine Daten.</li>}
          {best.map(({ a, score }) => (
            <li key={a.id} className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{a.name} <span className="text-muted-foreground">({a.ticker})</span></div>
                <div className="text-xs text-muted-foreground">{new Date(a.analyzed_at).toLocaleDateString("de-DE")} · {a.verdict}</div>
              </div>
              <span className="text-emerald-400 font-bold tabular-nums">{formatPercent(score, 2)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="bg-white/[0.03] border-red-500/20 p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="h-4 w-4 text-red-400" /> Wo APEX falsch lag</h3>
        <ul className="space-y-3">
          {worst.length === 0 && <li className="text-sm text-muted-foreground">Noch keine Daten.</li>}
          {worst.map(({ a, score }) => (
            <li key={a.id} className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{a.name} <span className="text-muted-foreground">({a.ticker})</span></div>
                <div className="text-xs text-muted-foreground">{new Date(a.analyzed_at).toLocaleDateString("de-DE")} · {a.verdict} — unvorhergesehenes Marktereignis außerhalb des statistischen Modells.</div>
              </div>
              <span className="text-red-400 font-bold tabular-nums">{formatPercent(score, 2)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/* -------------------- Methodology -------------------- */

function Methodology() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Wie bewertet APEX?</h2>
      <Card className="bg-white/[0.03] border-white/10 p-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="indikatoren">
            <AccordionTrigger className="px-4">Welche Indikatoren fließen ein?</AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-muted-foreground">
              APEX kombiniert RSI(14), MACD(12/26/9), Z-Score(20), Bollinger Bänder(20,2), 10-Tage-Momentum, SMA20/50/200-Trendstruktur sowie annualisierte Volatilität, Sharpe Ratio und Beta. Jeder Indikator wird abhängig vom erkannten Markt-Regime (Bull/Bär/Seitwärts/Hochvolatil) unterschiedlich gewichtet.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="confidence">
            <AccordionTrigger className="px-4">Was bedeutet der Confidence Score?</AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-muted-foreground">
              Der Confidence Score (0–100) misst, wie stark sich die Einzelindikatoren in dieselbe Richtung bewegen. Über 70 = sehr klare Datenlage, 40–70 = gemischtes Bild, unter 40 = widersprüchliche Signale.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="korrekt">
            <AccordionTrigger className="px-4">Wann gilt eine Vorhersage als korrekt?</AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-muted-foreground">
              Nach 30 Tagen: KAUF gilt als korrekt bei positiver Rendite, VERKAUFEN bei negativer Rendite, HALTEN wenn die Rendite zwischen −5 % und +5 % liegt.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="update">
            <AccordionTrigger className="px-4">Wie oft werden die Modelle aktualisiert?</AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-muted-foreground">
              Indikatoren werden bei jeder Analyse live berechnet. Die Outcome-Daten (30/60/90 Tage) werden täglich automatisch nachgetragen. Die Gewichtungs-Heuristik wird kontinuierlich anhand der Outcome-Statistik kalibriert.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </section>
  );
}

/* -------------------- CTA -------------------- */

function CTA() {
  return (
    <section className="text-center py-12 border-t border-white/10">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Du siehst was APEX kann.</h2>
      <p className="text-muted-foreground mt-2">Jetzt selbst analysieren.</p>
      <div className="flex justify-center gap-3 mt-6">
        <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-black"><Link to="/login">Kostenlos starten</Link></Button>
        <Button asChild size="lg" variant="outline"><Link to="/analyse">APEX Demo ansehen</Link></Button>
      </div>
    </section>
  );
}

/* -------------------- Utils -------------------- */

function avg(xs: number[]): number | null { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; }
function returnColor(r: number | null) { if (r == null) return "text-muted-foreground"; if (r > 0) return "text-emerald-400"; if (r < 0) return "text-red-400"; return ""; }
function fmtOpt(n: number | null | undefined) { return n != null ? formatPrice(n) : "—"; }
function sortVal(a: Analysis, k: SortKey): string | number | null {
  if (k === "analyzed_at") return new Date(a.analyzed_at).getTime();
  if (k === "ticker") return a.ticker;
  if (k === "verdict") return a.verdict;
  if (k === "return_30d") return a.outcome?.return_30d ?? null;
  if (k === "confidence_score") return a.confidence_score;
  return null;
}
