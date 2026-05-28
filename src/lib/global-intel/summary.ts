import type { Sentiment, RiskLevel, Strength, Trend, Mood } from "./types";
import { GLOBAL_SUMMARY_HEADLINE_EN } from "../global-intel-data.en";
import type { Lang } from "../i18n";

export const GLOBAL_SUMMARY = {
  sentiment: "mixed" as Sentiment,
  volatility: "medium" as RiskLevel,
  usd: "strong" as Strength,
  trend: "slowing" as Trend,
  mood: "uncertain" as Mood,
  headline:
    "US-Resilienz vs. globale Verlangsamung — USD bleibt fest, Rohstoffe gemischt, EM unter Druck.",
};

export function getGlobalHeadline(lang: Lang): string {
  return lang === "en" ? GLOBAL_SUMMARY_HEADLINE_EN : GLOBAL_SUMMARY.headline;
}
