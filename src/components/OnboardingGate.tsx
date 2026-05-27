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
  Languages,
} from "lucide-react";

/* ─────────────────── Language (forced step 0) ─────────────────── */

type LangCode = "de" | "en";
const LANGUAGES: { v: LangCode; label: string; native: string; flag: string }[] = [
  { v: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { v: "en", label: "English", native: "English", flag: "🇬🇧" },
];

/* ─────────────────── Bilingual dictionary ─────────────────── */

type Tr = Record<string, { de: string; en: string }>;
const T: Tr = {
  brand: { de: "Quantm Trade · Onboarding", en: "Quantm Trade · Onboarding" },
  step: { de: "Schritt", en: "Step" },
  of: { de: "von", en: "of" },
  private: { de: "Privat & verschlüsselt", en: "Private & encrypted" },
  back: { de: "Zurück", en: "Back" },
  next: { de: "Weiter", en: "Next" },
  getStarted: { de: "Loslegen", en: "Get started" },
  continue: { de: "Weiter", en: "Continue" },
  activate: { de: "Quantm Trade aktivieren", en: "Activate Quantm Trade" },
  calibrating: { de: "Kalibriere…", en: "Calibrating…" },

  // Language step
  langTitle: { de: "Bitte wähle deine Sprache", en: "Please choose your language" },
  langHint: {
    de: "Diese Auswahl bestimmt die Sprache der gesamten Plattform. Du kannst sie jederzeit in den Einstellungen ändern.",
    en: "This selection determines the language of the entire platform. You can change it any time in settings.",
  },

  // Welcome step
  welcome: { de: "Willkommen bei ", en: "Welcome to " },
  welcomeHint: {
    de: "Bevor wir deine Plattform kalibrieren, lies bitte unsere rechtlichen Bedingungen und bestätige sie.",
    en: "Before we calibrate your platform, please review our legal terms and confirm them.",
  },
  riskNotice: { de: "Wichtiger Hinweis zum Risiko.", en: "Important risk notice." },
  riskBody: {
    de: "Quantm Trade stellt ausschließlich informationsbasierte Inhalte, Marktdaten und algorithmische Analysen bereit. Wir bieten keine Anlageberatung, Vermögensverwaltung oder individuelle Empfehlung im Sinne der MiFID II / WpHG. Der Handel mit Finanzinstrumenten birgt erhebliche Verlustrisiken, bis hin zum Totalverlust des eingesetzten Kapitals. Vergangene Performance ist kein Indikator für zukünftige Ergebnisse. AI-generierte Signale sind probabilistisch und können fehlerhaft sein. Treffe Handelsentscheidungen ausschließlich auf eigene Verantwortung.",
    en: "Quantm Trade provides information, market data and algorithmic analysis only. We do not provide investment advice, portfolio management or individual recommendations under MiFID II / WpHG. Trading financial instruments carries substantial risk of loss, up to the total loss of invested capital. Past performance is not an indicator of future results. AI-generated signals are probabilistic and can be wrong. Make trading decisions at your own responsibility.",
  },

  // Consent
  consentAge: {
    de: "Ich bestätige, dass ich mindestens 18 Jahre alt bin.",
    en: "I confirm I am at least 18 years old.",
  },
  consentTermsPre: { de: "Ich akzeptiere die ", en: "I accept the " },
  consentTermsLink: { de: "Allgemeinen Geschäftsbedingungen (AGB)", en: "Terms and Conditions" },
  consentTermsPost: { de: " von Quantm Trade.", en: " of Quantm Trade." },
  consentPrivacyPre: { de: "Ich habe die ", en: "I have read the " },
  consentPrivacyLink: { de: "Datenschutzerklärung", en: "Privacy Policy" },
  consentPrivacyPost: {
    de: " gelesen und stimme der Verarbeitung meiner Daten zu.",
    en: " and consent to the processing of my data.",
  },
  consentRisk: {
    de: "Ich habe die Risikohinweise verstanden und nehme zur Kenntnis, dass Quantm Trade keine Anlageberatung leistet und nicht für Handelsverluste haftet.",
    en: "I have understood the risk disclosures and acknowledge that Quantm Trade does not provide investment advice and is not liable for trading losses.",
  },

  // Steps
  ageTitle: { de: "In welcher Altersgruppe bist du?", en: "What age range are you in?" },
  ageHint: {
    de: "Wir nutzen das ausschließlich zur Personalisierung — niemals an Dritte weitergegeben.",
    en: "We use this purely for personalization — never shared with third parties.",
  },
  expTitle: { de: "Wie erfahren bist du an den Finanzmärkten?", en: "How experienced are you with financial markets?" },
  expHint: { de: "Bestimmt Tiefe der AI-Erklärungen und Komplexität des Dashboards.", en: "Sets the depth of AI explanations and the complexity of your dashboard." },
  traderTitle: { de: "Was für ein Trader bist du?", en: "What type of trader are you?" },
  traderHint: { de: "Priorisiert deine Signal-Feeds, Charts und Insights.", en: "Prioritizes your signal feeds, charts and insights." },
  ccyTitle: { de: "In welcher Währung soll die Plattform rechnen?", en: "What currency should the platform use?" },
  ccyHint: { de: "Wird überall im Dashboard, Watchlist, Portfolio und in AI-Insights angewendet.", en: "Applied across dashboard, watchlist, portfolio and AI insights." },
  riskTitle: { de: "Welches Risikolevel ist für dich passend?", en: "What level of risk are you comfortable with?" },
  riskHint: { de: "Steuert AI-Konfidenz-Threshold und Signal-Aggressivität.", en: "Controls AI confidence threshold and signal aggressiveness." },
  notifTitle: { de: "Welche Updates möchtest du erhalten?", en: "What updates would you like to receive?" },
  notifHint: { de: "Du kannst das jederzeit in den Einstellungen anpassen.", en: "You can adjust this any time in settings." },
  sourcesTitle: { de: "Wähle deine vertrauenswürdigen Quellen", en: "Choose your trusted financial sources" },
  sourcesHint: {
    de: "Diese Publisher dominieren deinen Haupt-News-Feed. Wichtige Headlines anderer Quellen erscheinen separat in der Sidebar.",
    en: "These publishers dominate your main news feed. Important headlines from other sources appear separately in the sidebar.",
  },
  starterTitle: { de: "Starter-Watchlists", en: "Starter watchlists" },
  starterHint: { de: "Optional. Ausgewählte Listen werden direkt in deiner Watchlist verfügbar.", en: "Optional. Selected lists will be available in your watchlist immediately." },
  symbolsWord: { de: "Symbole", en: "symbols" },

  // Summary
  summaryBadge: { de: "AI-Profil kalibriert", en: "AI Profile Calibrated" },
  summaryTitle: { de: "Dein Quantm Trade Profil", en: "Your Quantm Trade profile" },
  summarySub: { de: "Diese Konfiguration steuert ab sofort deine gesamte Plattform-Erfahrung.", en: "This configuration controls your entire platform experience from now on." },
  sumTrader: { de: "Trader-Typ", en: "Trader Type" },
  sumExp: { de: "Erfahrung", en: "Experience" },
  sumRisk: { de: "Risikoprofil", en: "Risk Profile" },
  sumCcy: { de: "Währung", en: "Currency" },
  sumMarkets: { de: "Märkte", en: "Markets" },
  sumSources: { de: "Vertrauensquellen", en: "Trusted Sources" },
  aiTransparency: { de: "AI-Transparenz.", en: "AI transparency." },
  aiTransparencyBody: {
    de: "Unsere Engine analysiert Marktdaten, Volatilität, Sentiment und historische Muster, um probabilistische Insights zu generieren. Signale werden kontinuierlich rekalibriert, sobald sich Marktbedingungen ändern. Keine Garantie für zukünftige Performance.",
    en: "Our engine analyzes market data, volatility, sentiment and historical patterns to generate probabilistic insights. Signals are continuously recalibrated as market conditions change. No guarantee of future performance.",
  },
  aiAck: { de: "Ich verstehe und stimme zu.", en: "I understand and agree." },

  // Option labels — Ages
  age_under_18: { de: "Unter 18", en: "Under 18" },
  age_18_24: { de: "18 – 24", en: "18 – 24" },
  age_25_34: { de: "25 – 34", en: "25 – 34" },
  age_35_44: { de: "35 – 44", en: "35 – 44" },
  age_45_plus: { de: "45+", en: "45+" },

  // Experience
  exp_beginner_l: { de: "Anfänger", en: "Beginner" },
  exp_beginner_d: { de: "Neu im Markt – klare, einfache Erklärungen", en: "New to markets – clear, simple explanations" },
  exp_intermediate_l: { de: "Fortgeschritten", en: "Intermediate" },
  exp_intermediate_d: { de: "Solide Grundlagen – ausgewogene Tiefe", en: "Solid foundations – balanced depth" },
  exp_advanced_l: { de: "Profi", en: "Advanced" },
  exp_advanced_d: { de: "Institutionelle Tiefe, Fachvokabular, volle Indikatoren", en: "Institutional depth, jargon, full indicators" },

  // Trader types
  tt_beginner_l: { de: "Einsteiger", en: "Beginner Investor" },
  tt_beginner_d: { de: "Sicheres Lernen, kuratierte Setups", en: "Safe learning, curated setups" },
  tt_long_l: { de: "Langfrist-Investor", en: "Long-term Investor" },
  tt_long_d: { de: "Makro-Insights, Portfolio-Fokus", en: "Macro insights, portfolio focus" },
  tt_swing_l: { de: "Swing-Trader", en: "Swing Trader" },
  tt_swing_d: { de: "Tage bis Wochen, Momentum-Signale", en: "Days to weeks, momentum signals" },
  tt_day_l: { de: "Day-Trader", en: "Day Trader" },
  tt_day_d: { de: "Intraday-Charts und Echtzeit-Signale", en: "Intraday charts and real-time signals" },
  tt_opt_l: { de: "Options-Trader", en: "Options Trader" },
  tt_opt_d: { de: "Volatilität, Greeks, Strategien", en: "Volatility, Greeks, strategies" },
  tt_crypto_l: { de: "Crypto-Trader", en: "Crypto Trader" },
  tt_crypto_d: { de: "24/7 Märkte, High-Vol Setups", en: "24/7 markets, high-vol setups" },
  tt_mixed_l: { de: "Mixed Strategy", en: "Mixed Strategy" },
  tt_mixed_d: { de: "Quer durch alle Anlageklassen", en: "Across all asset classes" },

  // Currencies
  ccy_USD: { de: "US-Dollar", en: "US Dollar" },
  ccy_EUR: { de: "Euro", en: "Euro" },
  ccy_GBP: { de: "Britisches Pfund", en: "British Pound" },
  ccy_AUD: { de: "Australischer Dollar", en: "Australian Dollar" },
  ccy_CAD: { de: "Kanadischer Dollar", en: "Canadian Dollar" },
  ccy_JPY: { de: "Japanischer Yen", en: "Japanese Yen" },
  ccy_CHF: { de: "Schweizer Franken", en: "Swiss Franc" },

  // Risks
  r_low_l: { de: "Niedriges Risiko", en: "Low Risk" },
  r_low_d: { de: "Konfidenz-Threshold ≥ 80%, defensive Setups", en: "Confidence threshold ≥ 80%, defensive setups" },
  r_med_l: { de: "Mittleres Risiko", en: "Medium Risk" },
  r_med_d: { de: "Konfidenz ≥ 60%, ausgewogene Frequenz", en: "Confidence ≥ 60%, balanced frequency" },
  r_high_l: { de: "Hohes Risiko", en: "High Risk" },
  r_high_d: { de: "Konfidenz ≥ 50%, mehr Setups, höhere Vola", en: "Confidence ≥ 50%, more setups, higher volatility" },

  // Notifications
  n_realtime_l: { de: "AI-Trading-Signale", en: "AI Trading Signals" },
  n_realtime_d: { de: "Echtzeit-Signale aus der Quant-Engine", en: "Real-time signals from the quant engine" },
  n_breakout_l: { de: "Breaking Market News", en: "Breaking Market News" },
  n_breakout_d: { de: "Marktbewegende Headlines", en: "Market-moving headlines" },
  n_daily_l: { de: "Portfolio & Tageszusammenfassung", en: "Portfolio & Daily Summary" },
  n_daily_d: { de: "Tägliche Zusammenfassung deiner Holdings", en: "Daily summary of your holdings" },
  n_weekly_l: { de: "Wochenreports", en: "Weekly Reports" },
  n_weekly_d: { de: "Wöchentliche Performance & Trends", en: "Weekly performance & trends" },
};

const t = (k: keyof typeof T, lang: LangCode) => T[k][lang];

/* ─────────────────── Option catalogs (use t-keys) ─────────────────── */

const AGES: { v: AgeRange; k: keyof typeof T }[] = [
  { v: "under_18", k: "age_under_18" },
  { v: "18_24", k: "age_18_24" },
  { v: "25_34", k: "age_25_34" },
  { v: "35_44", k: "age_35_44" },
  { v: "45_plus", k: "age_45_plus" },
];

const EXPERIENCE: { v: ExperienceLevel; lk: keyof typeof T; dk: keyof typeof T }[] = [
  { v: "beginner", lk: "exp_beginner_l", dk: "exp_beginner_d" },
  { v: "intermediate", lk: "exp_intermediate_l", dk: "exp_intermediate_d" },
  { v: "advanced", lk: "exp_advanced_l", dk: "exp_advanced_d" },
];

const TRADER_TYPES: { v: TraderType; lk: keyof typeof T; dk: keyof typeof T }[] = [
  { v: "beginner_investor", lk: "tt_beginner_l", dk: "tt_beginner_d" },
  { v: "long_term_investor", lk: "tt_long_l", dk: "tt_long_d" },
  { v: "swing_trader", lk: "tt_swing_l", dk: "tt_swing_d" },
  { v: "day_trader", lk: "tt_day_l", dk: "tt_day_d" },
  { v: "mixed", lk: "tt_mixed_l", dk: "tt_mixed_d" },
];

// Wir bieten ausschließlich Aktien & ETFs an — daher nur die zugehörigen
// Hauptwährungen (USD, EUR, CHF) zur Auswahl.
const CURRENCIES: { v: PreferredCurrency; sym: string; k: keyof typeof T }[] = [
  { v: "USD", sym: "$", k: "ccy_USD" },
  { v: "EUR", sym: "€", k: "ccy_EUR" },
  { v: "CHF", sym: "Fr.", k: "ccy_CHF" },
];

const RISKS: { v: RiskLevel; lk: keyof typeof T; dk: keyof typeof T }[] = [
  { v: "low", lk: "r_low_l", dk: "r_low_d" },
  { v: "medium", lk: "r_med_l", dk: "r_med_d" },
  { v: "high", lk: "r_high_l", dk: "r_high_d" },
];

type NotifKey = "notif_realtime" | "notif_daily" | "notif_weekly" | "notif_breakout";
const NOTIFS: { v: NotifKey; lk: keyof typeof T; dk: keyof typeof T }[] = [
  { v: "notif_realtime", lk: "n_realtime_l", dk: "n_realtime_d" },
  { v: "notif_breakout", lk: "n_breakout_l", dk: "n_breakout_d" },
  { v: "notif_daily", lk: "n_daily_l", dk: "n_daily_d" },
  { v: "notif_weekly", lk: "n_weekly_l", dk: "n_weekly_d" },
];

const STARTER_LISTS: { id: string; name: string; symbols: string[]; tagline: string }[] = [
  { id: "ai-tech", name: "AI & Technology", tagline: "NVDA, MSFT, GOOGL …", symbols: ["NVDA", "MSFT", "GOOGL", "META", "AMD", "AVGO", "TSM", "ASML", "PLTR"] },
  { id: "large-cap", name: "Large Cap Stocks", tagline: "AAPL, MSFT, AMZN …", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "BRK.B", "JPM", "V", "WMT", "JNJ"] },
  { id: "high-vol", name: "High Volatility", tagline: "TSLA, COIN, MSTR …", symbols: ["TSLA", "COIN", "MSTR", "ARKK", "RIOT", "MARA", "PLTR"] },
  { id: "dividend", name: "Dividend Stocks", tagline: "KO, JNJ, PG …", symbols: ["KO", "JNJ", "PG", "T", "VZ", "XOM", "MMM", "MO"] },
  { id: "energy", name: "Energy & Commodities", tagline: "XOM, CVX, XLE …", symbols: ["XOM", "CVX", "COP", "XLE", "USO", "GLD", "SLV"] },
];

const CURRENCY_TO_BASE: Record<PreferredCurrency, BaseCurrency> = {
  USD: "USD", EUR: "EUR", GBP: "GBP", CHF: "CHF",
  AUD: "USD", CAD: "USD", JPY: "USD",
};

/* ─────────────────── Wizard state ─────────────────── */

type Answers = {
  language?: LangCode;
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
  terms_accepted: boolean;
  privacy_accepted: boolean;
  risk_disclosure_accepted: boolean;
  age_confirmed: boolean;
};

const initialAnswers: Answers = {
  markets: ["stocks", "etfs"],
  notifications: { notif_realtime: true, notif_breakout: true, notif_daily: true, notif_weekly: false },
  trusted_sources: ["reuters", "bloomberg", "yahoo"],
  starter_watchlists: [],
  ai_transparency_ack: false,
  terms_accepted: false,
  privacy_accepted: false,
  risk_disclosure_accepted: false,
  age_confirmed: false,
};

function deriveProfile(a: Answers): { trading_goal: TradingGoal; ai_style: AIStyle; usage_freq: "daily" | "weekly" | "occasional" } {
  const tt = a.trader_type ?? "long_term_investor";
  const tradingGoal: TradingGoal =
    tt === "long_term_investor" || tt === "beginner_investor" ? "long_term"
    : tt === "day_trader" || tt === "options_trader" ? "aggressive"
    : "active";
  const aiStyle: AIStyle =
    a.risk_level === "low" ? "conservative"
    : a.risk_level === "high" ? "aggressive"
    : "balanced";
  const freq: "daily" | "weekly" | "occasional" =
    tt === "day_trader" || tt === "options_trader" || tt === "crypto_trader" ? "daily"
    : tt === "swing_trader" || tt === "mixed" ? "weekly"
    : "occasional";
  return { trading_goal: tradingGoal, ai_style: aiStyle, usage_freq: freq };
}

/* ─────────────────── Component ─────────────────── */

// Steps: 0 language · 1 welcome · 2 age · 3 exp · 4 trader · 5 currency · 6 risk · 7 notif · 8 sources · 9 starter · 10 summary
const TOTAL_STEPS = 11;

export function OnboardingGate() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, completeOnboarding } = useTradingProfile();
  const { update, createWatchlistWithSymbols } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(initialAnswers);
  const [saving, setSaving] = useState(false);

  const uiLang: LangCode = a.language ?? "de";
  const tt = (k: keyof typeof T) => t(k, uiLang);

  if (authLoading || loading || !user || !profile) return null;
  if (profile.onboarding_completed) return null;

  const canNext = (() => {
    if (step === 0) return !!a.language;
    if (step === 1) return a.terms_accepted && a.privacy_accepted && a.risk_disclosure_accepted && a.age_confirmed;
    if (step === 2) return !!a.age_range;
    if (step === 3) return !!a.experience_level;
    if (step === 4) return !!a.trader_type;
    if (step === 5) return !!a.preferred_currency;
    if (step === 6) return !!a.risk_level;
    if (step === 7) return Object.values(a.notifications).some(Boolean);
    if (step === 8) return a.trusted_sources.length > 0;
    if (step === 9) return true;
    if (step === 10) return a.ai_transparency_ack;
    return false;
  })();

  const pickLanguage = (lang: LangCode) => {
    setA((s) => ({ ...s, language: lang }));
    // Persist immediately so the rest of the app + AutoTranslate engine use it from now on.
    update({ language: lang });
  };

  const finish = () => {
    if (!a.experience_level || !a.trader_type || !a.preferred_currency || !a.risk_level || a.markets.length === 0) return;
    setSaving(true);
    const derived = deriveProfile(a);

    update({
      ...(a.language ? { language: a.language } : {}),
      currency: CURRENCY_TO_BASE[a.preferred_currency],
      experienceLevel:
        a.experience_level === "advanced" ? "pro" : a.experience_level === "beginner" ? "beginner" : "intermediate",
      newsSources: Object.fromEntries(
        NEWS_SOURCES.map((s) => [s, a.trusted_sources.includes(s)]),
      ) as Record<NewsSource, boolean>,
      notifBreakingNews: a.notifications.notif_breakout,
    });

    for (const id of a.starter_watchlists) {
      const preset = STARTER_LISTS.find((p) => p.id === id);
      if (preset) createWatchlistWithSymbols(preset.name, preset.symbols);
    }

    void completeOnboarding({
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

    navigate({ to: "/", replace: true });
  };

  const stepIcons = [Languages, Sparkles, Calendar, GraduationCap, Briefcase, Coins, ShieldCheck, Bell, Newspaper, Wallet, CircuitBoard];
  const StepIcon = stepIcons[step] ?? Sparkles;
  const progressPct = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        data-no-translate
        className="max-w-3xl border-border/40 bg-[oklch(0.13_0.02_265)]/95 p-0 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden flex flex-col max-h-[92vh] w-[calc(100vw-1rem)] sm:w-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Quantm Trade Onboarding</DialogTitle>

        {/* Ambient AI background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-border/30 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <StepIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {tt("brand")}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {tt("step")} {Math.min(step + 1, TOTAL_STEPS)} {tt("of")} {TOTAL_STEPS}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/40 bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" /> {tt("private")}
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
        <div className="relative px-4 sm:px-8 py-5 sm:py-8 min-h-[340px] flex-1 overflow-y-auto">
          {step === 0 && (
            <LanguageStep value={a.language} onPick={pickLanguage} />
          )}
          {step === 1 && (
            <WelcomeStep
              lang={uiLang}
              terms={a.terms_accepted}
              privacy={a.privacy_accepted}
              risk={a.risk_disclosure_accepted}
              age={a.age_confirmed}
              setTerms={(v) => setA((s) => ({ ...s, terms_accepted: v }))}
              setPrivacy={(v) => setA((s) => ({ ...s, privacy_accepted: v }))}
              setRisk={(v) => setA((s) => ({ ...s, risk_disclosure_accepted: v }))}
              setAge={(v) => setA((s) => ({ ...s, age_confirmed: v }))}
            />
          )}
          {step === 2 && (
            <Question title={tt("ageTitle")} hint={tt("ageHint")}>
              <Grid cols={5}>
                {AGES.map((g) => (
                  <Choice key={g.v} active={a.age_range === g.v} onClick={() => setA((s) => ({ ...s, age_range: g.v }))} label={tt(g.k)} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 3 && (
            <Question title={tt("expTitle")} hint={tt("expHint")}>
              <Grid cols={3}>
                {EXPERIENCE.map((g) => (
                  <Choice key={g.v} active={a.experience_level === g.v} onClick={() => setA((s) => ({ ...s, experience_level: g.v }))} label={tt(g.lk)} desc={tt(g.dk)} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 4 && (
            <Question title={tt("traderTitle")} hint={tt("traderHint")}>
              <Grid cols={2}>
                {TRADER_TYPES.map((g) => (
                  <Choice key={g.v} active={a.trader_type === g.v} onClick={() => setA((s) => ({ ...s, trader_type: g.v }))} label={tt(g.lk)} desc={tt(g.dk)} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 5 && (
            <Question title={tt("ccyTitle")} hint={tt("ccyHint")}>
              <Grid cols={4}>
                {CURRENCIES.map((g) => (
                  <Choice
                    key={g.v}
                    active={a.preferred_currency === g.v}
                    onClick={() => setA((s) => ({ ...s, preferred_currency: g.v }))}
                    label={`${g.sym} ${g.v}`}
                    desc={tt(g.k)}
                  />
                ))}
              </Grid>
            </Question>
          )}
          {step === 6 && (
            <Question title={tt("riskTitle")} hint={tt("riskHint")}>
              <Grid cols={3}>
                {RISKS.map((g) => (
                  <Choice key={g.v} active={a.risk_level === g.v} onClick={() => setA((s) => ({ ...s, risk_level: g.v }))} label={tt(g.lk)} desc={tt(g.dk)} />
                ))}
              </Grid>
            </Question>
          )}
          {step === 7 && (
            <Question title={tt("notifTitle")} hint={tt("notifHint")}>
              <div className="space-y-2">
                {NOTIFS.map((n) => {
                  const on = a.notifications[n.v];
                  return (
                    <button
                      type="button"
                      key={n.v}
                      onClick={() => setA((s) => ({ ...s, notifications: { ...s.notifications, [n.v]: !s.notifications[n.v] } }))}
                      className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition min-h-[56px] ${
                        on ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30" : "border-border/50 bg-background/30 hover:border-foreground/30"
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className={`text-sm font-semibold ${on ? "text-primary" : "text-foreground"}`}>{tt(n.lk)}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{tt(n.dk)}</div>
                      </div>
                      <div className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition ${on ? "bg-primary" : "bg-muted"}`}>
                        <div className={`h-4 w-4 rounded-full bg-background shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Question>
          )}
          {step === 8 && (
            <Question title={tt("sourcesTitle")} hint={tt("sourcesHint")}>
              <Grid cols={4}>
                {NEWS_SOURCES.map((src) => {
                  const meta = AGENCY_META[src];
                  const on = a.trusted_sources.includes(src);
                  return (
                    <button
                      type="button"
                      key={src}
                      onClick={() =>
                        setA((s) => ({
                          ...s,
                          trusted_sources: s.trusted_sources.includes(src)
                            ? s.trusted_sources.filter((x) => x !== src)
                            : [...s.trusted_sources, src],
                        }))
                      }
                      className={`group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition min-h-[88px] ${
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
            <Question title={tt("starterTitle")} hint={tt("starterHint")}>
              <Grid cols={3}>
                {STARTER_LISTS.map((l) => {
                  const on = a.starter_watchlists.includes(l.id);
                  return (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() =>
                        setA((s) => ({
                          ...s,
                          starter_watchlists: s.starter_watchlists.includes(l.id)
                            ? s.starter_watchlists.filter((x) => x !== l.id)
                            : [...s.starter_watchlists, l.id],
                        }))
                      }
                      className={`relative rounded-xl border p-3 text-left transition min-h-[92px] ${
                        on ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40" : "border-border/50 bg-background/30 hover:border-foreground/30"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${on ? "text-primary" : "text-foreground"}`}>{l.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{l.tagline}</div>
                      <div className="mt-2 font-mono text-[9px] text-muted-foreground/70">{l.symbols.length} {tt("symbolsWord")}</div>
                      {on && <Check className="absolute right-2 top-2 h-3 w-3 text-primary" />}
                    </button>
                  );
                })}
              </Grid>
            </Question>
          )}
          {step === 10 && (
            <SummaryStep
              a={a}
              lang={uiLang}
              ack={a.ai_transparency_ack}
              setAck={(v) => setA((s) => ({ ...s, ai_transparency_ack: v }))}
            />
          )}
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between gap-2 border-t border-border/30 bg-background/30 px-4 sm:px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={step === 0}
            className="min-h-[40px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {tt("back")}
          </Button>
          <div className="font-mono text-[10px] tabular-nums text-muted-foreground hidden sm:block">{progressPct}%</div>
          {step < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={goNext}
              disabled={!canNext}
              className="min-h-[40px]"
            >
              {step === 0 ? tt("continue") : step === 1 ? tt("getStarted") : tt("next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={finish}
              disabled={!canNext || saving}
              className="min-h-[40px] bg-gradient-to-r from-primary to-violet-500 text-primary-foreground"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              {saving ? tt("calibrating") : tt("activate")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function LanguageStep({ value, onPick }: { value?: LangCode; onPick: (v: LangCode) => void }) {
  // This step is fully bilingual (shows both languages side-by-side) since the
  // user has not yet picked. Once picked, the rest of the wizard is strictly
  // single-language.
  return (
    <div className="py-2">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/30 ring-1 ring-primary/40 mb-4">
          <Languages className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          Bitte wähle deine Sprache
          <span className="block text-base sm:text-lg font-normal text-muted-foreground mt-1">
            Please choose your language
          </span>
        </h2>
        <p className="mt-3 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Diese Auswahl steuert die gesamte Plattform. · This selection controls the entire platform.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
        {LANGUAGES.map((l) => {
          const active = value === l.v;
          return (
            <button
              type="button"
              key={l.v}
              onClick={() => onPick(l.v)}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition min-h-[72px] ${
                active
                  ? "border-primary/60 bg-primary/10 ring-2 ring-primary/40 shadow-[0_0_28px_-10px_oklch(0.7_0.18_265)]"
                  : "border-border/50 bg-background/30 hover:border-foreground/30 active:scale-[0.99]"
              }`}
            >
              <span className="text-3xl leading-none">{l.flag}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-base font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                  {l.native}
                </div>
                <div className="text-[11px] text-muted-foreground">{l.label}</div>
              </div>
              {active && <Check className="h-5 w-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WelcomeStep({
  lang,
  terms,
  privacy,
  risk,
  age,
  setTerms,
  setPrivacy,
  setRisk,
  setAge,
}: {
  lang: LangCode;
  terms: boolean;
  privacy: boolean;
  risk: boolean;
  age: boolean;
  setTerms: (v: boolean) => void;
  setPrivacy: (v: boolean) => void;
  setRisk: (v: boolean) => void;
  setAge: (v: boolean) => void;
}) {
  const tt = (k: keyof typeof T) => t(k, lang);
  return (
    <div className="py-2">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/30 ring-1 ring-primary/40 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          {tt("welcome")}
          <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">Quantm Trade</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {tt("welcomeHint")}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-[11px] leading-relaxed text-amber-100/90">
            <span className="font-semibold text-amber-200">{tt("riskNotice")}</span>{" "}
            {tt("riskBody")}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <ConsentRow checked={age} onChange={setAge} label={tt("consentAge")} />
        <ConsentRow
          checked={terms}
          onChange={setTerms}
          label={
            <>
              {tt("consentTermsPre")}
              <a href="/agb" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
                {tt("consentTermsLink")}
              </a>
              {tt("consentTermsPost")}
            </>
          }
        />
        <ConsentRow
          checked={privacy}
          onChange={setPrivacy}
          label={
            <>
              {tt("consentPrivacyPre")}
              <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
                {tt("consentPrivacyLink")}
              </a>
              {tt("consentPrivacyPost")}
            </>
          }
        />
        <ConsentRow checked={risk} onChange={setRisk} label={tt("consentRisk")} />
      </div>
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer select-none transition min-h-[52px] ${
      checked ? "border-primary/50 bg-primary/5" : "border-border/50 bg-background/30 hover:border-foreground/30"
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-background accent-primary"
      />
      <span className="text-xs leading-relaxed text-muted-foreground">{label}</span>
    </label>
  );
}

function SummaryStep({
  a,
  lang,
  ack,
  setAck,
}: {
  a: Answers;
  lang: LangCode;
  ack: boolean;
  setAck: (v: boolean) => void;
}) {
  const tt = (k: keyof typeof T) => t(k, lang);
  const traderLabel = useMemo(() => {
    const item = TRADER_TYPES.find((x) => x.v === a.trader_type);
    return item ? tt(item.lk) : "—";
  }, [a.trader_type, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const riskLabel = useMemo(() => {
    const item = RISKS.find((x) => x.v === a.risk_level);
    return item ? tt(item.lk) : "—";
  }, [a.risk_level, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const expLabel = useMemo(() => {
    const item = EXPERIENCE.find((x) => x.v === a.experience_level);
    return item ? tt(item.lk) : "—";
  }, [a.experience_level, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const ccy = CURRENCIES.find((c) => c.v === a.preferred_currency);
  const sourceLabels = useMemo(
    () => a.trusted_sources.map((s) => AGENCY_META[s].label),
    [a.trusted_sources],
  );

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" /> {tt("summaryBadge")}
        </div>
        <h2 className="mt-3 font-display text-xl sm:text-2xl font-bold tracking-tight">{tt("summaryTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{tt("summarySub")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <SummaryRow icon={Briefcase} label={tt("sumTrader")} value={traderLabel} />
        <SummaryRow icon={GraduationCap} label={tt("sumExp")} value={expLabel} />
        <SummaryRow icon={ShieldCheck} label={tt("sumRisk")} value={riskLabel} />
        <SummaryRow icon={Coins} label={tt("sumCcy")} value={ccy ? `${ccy.sym} ${ccy.v}` : "—"} />
        <SummaryRow icon={Globe2} label={tt("sumMarkets")} value={a.markets.length > 0 ? "Stocks · ETFs" : "—"} />
        <SummaryRow icon={Newspaper} label={tt("sumSources")} value={sourceLabels.join(" · ") || "—"} />
      </div>

      <div className="rounded-xl border border-border/50 bg-background/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <CircuitBoard className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{tt("aiTransparency")}</span>{" "}
            {tt("aiTransparencyBody")}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border bg-background accent-primary"
          />
          <span className="text-[11px] text-muted-foreground">{tt("aiAck")}</span>
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
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-all min-h-[56px] active:scale-[0.99] ${
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
