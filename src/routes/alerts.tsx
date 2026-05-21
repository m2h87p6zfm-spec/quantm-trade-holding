import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAlerts, evaluate, type AlertRule } from "@/lib/alerts";
import { useQuote, useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { PRODUCTS } from "@/lib/products";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
  head: () => ({
    meta: [
      { title: "Smart Alerts — Apex Markets" },
      { name: "description", content: "Schwellen-Alerts für Preis und Setup-Score mit Push-Benachrichtigungen." },
    ],
  }),
});

function AlertRow({ a, onRemove, onTrigger }: { a: AlertRule; onRemove: (id: string) => void; onTrigger: (id: string) => void }) {
  const isPrice = a.kind.startsWith("price");
  const q = useQuote(a.symbol, 30_000);
  const analysis = useAnalysis(a.symbol);
  const { settings } = useSettings();
  const price = q.data?.c;
  const score = analysis.indicators ? scoreIndicators(analysis.indicators, settings.risk).score : undefined;
  const value = isPrice ? price : score;

  useEffect(() => {
    if (a.triggeredAt) return;
    if (evaluate(a, { price, score })) {
      onTrigger(a.id);
      toast(`Alert: ${a.symbol}`, {
        description: `${label(a.kind)} ${a.threshold} — aktuell ${value?.toFixed(2)}`,
        icon: "🔔",
      });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`Apex Alert: ${a.symbol}`, { body: `${label(a.kind)} ${a.threshold}` });
      }
    }
  }, [price, score, a, onTrigger, value]);

  const triggered = !!a.triggeredAt;
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="px-3 py-3 font-medium">{a.symbol}</td>
      <td className="px-3 py-3">{label(a.kind)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{a.threshold}</td>
      <td className="px-3 py-3 text-right tabular-nums">{value != null ? value.toFixed(2) : "…"}</td>
      <td className="px-3 py-3">
        {triggered ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            <BellRing className="h-3 w-3" /> Ausgelöst
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <Bell className="h-3 w-3" /> Aktiv
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <button onClick={() => onRemove(a.id)} className="text-muted-foreground hover:text-rose-400" aria-label="Löschen">
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function label(k: AlertRule["kind"]): string {
  switch (k) {
    case "price_above": return "Preis ≥";
    case "price_below": return "Preis ≤";
    case "score_above": return "Score ≥";
    case "score_below": return "Score ≤";
  }
}

function AlertsPage() {
  const { alerts, add, remove, markTriggered } = useAlerts();
  const [symbol, setSymbol] = useState("AAPL");
  const [kind, setKind] = useState<AlertRule["kind"]>("price_above");
  const [threshold, setThreshold] = useState(200);

  const active = useMemo(() => alerts.filter((a) => !a.triggeredAt), [alerts]);
  const history = useMemo(() => alerts.filter((a) => a.triggeredAt).sort((a, b) => (b.triggeredAt! - a.triggeredAt!)), [alerts]);

  async function requestPush() {
    if (typeof Notification === "undefined") return toast.error("Browser unterstützt keine Benachrichtigungen.");
    const p = await Notification.requestPermission();
    if (p === "granted") toast.success("Push-Benachrichtigungen aktiviert.");
    else toast.error("Push abgelehnt — Toasts bleiben aktiv.");
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol || !Number.isFinite(threshold)) return;
    add({ symbol: symbol.toUpperCase(), kind, threshold });
    toast.success(`Alert für ${symbol.toUpperCase()} erstellt.`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Smart Alerts</h1>
            <p className="text-sm text-muted-foreground">Werde sofort informiert, wenn Preis- oder Score-Schwellen erreicht werden.</p>
          </div>
        </div>
        <button onClick={requestPush} className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
          Push aktivieren
        </button>
      </div>

      <form onSubmit={onAdd} className="rounded-lg border border-border bg-card p-4 grid gap-3 md:grid-cols-[1fr,1fr,140px,auto]">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Symbol</label>
          <input list="apex-symbols-alerts" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <datalist id="apex-symbols-alerts">{PRODUCTS.map((p) => <option key={p.symbol} value={p.symbol}>{p.name}</option>)}</datalist>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Bedingung</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as AlertRule["kind"])} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="price_above">Preis steigt auf ≥</option>
            <option value="price_below">Preis fällt auf ≤</option>
            <option value="score_above">Setup-Score ≥</option>
            <option value="score_below">Setup-Score ≤</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Schwelle</label>
          <input type="number" step="any" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums" />
        </div>
        <button type="submit" className="self-end inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Anlegen
        </button>
      </form>

      <Section title={`Aktive Alerts (${active.length})`}>
        <Table rows={active} onRemove={remove} onTrigger={markTriggered} empty="Keine aktiven Alerts." />
      </Section>

      {history.length > 0 && (
        <Section title="Verlauf (ausgelöst)">
          <Table rows={history} onRemove={remove} onTrigger={markTriggered} empty="" />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Table({ rows, onRemove, onTrigger, empty }: { rows: AlertRule[]; onRemove: (id: string) => void; onTrigger: (id: string) => void; empty: string }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Symbol</th>
            <th className="px-3 py-2 text-left">Bedingung</th>
            <th className="px-3 py-2 text-right">Schwelle</th>
            <th className="px-3 py-2 text-right">Aktuell</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{empty}</td></tr>
          ) : rows.map((a) => <AlertRow key={a.id} a={a} onRemove={onRemove} onTrigger={onTrigger} />)}
        </tbody>
      </table>
    </div>
  );
}
