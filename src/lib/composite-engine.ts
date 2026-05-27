// ============================================================================
//  COMPOSITE ENGINE — Multi-Factor Scoring, Regime-Adaptive Weighting,
//  Monte-Carlo (10k paths), Value-at-Risk / CVaR, Bayesian Updating
// ----------------------------------------------------------------------------
//  Diese Engine ist der quantitative Kern für Quantm Trade. Sie ersetzt die
//  alte Heuristik in analysis.ts NICHT, sondern liefert eine reichere zweite
//  Schicht, die durch buildDecision konsumiert wird. Ziel: ein institutionell
//  nutzbarer Composite-Score plus Signal-Metriken (Expected Return, Sharpe,
//  Win-Probability, R:R, VaR / CVaR), die jede Empfehlung untermauern.
//
//  Faktoren (15):
//    1  RSI momentum            9  Macro regime alignment
//    2  MACD trend             10 Geopolitical risk (sentiment proxy)
//    3  Bollinger / Volatility 11 Sentiment (RSI extreme contrarian)
//    4  Volume profile         12 Liquidity (ATR / price)
//    5  Mean-Reversion (Z)     13 Correlation drift vs benchmark
//    6  Broker consensus       14 Trend strength (ADX / SMA stack)
//    7  Sharpe quality         15 Forecast (Monte-Carlo edge vs spot)
//    8  Momentum (ROC10)
//
//  Alle Faktor-Scores sind auf [-1, +1] normalisiert (>0 bullish).
//  Gewichte werden je nach MarketRegime dynamisch angepasst.
// ============================================================================

import type { IndicatorSet } from "./indicators";
import type { MarketRegime } from "./ai-learning";

// ---------------------------------------------------------------------------
//  Faktor-Definitionen
// ---------------------------------------------------------------------------

export type FactorKey =
  | "momentum_rsi"
  | "trend_macd"
  | "volatility_bb"
  | "volume_profile"
  | "mean_reversion"
  | "broker_consensus"
  | "sharpe_quality"
  | "momentum_roc"
  | "macro_regime"
  | "geopolitical"
  | "sentiment"
  | "liquidity"
  | "correlation"
  | "trend_strength"
  | "forecast_edge";

export type FactorScore = {
  key: FactorKey;
  label: string;
  score: number;   // [-1, +1]
  weight: number;  // regime-adjusted
  rationale: string;
};

export type CompositeResult = {
  score: number;           // [-1, +1] (sum of weight*score)
  scoreNormalized: number; // 0–100 (50 = neutral)
  factors: FactorScore[];
  regime: MarketRegime;
  bullishCount: number;
  bearishCount: number;
};

const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
const safe = (n: number, f = 0) => (Number.isFinite(n) ? n : f);

// ---------------------------------------------------------------------------
//  Regime-adaptive Basisgewichte (Summe ≈ 1.0)
// ---------------------------------------------------------------------------
//  Die Idee: in einem Bullenmarkt zählen Trend-/Momentum-Faktoren stärker,
//  in High-Vol-Phasen rücken Risiko-/Liquiditäts-Faktoren in den Vordergrund.

const BASE_WEIGHTS: Record<FactorKey, number> = {
  momentum_rsi:     0.08,
  trend_macd:       0.08,
  volatility_bb:    0.06,
  volume_profile:   0.05,
  mean_reversion:   0.07,
  broker_consensus: 0.08,
  sharpe_quality:   0.07,
  momentum_roc:     0.06,
  macro_regime:     0.08,
  geopolitical:     0.04,
  sentiment:        0.05,
  liquidity:        0.05,
  correlation:      0.05,
  trend_strength:   0.10,
  forecast_edge:    0.08,
};

const REGIME_TILTS: Record<MarketRegime, Partial<Record<FactorKey, number>>> = {
  bull:     { trend_macd: +0.04, trend_strength: +0.04, momentum_roc: +0.03, mean_reversion: -0.03, sentiment: -0.02 },
  bear:     { mean_reversion: +0.04, sentiment: +0.03, volatility_bb: +0.03, trend_strength: -0.03, momentum_roc: -0.02 },
  chop:     { mean_reversion: +0.05, volatility_bb: +0.03, trend_macd: -0.03, trend_strength: -0.03 },
  high_vol: { liquidity: +0.04, volatility_bb: +0.05, sharpe_quality: +0.03, momentum_roc: -0.03, trend_macd: -0.03 },
  low_vol:  { trend_macd: +0.03, sharpe_quality: +0.03, broker_consensus: +0.02, volatility_bb: -0.03 },
};

export function regimeWeights(regime: MarketRegime): Record<FactorKey, number> {
  const w: Record<FactorKey, number> = { ...BASE_WEIGHTS };
  const tilt = REGIME_TILTS[regime] ?? {};
  for (const k of Object.keys(tilt) as FactorKey[]) {
    w[k] = Math.max(0.01, w[k] + (tilt[k] ?? 0));
  }
  // re-normalize to sum 1
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w) as FactorKey[]) w[k] = w[k] / sum;
  return w;
}

// ---------------------------------------------------------------------------
//  Optionale Inputs aus externen Quellen
// ---------------------------------------------------------------------------

export type ExternalInputs = {
  brokerConsensus?: number;   // -1..+1  (SELL..BUY)
  geopoliticalRisk?: number;  // 0..1     (0 ruhig, 1 Krise)
  volumeTrend?: number;       // -1..+1   (today vs avg-20)
  adxValue?: number;          // 0..100
  mcMedian?: number;          // monte-carlo median price
  spotPrice?: number;         // for forecast edge
  correlationDrift?: number;  // ΔCorrelation vs benchmark (last 20d)
};

// ---------------------------------------------------------------------------
//  Faktor-Berechnung
// ---------------------------------------------------------------------------

export function computeFactorScores(
  ind: IndicatorSet,
  regime: MarketRegime,
  ext: ExternalInputs = {},
): CompositeResult {
  const weights = regimeWeights(regime);
  const f: FactorScore[] = [];

  // 1) Momentum RSI — überverkauft positiv, überkauft negativ
  const rsiScore = clamp((50 - ind.rsi) / 25);
  f.push({ key: "momentum_rsi", label: "RSI Momentum", score: rsiScore, weight: weights.momentum_rsi,
    rationale: `RSI ${ind.rsi.toFixed(1)} → ${rsiScore > 0 ? "Aufwärts-Reservoir" : "Käufer-Erschöpfung"}` });

  // 2) Trend MACD-Histogramm
  const macdScore = clamp(ind.macd.histogram / Math.max(0.5, Math.abs(ind.macd.macd) * 0.5));
  f.push({ key: "trend_macd", label: "MACD Trend", score: macdScore, weight: weights.trend_macd,
    rationale: `MACD-Hist ${ind.macd.histogram.toFixed(3)}` });

  // 3) Bollinger / Volatilität — am unteren Band positiv (mean-rev)
  const bbCenter = ind.bollinger.middle || ind.price;
  const bbRel = (ind.price - bbCenter) / Math.max(1e-6, (ind.bollinger.upper - bbCenter));
  const bbScore = clamp(-bbRel); // unter Center = bullish
  f.push({ key: "volatility_bb", label: "Bollinger Position", score: bbScore, weight: weights.volatility_bb,
    rationale: `Bollinger-relativ ${(bbRel * 100).toFixed(0)}%` });

  // 4) Volume profile — wenn extern verfügbar; sonst neutral
  const vol = clamp(ext.volumeTrend ?? 0);
  f.push({ key: "volume_profile", label: "Volume Profile", score: vol, weight: weights.volume_profile,
    rationale: ext.volumeTrend != null ? `Volumen-Trend ${(vol * 100).toFixed(0)}%` : "Volumen neutral (keine Quelle)" });

  // 5) Mean-Reversion Z-Score (negiert: z<0 → bullish)
  const zScore = clamp(-ind.zScore / 2);
  f.push({ key: "mean_reversion", label: "Mean Reversion (Z)", score: zScore, weight: weights.mean_reversion,
    rationale: `Z=${ind.zScore.toFixed(2)}σ` });

  // 6) Broker consensus
  const broker = clamp(ext.brokerConsensus ?? 0);
  f.push({ key: "broker_consensus", label: "Broker Consensus", score: broker, weight: weights.broker_consensus,
    rationale: ext.brokerConsensus != null ? `Konsens ${(broker * 100).toFixed(0)}%` : "Broker-Daten neutral" });

  // 7) Sharpe-Qualität
  const sharpeScore = clamp(ind.sharpe / 2);
  f.push({ key: "sharpe_quality", label: "Sharpe Quality", score: sharpeScore, weight: weights.sharpe_quality,
    rationale: `Sharpe ${ind.sharpe.toFixed(2)}` });

  // 8) ROC-Momentum
  const rocScore = clamp(ind.momentum * 10);
  f.push({ key: "momentum_roc", label: "Rate-of-Change", score: rocScore, weight: weights.momentum_roc,
    rationale: `ROC10 ${(ind.momentum * 100).toFixed(2)}%` });

  // 9) Macro / Regime alignment
  const macroMap: Record<MarketRegime, number> = { bull: 0.6, bear: -0.6, chop: 0, high_vol: -0.2, low_vol: 0.3 };
  f.push({ key: "macro_regime", label: "Macro Regime", score: macroMap[regime], weight: weights.macro_regime,
    rationale: `Regime: ${regime}` });

  // 10) Geopolitical risk (Risk-Off, je höher desto bearish)
  const geo = clamp(-(ext.geopoliticalRisk ?? 0.2) * 2 + 0.4);
  f.push({ key: "geopolitical", label: "Geopolitical Risk", score: geo, weight: weights.geopolitical,
    rationale: ext.geopoliticalRisk != null ? `Geo-Risiko ${(ext.geopoliticalRisk * 100).toFixed(0)}%` : "Geo-Risiko: Default 20%" });

  // 11) Sentiment — Contrarian an Extremen, neutral sonst
  let sentScore = 0;
  if (ind.rsi >= 75) sentScore = -0.6; // Euphorie → bearish
  else if (ind.rsi <= 25) sentScore = 0.6; // Panik → bullish
  f.push({ key: "sentiment", label: "Sentiment Contrarian", score: sentScore, weight: weights.sentiment,
    rationale: ind.rsi >= 75 ? "Retail-Euphorie" : ind.rsi <= 25 ? "Kapitulation" : "Sentiment ruhig" });

  // 12) Liquidity proxy — bb.width relativ
  const liq = clamp(0.5 - ind.bollinger.width * 2);
  f.push({ key: "liquidity", label: "Liquidity", score: liq, weight: weights.liquidity,
    rationale: `BB-Width ${(ind.bollinger.width * 100).toFixed(2)}%` });

  // 13) Correlation drift — Entkopplung vom Benchmark = idiosynkratisches Edge
  const corr = clamp(Math.abs(ext.correlationDrift ?? 0) * 2);
  f.push({ key: "correlation", label: "Correlation Drift", score: corr, weight: weights.correlation,
    rationale: ext.correlationDrift != null ? `Δρ ${(corr).toFixed(2)}` : "Korrelations-Drift n/a" });

  // 14) Trend-Stärke aus SMA-Stack + (optional) ADX
  let trendS = 0;
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    if (ind.sma50 > ind.sma200 && ind.price > ind.sma50) trendS = +0.7;
    else if (ind.sma50 < ind.sma200 && ind.price < ind.sma50) trendS = -0.7;
    else trendS = ind.price > ind.sma50 ? 0.2 : -0.2;
  }
  if (ext.adxValue != null) trendS = clamp(trendS * Math.min(1.5, ext.adxValue / 25));
  f.push({ key: "trend_strength", label: "Trend Strength", score: trendS, weight: weights.trend_strength,
    rationale: ext.adxValue != null ? `Trend × ADX ${ext.adxValue.toFixed(0)}` : "SMA-Stack" });

  // 15) Forecast edge — MC-Median vs Spot
  let forecast = 0;
  if (ext.mcMedian != null && ext.spotPrice != null && ext.spotPrice > 0) {
    forecast = clamp(((ext.mcMedian - ext.spotPrice) / ext.spotPrice) * 10);
  }
  f.push({ key: "forecast_edge", label: "Monte-Carlo Edge", score: forecast, weight: weights.forecast_edge,
    rationale: ext.mcMedian != null ? `MC-Median Δ ${(forecast * 10).toFixed(2)}%` : "Keine MC-Quelle" });

  const score = f.reduce((s, x) => s + x.score * x.weight, 0);
  const bullishCount = f.filter((x) => x.score > 0.1).length;
  const bearishCount = f.filter((x) => x.score < -0.1).length;
  return {
    score: clamp(score),
    scoreNormalized: Math.round((clamp(score) + 1) * 50),
    factors: f,
    regime,
    bullishCount,
    bearishCount,
  };
}

// ---------------------------------------------------------------------------
//  Monte-Carlo 10k Pfade + Win-Probability / Expected Return / VaR / CVaR
// ---------------------------------------------------------------------------

// Box-Muller (Standard-Normal)
const randn = () => {
  const u = Math.random() || 1e-12;
  const v = Math.random() || 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export type MonteCarloResult = {
  paths: number;
  days: number;
  spot: number;
  expectedPrice: number;
  expectedReturn: number;        // in % über horizon
  winProbability: number;        // P(S_T > spot)
  median: number;
  p05: number; p25: number; p75: number; p95: number;
  var95: number;                 // % loss at 95% conf
  cvar95: number;                // expected loss beyond VaR95
  sigmaUsed: number;             // ann.
  muUsed: number;                // ann.
};

export function monteCarloAdvanced(
  spot: number,
  muAnnual: number,
  sigmaAnnual: number,
  days = 30,
  paths = 10_000,
): MonteCarloResult {
  const dt = 1 / 252;
  const sigma = Math.max(1e-6, sigmaAnnual);
  const drift = (muAnnual - 0.5 * sigma * sigma) * dt;
  const vol = sigma * Math.sqrt(dt);
  const ends: number[] = new Array(paths);
  let wins = 0;
  for (let p = 0; p < paths; p++) {
    let S = spot;
    for (let d = 0; d < days; d++) {
      S = S * Math.exp(drift + vol * randn());
    }
    if (S > spot) wins++;
    ends[p] = S;
  }
  ends.sort((a, b) => a - b);
  const q = (pp: number) => ends[Math.min(ends.length - 1, Math.max(0, Math.floor(pp * ends.length)))];
  const mean = ends.reduce((s, v) => s + v, 0) / ends.length;
  const median = q(0.5);
  // VaR / CVaR auf Returns
  const returns = ends.map((e) => (e - spot) / spot);
  returns.sort((a, b) => a - b);
  const cut95 = Math.max(1, Math.floor(returns.length * 0.05));
  const tail = returns.slice(0, cut95);
  const var95 = -returns[cut95 - 1];
  const cvar95 = -tail.reduce((s, v) => s + v, 0) / tail.length;
  return {
    paths, days, spot,
    expectedPrice: mean,
    expectedReturn: (mean - spot) / spot,
    winProbability: wins / paths,
    median, p05: q(0.05), p25: q(0.25), p75: q(0.75), p95: q(0.95),
    var95: Math.max(0, var95), cvar95: Math.max(0, cvar95),
    sigmaUsed: sigma, muUsed: muAnnual,
  };
}

// ---------------------------------------------------------------------------
//  Bayesian Updating — Prior + Likelihood-Ratio → Posterior-Probability
// ---------------------------------------------------------------------------

/**
 *  posterior = (prior * LR) / (prior * LR + (1 - prior))
 *  LR > 1  : Evidenz stützt Hypothese (bullish)
 *  LR < 1  : Evidenz dagegen
 */
export function bayesianUpdate(priorProbability: number, likelihoodRatio: number): number {
  const p = Math.max(1e-6, Math.min(1 - 1e-6, priorProbability));
  const lr = Math.max(1e-6, likelihoodRatio);
  return (p * lr) / (p * lr + (1 - p));
}

/** Aus einem Composite-Score [-1..+1] eine Prior-Wahrscheinlichkeit für „BUY ist richtig" ableiten. */
export function compositeToPrior(score: number): number {
  // map [-1..+1] → [0.1..0.9] mit Sigmoid-Charakter
  return 1 / (1 + Math.exp(-score * 3));
}

// ---------------------------------------------------------------------------
//  Signal-Metriken (Expected Return, Sharpe, Win-Prob, R:R)
// ---------------------------------------------------------------------------

export type SignalMetrics = {
  expectedReturnPct: number;     // 30d
  expectedSharpe: number;        // annualisiert
  winProbability: number;        // 0..1
  riskRewardRatio: number;       // >1 = mehr Chance als Risiko
  var95Pct: number;
  cvar95Pct: number;
  posteriorBuyProb: number;      // nach Bayes
  monteCarloPaths: number;
  horizonDays: number;
};

export function computeSignalMetrics(
  ind: IndicatorSet,
  composite: CompositeResult,
  mc: MonteCarloResult,
): SignalMetrics {
  // Sharpe-Estimate aus MC: E[r]/σ_horizon × √(252/horizon)
  const horizonSigma = mc.sigmaUsed * Math.sqrt(mc.days / 252);
  const expectedSharpe = horizonSigma > 0
    ? (mc.expectedReturn / horizonSigma) * Math.sqrt(252 / mc.days)
    : 0;
  // R:R — Erwartungswert pos. Tail vs neg. Tail
  const upside = Math.max(0, mc.p75 - mc.spot) / mc.spot;
  const downside = Math.max(1e-6, (mc.spot - mc.p25) / mc.spot);
  const rr = upside / downside;
  // Bayes — Composite als Prior, MC-Win-Prob als Likelihood
  const prior = compositeToPrior(composite.score);
  const lr = mc.winProbability / Math.max(0.05, 1 - mc.winProbability);
  const posterior = bayesianUpdate(prior, lr);

  return {
    expectedReturnPct: safe(mc.expectedReturn * 100),
    expectedSharpe: safe(expectedSharpe),
    winProbability: safe(mc.winProbability),
    riskRewardRatio: safe(rr),
    var95Pct: safe(mc.var95 * 100),
    cvar95Pct: safe(mc.cvar95 * 100),
    posteriorBuyProb: safe(posterior),
    monteCarloPaths: mc.paths,
    horizonDays: mc.days,
  };
}

// ---------------------------------------------------------------------------
//  High-Level: alles aus IndicatorSet + Regime herleiten
// ---------------------------------------------------------------------------

export type CompositeAnalysis = {
  composite: CompositeResult;
  monteCarlo: MonteCarloResult;
  metrics: SignalMetrics;
};

export function analyzeComposite(
  ind: IndicatorSet,
  regime: MarketRegime,
  ext: ExternalInputs = {},
  opts: { horizonDays?: number; paths?: number; muOverride?: number } = {},
): CompositeAnalysis {
  const composite = computeFactorScores(ind, regime, ext);
  // μ-Schätzung: konservativ aus Sharpe & Volatilität (μ = Sharpe·σ + rf-proxy)
  const mu = opts.muOverride ?? (ind.sharpe * ind.volatility + 0.035);
  const mc = monteCarloAdvanced(
    ind.price,
    mu,
    Math.max(0.05, ind.volatility),
    opts.horizonDays ?? 30,
    opts.paths ?? 10_000,
  );
  // Forecast-Edge nachreichen, falls nicht von außen geliefert
  if (ext.mcMedian == null) {
    const forecastFactor = composite.factors.find((x) => x.key === "forecast_edge");
    if (forecastFactor) {
      forecastFactor.score = clamp(((mc.median - ind.price) / ind.price) * 10);
      forecastFactor.rationale = `MC-Median Δ ${(((mc.median - ind.price) / ind.price) * 100).toFixed(2)}%`;
      // re-aggregate
      composite.score = clamp(composite.factors.reduce((s, x) => s + x.score * x.weight, 0));
      composite.scoreNormalized = Math.round((composite.score + 1) * 50);
    }
  }
  const metrics = computeSignalMetrics(ind, composite, mc);
  return { composite, monteCarlo: mc, metrics };
}
