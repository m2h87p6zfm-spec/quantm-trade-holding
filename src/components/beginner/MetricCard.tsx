import { InfoTooltip } from "./InfoTooltip";

type Props = {
  value: string;
  label: string;
  explanation: string;
  tooltip?: string;
  tone?: "neutral" | "positive" | "negative";
  sublabel?: string;
};

/**
 * Beginner-freundliche Kennzahl:
 *   1) Große Zahl
 *   2) Kurzes Label in einfachem Deutsch
 *   3) Ein-Satz-Erklärung darunter
 *   4) Optionales ℹ mit Tooltip
 */
export function MetricCard({ value, label, explanation, tooltip, tone = "neutral", sublabel }: Props) {
  const toneClass =
    tone === "positive" ? "text-bull" : tone === "negative" ? "text-bear" : "text-foreground";

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition hover:border-border">
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl md:text-4xl font-bold tabular-nums tracking-tight ${toneClass}`}>
          {value}
        </span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-sm font-semibold text-foreground/90">{label}</span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{explanation}</p>
    </div>
  );
}
