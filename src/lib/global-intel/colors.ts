import type { RiskLevel, EventType, RouteStatus } from "./types";
import type { Lang } from "../i18n";

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "oklch(0.62 0.09 155)",
  medium: "oklch(0.74 0.10 78)",
  high: "oklch(0.62 0.13 25)",
};

export const RISK_LABEL: Record<RiskLevel, Record<Lang, string>> = {
  low: { en: "Stable", de: "Stabil" },
  medium: { en: "Watch", de: "Beobachten" },
  high: { en: "Elevated", de: "Erhöht" },
};

export const NEUTRAL_LAND = "oklch(0.30 0.012 260)";

export const EVENT_COLOR: Record<EventType, string> = {
  negative: "oklch(0.62 0.13 25)",
  positive: "oklch(0.62 0.09 155)",
  watch: "oklch(0.74 0.10 78)",
};

export const ROUTE_COLOR: Record<RouteStatus, string> = {
  stable: "oklch(0.65 0.06 200)",
  tense: "oklch(0.74 0.10 78)",
  disrupted: "oklch(0.62 0.13 25)",
};
