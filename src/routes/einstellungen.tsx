import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Shield,
  Palette,
  Bell,
  Coins,
  LayoutGrid,
  Volume2,
  VolumeX,
  Target,
  Languages,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/einstellungen")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Einstellungen — Apex Trades" },
      { name: "description", content: "Personalisiere Risikoprofil, Darstellung, Benachrichtigungen und Trading-Defaults." },
    ],
  }),
});

function SettingsPage() {
  const { settings, update } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  const resetAll = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    update({
      risk: "ausgewogen",
      theme: "dark",
      minConfidence: 60,
      currency: "USD",
      density: "comfortable",
      soundOnAlert: true,
      defaultTakeProfit: 8,
      defaultStopLoss: 4,
      language: "de",
      hideLowConfidence: true,
    });
    toast.success("Einstellungen zurückgesetzt.");
    setConfirmReset(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-card/40 p-6 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 0% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 0%, color-mix(in oklab, var(--violet-accent) 14%, transparent), transparent 60%)",
          }}
        />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Passe deinen Trading-Agent an deinen Stil an — Risiko, Darstellung, Benachrichtigungen und Standard-Targets.
            </p>
          </div>
        </div>
      </section>

      {/* Risikoprofil */}
      <Card icon={<Shield className="h-4 w-4" />} title="Risikoprofil" hint="Beeinflusst die Schwelle für LONG/SHORT-Empfehlungen.">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "konservativ", desc: "Strenge Filter" },
              { v: "ausgewogen", desc: "Balanciert" },
              { v: "spekulativ", desc: "Höhere Frequenz" },
            ] as const
          ).map((r) => {
            const active = settings.risk === r.v;
            return (
              <button
                key={r.v}
                onClick={() => update({ risk: r.v })}
                className={`group rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-primary/60 bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/30 shadow-lg shadow-primary/10"
                    : "border-border bg-background/40 hover:border-border hover:bg-accent/40"
                }`}
              >
                <div className={`text-sm font-semibold capitalize ${active ? "text-primary" : "text-foreground"}`}>{r.v}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{r.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Darstellung */}
      <Card icon={<Palette className="h-4 w-4" />} title="Darstellung" hint="Theme, Dichte und Standardwährung.">
        <div className="space-y-5">
          <Row label="Theme">
            <div className="flex gap-2">
              {(
                [
                  { v: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
                  { v: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
                ] as const
              ).map((t) => {
                const active = settings.theme === t.v;
                return (
                  <button
                    key={t.v}
                    onClick={() => update({ theme: t.v })}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-all ${
                      active ? "border-primary/60 bg-primary/10 text-primary ring-1 ring-primary/30" : "border-border hover:bg-accent/40"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Row>

          <Row label="Dichte" hint="Kompakte Tabellen für mehr Inhalt auf einen Blick.">
            <Segmented
              value={settings.density}
              onChange={(v) => update({ density: v as "comfortable" | "compact" })}
              options={[
                { value: "comfortable", label: "Komfortabel" },
                { value: "compact", label: "Kompakt" },
              ]}
            />
          </Row>

          <Row label="Standardwährung" icon={<Coins className="h-3.5 w-3.5" />}>
            <Segmented
              value={settings.currency}
              onChange={(v) => update({ currency: v as "USD" | "EUR" | "CHF" })}
              options={[
                { value: "USD", label: "USD" },
                { value: "EUR", label: "EUR" },
                { value: "CHF", label: "CHF" },
              ]}
            />
          </Row>

          <Row label="Sprache" icon={<Languages className="h-3.5 w-3.5" />} hint="Aktuell nur Deutsch — Englisch folgt mit dem nächsten Release.">
            <div className="inline-flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-background/40 p-0.5">
                <button className="rounded-md bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary shadow-sm ring-1 ring-primary/20">
                  Deutsch
                </button>
                <button
                  disabled
                  className="cursor-not-allowed rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground/60"
                  title="Englisch ist noch nicht verfügbar"
                >
                  English
                </button>
              </div>
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold ring-1 ring-gold/30">
                Bald
              </span>
            </div>
          </Row>
        </div>
      </Card>

      {/* Signal-Filter */}
      <Card icon={<Sparkles className="h-4 w-4" />} title="Signal-Filter" hint="Welche Signale dir angezeigt werden.">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Mindest-Konfidenz</div>
                <div className="text-[11px] text-muted-foreground">Signale unter dieser Schwelle werden ausgeblendet.</div>
              </div>
              <span className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary tabular-nums">
                {settings.minConfidence}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={settings.minConfidence}
              onChange={(e) => update({ minConfidence: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Alle</span>
              <span>Streng</span>
            </div>
          </div>

          <Toggle
            label="Low-Confidence Signale verbergen"
            hint="Versteckt HOLD-Signale unter 50 % Konfidenz."
            value={settings.hideLowConfidence}
            onChange={(v) => update({ hideLowConfidence: v })}
          />
        </div>
      </Card>

      {/* Trading-Defaults */}
      <Card icon={<Target className="h-4 w-4" />} title="Trading-Defaults" hint="Werden als Vorschlag in Setups und Smart Alerts genutzt.">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Standard Take-Profit"
            suffix="%"
            icon={<TrendingUp className="h-3.5 w-3.5 text-bull" />}
            value={settings.defaultTakeProfit}
            onChange={(v) => update({ defaultTakeProfit: v })}
            min={1}
            max={50}
            step={0.5}
          />
          <NumberField
            label="Standard Stop-Loss"
            suffix="%"
            icon={<TrendingDown className="h-3.5 w-3.5 text-bear" />}
            value={settings.defaultStopLoss}
            onChange={(v) => update({ defaultStopLoss: v })}
            min={0.5}
            max={25}
            step={0.5}
          />
        </div>
        <div className="mt-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          Risk/Reward Ratio:{" "}
          <span className="font-mono font-bold text-foreground">
            1 : {(settings.defaultTakeProfit / settings.defaultStopLoss).toFixed(2)}
          </span>
        </div>
      </Card>

      {/* Benachrichtigungen */}
      <Card icon={<Bell className="h-4 w-4" />} title="Benachrichtigungen" hint="Verhalten von Smart Alerts.">
        <Toggle
          label="Sound bei Alert-Auslösung"
          hint="Spielt einen kurzen Ton beim Auslösen ab."
          value={settings.soundOnAlert}
          onChange={(v) => update({ soundOnAlert: v })}
          icon={settings.soundOnAlert ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        />
      </Card>

      {/* Reset */}
      <Card icon={<Trash2 className="h-4 w-4" />} title="Zurücksetzen" hint="Setzt alle Präferenzen auf die Standardwerte zurück (Watchlist und Alerts bleiben erhalten)." danger>
        <button
          onClick={resetAll}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${
            confirmReset
              ? "border-bear/50 bg-bear/15 text-bear hover:bg-bear/25"
              : "border-border bg-background/60 text-foreground/80 hover:border-bear/40 hover:text-bear"
          }`}
        >
          <Trash2 className="h-4 w-4" />
          {confirmReset ? "Wirklich zurücksetzen?" : "Einstellungen zurücksetzen"}
        </button>
      </Card>
    </div>
  );
}

/* ────────── Subcomponents ────────── */

function Card({
  icon,
  title,
  hint,
  children,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={`rounded-2xl border bg-card/60 p-5 backdrop-blur ${danger ? "border-bear/20" : "border-border/60"}`}>
      <header className="mb-4 flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${
            danger ? "bg-bear/10 text-bear ring-bear/20" : "bg-primary/10 text-primary ring-primary/20"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Row({ label, hint, icon, children }: { label: string; hint?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {label}
        </div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background/40 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              active ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
  icon,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2.5 text-left transition-colors hover:bg-accent/30"
    >
      <div className="flex items-center gap-2.5">
        {icon && <span className={value ? "text-primary" : "text-muted-foreground"}>{icon}</span>}
        <div>
          <div className="text-sm font-medium">{label}</div>
          {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
        </div>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-muted"
        }`}
        aria-checked={value}
        role="switch"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
            value ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function NumberField({
  label,
  suffix,
  icon,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  suffix?: string;
  icon?: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 pr-10 text-sm tabular-nums font-medium transition-colors focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}
