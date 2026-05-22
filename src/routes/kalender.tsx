import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { upcomingEvents, timeUntil, type EconEvent } from "@/lib/calendar";
import { Calendar, AlertTriangle, Activity, ChevronRight } from "lucide-react";

import { FeatureGate } from "@/lib/featureGate";

export const Route = createFileRoute("/kalender")({
  component: () => (
    <FeatureGate
      feature="calendar"
      title="Economic Calendar ist Pro"
      description="Kuratierte Makro-Events mit Marktwirkung — Zinsentscheidungen, CPI, NFP und mehr."
    >
      <CalendarPage />
    </FeatureGate>
  ),
});

const COUNTRY_FLAG: Record<EconEvent["country"], string> = { US: "🇺🇸", EU: "🇪🇺", DE: "🇩🇪", JP: "🇯🇵", UK: "🇬🇧", CN: "🇨🇳" };
const IMPACT_STYLE: Record<EconEvent["impact"], string> = {
  high: "bg-bear/20 text-bear ring-bear/40",
  medium: "bg-gold/20 text-gold ring-gold/40",
  low: "bg-muted text-muted-foreground ring-border",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CalendarPage() {
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<"all" | EconEvent["impact"]>("all");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const events = useMemo(() => upcomingEvents(now).filter((e) => filter === "all" || e.impact === filter), [now, filter]);
  const next = events[0];
  const highToday = events.filter((e) => e.impact === "high" && new Date(e.date).toDateString() === new Date().toDateString()).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Calendar className="h-3 w-3 text-primary" /> Macro Calendar
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Wirtschafts­<span className="text-gradient-gold">kalender</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Kuratierte Makro-Events mit Marktwirkung. Hochrisiko-Termine bewegen Indizes, Zinsen und Vola.
        </p>

        <div className="mt-4 inline-flex rounded-lg border border-border bg-card p-1">
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${filter === f ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? "Alle" : f === "high" ? "Hoch" : f === "medium" ? "Mittel" : "Niedrig"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Heute (Hoch-Impact)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-bear">{highToday}</div>
        </div>
        <div className="card-glow rounded-xl p-4 md:col-span-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Nächstes Event</div>
          {next ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{next.title}</div>
                <div className="text-[11px] text-muted-foreground">{fmtDate(next.date)} · {COUNTRY_FLAG[next.country]} {next.country}</div>
              </div>
              <span className="font-mono text-sm font-bold text-primary animate-pulse-glow rounded-md bg-primary/10 px-2 py-1">
                {timeUntil(next.date, now).label}
              </span>
            </div>
          ) : <div className="mt-1 text-sm text-muted-foreground">Keine Events.</div>}
        </div>
      </div>

      <div className="space-y-2">
        {events.map((e) => {
          const tu = timeUntil(e.date, now);
          return (
            <div key={e.id} className={`group rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50 animate-fade-up ${tu.live ? "ring-1 ring-bear/50 animate-pulse-glow" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="text-base leading-none">{COUNTRY_FLAG[e.country]}</span>
                    <span className="font-mono">{fmtDate(e.date)}</span>
                    <span>·</span>
                    <span>{e.category}</span>
                    <span className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ring-1 ${IMPACT_STYLE[e.impact]}`}>
                      {e.impact === "high" ? <AlertTriangle className="h-2.5 w-2.5" /> : <Activity className="h-2.5 w-2.5" />}
                      {e.impact}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold leading-snug">{e.title}</h3>
                  {e.detail && <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className={`font-mono text-xs font-bold ${tu.live ? "text-bear" : tu.past ? "text-muted-foreground" : "text-primary"}`}>
                    {tu.label}
                  </span>
                  <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
