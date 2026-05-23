import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Plus, Trash2, Zap, Activity, History, Lock, Sparkles, TrendingUp, TrendingDown, Target, Radio } from "lucide-react";
import { toast } from "sonner";
import { useAlerts, evaluate, type AlertRule } from "@/lib/alerts";
import { useQuote, useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { PRODUCTS } from "@/lib/products";
import { useAlertsLimit } from "@/lib/featureGate";
import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
  head: () => ({
    meta: [
      { title: "Smart Alerts — Apex Trades" },
      { name: "description", content: "Schwellen-Alerts für Preis und Setup-Score mit Push-Benachrichtigungen." },
    ],
  }),
});

function label(k: AlertRule["kind"]): string {
  switch (k) {
    case "price_above": return "Preis ≥";
    case "price_below": return "Preis ≤";
    case "score_above": return "Score ≥";
    case "score_below": return "Score ≤";
  }
}

function AlertCard({ a, onRemove, onTrigger }: { a: AlertRule; onRemove: (id: string) => void; onTrigger: (id: string) => void }) {
  const isPrice = a.kind.startsWith("price");
  const isAbove = a.kind.endsWith("above");
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
  const distance = value != null ? ((value - a.threshold) / a.threshold) * 100 : null;
  const near = distance != null && Math.abs(distance) < 2 && !triggered;

  // Progress toward threshold: 0..100 (capped)
  const progress = (() => {
    if (value == null) return 0;
    if (triggered) return 100;
    const d = Math.abs(distance ?? 100);
    return Math.max(4, Math.min(100, 100 - d * 5));
  })();

  const accent = triggered
    ? "from-emerald-500/30 via-emerald-500/10 to-transparent"
    : near
    ? "from-gold/30 via-gold/10 to-transparent"
    : isAbove
    ? "from-primary/25 via-primary/5 to-transparent"
    : "from-violet-accent/25 via-violet-accent/5 to-transparent";

  const ringColor = triggered
    ? "ring-emerald-500/40"
    : near
    ? "ring-gold/40"
    : "ring-border/60 hover:ring-primary/40";

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-4 ring-1 backdrop-blur transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--primary)_30%,transparent)] ${ringColor}`}>
      {/* glow */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
      {/* corner pulse */}
      {!triggered && (
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl"
          style={{ background: near ? "var(--gold)" : isAbove ? "var(--primary)" : "color-mix(in oklab, var(--violet-accent, var(--primary)) 80%, transparent)" }}
        />
      )}

      <div className="relative flex items-start gap-3">
        {/* Symbol badge */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold tracking-tight text-primary ring-1 ring-primary/30">
          {a.symbol.slice(0, 4)}
          {!triggered && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${near ? "bg-gold/70" : isAbove ? "bg-emerald-400/70" : "bg-rose-400/70"}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-card ${near ? "bg-gold" : isAbove ? "bg-emerald-400" : "bg-rose-400"}`} />
            </span>
          )}
        </div>

        {/* Center: title + condition */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">{a.symbol}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
                {isPrice ? <Activity className="h-2.5 w-2.5 text-cyan-accent" /> : <Sparkles className="h-2.5 w-2.5 text-violet-accent" />}
                {isPrice ? "Preis" : "Score"}
              </span>
            </div>
            <button
              onClick={() => onRemove(a.id)}
              className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
              aria-label="Löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {isAbove ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
            <span>
              {isAbove ? "über" : "unter"} <span className="font-semibold tabular-nums text-foreground">{a.threshold}</span>
            </span>
            {distance != null && (
              <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${triggered ? "bg-emerald-500/15 text-emerald-400" : near ? "bg-gold/15 text-gold" : "bg-muted/40 text-muted-foreground"}`}>
                {distance > 0 ? "+" : ""}{distance.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/40">
            <div
              className={`h-full rounded-full transition-all duration-700 ${triggered ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : near ? "bg-gradient-to-r from-gold to-amber-300" : isAbove ? "bg-gradient-to-r from-primary to-cyan-accent" : "bg-gradient-to-r from-violet-accent to-rose-400"}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Bottom: current value + status */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">aktuell</span>
              <span className="text-lg font-bold tabular-nums tracking-tight">{value != null ? value.toFixed(2) : "…"}</span>
            </div>
            {triggered ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                <BellRing className="h-2.5 w-2.5" /> Ausgelöst
              </span>
            ) : near ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold ring-1 ring-gold/30">
                <Target className="h-2.5 w-2.5" /> Nah dran
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
                <Radio className="h-2.5 w-2.5 text-primary" /> Beobachtet
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertsPage() {
  const t = useT();
  const { alerts, remove, markTriggered } = useAlerts();
  const { guardedAdd, tier, max, count, atLimit } = useAlertsLimit();
  const [symbol, setSymbol] = useState("AAPL");
  const [kind, setKind] = useState<AlertRule["kind"]>("price_above");
  const [threshold, setThreshold] = useState(200);

  const active = useMemo(() => alerts.filter((a) => !a.triggeredAt), [alerts]);
  const history = useMemo(() => alerts.filter((a) => a.triggeredAt).sort((a, b) => (b.triggeredAt! - a.triggeredAt!)), [alerts]);
  const triggeredCount = history.length;
  const quotaPct = Number.isFinite(max) ? Math.min(100, (count / Number(max)) * 100) : Math.min(100, count * 5);

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
  const tierTint = tier === "elite" ? "text-gold ring-gold/40 bg-gold/10" : tier === "pro" ? "text-primary ring-primary/40 bg-primary/10" : "text-muted-foreground ring-border bg-muted/40";

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-background p-6 md:p-8">
        {/* Animated mesh background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 0% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 10%, color-mix(in oklab, var(--gold) 16%, transparent), transparent 65%), radial-gradient(ellipse 40% 35% at 60% 100%, color-mix(in oklab, var(--violet-accent, var(--primary)) 14%, transparent), transparent 60%)",
          }}
        />
        {/* Grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/40 shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
              <Bell className="h-7 w-7 text-primary" />
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-gold ring-2 ring-card" />
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
                  {t("page.alerts.title")}
                </h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${tierTint}`}>
                  <Sparkles className="h-2.5 w-2.5" /> {tierLabel}
                </span>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t("page.alerts.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={requestPush}
            className="group/btn relative inline-flex items-center gap-2 self-start overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all hover:border-primary/60 hover:shadow-[0_0_30px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)] md:self-auto"
          >
            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
            <BellRing className="relative h-4 w-4" />
            <span className="relative">Push aktivieren</span>
          </button>
        </div>

        {/* Stat strip */}
        <div className="relative mt-7 grid grid-cols-3 gap-3 border-t border-border/40 pt-5">
          <StatCard icon={<Activity className="h-3.5 w-3.5" />} label="Aktiv" value={active.length} tint="primary" />
          <StatCard icon={<BellRing className="h-3.5 w-3.5" />} label="Ausgelöst" value={triggeredCount} tint="emerald" />
          <StatCard
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Kontingent"
            value={Number.isFinite(max) ? `${count}/${max}` : `${count}/∞`}
            tint={atLimit ? "rose" : "gold"}
            progress={quotaPct}
          />
        </div>
      </section>

      {atLimit && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 via-gold/8 to-transparent px-5 py-4 text-sm shadow-[0_0_30px_-12px_color-mix(in_oklab,var(--gold)_50%,transparent)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 text-gold">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Du hast dein Alert-Limit ({max}) erreicht. Upgrade für <strong>unlimitierte</strong> Smart Alerts.</span>
          </div>
          <Link to="/preise" className="inline-flex items-center gap-1 rounded-lg bg-gold px-3.5 py-1.5 text-xs font-bold text-background shadow-md hover:bg-gold/90">
            Upgrade <Sparkles className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Create form */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl md:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 40% 60% at 100% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Plus className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90">Neuen Alert erstellen</h2>
        </div>
        <form onSubmit={onAdd} className="relative grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
          <Field label="Symbol">
            <input
              list="apex-symbols-alerts"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm font-semibold tracking-tight transition-all focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <datalist id="apex-symbols-alerts">{PRODUCTS.map((p) => <option key={p.symbol} value={p.symbol}>{p.name}</option>)}</datalist>
          </Field>
          <Field label="Bedingung">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AlertRule["kind"])}
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm transition-all focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm tabular-nums transition-all focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <button
            type="submit"
            className="group/add relative self-end inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:brightness-110"
          >
            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/add:translate-x-full" />
            <Plus className="relative h-4 w-4" /> <span className="relative">Anlegen</span>
          </button>
        </form>
      </section>

      <Section title="Aktive Alerts" count={active.length} icon={<Activity className="h-3.5 w-3.5" />}>
        <CardGrid rows={active} onRemove={remove} onTrigger={markTriggered} empty="Noch keine aktiven Alerts — leg deinen ersten oben an." />
      </Section>

      {history.length > 0 && (
        <Section title="Verlauf" count={history.length} icon={<History className="h-3.5 w-3.5" />}>
          <CardGrid rows={history} onRemove={remove} onTrigger={markTriggered} empty="" />
        </Section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tint, progress }: { icon: React.ReactNode; label: string; value: React.ReactNode; tint: "primary" | "emerald" | "gold" | "rose"; progress?: number }) {
  const tintMap = {
    primary: { text: "text-primary", bar: "bg-gradient-to-r from-primary to-cyan-accent" },
    emerald: { text: "text-emerald-400", bar: "bg-gradient-to-r from-emerald-500 to-emerald-300" },
    gold: { text: "text-gold", bar: "bg-gradient-to-r from-gold to-amber-300" },
    rose: { text: "text-rose-400", bar: "bg-gradient-to-r from-rose-500 to-rose-300" },
  }[tint];
  return (
    <div className="relative flex flex-col gap-1.5 rounded-xl border border-border/40 bg-background/30 px-3 py-2.5 backdrop-blur">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${tintMap.text}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      {progress != null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/40">
          <div className={`h-full rounded-full transition-all duration-700 ${tintMap.bar}`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground/80">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">{icon}</span>
        {title}
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-foreground/70 ring-1 ring-border/60">{count}</span>
      </h2>
      {children}
    </div>
  );
}

function CardGrid({ rows, onRemove, onTrigger, empty }: { rows: AlertRule[]; onRemove: (id: string) => void; onTrigger: (id: string) => void; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-14 text-center backdrop-blur">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-transparent ring-1 ring-border/60">
          <Bell className="h-6 w-6 text-muted-foreground/60" />
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary/70 ring-2 ring-background" />
          </span>
        </div>
        <span className="max-w-sm text-sm text-muted-foreground">{empty}</span>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((a) => <AlertCard key={a.id} a={a} onRemove={onRemove} onTrigger={onTrigger} />)}
    </div>
  );
}
