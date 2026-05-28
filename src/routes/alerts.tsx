import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  Zap,
  Activity,
  History,
  Lock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Radio,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAlerts, evaluate, type AlertRule } from "@/lib/alerts";
import { useQuote, useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { SymbolSearch } from "@/components/SymbolSearch";
import { useAlertsLimit } from "@/lib/featureGate";
import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
  head: () => ({
    meta: [
      { title: "Smart Alerts — Quantm Trade" },
      {
        name: "description",
        content: "Schwellen-Alerts für Preis und Setup-Score mit Push-Benachrichtigungen.",
      },
    ],
  }),
});

function label(k: AlertRule["kind"]): string {
  switch (k) {
    case "price_above":
      return "Preis ≥";
    case "price_below":
      return "Preis ≤";
    case "score_above":
      return "Score ≥";
    case "score_below":
      return "Score ≤";
  }
}

function AlertCard({
  a,
  onRemove,
  onTrigger,
}: {
  a: AlertRule;
  onRemove: (id: string) => void;
  onTrigger: (id: string) => void;
}) {
  const isPrice = a.kind.startsWith("price");
  const isAbove = a.kind.endsWith("above");
  const q = useQuote(a.symbol, 30_000);
  const analysis = useAnalysis(a.symbol);
  const { settings } = useSettings();
  const price = q.data?.c;
  const score = analysis.indicators
    ? scoreIndicators(analysis.indicators, settings.risk).score
    : undefined;
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
        new Notification(`Quantm Alert: ${a.symbol}`, { body: `${label(a.kind)} ${a.threshold}` });
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
    <div
      className={`group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-4 ring-1 backdrop-blur transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--primary)_30%,transparent)] ${ringColor}`}
    >
      {/* glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60`}
      />
      {/* corner pulse */}
      {!triggered && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl"
          style={{
            background: near
              ? "var(--gold)"
              : isAbove
                ? "var(--primary)"
                : "color-mix(in oklab, var(--violet-accent, var(--primary)) 80%, transparent)",
          }}
        />
      )}

      <div className="relative flex items-start gap-3">
        {/* Symbol badge */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold tracking-tight text-primary ring-1 ring-primary/30">
          {a.symbol.slice(0, 4)}
          {!triggered && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${near ? "bg-gold/70" : isAbove ? "bg-emerald-400/70" : "bg-rose-400/70"}`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-card ${near ? "bg-gold" : isAbove ? "bg-emerald-400" : "bg-rose-400"}`}
              />
            </span>
          )}
        </div>

        {/* Center: title + condition */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">{a.symbol}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
                {isPrice ? (
                  <Activity className="h-2.5 w-2.5 text-cyan-accent" />
                ) : (
                  <Sparkles className="h-2.5 w-2.5 text-violet-accent" />
                )}
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
            {isAbove ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-400" />
            )}
            <span>
              {isAbove ? "über" : "unter"}{" "}
              <span className="font-semibold tabular-nums text-foreground">{a.threshold}</span>
            </span>
            {distance != null && (
              <span
                className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${triggered ? "bg-emerald-500/15 text-emerald-400" : near ? "bg-gold/15 text-gold" : "bg-muted/40 text-muted-foreground"}`}
              >
                {distance > 0 ? "+" : ""}
                {distance.toFixed(2)}%
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
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                aktuell
              </span>
              <span className="text-lg font-bold tabular-nums tracking-tight">
                {value != null ? value.toFixed(2) : "…"}
              </span>
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

  const active = useMemo(() => alerts.filter((a) => !a.triggeredAt), [alerts]);
  const history = useMemo(
    () => alerts.filter((a) => a.triggeredAt).sort((a, b) => b.triggeredAt! - a.triggeredAt!),
    [alerts],
  );
  const triggeredCount = history.length;
  const quotaPct = Number.isFinite(max)
    ? Math.min(100, (count / Number(max)) * 100)
    : Math.min(100, count * 5);

  const {
    status: pushStatus,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  async function requestPush() {
    if (pushStatus === "unsupported")
      return toast.error("Browser unterstützt keine Web-Push-Benachrichtigungen.");
    if (pushStatus === "denied")
      return toast.error(
        "Push wurde blockiert. Aktiviere Benachrichtigungen in den Browser-Einstellungen.",
      );
    if (pushStatus === "subscribed") {
      const ok = await unsubscribePush();
      if (ok) toast.success("Push deaktiviert.");
      return;
    }
    const ok = await subscribePush();
    if (ok)
      toast.success("Push aktiviert — du bekommst Benachrichtigungen auch bei geschlossenem Tab.");
    else toast.error("Push konnte nicht aktiviert werden.");
  }

  const tierLabel = tier === "free" ? "Free" : tier === "pro" ? "Pro" : "Elite";
  const tierTint =
    tier === "elite"
      ? "text-gold ring-gold/40 bg-gold/10"
      : tier === "pro"
        ? "text-primary ring-primary/40 bg-primary/10"
        : "text-muted-foreground ring-border bg-muted/40";

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
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${tierTint}`}
                >
                  <Sparkles className="h-2.5 w-2.5" /> {tierLabel}
                </span>
                <PushBadge status={pushStatus} />
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
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
            />
            <BellRing className="relative h-4 w-4" />
            <span className="relative">
              {pushStatus === "subscribed" ? "Push aktiv · deaktivieren" : "Push aktivieren"}
            </span>
          </button>
        </div>

        {/* Stat strip */}
        <div className="relative mt-7 grid grid-cols-3 gap-3 border-t border-border/40 pt-5">
          <StatCard
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Aktiv"
            value={active.length}
            tint="primary"
          />
          <StatCard
            icon={<BellRing className="h-3.5 w-3.5" />}
            label="Ausgelöst"
            value={triggeredCount}
            tint="emerald"
          />
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
            <span>
              Du hast dein Alert-Limit ({max}) erreicht. Upgrade für <strong>unlimitierte</strong>{" "}
              Smart Alerts.
            </span>
          </div>
          <Link
            to="/preise"
            className="inline-flex items-center gap-1 rounded-lg bg-gold px-3.5 py-1.5 text-xs font-bold text-background shadow-md hover:bg-gold/90"
          >
            Upgrade <Sparkles className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Creator */}
      <AlertCreator
        atLimit={atLimit}
        max={max}
        existingSymbols={active.map((a) => a.symbol)}
        onCreate={async (rule) => {
          await guardedAdd(rule);
          toast.success(`Alert für ${rule.symbol} erstellt.`);
        }}
      />

      <Section
        title="Aktive Alerts"
        count={active.length}
        icon={<Activity className="h-3.5 w-3.5" />}
      >
        <CardGrid
          rows={active}
          onRemove={remove}
          onTrigger={markTriggered}
          empty="Noch keine aktiven Alerts — leg deinen ersten oben an."
        />
      </Section>

      {history.length > 0 && (
        <Section title="Verlauf" count={history.length} icon={<History className="h-3.5 w-3.5" />}>
          <CardGrid rows={history} onRemove={remove} onTrigger={markTriggered} empty="" />
        </Section>
      )}
    </div>
  );
}

function PushBadge({ status }: { status: ReturnType<typeof usePushNotifications>["status"] }) {
  if (status === "subscribed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/30">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        Push live
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 ring-1 ring-rose-500/30">
        Push blockiert
      </span>
    );
  }
  if (status === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border/60">
        Browser ohne Push
      </span>
    );
  }
  return null;
}

type CreatorProps = {
  atLimit: boolean;
  max: number;
  existingSymbols: string[];
  onCreate: (rule: { symbol: string; kind: AlertRule["kind"]; threshold: number }) => Promise<void>;
};

function AlertCreator({ atLimit, max, existingSymbols, onCreate }: CreatorProps) {
  const [symbol, setSymbol] = useState<string | null>(null);
  const [mode, setMode] = useState<"price" | "score">("price");
  const [direction, setDirection] = useState<"above" | "below">("above");
  // pct = relative deviation from anchor (price → current price, score → 50)
  const [pct, setPct] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const quote = useQuote(symbol ?? "", 30_000);
  const analysis = useAnalysis(symbol ?? "");
  const { settings } = useSettings();
  const currentPrice = quote.data?.c;
  const currentScore = analysis.indicators
    ? scoreIndicators(analysis.indicators, settings.risk).score
    : undefined;

  const anchor = mode === "price" ? currentPrice : currentScore;
  const threshold = useMemo(() => {
    if (mode === "price") {
      if (anchor == null) return 0;
      const sign = direction === "above" ? 1 : -1;
      return +(anchor * (1 + (sign * pct) / 100)).toFixed(2);
    }
    // score: clamp 0..100, anchor 50 by default
    const sign = direction === "above" ? 1 : -1;
    const base = anchor ?? 50;
    return Math.max(0, Math.min(100, Math.round(base + sign * pct)));
  }, [mode, direction, pct, anchor]);

  function reset() {
    setSymbol(null);
    setPct(5);
  }

  async function submit() {
    if (!symbol) return;
    if (!Number.isFinite(threshold) || threshold <= 0) {
      toast.error("Schwellwert konnte nicht berechnet werden — Kurs noch nicht verfügbar.");
      return;
    }
    setSubmitting(true);
    try {
      const kind = `${mode}_${direction}` as AlertRule["kind"];
      await onCreate({ symbol, kind, threshold });
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative z-20 overflow-visible rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl md:p-6">
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/90">
          Neuen Alert erstellen
        </h2>
      </div>

      {!symbol ? (
        <div className="relative z-50 space-y-3">
          <p className="text-xs text-muted-foreground">
            Wähle eine Aktie — wir zeigen dir den aktuellen Kurs und du legst die Schwelle visuell
            fest.
          </p>
          <SymbolSearch
            compact
            existing={existingSymbols}
            onAdd={(syms) => syms[0] && setSymbol(syms[0])}
            placeholder="Aktie suchen — z. B. Rheinmetall, AAPL, Siemens, BMW.DE"
          />
        </div>
      ) : (
        <div className="relative space-y-5">
          {/* Header row: symbol + current price + reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 text-sm font-bold text-primary ring-1 ring-primary/30">
                {symbol.slice(0, 4)}
              </div>
              <div>
                <div className="text-base font-bold tracking-tight">{symbol}</div>
                <div className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
                  <span className="uppercase tracking-wider">aktuell</span>
                  <span className="text-lg font-bold tabular-nums text-foreground">
                    {mode === "price"
                      ? currentPrice != null
                        ? currentPrice.toFixed(2)
                        : "…"
                      : currentScore != null
                        ? currentScore.toFixed(0)
                        : "…"}
                  </span>
                  {mode === "price" && quote.isFetching && (
                    <span className="text-[10px] text-primary">live</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              <X className="h-3 w-3" /> Andere Aktie
            </button>
          </div>

          {/* Mode + Direction toggles */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Worauf reagieren?"
              value={mode}
              onChange={(v) => {
                setMode(v as "price" | "score");
                setPct(5);
              }}
              options={[
                { value: "price", label: "Preis", icon: <Activity className="h-3 w-3" /> },
                { value: "score", label: "Setup-Score", icon: <Sparkles className="h-3 w-3" /> },
              ]}
            />
            <Toggle
              label="Richtung"
              value={direction}
              onChange={(v) => setDirection(v as "above" | "below")}
              options={[
                {
                  value: "above",
                  label: "Steigt über",
                  icon: <TrendingUp className="h-3 w-3 text-emerald-400" />,
                },
                {
                  value: "below",
                  label: "Fällt unter",
                  icon: <TrendingDown className="h-3 w-3 text-rose-400" />,
                },
              ]}
            />
          </div>

          {/* Visual threshold picker */}
          <ThresholdPicker
            mode={mode}
            direction={direction}
            anchor={anchor}
            pct={pct}
            setPct={setPct}
            threshold={threshold}
          />

          {/* Submit */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Auslöser:{" "}
              <span className="font-semibold text-foreground">
                {mode === "price" ? "Preis" : "Score"} {direction === "above" ? "≥" : "≤"}{" "}
                <span className="tabular-nums text-primary">{threshold || "—"}</span>
              </span>
            </div>
            <button
              onClick={submit}
              disabled={submitting || atLimit || (mode === "price" && currentPrice == null)}
              className="group/add relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/add:translate-x-full"
              />
              <Plus className="relative h-4 w-4" /> <span className="relative">Alert anlegen</span>
            </button>
          </div>
          {atLimit && (
            <p className="text-[11px] text-rose-400">
              Alert-Limit ({max}) erreicht. Upgrade für mehr.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Toggle({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-background/40 p-1">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-gradient-to-br from-primary/25 to-primary/10 text-foreground ring-1 ring-primary/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThresholdPicker({
  mode,
  direction,
  anchor,
  pct,
  setPct,
  threshold,
}: {
  mode: "price" | "score";
  direction: "above" | "below";
  anchor: number | undefined;
  pct: number;
  setPct: (n: number) => void;
  threshold: number;
}) {
  const isPrice = mode === "price";
  const max = isPrice ? 50 : 50;
  const presets = isPrice ? [1, 3, 5, 10, 20] : [5, 10, 20, 30, 40];

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Abstand zum {isPrice ? "aktuellen Kurs" : "aktuellen Score"}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeftRight className="h-3 w-3" />
          <span className="tabular-nums font-semibold text-foreground">
            {direction === "above" ? "+" : "−"}
            {pct}
            {isPrice ? "%" : " Punkte"}
          </span>
        </div>
      </div>

      {/* Visual line: anchor in center, threshold marker offset by direction */}
      <div className="relative h-12">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-border to-transparent" />
        {/* anchor marker */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-foreground/70 ring-2 ring-background" />
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              jetzt
            </div>
            <div className="text-[10px] tabular-nums text-foreground">
              {anchor != null ? (isPrice ? anchor.toFixed(2) : Math.round(anchor)) : "…"}
            </div>
          </div>
        </div>
        {/* threshold marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
          style={{
            left: `${50 + (direction === "above" ? 1 : -1) * Math.min(45, (pct / max) * 45)}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full ring-2 ring-background ${
                direction === "above" ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <div
              className={`mt-1 text-[9px] font-semibold uppercase tracking-wider ${direction === "above" ? "text-emerald-400" : "text-rose-400"}`}
            >
              Ziel
            </div>
            <div className="text-[10px] font-bold tabular-nums text-foreground">
              {threshold || "—"}
            </div>
          </div>
        </div>
      </div>

      <input
        type="range"
        min={isPrice ? 0.5 : 1}
        max={max}
        step={isPrice ? 0.5 : 1}
        value={pct}
        onChange={(e) => setPct(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPct(p)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
              pct === p
                ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {direction === "above" ? "+" : "−"}
            {p}
            {isPrice ? "%" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tint: "primary" | "emerald" | "gold" | "rose";
  progress?: number;
}) {
  const tintMap = {
    primary: { text: "text-primary", bar: "bg-gradient-to-r from-primary to-cyan-accent" },
    emerald: { text: "text-emerald-400", bar: "bg-gradient-to-r from-emerald-500 to-emerald-300" },
    gold: { text: "text-gold", bar: "bg-gradient-to-r from-gold to-amber-300" },
    rose: { text: "text-rose-400", bar: "bg-gradient-to-r from-rose-500 to-rose-300" },
  }[tint];
  return (
    <div className="relative flex flex-col gap-1.5 rounded-xl border border-border/40 bg-background/30 px-3 py-2.5 backdrop-blur">
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${tintMap.text}`}
      >
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      {progress != null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ${tintMap.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground/80">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
          {icon}
        </span>
        {title}
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-foreground/70 ring-1 ring-border/60">
          {count}
        </span>
      </h2>
      {children}
    </div>
  );
}

function CardGrid({
  rows,
  onRemove,
  onTrigger,
  empty,
}: {
  rows: AlertRule[];
  onRemove: (id: string) => void;
  onTrigger: (id: string) => void;
  empty: string;
}) {
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
      {rows.map((a) => (
        <AlertCard key={a.id} a={a} onRemove={onRemove} onTrigger={onTrigger} />
      ))}
    </div>
  );
}
