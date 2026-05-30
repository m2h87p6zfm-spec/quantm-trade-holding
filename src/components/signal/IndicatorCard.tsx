type Tag = "bull" | "bear" | "neutral";

export function IndicatorCard({
  name,
  value,
  interpretation,
  tag,
}: {
  name: string;
  value: string;
  interpretation: string;
  tag: Tag;
}) {
  const color =
    tag === "bull"
      ? "text-bull border-bull/40 bg-bull/5"
      : tag === "bear"
      ? "text-bear border-bear/40 bg-bear/5"
      : "text-muted-foreground border-border bg-muted/30";

  const bar =
    tag === "bull"
      ? "bg-bull"
      : tag === "bear"
      ? "bg-bear"
      : "bg-muted-foreground/40";

  return (
    <div className={`rounded-lg border ${color} px-3 py-2.5 flex flex-col gap-1.5 min-w-0`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {name}
        </span>
        <span className={`h-1.5 w-8 rounded-full ${bar}`} aria-hidden />
      </div>
      <div className="num text-base font-semibold tabular-nums text-foreground truncate">
        {value}
      </div>
      <div className="text-[11px] text-foreground/70 truncate" title={interpretation}>
        {interpretation}
      </div>
    </div>
  );
}
