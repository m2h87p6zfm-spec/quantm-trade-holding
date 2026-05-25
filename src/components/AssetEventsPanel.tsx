import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Sparkles, AlertTriangle, TrendingUp, Building2, Globe2 } from "lucide-react";
import { nextEarningsFor, topMacroEvents, timeUntil, type EconEvent } from "@/lib/calendar";
import { useLang } from "@/lib/i18n";

function fmtDate(iso: string, lang: "de" | "en"): string {
  const d = new Date(iso);
  const locale = lang === "en" ? "en-US" : "de-DE";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) + (lang === "en" ? "" : " Uhr");
}

const IMPACT_TONE: Record<EconEvent["impact"], string> = {
  high: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-border bg-muted/40 text-muted-foreground",
};

const COUNTRY_FLAG: Record<EconEvent["country"], string> = {
  US: "🇺🇸", EU: "🇪🇺", DE: "🇩🇪", JP: "🇯🇵", UK: "🇬🇧", CN: "🇨🇳",
};

export function AssetEventsPanel({ symbol }: { symbol: string }) {
  const lang = useLang();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const earnings = useMemo(() => nextEarningsFor(symbol, now), [symbol, now]);
  const macros = useMemo(() => topMacroEvents(5, now), [now]);

  const daysToEarnings = earnings
    ? Math.max(0, Math.ceil((new Date(earnings.date).getTime() - now) / 86_400_000))
    : null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border/60 p-5">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{lang === "en" ? "Earnings & event calendar" : "Earnings & Event-Kalender"}</div>
          <div className="text-xs text-muted-foreground">
            {lang === "en" ? `Upcoming events that can move ${symbol} and the market` : `Nächste Termine, die ${symbol} und den Markt bewegen können`}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        {/* Earnings Card */}
        <div className="rounded-lg border border-border/70 bg-background/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {lang === "en" ? "Next earnings" : "Nächste Earnings"} — {symbol}
          </div>

          {earnings ? (
            <div className="space-y-3">
              <div>
                <div className="text-base font-semibold text-foreground">{earnings.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{fmtDate(earnings.date, lang)}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${IMPACT_TONE[earnings.impact]}`}>
                  <AlertTriangle className="h-3 w-3" />
                  {earnings.impact === "high" ? (lang === "en" ? "High move" : "Hohe Bewegung") : earnings.impact === "medium" ? (lang === "en" ? "Medium" : "Mittel") : (lang === "en" ? "Low" : "Niedrig")}
                </span>
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {timeUntil(earnings.date, now).label}
                </span>
              </div>

              {earnings.detail && (
                <div className="flex gap-2 rounded-md bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
                  <span><span className="font-medium text-foreground/80">{lang === "en" ? "What to watch:" : "Worauf zu achten:"}</span> {earnings.detail}</span>
                </div>
              )}

              {daysToEarnings !== null && daysToEarnings <= 14 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">
                  {lang === "en" ? `⚠ Earnings in ${daysToEarnings} days — higher implied volatility likely.` : `⚠ Earnings in ${daysToEarnings} Tagen — erhöhte implizite Volatilität wahrscheinlich.`}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {lang === "en" ? `No confirmed earnings date for ${symbol} in the near future.` : `Kein bestätigter Earnings-Termin für ${symbol} in der nahen Zukunft.`}
              <div className="mt-1 text-[11px] opacity-70">
                {lang === "en" ? "(The date is usually published 4–6 weeks before quarter-end.)" : "(Termin wird i.d.R. 4–6 Wochen vor dem Quartalsende veröffentlicht.)"}
              </div>
            </div>
          )}
        </div>

        {/* Macro Events */}
        <div className="rounded-lg border border-border/70 bg-background/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" />
            {lang === "en" ? "Important macro events" : "Wichtige Makro-Termine"}
          </div>

          {macros.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {lang === "en" ? "No highly relevant events right now." : "Aktuell keine hochrelevanten Termine."}
            </div>
          ) : (
            <ul className="space-y-2">
              {macros.map((e) => {
                const tu = timeUntil(e.date, now);
                return (
                  <li key={e.id} className="flex items-start gap-3 rounded-md border border-border/50 bg-card/40 p-2.5">
                    <span className="text-base leading-none">{COUNTRY_FLAG[e.country]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{e.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{fmtDate(e.date, lang)}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tu.live ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border bg-card text-muted-foreground"}`}>
                      {tu.live ? <span className="inline-flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />live</span> : tu.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 text-[10px] text-muted-foreground/70">
            {lang === "en" ? `Macro events can indirectly move ${symbol} — especially Fed decisions and inflation data.` : `Makro-Events können ${symbol} indirekt bewegen — besonders Fed-Entscheidungen und Inflationszahlen.`}
          </div>
        </div>
      </div>
    </div>
  );
}
