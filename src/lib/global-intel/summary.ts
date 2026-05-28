import type { Sentiment, RiskLevel, Strength, Trend, Mood } from "./types";
import { GLOBAL_SUMMARY_HEADLINE_DE } from "./dict.de";
import { GLOBAL_SUMMARY_HEADLINE_EN } from "./dict.en";
import type { Lang } from "../i18n";

/** Language-neutral structural summary (sentiment / mood / trend / usd are enums). */
export const GLOBAL_SUMMARY = {
  sentiment: "mixed" as Sentiment,
  volatility: "medium" as RiskLevel,
  usd: "strong" as Strength,
  trend: "slowing" as Trend,
  mood: "uncertain" as Mood,
  /** @deprecated Use getGlobalHeadline(lang) or useGlobalHeadline(). */
  headline: GLOBAL_SUMMARY_HEADLINE_DE,
};

export function getGlobalHeadline(lang: Lang): string {
  return lang === "en" ? GLOBAL_SUMMARY_HEADLINE_EN : GLOBAL_SUMMARY_HEADLINE_DE;
}
