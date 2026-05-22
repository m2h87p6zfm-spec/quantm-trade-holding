import type { Verdict } from "@/lib/analysis";

export function SignalBadge({ verdict, confidence }: { verdict: Verdict; confidence?: number }) {
  const cfg = {
    LONG:    { dot: "bg-bull",    text: "text-bull",             ring: "ring-bull/30",    label: "LONG" },
    SHORT:   { dot: "bg-bear",    text: "text-bear",             ring: "ring-bear/30",    label: "SHORT" },
    NEUTRAL: { dot: "bg-muted-foreground", text: "text-muted-foreground", ring: "ring-border", label: "NEUTRAL" },
  }[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-card/70 px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ${cfg.ring} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span className="font-display">{cfg.label}</span>
      {confidence != null && <span className="num font-normal text-muted-foreground">{confidence.toFixed(0)}%</span>}
    </span>
  );
}
