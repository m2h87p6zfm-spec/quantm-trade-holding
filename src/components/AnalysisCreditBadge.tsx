import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getAnalysisCreditStatus } from "@/lib/credits.functions";
import { creditLabel } from "@/lib/credits";

export function AnalysisCreditBadge() {
  const { user } = useAuth();
  const getStatus = useServerFn(getAnalysisCreditStatus);
  const { data } = useQuery({
    queryKey: ["analysis-credits", user?.id ?? "anon"],
    queryFn: async () => {
      // Ensure a fresh session/token exists before calling the protected fn,
      // otherwise the server middleware throws "Unauthorized" during auth hydration.
      const { data: s } = await supabase.auth.getSession();
      if (!s.session?.access_token) return null;
      try {
        return await getStatus();
      } catch {
        return null;
      }
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
  });

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      >
        <Coins className="h-3 w-3" />
        Einloggen für Credits
      </Link>
    );
  }
  if (!data) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
        <Coins className="h-3 w-3" />
        Credits laden…
      </span>
    );
  }

  const exhausted = data.remaining <= 0;
  const low = !exhausted && data.remaining <= Math.max(1, Math.floor(data.limit * 0.2));
  const tone = exhausted
    ? "border-bear/40 bg-bear/10 text-bear"
    : low
      ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";

  return (
    <Link
      to="/preise"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:opacity-90 ${tone}`}
      title={`${creditLabel(data.tier)}-Plan · ${data.used} von ${data.limit} Analysen diesen Monat genutzt`}
    >
      <Coins className="h-3 w-3" />
      {data.remaining} / {data.limit} Credits
      <span className="text-[10px] opacity-70">· {creditLabel(data.tier)}</span>
    </Link>
  );
}
