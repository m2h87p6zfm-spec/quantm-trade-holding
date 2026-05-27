import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  scope_key: string;
  universe: string;
  sector: string;
  region: string;
  total_scanned: number;
  succeeded: number;
  failed: number;
  picks_count: number;
  preserved: boolean;
  scanned_at: string;
};

export function ScanHistoryPanel({ scopeKey }: { scopeKey?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("scan_history")
      .select("*")
      .order("scanned_at", { ascending: false })
      .limit(20);
    if (scopeKey) q = q.eq("scope_key", scopeKey);
    const { data } = await q;
    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scopeKey]);

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <History className="h-4 w-4" />
          Scan-Historie {scopeKey ? "(aktueller Filter)" : "(alle)"}
        </button>
        {open && (
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-3 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              {loading ? "Lade…" : "Noch keine Scans protokolliert."}
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left py-1.5 pr-2">Zeit</th>
                  <th className="text-left py-1.5 pr-2">Scope</th>
                  <th className="text-right py-1.5 pr-2" title="Insgesamt geprüfte Werte im Universum">Geprüft</th>
                  <th className="text-right py-1.5 pr-2" title="Werte mit gültigen Marktdaten">Mit Daten</th>
                  <th className="text-right py-1.5 pr-2" title="Werte ohne abrufbare Marktdaten (z. B. Quelle gedrosselt)">Ohne Daten</th>
                  <th className="text-right py-1.5 pr-2" title="Davon BUY-Signale">Picks</th>
                  <th className="text-right py-1.5">Preserved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {new Date(r.scanned_at).toLocaleString("de-DE", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-[10px]">{r.scope_key}</td>
                    <td className="text-right py-1.5 pr-2">{r.total_scanned}</td>
                    <td className="text-right py-1.5 pr-2 text-emerald-500">{r.succeeded}</td>
                    <td className="text-right py-1.5 pr-2 text-red-500">{r.failed}</td>
                    <td className="text-right py-1.5 pr-2 font-semibold">{r.picks_count}</td>
                    <td className="text-right py-1.5">
                      {r.preserved ? (
                        <span className="rounded bg-amber-500/15 text-amber-600 px-1.5 py-0.5">true</span>
                      ) : (
                        <span className="rounded bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5">false</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Card>
  );
}
