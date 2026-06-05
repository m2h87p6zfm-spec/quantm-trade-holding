import { Hourglass } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Props = {
  daysOfData: number;
  threshold?: number;
  title?: string;
  explanation?: string;
};

/**
 * Wird angezeigt, wenn noch nicht genug Tage echter Trade-Daten
 * vorliegen, um aussagekräftige Performance-Zahlen zu zeigen.
 */
export function ThresholdGate({
  daysOfData,
  threshold = 30,
  title,
  explanation,
}: Props) {
  const clamped = Math.max(0, Math.min(daysOfData, threshold));
  const pct = (clamped / threshold) * 100;
  const remaining = Math.max(0, threshold - clamped);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Hourglass className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">
        {title ?? `Tag ${clamped} von ${threshold} — In ${remaining} Tagen schalten wir die vollständige Auswertung frei`}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {explanation ??
          "Märkte brauchen mindestens 30 Tage, um aussagekräftige Muster zu zeigen. Wir zeigen Ihnen nur Zahlen, hinter denen wir stehen können."}
      </p>
      <div className="mx-auto mt-6 max-w-md">
        <Progress value={pct} className="h-2" />
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">{Math.round(pct)} %</p>
      </div>
    </section>
  );
}
