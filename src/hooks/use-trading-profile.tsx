import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type TradingGoal = "long_term" | "active" | "aggressive" | "learning";
export type RiskLevel = "low" | "medium" | "high";
export type UsageFreq = "daily" | "weekly" | "occasional";
export type Market = "stocks" | "etfs" | "crypto" | "forex" | "commodities" | "mixed";
export type AIStyle = "conservative" | "balanced" | "aggressive";
export type Region = "us" | "eu" | "global";
export type SignalFreq = "low" | "medium" | "high";
export type StrategyMode = "conservative" | "balanced" | "aggressive";
export type AITone = "professional" | "simplified";
export type ExplanationDepth = "brief" | "detailed";
export type AgeRange = "under_18" | "18_24" | "25_34" | "35_44" | "45_plus";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type TraderType =
  | "beginner_investor"
  | "long_term_investor"
  | "swing_trader"
  | "day_trader"
  | "options_trader"
  | "crypto_trader"
  | "mixed";
export type PreferredCurrency = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "JPY" | "CHF";

export type TradingProfile = {
  user_id: string;
  onboarding_completed: boolean;
  trading_goal: TradingGoal | null;
  risk_level: RiskLevel | null;
  usage_frequency: UsageFreq | null;
  markets: Market[];
  ai_style: AIStyle | null;
  region: Region;
  confidence_threshold: number;
  signal_frequency: SignalFreq;
  strategy_mode: StrategyMode;
  notif_realtime: boolean;
  notif_daily: boolean;
  notif_weekly: boolean;
  notif_breakout: boolean;
  notif_silent: boolean;
  ai_tone: AITone;
  explanation_depth: ExplanationDepth;
  show_reasoning: boolean;
  age_range: AgeRange | null;
  experience_level: ExperienceLevel | null;
  trader_type: TraderType | null;
  preferred_currency: PreferredCurrency;
  trusted_sources: string[];
  starter_watchlists: string[];
  ai_transparency_ack: boolean;
};

export const RISK_TO_MIN_CONFIDENCE: Record<RiskLevel, number> = {
  low: 80,
  medium: 60,
  high: 50,
};

export function useTradingProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TradingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_trading_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) {
      const { data: inserted } = await supabase
        .from("user_trading_profile")
        .insert({ user_id: user.id })
        .select("*")
        .single();
      setProfile(inserted as TradingProfile);
    } else {
      setProfile(data as TradingProfile);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<TradingProfile>) => {
      if (!user || !profile) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      await supabase
        .from("user_trading_profile")
        .update(patch)
        .eq("user_id", user.id);
    },
    [user, profile],
  );

  const completeOnboarding = useCallback(
    async (answers: {
      trading_goal: TradingGoal;
      risk_level: RiskLevel;
      usage_frequency: UsageFreq;
      markets: Market[];
      ai_style: AIStyle;
    }) => {
      if (!user) return;
      const confidence_threshold = RISK_TO_MIN_CONFIDENCE[answers.risk_level];
      const strategy_mode: StrategyMode = answers.ai_style;
      const signal_frequency: SignalFreq =
        answers.usage_frequency === "daily"
          ? "high"
          : answers.usage_frequency === "weekly"
            ? "medium"
            : "low";
      const patch: Partial<TradingProfile> = {
        ...answers,
        confidence_threshold,
        strategy_mode,
        signal_frequency,
        onboarding_completed: true,
      };
      setProfile((p) => (p ? { ...p, ...patch } as TradingProfile : p));
      await supabase
        .from("user_trading_profile")
        .update(patch)
        .eq("user_id", user.id);
    },
    [user],
  );

  return { profile, loading, update, completeOnboarding, reload: load };
}
