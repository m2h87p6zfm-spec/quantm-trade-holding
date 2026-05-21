import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, Activity, CheckCircle2, XCircle, MinusCircle, Sparkles, Target, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ScatterChart, Scatter, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { getPerformanceMetrics } from "@/lib/ai-learning.functions";

export const Route = createFileRoute("/ai-learning")({
  component: AiLearningPage,
  head: () => ({
    meta: [
      { title: "AI Learning · Apex Markets" },
      { name: "description", content: "Sieh, wie der statistische Analyst aus Fehlern lernt — Accuracy-Trends, Confidence-Calibration, Self-Corrections und Performance pro Marktregime." },
    ],
  }),
});

function AiLearningPage() {
  const [window, setWindow] = useState<7 | 30 | 90>(30);
  const fetchMetrics = useServerFn(getPerformanceMetrics);
  const { data, isLoading } = useQuery({
    queryKey: ["ai-perf", window],
    queryFn: () => fetchMetrics({ data: { window } }),
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-6 pt-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 animate-fade-up">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-accent/40 bg-violet-accent/10 px-3 py-1 text-[10px] uppercase tracking-widest text-violet-accent">
              <Brain className="h-3 w-3" /> Lernender Analyst
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              AI <span className="text-gradient-primary">Learning Center</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
              Hier kannst du dem statistischen Analysten beim Lernen zusehen. Jede Prognose wird gespeichert, nach Ablauf des Horizonts gegen den realen Kurs geprüft und Muster systematischer Fehler werden in transparente Selbstkorrekturen übersetzt.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/50 p-1">
            {([7, 30, 90] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition ${
                  window === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w} Tage
              </button>
            ))}
          </div>
        </div>

        {isLoading || !data ? (
          <SkeletonBlocks />
        ) : data.total === 0 ? (
          <EmptyState window={window} />
        ) : (
          <>
            {/* KPI-Karten */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
              <KpiCard label="Gesamt-Accuracy" value={`${(data.accuracy * 100).toFixed(1)}%`} sub={`${data.total} Outcomes`} icon={Target} accent="primary" />
              <KpiCard
                label="Improvement-Trend"
                value={`${data.improvement >= 0 ? "+" : ""}${(data.improvement * 100).toFixed(1)}pp`}
                sub={data.improvement >= 0 ? "AI wird besser" : "AI wird schlechter"}
                icon={data.improvement >= 0 ? TrendingUp : TrendingDown}
                accent={data.improvement >= 0 ? "bull" : "bear"}
              />
              <KpiCard
                label="Beste Bedingung"
                value={data.best ? `${(data.best.accuracy * 100).toFixed(0)}%` : "—"}
                sub={data.best ? regimeName(data.best.regime) : ""}
                icon={CheckCircle2}
                accent="bull"
              />
              <KpiCard
                label="Schwächste Bedingung"
                value={data.worst ? `${(data.worst.accuracy * 100).toFixed(0)}%` : "—"}
                sub={data.worst ? regimeName(data.worst.regime) : ""}
                icon={XCircle}
                accent="bear"
              />
            </div>

            {/* Trend Chart */}
            <ChartCard title="Accuracy-Trend" subtitle="Tägliche Hit-Rate, je mehr Punkte desto schlauer die AI" icon={Activity}>
              {data.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.trend} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Accuracy"]}
                    />
                    <ReferenceLine y={0.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <NoData label="Noch keine Outcomes im Zeitraum" />
              )}
            </ChartCard>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Calibration */}
              <ChartCard title="Confidence-Calibration" subtitle="Stimmt das Selbstvertrauen mit der Realität überein?" icon={BarChart3}>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      type="number"
                      dataKey="expected"
                      domain={[0, 1]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                      name="Confidence"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      type="number"
                      dataKey="actual"
                      domain={[0, 1]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                      name="Accuracy"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, name: string) => [`${(v * 100).toFixed(1)}%`, name === "expected" ? "Confidence" : "Accuracy"]}
                    />
                    <Scatter data={data.calibration.filter((c) => c.actual != null)} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="px-4 pb-3 text-[10px] text-muted-foreground">
                  Punkte auf der Diagonalen = perfekt kalibriert. Über der Linie = AI ist zu vorsichtig, darunter = zu selbstsicher.
                </p>
              </ChartCard>

              {/* Regime Performance */}
              <ChartCard title="Performance pro Marktregime" subtitle="Wo ist die AI stark, wo schwach?" icon={Activity}>
                {data.byRegime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.byRegime} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="regime" tick={{ fontSize: 10 }} tickFormatter={regimeName} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Accuracy"]}
                      />
                      <ReferenceLine y={0.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
                      <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                        {data.byRegime.map((r, i) => (
                          <Cell key={i} fill={r.accuracy >= 0.6 ? "hsl(var(--bull))" : r.accuracy >= 0.45 ? "hsl(var(--primary))" : "hsl(var(--bear))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoData label="Noch keine Regime-Auswertung möglich" />
                )}
              </ChartCard>
            </div>

            {/* Recent Predictions Table */}
            <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden animate-fade-up">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Letzte 20 ausgewertete Prognosen</div>
                <div className="text-[10px] text-muted-foreground">Prediction vs Outcome</div>
              </div>
              <div className="divide-y divide-border/40">
                {data.recent.length === 0 ? (
                  <NoData label="Noch keine ausgewerteten Prognosen" />
                ) : (
                  data.recent.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 text-[11px]">
                      <div className="col-span-2 font-mono text-muted-foreground">{new Date(r.date).toLocaleDateString("de-DE")}</div>
                      <div className="col-span-2 font-bold">{r.symbol}</div>
                      <div className={`col-span-2 font-semibold ${r.verdict === "LONG" ? "text-bull" : r.verdict === "SHORT" ? "text-bear" : "text-muted-foreground"}`}>
                        {r.verdict} @ {(r.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="col-span-3 text-muted-foreground truncate">{regimeName(r.regime)}</div>
                      <div className={`col-span-2 tabular-nums text-right ${r.realizedReturn >= 0 ? "text-bull" : "text-bear"}`}>
                        {r.realizedReturn >= 0 ? "+" : ""}{(r.realizedReturn * 100).toFixed(2)}%
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {r.correct ? <CheckCircle2 className="h-4 w-4 text-bull" /> : <XCircle className="h-4 w-4 text-bear" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Learning Events Timeline */}
            <div className="rounded-xl border border-violet-accent/30 bg-violet-accent/5 overflow-hidden animate-fade-up">
              <div className="flex items-center gap-2 border-b border-violet-accent/30 bg-violet-accent/10 px-4 py-3">
                <Sparkles className="h-4 w-4 text-violet-accent" />
                <div className="text-xs font-bold uppercase tracking-wider text-violet-accent">Self-Correction Timeline</div>
                <span className="text-[10px] text-muted-foreground">— Was die AI aus eigenen Fehlern gelernt hat</span>
              </div>
              {data.learningEvents.length === 0 ? (
                <NoData label="Noch keine Self-Corrections — die AI sammelt Evidenz." />
              ) : (
                <div className="divide-y divide-violet-accent/20">
                  {data.learningEvents.map((e) => (
                    <div key={e.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-mono">{new Date(e.createdAt).toLocaleString("de-DE")}</span>
                        <span>
                          {regimeName(e.regime)} · n={e.sampleSize}
                          {e.priorAccuracy != null && ` · Acc ${(e.priorAccuracy * 100).toFixed(0)}%`}
                        </span>
                      </div>
                      <div className="text-xs font-medium">{e.pattern}</div>
                      <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                        <div className="rounded border border-bear/30 bg-bear/5 px-2 py-1.5">
                          <span className="font-bold text-bear">Vorher: </span>
                          <span className="text-muted-foreground">{e.before}</span>
                        </div>
                        <div className="rounded border border-bull/30 bg-bull/5 px-2 py-1.5">
                          <span className="font-bold text-bull">Jetzt: </span>
                          <span className="text-muted-foreground">{e.after}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub: string; icon: typeof Brain; accent: "primary" | "bull" | "bear" }) {
  const color = accent === "bull" ? "text-bull" : accent === "bear" ? "text-bear" : "text-primary";
  const ring = accent === "bull" ? "ring-bull/30" : accent === "bear" ? "ring-bear/30" : "ring-primary/30";
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md bg-card ring-1 ${ring} ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof Brain; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">{title}</div>
            <div className="text-[10px] text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function NoData({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
      <MinusCircle className="h-4 w-4 mr-2" /> {label}
    </div>
  );
}

function SkeletonBlocks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl border border-border/60 bg-card/40 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ window }: { window: number }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-12 text-center animate-fade-up">
      <Brain className="mx-auto h-10 w-10 text-violet-accent mb-4" />
      <h2 className="text-lg font-bold">Lern-Engine läuft warm</h2>
      <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">
        In den letzten {window} Tagen wurden noch keine Prognosen ausgewertet. Sobald du im{" "}
        <span className="text-primary font-semibold">Analyse-Agent</span> Symbole abfragst, beginnt die AI Daten zu sammeln.
        Outcomes werden täglich nach US-Close automatisch geprüft.
      </p>
    </div>
  );
}

function regimeName(r: string): string {
  const map: Record<string, string> = {
    bull: "Bullenmarkt", bear: "Bärenmarkt", chop: "Seitwärts", high_vol: "Hohe Vola", low_vol: "Niedrige Vola",
  };
  return map[r] ?? r;
}
