import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTradingProfile, RISK_TO_MIN_CONFIDENCE, type RiskLevel, type SignalFreq, type StrategyMode, type Market, type Region, type AITone, type ExplanationDepth } from "@/hooks/use-trading-profile";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Bell, Sparkles, Globe2, LineChart, Lock } from "lucide-react";

export const Route = createFileRoute("/handelsprofil")({
  component: TradingProfilePage,
  head: () => ({
    meta: [
      { title: "Handelsprofil — Quantm Trade" },
      { name: "description", content: "Trading-Präferenzen, Märkte, Benachrichtigungen und AI-Personalisierung." },
    ],
  }),
});

function TradingProfilePage() {
  const { user } = useAuth();
  const { profile, loading, update } = useTradingProfile();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-sm text-muted-foreground">
        Bitte <Link to="/login" className="text-primary underline">anmelden</Link>, um dein Handelsprofil zu verwalten.
      </div>
    );
  }
  if (loading || !profile) return <div className="p-8 text-sm text-muted-foreground">Lade Profil…</div>;

  const setRisk = (v: RiskLevel) => {
    update({ risk_level: v, confidence_threshold: RISK_TO_MIN_CONFIDENCE[v] });
    toast.success("Risikoprofil gespeichert");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Handelsprofil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Konfiguration für AI-Signale, Märkte und Benachrichtigungen. Änderungen wirken sofort.</p>
      </header>

      <Section icon={<Shield className="h-4 w-4" />} title="Trading Preferences">
        <Row label="Risk Level">
          <Seg<RiskLevel>
            value={profile.risk_level ?? "medium"}
            onChange={setRisk}
            opts={[
              { v: "low", label: "Low (≥80%)" },
              { v: "medium", label: "Medium (≥60%)" },
              { v: "high", label: "High (≥50%)" },
            ]}
          />
        </Row>
        <Row label="Signal Frequency">
          <Seg<SignalFreq>
            value={profile.signal_frequency}
            onChange={(v) => update({ signal_frequency: v })}
            opts={[{ v: "low", label: "Low" }, { v: "medium", label: "Medium" }, { v: "high", label: "High" }]}
          />
        </Row>
        <Row label="Confidence Threshold" hint={`${profile.confidence_threshold}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={profile.confidence_threshold}
            onChange={(e) => update({ confidence_threshold: Number(e.target.value) })}
            className="w-full max-w-xs accent-primary"
          />
        </Row>
        <Row label="Strategy Mode">
          <Seg<StrategyMode>
            value={profile.strategy_mode}
            onChange={(v) => update({ strategy_mode: v })}
            opts={[{ v: "conservative", label: "Conservative" }, { v: "balanced", label: "Balanced" }, { v: "aggressive", label: "Aggressive" }]}
          />
        </Row>
      </Section>

      <Section icon={<LineChart className="h-4 w-4" />} title="Markets">
        <Row label="Interessen (Aktien & ETFs)">
          <div className="flex flex-wrap gap-2">
            {([
              { v: "stocks" as Market, label: "Aktien" },
              { v: "etfs" as Market, label: "ETFs" },
            ]).map(({ v: m, label }) => {
              const on = profile.markets.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => update({ markets: on ? profile.markets.filter((x) => x !== m) : [...profile.markets, m] })}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    on ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="Region" icon={<Globe2 className="h-3.5 w-3.5" />}>
          <Seg<Region>
            value={profile.region}
            onChange={(v) => update({ region: v })}
            opts={[{ v: "us", label: "US" }, { v: "eu", label: "EU" }, { v: "global", label: "Global" }]}
          />
        </Row>
      </Section>

      <Section icon={<Bell className="h-4 w-4" />} title="Notifications">
        <Toggle label="Real-time Alerts" value={profile.notif_realtime} onChange={(v) => update({ notif_realtime: v })} />
        <Toggle label="Daily Summary" value={profile.notif_daily} onChange={(v) => update({ notif_daily: v })} />
        <Toggle label="Weekly Report" value={profile.notif_weekly} onChange={(v) => update({ notif_weekly: v })} />
        <Toggle label="Breakout Alerts" value={profile.notif_breakout} onChange={(v) => update({ notif_breakout: v })} />
        <Toggle label="Silent Mode" hint="Unterdrückt alle Push-Benachrichtigungen" value={profile.notif_silent} onChange={(v) => update({ notif_silent: v })} />
      </Section>

      <Section icon={<Sparkles className="h-4 w-4" />} title="AI Personalization">
        <Row label="AI Tone">
          <Seg<AITone>
            value={profile.ai_tone}
            onChange={(v) => update({ ai_tone: v })}
            opts={[{ v: "professional", label: "Professional" }, { v: "simplified", label: "Simplified" }]}
          />
        </Row>
        <Row label="Explanation Depth">
          <Seg<ExplanationDepth>
            value={profile.explanation_depth}
            onChange={(v) => update({ explanation_depth: v })}
            opts={[{ v: "brief", label: "Brief" }, { v: "detailed", label: "Detailed" }]}
          />
        </Row>
        <Toggle label="Show Reasoning" hint="Zeigt internes Reasoning der AI in Antworten" value={profile.show_reasoning} onChange={(v) => update({ show_reasoning: v })} />
      </Section>

      <Section icon={<Lock className="h-4 w-4" />} title="Security">
        <div className="text-xs text-muted-foreground">
          Konto- und Sicherheitsverwaltung findest du unter <Link to="/konto" className="text-primary underline">Profil & Konto</Link>. Device-Management, Login-Historie und Privacy-Controls werden in einem zukünftigen Release ergänzt.
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/60 p-5">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
      </header>
      <div className="space-y-4">{children}</div>
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
        {hint && <div className="text-[11px] font-mono text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: { v: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background/40 p-0.5">
      {opts.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              active ? "bg-primary/15 text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2.5 text-left transition-colors hover:bg-accent/30"
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`} role="switch" aria-checked={value}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${value ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
