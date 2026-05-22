import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Plus, Trash2, Zap, Activity, History, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAlerts, evaluate, type AlertRule } from "@/lib/alerts";
import { useQuote, useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { PRODUCTS } from "@/lib/products";
import { useAlertsLimit } from "@/lib/featureGate";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
  head: () => ({
    meta: [
      { title: "Smart Alerts — Apex Trades" },
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
  const isAbove = a.kind.endsWith("above");
  const distance = value != null ? ((value - a.threshold) / a.threshold) * 100 : null;
  const near = distance != null && Math.abs(distance) < 2;

  return (
    <tr className="group border-b border-border/40 transition-colors hover:bg-muted/20">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5 text-[11px] font-bold text-primary ring-1 ring-primary/20">
            {a.symbol.slice(0, 2)}
          </div>
          <span className="font-semibold tracking-tight">{a.symbol}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground/80">
          {isPrice ? <Activity className="h-3.5 w-3.5 text-cyan-accent" /> : <Sparkles className="h-3.5 w-3.5 text-violet-accent" />}
          {label(a.kind)}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right tabular-nums font-medium">{a.threshold}</td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex flex-col items-end">
          <span className="tabular-nums font-medium">{value != null ? value.toFixed(2) : "…"}</span>
          {distance != null && !triggered && (
            <span className={`text-[10px] tabular-nums ${near ? "text-gold" : "text-muted-foreground"}`}>
              {distance > 0 ? "+" : ""}{distance.toFixed(1)}%
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        {triggered ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
            <BellRing className="h-3 w-3" /> Ausgelöst
          </span>
        ) : near ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold ring-1 ring-gold/30">
            <Zap className="h-3 w-3" /> Nah dran
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border/60">
            <span className={`h-1.5 w-1.5 rounded-full ${isAbove ? "bg-bull" : "bg-bear"} animate-pulse`} /> Aktiv
          </span>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        <button
          onClick={() => onRemove(a.id)}
          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
          aria-label="Löschen"
        >
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
  const { alerts, remove, markTriggered } = useAlerts();
  const { guardedAdd, tier, max, count, atLimit } = useAlertsLimit();
  const [symbol, setSymbol] = useState("AAPL");
  const [kind, setKind] = useState<AlertRule["kind"]>("price_above");
  const [threshold, setThreshold] = useState(200);

  const active = useMemo(() => alerts.filter((a) => !a.triggeredAt), [alerts]);
  const history = useMemo(() => alerts.filter((a) => a.triggeredAt).sort((a, b) => (b.triggeredAt! - a.triggeredAt!)), [alerts]);
  const triggeredCount = history.length;

  async function requestPush() {
    if (typeof Notification === "undefined") return toast.error("Browser unterstützt keine Benachrichtigungen.");
    const p = await Notification.requestPermission();
    if (p === "granted") toast.success("Push-Benachrichtigungen aktiviert.");
    else toast.error("Push abgelehnt — Toasts bleiben aktiv.");
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol || !Number.isFinite(threshold)) return;
    if (atLimit) {
      toast.error(`Alert-Limit erreicht (${max})`, { description: "Upgrade auf Pro für unlimitierte Smart Alerts." });
      return;
    }
    guardedAdd({ symbol: symbol.toUpperCase(), kind, threshold });
    toast.success(`Alert für ${symbol.toUpperCase()} erstellt.`);
  }

  const tierLabel = tier === "free" ? "Free" : tier === "pro" ? "Pro" : "Elite";
  const tierTint = tier === "elite" ? "text-gold ring-gold/30 bg-gold/10" : tier === "pro" ? "text-primary ring-primary/30 bg-primary/10" : "text-muted-foreground ring-border bg-muted/40";

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-card/40 p-6 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 0% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 0%, color-mix(in oklab, var(--gold) 12%, transparent), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Smart Alerts</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${tierTint}`}>
                  {tierLabel}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Werde in Echtzeit informiert, wenn Preis- oder Setup-Score-Schwellen erreicht werden — direkt im Browser per Push.
              </p>
            </div>
          </div>
          <button
            onClick={requestPush}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_20px_-4px_color-mix(in_oklab,var(--primary)_50%,transparent)] md:self-auto"
          >
            <BellRing className="h-4 w-4" />
            Push aktivieren
          </button>
        </div>

        {/* Stat strip */}
        <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-border/40 pt-5">
          <Stat icon={<Activity className="h-3.5 w-3.5" />} label="Aktiv" value={active.length} tint="text-primary" />
          <Stat icon={<BellRing className="h-3.5 w-3.5" />} label="Ausgelöst" value={triggeredCount} tint="text-emerald-400" />
          <Stat
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Kontingent"
            value={Number.isFinite(max) ? `${count} / ${max}` : `${count} / ∞`}
            tint={atLimit ? "text-bear" : "text-gold"}
          />
        </div>
      </section>

      {atLimit && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-gold/40 bg-gradient-to-r from-gold/15 to-gold/5 px-5 py-4 text-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 text-gold">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Du hast dein Alert-Limit ({max}) erreicht. Upgrade für <strong>unlimitierte</strong> Smart Alerts.</span>
          </div>
          <Link to="/preise" className="inline-flex items-center gap-1 rounded-md bg-gold px-3.5 py-1.5 text-xs font-bold text-background hover:bg-gold/90">
            Upgrade <Sparkles className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Create form */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Neuen Alert erstellen</h2>
        </div>
        <form onSubmit={onAdd} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
          <Field label="Symbol">
            <input
              list="apex-symbols-alerts"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm font-medium tracking-tight transition-colors focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <datalist id="apex-symbols-alerts">{PRODUCTS.map((p) => <option key={p.symbol} value={p.symbol}>{p.name}</option>)}</datalist>
          </Field>
          <Field label="Bedingung">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AlertRule["kind"])}
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm transition-colors focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="price_above">Preis steigt auf ≥</option>
              <option value="price_below">Preis fällt auf ≤</option>
              <option value="score_above">Setup-Score ≥</option>
              <option value="score_below">Setup-Score ≤</option>
            </select>
          </Field>
          <Field label="Schwelle">
            <input
              type="number"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm tabular-nums transition-colors focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <button
            type="submit"
            className="self-end inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Anlegen
          </button>
        </form>
      </section>

      <Section title="Aktive Alerts" count={active.length} icon={<Activity className="h-3.5 w-3.5" />}>
        <Table rows={active} onRemove={remove} onTrigger={markTriggered} empty="Noch keine aktiven Alerts — leg deinen ersten oben an." />
      </Section>

      {history.length > 0 && (
        <Section title="Verlauf" count={history.length} icon={<History className="h-3.5 w-3.5" />}>
          <Table rows={history} onRemove={remove} onTrigger={markTriggered} empty="" />
        </Section>
      )}
    </div>
  );
}

function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: React.ReactNode; tint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${tint}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title}
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-foreground/70">{count}</span>
      </h2>
      {children}
    </div>
  );
}

function Table({ rows, onRemove, onTrigger, empty }: { rows: AlertRule[]; onRemove: (id: string) => void; onTrigger: (id: string) => void; empty: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Symbol</th>
            <th className="px-4 py-3 text-left font-semibold">Bedingung</th>
            <th className="px-4 py-3 text-right font-semibold">Schwelle</th>
            <th className="px-4 py-3 text-right font-semibold">Aktuell</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Bell className="h-6 w-6 opacity-40" />
                  <span className="text-sm">{empty}</span>
                </div>
              </td>
            </tr>
          ) : rows.map((a) => <AlertRow key={a.id} a={a} onRemove={onRemove} onTrigger={onTrigger} />)}
        </tbody>
      </table>
    </div>
  );
}
