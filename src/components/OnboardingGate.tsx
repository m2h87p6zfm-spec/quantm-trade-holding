import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useTradingProfile,
  type TradingGoal,
  type RiskLevel,
  type Market,
  type AIStyle,
  type AgeRange,
  type ExperienceLevel,
  type TraderType,
  type PreferredCurrency,
} from "@/hooks/use-trading-profile";
import { useAuth } from "@/hooks/use-auth";
import { useSettings, NEWS_SOURCES, type NewsSource, type BaseCurrency } from "@/lib/settings";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AgencyLogo, AGENCY_META } from "@/components/AgencyLogo";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Newspaper,
  Bell,
  Wallet,
  Briefcase,
  GraduationCap,
  Calendar,
  Coins,
  Globe2,
  Lock,
  CircuitBoard,
  Loader2,
} from "lucide-react";

/* ─────────────────── Option catalogs ─────────────────── */

const AGES: { v: AgeRange; label: string }[] = [
  { v: "under_18", label: "Under 18" },
  { v: "18_24", label: "18 – 24" },
  { v: "25_34", label: "25 – 34" },
  { v: "35_44", label: "35 – 44" },
  { v: "45_plus", label: "45+" },
];

const EXPERIENCE: { v: ExperienceLevel; label: string; desc: string }[] = [
  { v: "beginner", label: "Beginner", desc: "Neu im Markt – klare, einfache Erklärungen" },
  { v: "intermediate", label: "Intermediate", desc: "Solide Grundlagen – ausgewogene Tiefe" },
  { v: "advanced", label: "Advanced", desc: "Institutionelle Tiefe, Fachvokabular, volle Indikatoren" },
];

const TRADER_TYPES: { v: TraderType; label: string; desc: string }[] = [
  { v: "beginner_investor", label: "Beginner Investor", desc: "Sicheres Lernen, kuratierte Setups" },
  { v: "long_term_investor", label: "Long-term Investor", desc: "Makro-Insights, Portfolio-Fokus" },
  { v: "swing_trader", label: "Swing Trader", desc: "Tage bis Wochen, Momentum-Signale" },
  { v: "day_trader", label: "Day Trader", desc: "Intraday-Charts und Echtzeit-Signale" },
  { v: "options_trader", label: "Options Trader", desc: "Volatilität, Greeks, Strategien" },
  { v: "crypto_trader", label: "Crypto Trader", desc: "24/7 Märkte, High-Vol Setups" },
  { v: "mixed", label: "Mixed Strategy", desc: "Quer durch alle Anlageklassen" },
];

const CURRENCIES: { v: PreferredCurrency; label: string; sym: string }[] = [
  { v: "USD", label: "US-Dollar", sym: "$" },
  { v: "EUR", label: "Euro", sym: "€" },
  { v: "GBP", label: "British Pound", sym: "£" },
  { v: "AUD", label: "Australian Dollar", sym: "A$" },
  { v: "CAD", label: "Canadian Dollar", sym: "C$" },
  { v: "JPY", label: "Japanese Yen", sym: "¥" },
  { v: "CHF", label: "Swiss Franc", sym: "Fr." },
];

const RISKS: { v: RiskLevel; label: string; desc: string }[] = [
  { v: "low", label: "Low Risk", desc: "Konfidenz-Threshold ≥ 80%, defensive Setups" },
  { v: "medium", label: "Medium Risk", desc: "Konfidenz ≥ 60%, ausgewogene Frequenz" },
  { v: "high", label: "High Risk", desc: "Konfidenz ≥ 50%, mehr Setups, höhere Vola" },
];

const MARKETS: { v: Market; label: string; desc?: string }[] = [
  { v: "stocks", label: "Stocks", desc: "Einzelaktien US / EU / DE" },
  { v: "etfs", label: "ETFs", desc: "Index-, Sektor- und Themen-ETFs" },
  { v: "crypto", label: "Crypto", desc: "BTC, ETH und Top-Altcoins" },
  { v: "forex", label: "Forex", desc: "Major & Minor FX-Paare" },
  { v: "commodities", label: "Commodities", desc: "Öl, Gold, Industriemetalle" },
  { v: "mixed", label: "Mixed Portfolio", desc: "Quer über alle Klassen" },
];

type NotifKey = "notif_realtime" | "notif_daily" | "notif_weekly" | "notif_breakout";
const NOTIFS: { v: NotifKey; label: string; desc: string }[] = [
  { v: "notif_realtime", label: "AI Trading Signals", desc: "Echtzeit-Signale aus der Quant-Engine" },
  { v: "notif_breakout", label: "Breaking Market News", desc: "Marktbewegende Headlines" },
  { v: "notif_daily", label: "Portfolio & Daily Summary", desc: "Tägliche Zusammenfassung deiner Holdings" },
  { v: "notif_weekly", label: "Weekly Reports", desc: "Wöchentliche Performance & Trends" },
];

const STARTER_LISTS: { id: string; name: string; symbols: string[]; tagline: string }[] = [
  { id: "ai-tech", name: "AI & Technology", tagline: "NVDA, MSFT, GOOGL …", symbols: ["NVDA", "MSFT", "GOOGL", "META", "AMD", "AVGO", "TSM", "ASML", "PLTR"] },
  { id: "large-cap", name: "Large Cap Stocks", tagline: "AAPL, MSFT, AMZN …", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "BRK.B", "JPM", "V", "WMT", "JNJ"] },
  { id: "crypto", name: "Crypto Leaders", tagline: "BTC, ETH, SOL …", symbols: ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "AVAX-USD"] },
  { id: "high-vol", name: "High Volatility", tagline: "TSLA, COIN, MSTR …", symbols: ["TSLA", "COIN", "MSTR", "ARKK", "RIOT", "MARA", "PLTR"] },
  { id: "dividend", name: "Dividend Stocks", tagline: "KO, JNJ, PG …", symbols: ["KO", "JNJ", "PG", "T", "VZ", "XOM", "MMM", "MO"] },
  { id: "energy", name: "Energy & Commodities", tagline: "XOM, CVX, XLE …", symbols: ["XOM", "CVX", "COP", "XLE", "USO", "GLD", "SLV"] },
];

const CURRENCY_TO_BASE: Record<PreferredCurrency, BaseCurrency> = {
  USD: "USD", EUR: "EUR", GBP: "GBP", CHF: "CHF",
  AUD: "USD", CAD: "USD", JPY: "USD", // fallback for unsupported BaseCurrency keys
};

/* ─────────────────── Wizard state ─────────────────── */

type Answers = {
  age_range?: AgeRange;
  experience_level?: ExperienceLevel;
  trader_type?: TraderType;
  preferred_currency?: PreferredCurrency;
  risk_level?: RiskLevel;
  markets: Market[];
  notifications: Record<NotifKey, boolean>;
  trusted_sources: NewsSource[];
  starter_watchlists: string[];
  ai_transparency_ack: boolean;
};

const initialAnswers: Answers = {
  markets: [],
  notifications: { notif_realtime: true, notif_breakout: true, notif_daily: true, notif_weekly: false },
  trusted_sources: ["reuters", "bloomberg", "yahoo"],
  starter_watchlists: [],
  ai_transparency_ack: false,
};

/* Map trader_type → derived trading_goal + ai_style so the existing AI logic stays untouched. */
function deriveProfile(a: Answers): { trading_goal: TradingGoal; ai_style: AIStyle; usage_freq: "daily" | "weekly" | "occasional" } {
  const t = a.trader_type ?? "long_term_investor";
  const tradingGoal: TradingGoal =
    t === "long_term_investor" || t === "beginner_investor" ? "long_term"
    : t === "day_trader" || t === "options_trader" ? "aggressive"
    : "active";
  const aiStyle: AIStyle =
    a.risk_level === "low" ? "conservative"
    : a.risk_level === "high" ? "aggressive"
    : "balanced";
  const freq: "daily" | "weekly" | "occasional" =
    t === "day_trader" || t === "options_trader" || t === "crypto_trader" ? "daily"
    : t === "swing_trader" || t === "mixed" ? "weekly"
    : "occasional";
  return { trading_goal: tradingGoal, ai_style: aiStyle, usage_freq: freq };
}

/* ─────────────────── Component ─────────────────── */

const TOTAL_STEPS = 11; // 0 welcome · 1 age · 2 exp · 3 trader · 4 currency · 5 risk · 6 markets · 7 notif · 8 sources · 9 starter · 10 trust+summary

export function OnboardingGate() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, completeOnboarding } = useTradingProfile();
  const { update, createWatchlistWithSymbols } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(initialAnswers);
  const [saving, setSaving] = useState(false);

  if (authLoading || loading || !user || !profile) return null;
  if (profile.onboarding_completed) {
    // Already done — bounce to the personalized watchlist/cockpit.
    if (typeof window !== "undefined") navigate({ to: "/", replace: true });
    return null;
  }

  const canNext = (() => {
    if (step === 0) return true;
    if (step === 1) return !!a.age_range;
    if (step === 2) return !!a.experience_level;
    if (step === 3) return !!a.trader_type;
    if (step === 4) return !!a.preferred_currency;
    if (step === 5) return !!a.risk_level;
    if (step === 6) return a.markets.length > 0;
    if (step === 7) return Object.values(a.notifications).some(Boolean);
    if (step === 8) return a.trusted_sources.length > 0;
    if (step === 9) return true; // starter watchlists optional
    if (step === 10) return a.ai_transparency_ack;
    return false;
  })();

  const finish = async () => {
    if (!a.experience_level || !a.trader_type || !a.preferred_currency || !a.risk_level || a.markets.length === 0) return;
    setSaving(true);
    const derived = deriveProfile(a);

    // 1. Persist to settings (localStorage → instantly reflected across the app).
    update({
      currency: CURRENCY_TO_BASE[a.preferred_currency],
      experienceLevel:
        a.experience_level === "advanced" ? "pro" : a.experience_level === "beginner" ? "beginner" : "intermediate",
      newsSources: Object.fromEntries(
        NEWS_SOURCES.map((s) => [s, a.trusted_sources.includes(s)]),
      ) as Record<NewsSource, boolean>,
      notifBreakingNews: a.notifications.notif_breakout,
    });

    // 2. Create selected starter watchlists.
    for (const id of a.starter_watchlists) {
      const preset = STARTER_LISTS.find((p) => p.id === id);
      if (preset) createWatchlistWithSymbols(preset.name, preset.symbols);
    }

    // 3. Persist the full trading profile to Supabase.
    await completeOnboarding({
      trading_goal: derived.trading_goal,
      risk_level: a.risk_level,
      usage_frequency: derived.usage_freq,
      markets: a.markets,
      ai_style: derived.ai_style,
      age_range: a.age_range ?? null,
      experience_level: a.experience_level,
      trader_type: a.trader_type,
      preferred_currency: a.preferred_currency,
      trusted_sources: a.trusted_sources,
      starter_watchlists: a.starter_watchlists,
      ai_transparency_ack: a.ai_transparency_ack,
      notif_realtime: a.notifications.notif_realtime,
      notif_daily: a.notifications.notif_daily,
      notif_weekly: a.notifications.notif_weekly,
      notif_breakout: a.notifications.notif_breakout,
    });
    setSaving(false);
  };

  const stepIcon = [Sparkles, Calendar, GraduationCap, Briefcase, Coins, ShieldCheck, Globe2, Bell, Newspaper, Wallet, CircuitBoard][step];
  const StepIcon = stepIcon ?? Sparkles;
  const progressPct = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-3xl border-border/40 bg-[oklch(0.13_0.02_265)]/95 p-0 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Apex Onboarding</DialogTitle>
        {/* Ambient AI background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-border/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <StepIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Apex AI · Onboarding</div>
              <div className="text-sm font-semibold text-foreground">
                Step {Math.min(step + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/40 bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Privat & verschlüsselt
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-border/30">
          <div
            className="h-full bg-gradient-to-r from-primary via-violet-400 to-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Body */}
        <div className="relative px-6 py-6 sm:px-8 sm:py-8 min-h-[360px]">
          {step === 0 && <WelcomeStep />}
          {step === 1 && (
            <Question title="What age range are you in?" hint="Wir nutzen das ausschließlich zur Personalisierung — niemals an Dritte weitergegeben.">
              <Grid cols={5}>
                {AGES.map((g) => (
                  <Choice key={g.v} active={a.age_range === g.v} onClick={() => setA((s) => ({ ...s, age_range: g.v }))} label={g.label} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 2 && (
            <Question title="How experienced are you with financial markets?" hint="Bestimmt Tiefe der AI-Erklärungen und Komplexität des Dashboards.">
              <Grid cols={3}>
                {EXPERIENCE.map((g) => (
                  <Choice key={g.v} active={a.experience_level === g.v} onClick={() => setA((s) => ({ ...s, experience_level: g.v }))} label={g.label} desc={g.desc} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 3 && (
            <Question title="What type of trader are you?" hint="Priorisiert deine Signal-Feeds, Charts und Insights.">
              <Grid cols={2}>
                {TRADER_TYPES.map((g) => (
                  <Choice key={g.v} active={a.trader_type === g.v} onClick={() => setA((s) => ({ ...s, trader_type: g.v }))} label={g.label} desc={g.desc} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 4 && (
            <Question title="What currency should the platform use?" hint="Wird überall im Dashboard, Watchlist, Portfolio und in AI-Insights angewendet.">
              <Grid cols={4}>
                {CURRENCIES.map((g) => (
                  <Choice
                    key={g.v}
                    active={a.preferred_currency === g.v}
                    onClick={() => setA((s) => ({ ...s, preferred_currency: g.v }))}
                    label={`${g.sym} ${g.v}`}
                    desc={g.label}
                  />
                ))}
              </Grid>
            </Question>
          )}
          {step === 5 && (
            <Question title="What level of risk are you comfortable with?" hint="Steuert AI-Konfidenz-Threshold und Signal-Aggressivität.">
              <Grid cols={3}>
                {RISKS.map((g) => (
                  <Choice key={g.v} active={a.risk_level === g.v} onClick={() => setA((s) => ({ ...s, risk_level: g.v }))} label={g.label} desc={g.desc} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 6 && (
            <Question title="Which markets interest you?" hint="Mehrfachauswahl. Nur diese Klassen werden in Feeds und Empfehlungen priorisiert.">
              <Grid cols={3}>
                {MARKETS.map((g) => (
                  <Choice
                    key={g.v}
                    active={a.markets.includes(g.v)}
                    onClick={() => setA((s) => ({ ...s, markets: s.markets.includes(g.v) ? s.markets.filter((x) => x !== g.v) : [...s.markets, g.v] }))}
                    label={g.label}
                    desc={g.desc}
                  />
                ))}
              </Grid>
            </Question>
          )}
          {step === 7 && (
            <Question title="What updates would you like to receive?" hint="Du kannst das jederzeit in den Einstellungen anpassen.">
              <div className="space-y-2">
                {NOTIFS.map((n) => {
                  const on = a.notifications[n.v];
                  return (
                    <button
                      key={n.v}
                      onClick={() => setA((s) => ({ ...s, notifications: { ...s.notifications, [n.v]: !s.notifications[n.v] } }))}
                      className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition ${
                        on ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30" : "border-border/50 bg-background/30 hover:border-foreground/30"
                      }`}
                    >
                      <div>
                        <div className={`text-sm font-semibold ${on ? "text-primary" : "text-foreground"}`}>{n.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{n.desc}</div>
                      </div>
                      <div className={`h-5 w-9 rounded-full p-0.5 transition ${on ? "bg-primary" : "bg-muted"}`}>
                        <div className={`h-4 w-4 rounded-full bg-background shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Question>
          )}
          {step === 8 && (
            <Question
              title="Choose Your Trusted Financial Sources"
              hint="Diese Publisher dominieren deinen Haupt-News-Feed. Wichtige Headlines anderer Quellen erscheinen separat in der Sidebar."
            >
              <Grid cols={4}>
                {NEWS_SOURCES.map((src) => {
                  const meta = AGENCY_META[src];
                  const on = a.trusted_sources.includes(src);
                  return (
                    <button
                      key={src}
                      onClick={() =>
                        setA((s) => ({
                          ...s,
                          trusted_sources: s.trusted_sources.includes(src)
                            ? s.trusted_sources.filter((x) => x !== src)
                            : [...s.trusted_sources, src],
                        }))
                      }
                      className={`group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                        on ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40" : "border-border/50 bg-background/30 hover:border-foreground/30"
                      }`}
                    >
                      <AgencyLogo source={src} />
                      <div className={`text-[11px] font-semibold text-center ${on ? "text-primary" : "text-foreground"}`}>{meta.label}</div>
                      {on && <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-primary" />}
                    </button>
                  );
                })}
              </Grid>
            </Question>
          )}
          {step === 9 && (
            <Question
              title="Starter watchlists"
              hint="Optional. Ausgewählte Listen werden direkt in deiner Watchlist verfügbar."
            >
              <Grid cols={3}>
                {STARTER_LISTS.map((l) => {
                  const on = a.starter_watchlists.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() =>
                        setA((s) => ({
                          ...s,
                          starter_watchlists: s.starter_watchlists.includes(l.id)
                            ? s.starter_watchlists.filter((x) => x !== l.id)
                            : [...s.starter_watchlists, l.id],
                        }))
                      }
                      className={`relative rounded-xl border p-3 text-left transition ${
                        on ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40" : "border-border/50 bg-background/30 hover:border-foreground/30"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${on ? "text-primary" : "text-foreground"}`}>{l.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{l.tagline}</div>
                      <div className="mt-2 font-mono text-[9px] text-muted-foreground/70">{l.symbols.length} Symbole</div>
                      {on && <Check className="absolute right-2 top-2 h-3 w-3 text-primary" />}
                    </button>
                  );
                })}
              </Grid>
            </Question>
          )}
          {step === 10 && <SummaryStep a={a} ack={a.ai_transparency_ack} setAck={(v) => setA((s) => ({ ...s, ai_transparency_ack: v }))} />}
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between border-t border-border/30 bg-background/30 px-6 py-3.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
          <div className="font-mono text-[10px] tabular-nums text-muted-foreground">{progressPct}%</div>
          {step < TOTAL_STEPS - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              {step === 0 ? "Loslegen" : "Weiter"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={finish} disabled={!canNext || saving} className="bg-gradient-to-r from-primary to-violet-500 text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              {saving ? "Kalibriere…" : "Apex AI aktivieren"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function WelcomeStep() {
  return (
    <div className="text-center py-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/30 ring-1 ring-primary/40 mb-5">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
        Willkommen bei <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">Apex AI</span>
      </h2>
      <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        In den nächsten 90 Sekunden kalibrieren wir die Plattform exakt auf deinen Trading-Stil,
        deine Risikobereitschaft und deine bevorzugten Informationsquellen.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2 max-w-md mx-auto">
        {[
          { i: TrendingUp, l: "Personalisierte Signale" },
          { i: Newspaper, l: "Kuratierte News" },
          { i: ShieldCheck, l: "Institutional-Grade" },
        ].map((b, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-background/40 p-3">
            <b.i className="h-4 w-4 text-primary mx-auto" />
            <div className="mt-1.5 text-[10px] text-muted-foreground">{b.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryStep({ a, ack, setAck }: { a: Answers; ack: boolean; setAck: (v: boolean) => void }) {
  const traderLabel = TRADER_TYPES.find((t) => t.v === a.trader_type)?.label ?? "—";
  const riskLabel = RISKS.find((r) => r.v === a.risk_level)?.label ?? "—";
  const expLabel = EXPERIENCE.find((e) => e.v === a.experience_level)?.label ?? "—";
  const ccy = CURRENCIES.find((c) => c.v === a.preferred_currency);
  const sourceLabels = useMemo(
    () => a.trusted_sources.map((s) => AGENCY_META[s].label),
    [a.trusted_sources],
  );

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" /> AI Profile Calibrated
        </div>
        <h2 className="mt-3 font-display text-xl sm:text-2xl font-bold tracking-tight">Dein Apex AI Trading-Profil</h2>
        <p className="mt-1 text-xs text-muted-foreground">Diese Konfiguration steuert ab sofort deine gesamte Plattform-Erfahrung.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <SummaryRow icon={Briefcase} label="Trader Type" value={traderLabel} />
        <SummaryRow icon={GraduationCap} label="Experience" value={expLabel} />
        <SummaryRow icon={ShieldCheck} label="Risk Profile" value={riskLabel} />
        <SummaryRow icon={Coins} label="Currency" value={ccy ? `${ccy.sym} ${ccy.v}` : "—"} />
        <SummaryRow icon={Globe2} label="Markets" value={a.markets.map((m) => MARKETS.find((x) => x.v === m)?.label).filter(Boolean).join(" · ") || "—"} />
        <SummaryRow icon={Newspaper} label="Trusted Sources" value={sourceLabels.join(" · ") || "—"} />
      </div>

      <div className="rounded-xl border border-border/50 bg-background/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <CircuitBoard className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">AI-Transparenz.</span>{" "}
            Unsere Engine analysiert Marktdaten, Volatilität, Sentiment und historische Muster, um
            probabilistische Insights zu generieren. Signale werden kontinuierlich rekalibriert,
            sobald sich Marktbedingungen ändern. Keine Garantie für zukünftige Performance.
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border bg-background accent-primary"
          />
          <span className="text-[11px] text-muted-foreground">Ich verstehe und stimme zu.</span>
        </label>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground line-clamp-2">{value}</div>
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{title}</h3>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground max-w-xl">{hint}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 2 | 3 | 4 | 5; children: React.ReactNode }) {
  const cls =
    cols === 5 ? "grid-cols-2 sm:grid-cols-5"
    : cols === 4 ? "grid-cols-2 sm:grid-cols-4"
    : cols === 3 ? "grid-cols-1 sm:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2";
  return <div className={`grid ${cls} gap-2`}>{children}</div>;
}

function Choice({ active, onClick, label, desc }: { active: boolean; onClick: () => void; label: string; desc?: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-all ${
        active
          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40 shadow-[0_0_24px_-12px_oklch(0.7_0.18_265)]"
          : "border-border/50 bg-background/30 hover:border-foreground/30"
      }`}
    >
      <div className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</div>
      {desc && <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{desc}</div>}
    </button>
  );
}
