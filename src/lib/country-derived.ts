// Derived intelligence over the static COUNTRIES registry.
// Pure, client-safe helpers — keeps global-intel.tsx focused on rendering.

import { useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio";
import type { CountryIntel } from "@/lib/global-intel-data";
import { COUNTRY_EXTRAS } from "@/lib/global-intel-data";

/* ─────────────────────────── Risk Score (0–100) ─────────────────────────── */

export type RiskScore = {
  score: number; // 0 (calm) → 100 (extreme stress)
  band: "low" | "medium" | "elevated" | "high";
  drivers: string[]; // 3 short bullets explaining the score
};

const RISK_WEIGHT: Record<"low" | "medium" | "high", number> = { low: 25, medium: 55, high: 80 };

export function computeRiskScore(country: CountryIntel): RiskScore {
  const extras = COUNTRY_EXTRAS[country.name];
  let score = RISK_WEIGHT[country.risk]; // base anchor
  const drivers: string[] = [];

  // ── Geopolitics ──
  if (country.geopolitics.politicalRisk === "High") { score += 8; drivers.push("Politisches Risiko: hoch"); }
  else if (country.geopolitics.politicalRisk === "Medium") { score += 3; }
  if (country.geopolitics.governmentStability === "Weak") { score += 7; drivers.push("Regierungsstabilität: schwach"); }
  else if (country.geopolitics.governmentStability === "Moderate") { score += 2; }
  if (country.geopolitics.policyDirection === "Unstable") { score += 6; drivers.push("Politikkurs: instabil"); }
  else if (country.geopolitics.policyDirection === "Restrictive") { score += 3; }

  // ── Economy ──
  if (country.economy.gdp === "recession-risk") { score += 8; drivers.push("BIP: Rezessionsrisiko"); }
  else if (country.economy.gdp === "slowing") { score += 3; drivers.push("BIP-Wachstum verlangsamt sich"); }
  if (country.economy.inflation === "rising") { score += 5; drivers.push("Inflation steigt"); }
  if (country.economy.fxVsUsd === "weakening") { score += 4; drivers.push("Währung schwächt sich vs USD ab"); }
  if (country.economy.rates === "tightening") { score += 3; }

  // ── Geopolitical stability inverse (extras) ──
  if (extras) {
    const inv = (10 - extras.strengthIndex.geopoliticalStability) * 1.2;
    score += inv;
    if (extras.strengthIndex.geopoliticalStability <= 4) {
      drivers.push("Geopol. Stabilität niedrig (Konflikt-/Sanktionsexposition)");
    }
  }

  // Clamp & dedupe
  score = Math.max(5, Math.min(100, Math.round(score)));
  const unique = Array.from(new Set(drivers));
  // Always show 3 — fill with positives if too few
  if (unique.length < 3) {
    const positives = country.positives.slice(0, 3 - unique.length).map((p) => `Puffer: ${p}`);
    unique.push(...positives);
  }

  const band: RiskScore["band"] =
    score >= 75 ? "high" : score >= 55 ? "elevated" : score >= 35 ? "medium" : "low";

  return { score, band, drivers: unique.slice(0, 3) };
}

export const RISK_BAND_COLOR: Record<RiskScore["band"], string> = {
  low: "oklch(0.72 0.10 155)",
  medium: "oklch(0.78 0.12 90)",
  elevated: "oklch(0.74 0.14 50)",
  high: "oklch(0.66 0.17 25)",
};
export const RISK_BAND_LABEL: Record<RiskScore["band"], string> = {
  low: "Niedrig",
  medium: "Mittel",
  elevated: "Erhöht",
  high: "Hoch",
};

/* ─────────────────────────── Heatmap value extractor ───────────────────────── */

export type HeatmapMode = "none" | "risk" | "influence" | "stability" | "inflation";

/** Returns a normalised intensity 0..1 for tinting a country polygon. */
export function heatmapValue(country: CountryIntel, mode: HeatmapMode): number | null {
  const extras = COUNTRY_EXTRAS[country.name];
  switch (mode) {
    case "none": return null;
    case "risk": return computeRiskScore(country).score / 100;
    case "influence": return extras ? extras.influenceScore / 10 : 0.3;
    case "stability":
      // Invert — lower stability = hotter
      return extras ? 1 - extras.strengthIndex.geopoliticalStability / 10 : 0.4;
    case "inflation":
      return country.economy.inflation === "rising" ? 0.9
        : country.economy.inflation === "stable" ? 0.45
        : 0.15;
  }
}

export const HEATMAP_LABEL: Record<HeatmapMode, string> = {
  none: "Aus",
  risk: "Risiko",
  influence: "Einfluss",
  stability: "Instabilität",
  inflation: "Inflation",
};

/** Hot palette (green → amber → red) shared across heatmap modes. */
export function heatColor(v: number): string {
  // v in 0..1 → hue from 155 (green) to 25 (red)
  const hue = 155 - v * 130;
  const chroma = 0.10 + v * 0.07;
  const light = 0.72 - v * 0.10;
  return `oklch(${light.toFixed(2)} ${chroma.toFixed(2)} ${hue.toFixed(0)})`;
}

/* ─────────────────────────── Tickers per country ─────────────────────────── */

export type CountryTickers = {
  equities: { symbol: string; name: string }[];
  fx?: { symbol: string; name: string };
  commodities?: { symbol: string; name: string }[];
};

/** Curated reference tickers — these are the most-watched proxies per country. */
const TICKERS_BY_ISO: Record<string, CountryTickers> = {
  US: {
    equities: [
      { symbol: "SPY", name: "S&P 500" },
      { symbol: "QQQ", name: "Nasdaq 100" },
      { symbol: "IWM", name: "Russell 2000" },
    ],
    fx: { symbol: "DXY", name: "USD Index" },
    commodities: [{ symbol: "GLD", name: "Gold" }, { symbol: "USO", name: "WTI" }],
  },
  CN: {
    equities: [
      { symbol: "FXI", name: "China Large-Cap" },
      { symbol: "MCHI", name: "MSCI China" },
      { symbol: "KWEB", name: "China Internet" },
    ],
    fx: { symbol: "USD/CNH", name: "Yuan offshore" },
    commodities: [{ symbol: "COPX", name: "Copper Miners" }],
  },
  DE: {
    equities: [
      { symbol: "EWG", name: "MSCI Germany" },
      { symbol: "^GDAXI", name: "DAX" },
      { symbol: "RHM.DE", name: "Rheinmetall" },
    ],
    fx: { symbol: "EUR/USD", name: "Euro" },
  },
  JP: {
    equities: [
      { symbol: "EWJ", name: "MSCI Japan" },
      { symbol: "^N225", name: "Nikkei 225" },
      { symbol: "DXJ", name: "Japan hedged" },
    ],
    fx: { symbol: "USD/JPY", name: "Yen" },
  },
  GB: {
    equities: [
      { symbol: "EWU", name: "MSCI UK" },
      { symbol: "^FTSE", name: "FTSE 100" },
    ],
    fx: { symbol: "GBP/USD", name: "Pound" },
  },
  FR: {
    equities: [{ symbol: "EWQ", name: "MSCI France" }, { symbol: "^FCHI", name: "CAC 40" }],
    fx: { symbol: "EUR/USD", name: "Euro" },
  },
  IN: {
    equities: [{ symbol: "INDA", name: "MSCI India" }, { symbol: "EPI", name: "India Earnings" }],
    fx: { symbol: "USD/INR", name: "Rupee" },
  },
  RU: {
    equities: [{ symbol: "RSX", name: "MSCI Russia (suspended)" }],
    fx: { symbol: "USD/RUB", name: "Ruble" },
    commodities: [{ symbol: "USO", name: "WTI" }, { symbol: "UNG", name: "Nat Gas" }],
  },
  BR: {
    equities: [{ symbol: "EWZ", name: "MSCI Brazil" }, { symbol: "^BVSP", name: "Bovespa" }],
    fx: { symbol: "USD/BRL", name: "Real" },
    commodities: [{ symbol: "SOYB", name: "Soybeans" }],
  },
  CA: {
    equities: [{ symbol: "EWC", name: "MSCI Canada" }, { symbol: "^GSPTSE", name: "TSX" }],
    fx: { symbol: "USD/CAD", name: "Loonie" },
    commodities: [{ symbol: "USO", name: "WTI" }],
  },
  SA: {
    equities: [{ symbol: "KSA", name: "MSCI Saudi" }],
    fx: { symbol: "USD/SAR", name: "Riyal" },
    commodities: [{ symbol: "BNO", name: "Brent" }],
  },
  KR: {
    equities: [{ symbol: "EWY", name: "MSCI Korea" }, { symbol: "^KS11", name: "KOSPI" }],
    fx: { symbol: "USD/KRW", name: "Won" },
  },
  MX: {
    equities: [{ symbol: "EWW", name: "MSCI Mexico" }],
    fx: { symbol: "USD/MXN", name: "Peso" },
  },
  AU: {
    equities: [{ symbol: "EWA", name: "MSCI Australia" }, { symbol: "^AXJO", name: "ASX 200" }],
    fx: { symbol: "AUD/USD", name: "Aussie" },
    commodities: [{ symbol: "PICK", name: "Metals & Mining" }],
  },
  AR: {
    equities: [{ symbol: "ARGT", name: "MSCI Argentina" }],
    fx: { symbol: "USD/ARS", name: "Peso" },
  },
  IT: { equities: [{ symbol: "EWI", name: "MSCI Italy" }], fx: { symbol: "EUR/USD", name: "Euro" } },
  ES: { equities: [{ symbol: "EWP", name: "MSCI Spain" }], fx: { symbol: "EUR/USD", name: "Euro" } },
  CH: { equities: [{ symbol: "EWL", name: "MSCI Switzerland" }], fx: { symbol: "USD/CHF", name: "Franc" } },
  TR: { equities: [{ symbol: "TUR", name: "MSCI Turkey" }], fx: { symbol: "USD/TRY", name: "Lira" } },
  ID: { equities: [{ symbol: "EIDO", name: "MSCI Indonesia" }], fx: { symbol: "USD/IDR", name: "Rupiah" } },
  VN: { equities: [{ symbol: "VNM", name: "MSCI Vietnam" }] },
  NG: { equities: [{ symbol: "NGE", name: "Nigeria" }] },
  AE: { equities: [{ symbol: "UAE", name: "MSCI UAE" }] },
  PL: { equities: [{ symbol: "EPOL", name: "MSCI Poland" }], fx: { symbol: "EUR/PLN", name: "Zloty" } },
  TW: { equities: [{ symbol: "EWT", name: "MSCI Taiwan" }, { symbol: "TSM", name: "TSMC ADR" }] },
};

export function tickersForCountry(iso2: string): CountryTickers | null {
  return TICKERS_BY_ISO[iso2.toUpperCase()] ?? null;
}

/* ─────────────────────────── Portfolio → countries ─────────────────────────── */

/**
 * Best-effort mapping: explicit suffixes (".DE", ".PA", ".L", ".HK", ".T")
 * plus known ADR/index symbols. Anything unknown defaults to US.
 */
const SUFFIX_TO_ISO: Record<string, string> = {
  DE: "DE", F: "DE", MU: "DE", BE: "DE",   // Xetra/regional DE
  PA: "FR",
  L: "GB", IL: "GB",
  AS: "NL", BR: "BE", LS: "PT", MC: "ES", MI: "IT", VI: "AT", ST: "SE", OL: "NO", HE: "FI", CO: "DK",
  SW: "CH", VX: "CH",
  T: "JP", TYO: "JP",
  HK: "CN", SS: "CN", SZ: "CN",
  KS: "KR", KQ: "KR",
  TW: "TW", TWO: "TW",
  NS: "IN", BO: "IN",
  AX: "AU",
  TO: "CA", V: "CA",
  SA: "BR",
  MX: "MX",
  WA: "PL",
  IS: "TR",
};

const SYMBOL_TO_ISO: Record<string, string> = {
  TSM: "TW", BABA: "CN", JD: "CN", PDD: "CN", NIO: "CN",
  NVO: "DK", ASML: "NL", SAP: "DE", SHOP: "CA",
  RIO: "AU", BHP: "AU",
};

export function tickerToIso(symbol: string): string {
  const sym = symbol.toUpperCase().trim();
  if (SYMBOL_TO_ISO[sym]) return SYMBOL_TO_ISO[sym];
  const dot = sym.lastIndexOf(".");
  if (dot > 0) {
    const suf = sym.slice(dot + 1);
    if (SUFFIX_TO_ISO[suf]) return SUFFIX_TO_ISO[suf];
  }
  return "US";
}

/** Hook: returns Set of ISO2 codes the user has exposure to. */
export function useUserCountryExposure(): Set<string> {
  const { positions } = usePortfolio();
  return useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) set.add(tickerToIso(p.symbol));
    return set;
  }, [positions]);
}
