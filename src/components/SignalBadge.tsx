import type { Verdict } from "@/lib/analysis";

export function SignalBadge({ verdict, confidence }: { verdict: Verdict; confidence?: number }) {
  const cfg = {
    LONG: { bg: "bg-bull/20", text: "text-bull", border: "border-bull/40", label: "LONG" },
    SHORT: { bg: "bg-bear/20", text: "text-bear", border: "border-bear/40", label: "SHORT" },
    NEUTRAL: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "NEUTRAL" },
  }[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cfg.label}{confidence != null && <span className="opacity-70">· {confidence.toFixed(0)}%</span>}
    </span>
  );
}
