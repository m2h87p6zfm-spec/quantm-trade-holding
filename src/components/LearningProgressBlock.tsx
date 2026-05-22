import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, CheckCircle2, XCircle, MinusCircle, RotateCcw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getLearningContext } from "@/lib/ai-learning.functions";
import type { MarketRegime } from "@/lib/ai-learning";
import { regimeLabel } from "@/lib/ai-learning";

interface Props {
  symbol: string;
  scenarioTag: string;
  marketRegime: MarketRegime;
  currentVerdict: "LONG" | "SHORT" | "NEUTRAL";
  currentConfidence: number;
}

// Macht aus "rsi_oversold_macd_bull_div" → "RSI überverkauft · MACD bullish Div"
function humanizeTag(tag: string): string {
  return tag
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" · ");
}

function verdictLabel(v: "LONG" | "SHORT" | "NEUTRAL"): string {
  return v === "LONG" ? "Kaufen" : v === "SHORT" ? "Verkaufen" : "Abwarten";
}

export function LearningProgressBlock({ symbol, scenarioTag, marketRegime, currentVerdict, currentConfidence }: Props) {
  const fetchContext = useServerFn(getLearningContext);
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-learning-context", symbol, scenarioTag, marketRegime],
    queryFn: () => fetchContext({ data: { symbol, scenarioTag, marketRegime } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-violet-accent/30 bg-violet-accent/5 p-4 animate-pulse">
        <div className="h-4 w-40 rounded bg-violet-accent/20" />
      </div>
    );
  }

  const ctx = data;
  const adjusted = ctx?.hitRate != null
    ? Math.max(0, Math.min(1, currentConfidence * (0.5 + ctx.hitRate * 0.7)))
    : currentConfidence;
  const adjustedDelta = adjusted - currentConfidence;
  const hasEvents = (ctx?.learningEvents.length ?? 0) > 0;
  const noHistory = ctx == null || ctx.sampleSize === 0;

  // Kurze, anfängerfreundliche Zusammenfassung
  const summary = noHistory
    ? `Für diese Situation hat die KI noch keine vergleichbaren Fälle gesehen. Sie startet vorsichtig und sammelt Erfahrung.`
    : adjustedDelta < -0.02
      ? `In ähnlichen Situationen lag die KI öfter daneben — sie ist deshalb vorsichtiger als sonst.`
      : adjustedDelta > 0.02
        ? `Ähnliche Situationen sind in der Vergangenheit gut aufgegangen — die KI ist etwas zuversichtlicher.`
        : `Vergangene Fälle passen zur jetzigen Einschätzung — keine besondere Anpassung nötig.`;

  return (
    <div className="rounded-xl border border-violet-accent/30 bg-gradient-to-br from-violet-accent/10 via-violet-accent/5 to-transparent p-4 space-y-3">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-accent/20 text-violet-accent">
            <Brain className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-violet-accent">Was die KI gelernt hat</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {regimeLabel(marketRegime)} · Empfehlung: <span className="font-semibold text-foreground">{verdictLabel(currentVerdict)}</span>
            </div>
          </div>
        </div>
        {hasEvents && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300 ring-1 ring-amber-500/40">
            <RotateCcw className="h-3 w-3" /> nachjustiert
          </span>
        )}
      </div>

      {/* Drei Kennzahlen — anfängerfreundlich beschriftet */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-border/50 bg-card/40 px-2.5 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Ähnliche Fälle</div>
          <div className="text-base font-bold tabular-nums">{ctx?.sampleSize ?? 0}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/40 px-2.5 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Trefferquote</div>
          <div className="text-base font-bold tabular-nums">
            {ctx?.hitRate != null ? `${(ctx.hitRate * 100).toFixed(0)}%` : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/40 px-2.5 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Vertrauen jetzt</div>
          <div className="text-base font-bold tabular-nums">
            {(adjusted * 100).toFixed(0)}%
            {Math.abs(adjustedDelta) >= 0.005 && (
              <span className={`ml-1 text-[10px] font-medium ${adjustedDelta < 0 ? "text-bear" : "text-bull"}`}>
                {adjustedDelta >= 0 ? "+" : ""}{(adjustedDelta * 100).toFixed(0)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kurze Klartext-Erklärung */}
      <p className="text-[12px] leading-relaxed text-muted-foreground">{summary}</p>

      {/* Mehr-anzeigen-Toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-accent hover:underline"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" /> Weniger anzeigen
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" /> Mehr Details anzeigen
          </>
        )}
      </button>

      {/* Details — nur bei Bedarf */}
      {expanded && (
        <div className="space-y-3 border-t border-border/40 pt-3">
          {/* Cluster-Beschreibung in lesbar */}
          <div className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Erkanntes Muster: </span>
            <span className="break-words">{humanizeTag(scenarioTag)}</span>
          </div>

          {/* Ähnliche frühere Predictions */}
          {(ctx?.similar.length ?? 0) > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Was die KI in ähnlichen Situationen gesagt hat
              </div>
              <ul className="space-y-1">
                {ctx!.similar.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {s.correct === true ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-bull shrink-0" />
                    ) : s.correct === false ? (
                      <XCircle className="h-3.5 w-3.5 text-bear shrink-0" />
                    ) : (
                      <MinusCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("de-DE")}</span>
                    <span className="font-semibold">{s.symbol}</span>
                    <span className={s.verdict === "LONG" ? "text-bull" : s.verdict === "SHORT" ? "text-bear" : "text-muted-foreground"}>
                      {verdictLabel(s.verdict)}
                    </span>
                    {s.realizedReturn != null && (
                      <span className={`ml-auto tabular-nums ${s.realizedReturn >= 0 ? "text-bull" : "text-bear"}`}>
                        {s.realizedReturn >= 0 ? "+" : ""}{(s.realizedReturn * 100).toFixed(2)}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Learning Events */}
          {hasEvents && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                <Sparkles className="h-3 w-3" /> Was die KI aus Fehlern gelernt hat
              </div>
              {ctx!.learningEvents.slice(0, 2).map((e) => (
                <div key={e.id} className="text-[11px] space-y-1">
                  <div className="text-foreground/90">{e.pattern}</div>
                  <div className="grid gap-1 sm:grid-cols-2 text-[10px]">
                    <div className="text-muted-foreground">
                      <span className="text-bear font-semibold">Früher: </span>{e.before}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="text-bull font-semibold">Heute: </span>{e.after}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
