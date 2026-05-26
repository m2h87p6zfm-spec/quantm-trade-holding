import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  checkIsAdmin,
  getHealingLogs,
  getHealingStats,
} from "@/lib/self-healing.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/self-healing")({
  component: AdminSelfHealingPage,
  head: () => ({
    meta: [{ title: "Self-Healing Dashboard" }, { name: "robots", content: "noindex" }],
  }),
});

function AdminSelfHealingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(checkIsAdmin);
  const fetchLogs = useServerFn(getHealingLogs);
  const fetchStats = useServerFn(getHealingStats);
  const [severity, setSeverity] = useState<string>("");

  const adminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (adminQ.data && !adminQ.data.isAdmin) {
      navigate({ to: "/" });
    }
  }, [user, adminQ.data, navigate]);

  const isAdmin = adminQ.data?.isAdmin === true;

  const logsQ = useQuery({
    queryKey: ["self-healing-logs", severity],
    queryFn: () =>
      fetchLogs({
        data: {
          limit: 200,
          ...(severity ? { severity: severity as any } : {}),
        },
      }),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  const statsQ = useQuery({
    queryKey: ["self-healing-stats"],
    queryFn: () => fetchStats(),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  if (!user || adminQ.isLoading) {
    return <div className="p-8 text-muted-foreground">Lädt…</div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-muted-foreground">Kein Zugriff.</div>;
  }

  const stats = statsQ.data;
  const logs = logsQ.data?.logs ?? [];

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Self-Healing Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Interne Übersicht aller Konsistenzprüfungen und automatischen Heilungs-Aktionen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Checks 24h" value={stats?.total_24h ?? 0} />
        <StatCard label="Auto-Healed 24h" value={stats?.healed_24h ?? 0} />
        <StatCard
          label="Heal-Rate"
          value={
            stats
              ? `${Math.round((stats.heal_rate ?? 0) * 100)}%`
              : "—"
          }
        />
        <StatCard
          label="Eskalationen 7d"
          value={stats?.escalations_7d ?? 0}
          tone={stats && stats.escalations_7d > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Severity:</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Alle</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          Auto-refresh: 30s · {logs.length} Einträge
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Zeit</th>
                <th className="px-3 py-2">Check</th>
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Healed</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-t border-border/50 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{l.check_name}</td>
                  <td className="px-3 py-2 text-xs">{l.category}</td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={l.severity} />
                  </td>
                  <td className="px-3 py-2 text-xs">{l.status}</td>
                  <td className="px-3 py-2 text-xs">{l.auto_healed ? "✓" : "—"}</td>
                  <td className="max-w-md px-3 py-2 text-xs">
                    <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground">
                      {l.error_message ||
                        JSON.stringify(l.details ?? {}).slice(0, 200)}
                    </code>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Keine Einträge.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${
          tone === "warn" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant: Record<string, string> = {
    info: "bg-muted text-muted-foreground",
    warn: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    error: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    critical: "bg-destructive/15 text-destructive",
  };
  return (
    <Badge variant="outline" className={variant[severity] ?? ""}>
      {severity}
    </Badge>
  );
}
