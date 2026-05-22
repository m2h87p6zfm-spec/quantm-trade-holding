// Tier-based portfolio sizing + a tiny window-event bus to trigger the Upgrade modal
// from anywhere (SymbolSearch, onboarding, EditPortfolioDialog, …).

import type { Tier } from "@/hooks/useSubscription";

export type UpgradeReason = "portfolio_limit" | "news_sources" | "ai_summaries";

export function getPortfolioLimit(tier: Tier): number {
  if (tier === "elite") return Infinity;
  if (tier === "pro") return 20;
  return 10;
}

export function limitLabel(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "unbegrenzt";
}

export type UpgradePromptDetail = {
  reason: UpgradeReason;
  currentTier: Tier;
  currentCount?: number;
  limit?: number;
};

export function promptUpgrade(detail: UpgradePromptDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UpgradePromptDetail>("apex:upgrade-prompt", { detail }));
}
