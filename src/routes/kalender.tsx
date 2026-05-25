import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { upcomingEvents, timeUntil, type EconEvent } from "@/lib/calendar";
import { Calendar, AlertTriangle, Activity, ChevronRight, X } from "lucide-react";

import { FeatureGate } from "@/lib/featureGate";
import { useLang, useT } from "@/lib/i18n";

export const Route = createFileRoute("/kalender")({
  component: CalendarRoute,
});

function CalendarRoute() {
  const t = useT();
  return (
    <FeatureGate
      feature="calendar"
      title={t("gate.calendar.title")}
      description={t("gate.calendar.description")}
    >
      <CalendarPage />
    </FeatureGate>
  );
}

const COUNTRY_FLAG: Record<EconEvent["country"], string> = { US: "🇺🇸", EU: "🇪🇺", DE: "🇩🇪", JP: "🇯🇵", UK: "🇬🇧", CN: "🇨🇳" };
const IMPACT_STYLE: Record<EconEvent["impact"], string> = {
  high: "bg-bear/20 text-bear ring-bear/40",
  medium: "bg-gold/20 text-gold ring-gold/40",
  low: "bg-muted text-muted-foreground ring-border",
};

function fmtDate(iso: string, lang: "de" | "en") {
  const d = new Date(iso);
  return d.toLocaleString(lang === "en" ? "en-US" : "de-DE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CalendarPage() {
  const t = useT();
  const lang = useLang();
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<"all" | EconEvent["impact"]>("all");
  const [openEvent, setOpenEvent] = useState<EconEvent | null>(null);

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
          <Calendar className="h-3 w-3 text-primary" /> {t("calendar.badge")}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          {t("page.calendar.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("page.calendar.subtitle")}
        </p>

        <div className="mt-4 inline-flex rounded-lg border border-border bg-card p-1">
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${filter === f ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? t("calendar.filter.all") : f === "high" ? t("calendar.filter.high") : f === "medium" ? t("calendar.filter.medium") : t("calendar.filter.low")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("calendar.todayHigh")}</div>
          <div className="mt-1 font-mono text-2xl font-bold text-bear">{highToday}</div>
        </div>
        <div className="card-glow rounded-xl p-4 md:col-span-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("calendar.nextEvent")}</div>
          {next ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{next.title}</div>
                <div className="text-[11px] text-muted-foreground">{fmtDate(next.date, lang)} · {COUNTRY_FLAG[next.country]} {next.country}</div>
              </div>
              <span className="font-mono text-sm font-bold text-primary animate-pulse-glow rounded-md bg-primary/10 px-2 py-1">
                {timeUntil(next.date, now).label}
              </span>
            </div>
          ) : <div className="mt-1 text-sm text-muted-foreground">{t("calendar.noEvents")}</div>}
        </div>
      </div>

      <div className="space-y-2">
        {events.map((e) => {
          const tu = timeUntil(e.date, now);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setOpenEvent(e)}
              className={`group block w-full rounded-xl border border-border bg-card/60 p-4 text-left backdrop-blur transition hover:border-primary/50 animate-fade-up ${tu.live ? "ring-1 ring-bear/50 animate-pulse-glow" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="text-base leading-none">{COUNTRY_FLAG[e.country]}</span>
                    <span className="font-mono">{fmtDate(e.date, lang)}</span>
                    <span>·</span>
                    <span>{e.category}</span>
                    <span className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ring-1 ${IMPACT_STYLE[e.impact]}`}>
                      {e.impact === "high" ? <AlertTriangle className="h-2.5 w-2.5" /> : <Activity className="h-2.5 w-2.5" />}
                      {e.impact}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold leading-snug group-hover:text-primary">{e.title}</h3>
                  {e.detail && <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className={`font-mono text-xs font-bold ${tu.live ? "text-bear" : tu.past ? "text-muted-foreground" : "text-primary"}`}>
                    {tu.label}
                  </span>
                  <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {openEvent && <EventDetailModal event={openEvent} now={now} onClose={() => setOpenEvent(null)} />}
    </div>
  );
}

const CATEGORY_INFO: Record<EconEvent["category"], string> = {
  Inflation: "Inflationsdaten beeinflussen Zinserwartungen — höher als erwartet ist meist bearish für Bonds und Tech, bullish für USD.",
  Zinsen: "Zinsentscheidungen bewegen FX, Bonds und Aktien stark. Achte besonders auf Forward Guidance.",
  Arbeit: "Arbeitsmarktdaten signalisieren Wirtschaftsstärke. Starke Daten = hawkische Fed = USD-stark, Bonds schwach.",
  Wachstum: "Wachstumsindikatoren (BIP, PMI, ifo) zeigen die Konjunkturlage und beeinflussen zyklische Sektoren.",
  Earnings: "Quartalszahlen können Einzelaktien zweistellig bewegen — Guidance ist oft wichtiger als die reinen Zahlen.",
  Notenbank: "Notenbank-Kommunikation (FOMC, EZB) setzt den Ton für globale Risikobereitschaft.",
};

function EventDetailModal({ event, now, onClose }: { event: EconEvent; now: number; onClose: () => void }) {
  const tu = timeUntil(event.date, now);
  const d = new Date(event.date);
  const longDate = d.toLocaleString("de-DE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mt-12 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="text-base leading-none">{COUNTRY_FLAG[event.country]}</span>
          <span className="font-medium text-foreground/80">{event.country}</span>
          <span>·</span>
          <span>{event.category}</span>
          <span className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ring-1 ${IMPACT_STYLE[event.impact]}`}>
            {event.impact === "high" ? <AlertTriangle className="h-2.5 w-2.5" /> : <Activity className="h-2.5 w-2.5" />}
            {event.impact} Impact
          </span>
        </div>

        <h2 className="mt-3 text-xl font-bold leading-tight">{event.title}</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Termin</div>
            <div className="mt-1 text-sm font-semibold">{longDate}</div>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</div>
            <div className={`mt-1 font-mono text-sm font-bold ${tu.live ? "text-bear" : tu.past ? "text-muted-foreground" : "text-primary"}`}>
              {tu.label}
            </div>
          </div>
        </div>

        {event.detail && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Hintergrund</div>
            <p className="text-sm leading-relaxed text-foreground/90">{event.detail}</p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-primary">Marktwirkung · {event.category}</div>
          <p className="text-sm leading-relaxed text-foreground/85">{CATEGORY_INFO[event.category]}</p>
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground/70">
          Kuratierte Makro-Events. Reale Veröffentlichungen können Indizes, Zinsen und Volatilität signifikant bewegen.
        </p>
      </div>
    </div>
  );
}
