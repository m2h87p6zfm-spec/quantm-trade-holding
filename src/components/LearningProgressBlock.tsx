import { useQuery } from "@tanstack/react-query";
import { Brain, CheckCircle2, XCircle, MinusCircle, RotateCcw, Sparkles } from "lucide-react";
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

export function LearningProgressBlock({ symbol, scenarioTag, marketRegime, currentVerdict, currentConfidence }: Props) {
  const fetchContext = useServerFn(getLearningContext);
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

  return (
    <div className="rounded-xl border border-violet-accent/30 bg-gradient-to-br from-violet-accent/10 via-violet-accent/5 to-transparent p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-accent/20 text-violet-accent">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-violet-accent">AI Learning Progress</div>
            <div className="text-[10px] text-muted-foreground">
              Cluster · <span className="font-mono">{scenarioTag}</span> · {regimeLabel(marketRegime)}
            </div>
          </div>
        </div>
        {hasEvents && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase text-amber-300 ring-1 ring-amber-500/40">
            <RotateCcw className="h-3 w-3" /> Self-Correction angewandt
          </span>
        )}
      </div>

      {/* Hit-Rate aus ähnlichen Setups */}
      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-lg border border-border/50 bg-card/40 px-3 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Ähnliche Setups</div>
          <div className="text-lg font-bold tabular-nums">{ctx?.sampleSize ?? 0}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/40 px-3 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Historische Hit-Rate</div>
          <div className="text-lg font-bold tabular-nums">
            {ctx?.hitRate != null ? `${(ctx.hitRate * 100).toFixed(0)}%` : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/40 px-3 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Adjusted Confidence</div>
          <div className="text-lg font-bold tabular-nums">
            {(adjusted * 100).toFixed(0)}%{" "}
            <span className={`text-[11px] font-medium ${adjustedDelta < 0 ? "text-bear" : "text-bull"}`}>
              {adjustedDelta >= 0 ? "+" : ""}{(adjustedDelta * 100).toFixed(0)}pp
            </span>
          </div>
        </div>
      </div>

      {/* Ähnliche frühere Predictions */}
      {(ctx?.similar.length ?? 0) > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Was die AI in vergleichbaren Situationen gesagt hat
          </div>
          <ul className="space-y-1.5">
            {ctx!.similar.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-[11px]">
                {s.correct === true ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-bull shrink-0" />
                ) : s.correct === false ? (
                  <XCircle className="h-3.5 w-3.5 text-bear shrink-0" />
                ) : (
                  <MinusCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="font-mono text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("de-DE")}</span>
                <span className="font-semibold">{s.symbol}</span>
                <span className={s.verdict === "LONG" ? "text-bull" : s.verdict === "SHORT" ? "text-bear" : "text-muted-foreground"}>
                  {s.verdict}
                </span>
                <span className="text-muted-foreground">@{(s.confidence * 100).toFixed(0)}%</span>
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
            <Sparkles className="h-3 w-3" /> Was die AI aus Fehlern gelernt hat
          </div>
          {ctx!.learningEvents.slice(0, 2).map((e) => (
            <div key={e.id} className="text-[11px] space-y-1">
              <div className="text-foreground/90">{e.pattern}</div>
              <div className="grid gap-1 sm:grid-cols-2 text-[10px]">
                <div className="text-muted-foreground">
                  <span className="text-bear font-semibold">Vorher:</span> {e.before}
                </div>
                <div className="text-muted-foreground">
                  <span className="text-bull font-semibold">Jetzt:</span> {e.after}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aktuelle Auswirkung */}
      <div className="border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Aktuelle Anpassung:</span>{" "}
        {noHistory
          ? "Für dieses spezifische Cluster gibt es noch keine validierte Historie. Die AI startet hier kalibriert auf die globale Baseline und sammelt Evidenz."
          : adjustedDelta < -0.02
            ? `Historie für ${currentVerdict} in diesem Cluster war schwach — Confidence wird heruntergewichtet.`
            : adjustedDelta > 0.02
              ? `Cluster hat sich historisch bewährt — Confidence wird leicht angehoben.`
              : "Historie ist konsistent mit aktueller Confidence — keine Anpassung nötig."}
      </div>
    </div>
  );
}
