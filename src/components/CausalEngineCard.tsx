import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { runCausalAnalysis } from "@/lib/causal-engine.functions";

type Props = { ticker: string; companyName: string };

type EventType =
  | "government_contract" | "earnings_beat" | "earnings_miss" | "insider_buy" | "insider_sell"
  | "government_investment" | "partnership_announcement" | "product_launch"
  | "regulatory_approval" | "regulatory_rejection" | "analyst_upgrade" | "analyst_downgrade"
  | "macro_interest_rate_change" | "macro_geopolitical"
  | "sentiment_spike_positive" | "sentiment_spike_negative";

const LABEL_DE: Record<EventType, string> = {
  government_contract: "Regierungsauftrag",
  earnings_beat: "Gewinn übertrifft Erwartungen",
  earnings_miss: "Gewinn enttäuscht",
  insider_buy: "Insider kaufen",
  insider_sell: "Insider verkaufen",
  government_investment: "Staatliche Investition",
  partnership_announcement: "Partnerschaft",
  product_launch: "Produkteinführung",
  regulatory_approval: "Behördliche Zulassung",
  regulatory_rejection: "Behördliche Ablehnung",
  analyst_upgrade: "Analysten-Upgrade",
  analyst_downgrade: "Analysten-Downgrade",
  macro_interest_rate_change: "Zinsänderung",
  macro_geopolitical: "Geopolitik",
  sentiment_spike_positive: "Positiver Sentiment-Schub",
  sentiment_spike_negative: "Negativer Sentiment-Einbruch",
};

const DOT_COLOR: Record<EventType, string> = {
  government_contract: "bg-emerald-500",
  government_investment: "bg-emerald-400",
  earnings_beat: "bg-green-500",
  earnings_miss: "bg-red-500",
  insider_buy: "bg-lime-500",
  insider_sell: "bg-rose-500",
  partnership_announcement: "bg-cyan-500",
  product_launch: "bg-blue-500",
  regulatory_approval: "bg-emerald-600",
  regulatory_rejection: "bg-red-600",
  analyst_upgrade: "bg-green-400",
  analyst_downgrade: "bg-orange-500",
  macro_interest_rate_change: "bg-purple-500",
  macro_geopolitical: "bg-amber-600",
  sentiment_spike_positive: "bg-teal-400",
  sentiment_spike_negative: "bg-pink-500",
};

function verdictStyle(v: string): { bg: string; text: string; label: string } {
  switch (v) {
    case "STARK_KAUSAL":
      return { bg: "bg-green-700", text: "text-white", label: "STARK KAUSAL" };
    case "MODERAT_KAUSAL":
      return { bg: "bg-yellow-400", text: "text-black", label: "MODERAT KAUSAL" };
    case "SCHWACH_KAUSAL":
      return { bg: "bg-orange-500", text: "text-white", label: "SCHWACH KAUSAL" };
    default:
      return { bg: "bg-zinc-500", text: "text-white", label: "KEINE DATEN" };
  }
}

function barColor(score: number): string {
  if (score <= 40) return "bg-red-500";
  if (score <= 65) return "bg-yellow-400";
  return "bg-green-500";
}

function fmtPct(v: number): string {
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} um ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return iso;
  }
}

export function CausalEngineCard({ ticker, companyName }: Props) {
  const run = useServerFn(runCausalAnalysis);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["causal-analysis", ticker.toUpperCase()],
    queryFn: () => run({ data: { ticker, companyName } }),
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });

  const verdict = data?.verdict ?? "KEINE_DATEN";
  const vStyle = verdictStyle(verdict);
  const significantPatterns = useMemo(
    () => (data?.patterns ?? []).filter((p) => p.total_occurrences >= 3),
    [data?.patterns],
  );

  return (
    <Card className="w-full overflow-hidden p-4 sm:p-5 bg-card border-border">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-5 w-5 text-cyan-accent flex-shrink-0" />
          <span className="font-semibold text-sm sm:text-base truncate">QUANTM Causal Engine</span>
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground text-right flex-shrink-0">
          {data?.analyzedAt ? (
            <>Analysiert am {fmtDateTime(data.analyzedAt)}</>
          ) : isLoading ? (
            <>Wird analysiert…</>
          ) : null}
        </div>
      </div>
      <div className="w-full h-px bg-border mt-3 mb-4" />

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Kausale Muster werden berechnet…</span>
        </div>
      )}

      {isError && (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Causal Engine konnte momentan keine Daten laden. Bitte später erneut versuchen.
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* Verdict Badge */}
          <div className="flex flex-col items-center gap-2">
            <div className={`inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm sm:text-base font-bold tracking-wide ${vStyle.bg} ${vStyle.text}`}>
              {vStyle.label}
            </div>
            {verdict === "KEINE_DATEN" && (
              <p className="text-xs text-muted-foreground text-center max-w-md px-2">
                Noch nicht genug historische Daten für diese Aktie.
              </p>
            )}
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Causal Score</div>
              <div className="text-2xl sm:text-3xl font-bold mt-1">{Math.round(data.causalScore)}</div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                <div className={`h-full ${barColor(data.causalScore)}`} style={{ width: `${data.causalScore}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Repeatability Score</div>
              <div className="text-2xl sm:text-3xl font-bold mt-1">{Math.round(data.repeatabilityScore)}</div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                <div className={`h-full ${barColor(data.repeatabilityScore)}`} style={{ width: `${data.repeatabilityScore}%` }} />
              </div>
            </div>
          </div>

          {/* Erkannte Ereignisse */}
          <div className="min-w-0">
            <h4 className="text-sm font-semibold mb-2">Aktuell erkannte Ereignisse (letzte 30 Tage)</h4>
            {data.events.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine relevanten Ereignisse in den letzten 30 Tagen erkannt.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.events.map((ev) => {
                  const dot = DOT_COLOR[ev.event_type as EventType] ?? "bg-zinc-400";
                  return (
                    <li key={ev.id} className="text-xs sm:text-sm min-w-0">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`${dot} h-2 w-2 rounded-full mt-1.5 flex-shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <span className="text-muted-foreground">{fmtDate(ev.event_date)}</span>
                          <span className="mx-1">—</span>
                          <span className="break-words">{ev.event_description}</span>
                          {ev.pattern && ev.pattern.total_occurrences >= 3 && (
                            <div className="italic text-muted-foreground text-[11px] sm:text-xs mt-0.5">
                              Historisch: {fmtPct(ev.pattern.avg_return_30d)} nach 30 Tagen in {ev.pattern.positive_outcomes_30d} von {ev.pattern.total_occurrences} Fällen
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Historische Muster */}
          {significantPatterns.length > 0 && (
            <div className="min-w-0">
              <h4 className="text-sm font-semibold mb-2">Was die Geschichte sagt</h4>
              <ul className="space-y-1.5">
                {significantPatterns.map((p) => (
                  <li key={p.event_type} className="text-xs sm:text-sm break-words">
                    <span className="font-medium">{LABEL_DE[p.event_type as EventType] ?? p.event_type}:</span>{" "}
                    <span className="text-muted-foreground">
                      durchschnittlich {fmtPct(p.avg_return_30d)} nach 30 Tagen — {p.positive_outcomes_30d} von {p.total_occurrences} Mal positiv
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 leading-relaxed pt-2 border-t border-border">
            QUANTM Causal Engine basiert auf historischen Mustern und ist keine Garantie für zukünftige Entwicklungen. Keine Anlageberatung.
          </p>
        </div>
      )}
    </Card>
  );
}
