import { useState } from "react";
import { useTradingProfile, type TradingGoal, type RiskLevel, type UsageFreq, type Market, type AIStyle } from "@/hooks/use-trading-profile";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";

const GOALS: { v: TradingGoal; label: string; desc: string }[] = [
  { v: "long_term", label: "Long-term Investing", desc: "Niedriges Risiko, Buy & Hold" },
  { v: "active", label: "Active Trading", desc: "Mittleres Risiko, regelmäßige Positionen" },
  { v: "aggressive", label: "Aggressive Trading", desc: "Hohes Risiko, hohe Renditeziele" },
  { v: "learning", label: "Learning Mode", desc: "Sichere Empfehlungen zum Einstieg" },
];
const RISKS: { v: RiskLevel; label: string; desc: string }[] = [
  { v: "low", label: "Low", desc: "Signal-Konfidenz ≥ 80%" },
  { v: "medium", label: "Medium", desc: "Signal-Konfidenz ≥ 60%" },
  { v: "high", label: "High", desc: "Signal-Konfidenz ≥ 50%" },
];
const FREQ: { v: UsageFreq; label: string; desc: string }[] = [
  { v: "daily", label: "Daily", desc: "Häufige Signale & Echtzeit-Alerts" },
  { v: "weekly", label: "Weekly", desc: "Wöchentliche Zusammenfassungen" },
  { v: "occasional", label: "Occasional", desc: "Selten, nur kuratierte Setups" },
];
const MARKETS: { v: Market; label: string; desc?: string }[] = [
  { v: "stocks", label: "Aktien", desc: "Einzelaktien aus US, EU und DE" },
  { v: "etfs", label: "ETFs", desc: "Index-, Sektor- und Themen-ETFs" },
];
const STYLES: { v: AIStyle; label: string; desc: string }[] = [
  { v: "conservative", label: "Conservative", desc: "Weniger, hochwertige Signale" },
  { v: "balanced", label: "Balanced", desc: "Ausgewogene Signal-Anzahl" },
  { v: "aggressive", label: "Aggressive", desc: "Mehr Signale, höhere Frequenz" },
];

type Answers = {
  trading_goal?: TradingGoal;
  risk_level?: RiskLevel;
  usage_frequency?: UsageFreq;
  markets: Market[];
  ai_style?: AIStyle;
};

export function OnboardingGate() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, completeOnboarding } = useTradingProfile();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ markets: [] });
  const [saving, setSaving] = useState(false);

  if (authLoading || loading || !user || !profile) return null;
  if (profile.onboarding_completed) return null;

  const totalSteps = 5;

  const canNext = (() => {
    if (step === 0) return !!a.trading_goal;
    if (step === 1) return !!a.risk_level;
    if (step === 2) return !!a.usage_frequency;
    if (step === 3) return a.markets.length > 0;
    if (step === 4) return !!a.ai_style;
    return false;
  })();

  const finish = async () => {
    if (!a.trading_goal || !a.risk_level || !a.usage_frequency || !a.ai_style || a.markets.length === 0) return;
    setSaving(true);
    await completeOnboarding({
      trading_goal: a.trading_goal,
      risk_level: a.risk_level,
      usage_frequency: a.usage_frequency,
      markets: a.markets,
      ai_style: a.ai_style,
    });
    setSaving(false);
  };

  const toggleMarket = (m: Market) => {
    setA((s) => ({ ...s, markets: s.markets.includes(m) ? s.markets.filter((x) => x !== m) : [...s.markets, m] }));
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Trader-Profil einrichten</DialogTitle>
          <DialogDescription>
            Schritt {step + 1} von {totalSteps} · Diese Antworten kalibrieren die AI auf deinen Stil.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>

        <div className="min-h-[260px]">
          {step === 0 && (
            <StepGrid>
              <StepTitle>Trading Goal</StepTitle>
              {GOALS.map((g) => (
                <Choice key={g.v} active={a.trading_goal === g.v} onClick={() => setA((s) => ({ ...s, trading_goal: g.v }))} label={g.label} desc={g.desc} />
              ))}
            </StepGrid>
          )}
          {step === 1 && (
            <StepGrid>
              <StepTitle>Risk Level</StepTitle>
              {RISKS.map((g) => (
                <Choice key={g.v} active={a.risk_level === g.v} onClick={() => setA((s) => ({ ...s, risk_level: g.v }))} label={g.label} desc={g.desc} />
              ))}
            </StepGrid>
          )}
          {step === 2 && (
            <StepGrid>
              <StepTitle>Usage Frequency</StepTitle>
              {FREQ.map((g) => (
                <Choice key={g.v} active={a.usage_frequency === g.v} onClick={() => setA((s) => ({ ...s, usage_frequency: g.v }))} label={g.label} desc={g.desc} />
              ))}
            </StepGrid>
          )}
          {step === 3 && (
            <StepGrid>
              <StepTitle>Interessen — Aktien & ETFs (Mehrfachauswahl)</StepTitle>
              {MARKETS.map((g) => (
                <Choice key={g.v} active={a.markets.includes(g.v)} onClick={() => toggleMarket(g.v)} label={g.label} desc={g.desc} />
              ))}
            </StepGrid>
          )}
          {step === 4 && (
            <StepGrid>
              <StepTitle>AI Style</StepTitle>
              {STYLES.map((g) => (
                <Choice key={g.v} active={a.ai_style === g.v} onClick={() => setA((s) => ({ ...s, ai_style: g.v }))} label={g.label} desc={g.desc} />
              ))}
            </StepGrid>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
          {step < totalSteps - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Weiter <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={finish} disabled={!canNext || saving}>
              <Check className="h-4 w-4 mr-1" /> {saving ? "Speichere…" : "Profil aktivieren"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="col-span-full text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{children}</h3>;
}
function StepGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>;
}
function Choice({ active, onClick, label, desc }: { active: boolean; onClick: () => void; label: string; desc?: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-all ${
        active ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30" : "border-border bg-background/40 hover:border-foreground/30"
      }`}
    >
      <div className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</div>
      {desc && <div className="mt-0.5 text-[11px] text-muted-foreground">{desc}</div>}
    </button>
  );
}
