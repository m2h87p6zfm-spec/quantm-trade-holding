// Zeigt Premium-Nutzern „LIVE" + grünen Pulse, Free-Nutzern „Verzögert · Upgrade".
import { Link } from "@tanstack/react-router";
import type { RealtimeTier } from "@/hooks/useLiveQuotes";

export function RealtimeStatusBadge({
  tier,
  connected,
  compact = false,
}: {
  tier: RealtimeTier;
  connected: boolean;
  compact?: boolean;
}) {
  if (tier === "premium") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ${compact ? "" : "sm:text-xs"}`}
        title={connected ? "Live-Kurse aktiv" : "Verbinde…"}
      >
        <span className="relative flex h-1.5 w-1.5">
          {connected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
        </span>
        LIVE
      </span>
    );
  }
  if (tier === "free") {
    return (
      <Link
        to="/preise"
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary ${compact ? "" : "sm:text-xs"}`}
        title="Echtzeit-Kurse nur für Pro/Elite — jetzt upgraden"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
        Verzögert · Upgrade
      </Link>
    );
  }
  return null;
}
