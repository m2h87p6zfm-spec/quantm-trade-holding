// Shared types for global intel data
export type RiskLevel = "low" | "medium" | "high";
export type Direction = "rising" | "stable" | "falling";
export type Trend = "expanding" | "slowing" | "recession";
export type Mood = "bullish" | "bearish" | "uncertain";
export type Sentiment = "risk-on" | "risk-off" | "mixed";
export type Strength = "weak" | "neutral" | "strong";

export type CountryIntel = {
  name: string;
  iso2: string;
  flag: string;
  risk: RiskLevel;
  summary: string;
  pivotalEvent: { title: string; year: string; why: string };
  geopolitics: {
    governmentStability: "Strong" | "Moderate" | "Weak";
    politicalRisk: "Low" | "Medium" | "High";
    tensions: string;
    policyDirection: "Pro-growth" | "Restrictive" | "Mixed" | "Unstable";
  };
  economy: {
    inflation: Direction;
    rates: "low" | "high" | "tightening" | "easing";
    gdp: "growing" | "slowing" | "recession-risk";
    fxVsUsd: "weakening" | "stable" | "strengthening";
  };
  impact: { equities: string; forex: string; commodities: string; sentiment: string };
  positives: string[];
  negatives: string[];
  newsKeywords: string[];
};

export type EventType = "negative" | "positive" | "watch";
export type GlobalEvent = {
  id: string;
  type: EventType;
  category: string;
  title: string;
  location: string;
  coords: [number, number];
  date: string;
  summary: string;
  newsQuery: string;
  impact: { fx?: string; commodities?: string; equities?: string; regions?: string };
};

export type RouteStatus = "stable" | "tense" | "disrupted";
export type TradeFlow = {
  id: string;
  kind: "trade" | "energy" | "commodity" | "supply";
  label: string;
  from: [number, number];
  to: [number, number];
  status: RouteStatus;
  note: string;
};

export type Tension = {
  id: string;
  from: string;
  to: string;
  level: RiskLevel;
  topic: string;
  impact: string;
};

export type FeedItem = {
  id: string;
  time: string;
  category: "FX" | "Commodities" | "Equities" | "Macro" | "Geopolitics" | "Supply";
  title: string;
  body: string;
  impact: RiskLevel;
};

export type CountryExtras = {
  influenceScore: number;
  influenceWhy: string;
  globalRole: string;
  strengthIndex: {
    government: "Strong" | "Moderate" | "Weak";
    policy: "High" | "Medium" | "Low";
    economy: "Strong" | "Medium" | "Weak";
    geopoliticalStability: number;
    investorConfidence: "High" | "Medium" | "Low";
  };
  transmission: string[];
};
