import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Target, Activity, Calendar } from "lucide-react";
import { getTrustStats } from "@/lib/trust-stats.functions";

/**
 * Replaces fabricated marketing numbers ("1.200+ Nutzer") with live,
 * auditable counts from the actual track record. Falls back gracefully
 * if the network is slow or the fetch fails — never renders fake digits.
 */
export function LiveTrustStrip() {
  const fetchStats = useServerFn(getTrustStats);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public", "trust-stats"],
    queryFn: () => fetchStats(),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  if (isError) return null;

  const fmtPct = (n: number | null | undefined) =>
    n == null ? "—" : `${n.toFixed(1).replace(".", ",")} %`;
  const fmtInt = (n: number | null | undefined) =>
    n == null ? "—" : n.toLocaleString("de-DE");

  const items = [
    {
      icon: Activity,
      number: isLoading ? "…" : fmtInt(data?.totalPicks),
      label: "Empfehlungen dokumentiert",
    },
    {
      icon: Target,
      number: isLoading ? "…" : fmtPct(data?.hitRate),
      label: `Trefferquote · ${fmtInt(data?.evaluatedPicks)} ausgewertet`,
    },
    {
      icon: ShieldCheck,
      number: isLoading ? "…" : fmtInt(data?.uniqueTickers),
      label: "verschiedene Aktien analysiert",
    },
    {
      icon: Calendar,
      number: isLoading ? "…" : fmtInt(data?.trackedDays),
      label: "Tage live & öffentlich dokumentiert",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
      {items.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-border/60 bg-card/40 px-4 py-4 backdrop-blur"
        >
          <div className="flex items-center gap-2 text-primary">
            <s.icon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Live</span>
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {s.number}
          </div>
          <div className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
