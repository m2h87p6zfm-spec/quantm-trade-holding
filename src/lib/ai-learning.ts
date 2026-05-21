// Client-safe Helpers (Regime-Detection, Scenario-Tagging)
import type { IndicatorSet } from "./indicators";

export type MarketRegime = "bull" | "bear" | "chop" | "high_vol" | "low_vol";

/** Bestimmt das Markt-Regime aus den Indikatoren eines Symbols. */
export function detectRegime(ind: IndicatorSet): MarketRegime {
  // High vol > 35% ann., low vol < 15%
  const annVol = ind.volatility * Math.sqrt(252);
  if (annVol > 0.35) return "high_vol";
  if (annVol < 0.15) return "low_vol";

  // Trend via SMA50 vs SMA200
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    if (ind.sma50 > ind.sma200 * 1.02 && ind.price > ind.sma50) return "bull";
    if (ind.sma50 < ind.sma200 * 0.98 && ind.price < ind.sma50) return "bear";
  }
  return "chop";
}

/** Erzeugt einen wiederfindbaren Tag, der das Setup-Cluster beschreibt. */
export function deriveScenarioTag(ind: IndicatorSet, regime: MarketRegime): string {
  const z = ind.zScore;
  const rsi = ind.rsi;
  let zBucket = "z_mid";
  if (z <= -2) zBucket = "z_extreme_low";
  else if (z <= -1) zBucket = "z_low";
  else if (z >= 2) zBucket = "z_extreme_high";
  else if (z >= 1) zBucket = "z_high";

  let rsiBucket = "rsi_mid";
  if (rsi <= 25) rsiBucket = "rsi_oversold";
  else if (rsi <= 40) rsiBucket = "rsi_weak";
  else if (rsi >= 75) rsiBucket = "rsi_overbought";
  else if (rsi >= 60) rsiBucket = "rsi_strong";

  const macd = ind.macd.histogram > 0 ? "macd_up" : ind.macd.histogram < 0 ? "macd_down" : "macd_flat";

  return `${regime}__${zBucket}__${rsiBucket}__${macd}`;
}

/** Menschenlesbares Label für ein Regime. */
export function regimeLabel(r: MarketRegime): string {
  switch (r) {
    case "bull": return "Bullenmarkt";
    case "bear": return "Bärenmarkt";
    case "chop": return "Seitwärts";
    case "high_vol": return "Hohe Volatilität";
    case "low_vol": return "Niedrige Volatilität";
  }
}
