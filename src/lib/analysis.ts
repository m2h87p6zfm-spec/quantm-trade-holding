// Agent-Logik: aus IndicatorSet → Urteil + Wall-Street-Text
import type { IndicatorSet } from "./indicators";

export type Verdict = "LONG" | "SHORT" | "NEUTRAL";
export type RiskProfile = "konservativ" | "ausgewogen" | "spekulativ";

export type Signal = {
  verdict: Verdict;
  confidence: number; // 0..100
  score: number; // -100..+100
  rationale: string[];
  entry: number;
  stop: number;
  target: number;
  rr: number;
  risk: number; // ATR-Proxy abs
};

const fmt = (n: number, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

export function scoreIndicators(ind: IndicatorSet, profile: RiskProfile = "ausgewogen"): Signal {
  let score = 0;
  const r: string[] = [];

  // Z-Score: extrem = Mean-Reversion-Signal
  if (ind.zScore <= -2) { score += 25; r.push(`Z-Score von ${fmt(ind.zScore)} signalisiert eine klare Überverkauft-Situation — statistisch reif für Mean Reversion.`); }
  else if (ind.zScore >= 2) { score -= 25; r.push(`Z-Score von +${fmt(ind.zScore)} signalisiert eine klare Überkauft-Situation. Der Markt ist überdehnt.`); }
  else if (ind.zScore < -1) { score += 10; r.push(`Z-Score bei ${fmt(ind.zScore)} — Kurs handelt unter dem statistischen Mittel.`); }
  else if (ind.zScore > 1) { score -= 10; r.push(`Z-Score bei +${fmt(ind.zScore)} — Kurs handelt über dem statistischen Mittel.`); }

  // RSI
  if (ind.rsi >= 75) { score -= 20; r.push(`RSI bei ${fmt(ind.rsi, 1)} bestätigt: überkauft, Momentum erschöpft.`); }
  else if (ind.rsi <= 25) { score += 20; r.push(`RSI bei ${fmt(ind.rsi, 1)} — kapituliertes Sentiment, Rebound-Setup.`); }
  else if (ind.rsi > 60) { score -= 5; r.push(`RSI bei ${fmt(ind.rsi, 1)} — konstruktives, aber gespanntes Momentum.`); }
  else if (ind.rsi < 40) { score += 5; r.push(`RSI bei ${fmt(ind.rsi, 1)} — schwaches Momentum, Bodenbildung möglich.`); }

  // MACD
  if (ind.macd.histogram > 0 && ind.macd.macd > ind.macd.signal) { score += 15; r.push(`MACD-Histogramm positiv (${fmt(ind.macd.histogram, 3)}) — Bull-Cross intakt.`); }
  else if (ind.macd.histogram < 0 && ind.macd.macd < ind.macd.signal) { score -= 15; r.push(`MACD bricht negativ durch die Signallinie (Histogramm ${fmt(ind.macd.histogram, 3)}).`); }

  // Bollinger
  if (ind.price >= ind.bollinger.upper) { score -= 10; r.push(`Kurs schließt am oberen Bollinger-Band (${fmt(ind.bollinger.upper)}) — statistisches Extrem.`); }
  else if (ind.price <= ind.bollinger.lower) { score += 10; r.push(`Kurs am unteren Bollinger-Band (${fmt(ind.bollinger.lower)}) — Squeeze-Setup für Reversion.`); }

  // Trend (SMA50/200)
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    if (ind.sma50 > ind.sma200 && ind.price > ind.sma50) { score += 10; r.push(`Golden-Cross-Struktur intakt, Kurs über SMA50 — primärer Aufwärtstrend bestätigt.`); }
    else if (ind.sma50 < ind.sma200 && ind.price < ind.sma50) { score -= 10; r.push(`Death-Cross-Struktur, Kurs unter SMA50 — primärer Abwärtstrend.`); }
  }

  // Momentum
  if (ind.momentum > 0.05) { score += 5; r.push(`10-Perioden-Momentum +${fmt(ind.momentum * 100, 1)}% — Käufer kontrollieren das Tape.`); }
  else if (ind.momentum < -0.05) { score -= 5; r.push(`10-Perioden-Momentum ${fmt(ind.momentum * 100, 1)}% — Verkäufer dominieren.`); }

  // Sharpe-Kontext
  if (ind.sharpe > 1.5) r.push(`Sharpe Ratio ${fmt(ind.sharpe, 2)} — risikoadjustierte Performance institutioneller Qualität.`);
  else if (ind.sharpe < 0) r.push(`Sharpe Ratio ${fmt(ind.sharpe, 2)} — risikoadjustierte Underperformance, Vorsicht.`);

  // Vol-Kontext
  if (ind.volatility > 0.5) r.push(`Annualisierte Vola ${fmt(ind.volatility * 100, 1)}% — Tail-Risk hoch, Positionsgröße reduzieren.`);

  // Risk-Profil moduliert Schwelle
  const threshold = profile === "konservativ" ? 25 : profile === "spekulativ" ? 12 : 18;

  let verdict: Verdict = "NEUTRAL";
  if (score >= threshold) verdict = "LONG";
  else if (score <= -threshold) verdict = "SHORT";

  // Entry/Stop/Target auf Basis Vola
  const dailyVol = ind.volatility / Math.sqrt(252);
  const risk = ind.price * Math.max(dailyVol * 1.5, 0.01);
  const entry = ind.price;
  const stop = verdict === "LONG" ? entry - risk : verdict === "SHORT" ? entry + risk : entry;
  const target = verdict === "LONG" ? entry + risk * 2.5 : verdict === "SHORT" ? entry - risk * 2.5 : entry;
  const rr = verdict === "NEUTRAL" ? 0 : 2.5;

  const confidence = Math.min(95, Math.max(15, Math.abs(score) * 1.6 + 20));

  return { verdict, confidence, score, rationale: r, entry, stop, target, rr, risk };
}

export function brokerNarrative(symbol: string, name: string, ind: IndicatorSet, sig: Signal): string {
  const verdictLine = sig.verdict === "LONG"
    ? `Das Setup schreit **LONG**.`
    : sig.verdict === "SHORT"
    ? `Das Setup schreit **SHORT**.`
    : `Keine klare Edge. **NEUTRAL** — die Hände bleiben am Steuer, aber nicht am Abzug.`;

  const levels = sig.verdict === "NEUTRAL"
    ? `Kein Trade. Geduld ist eine Position.`
    : `Risk/Reward von 1:${sig.rr.toFixed(1)} spricht für einen Einstieg ${sig.verdict === "LONG" ? "über" : "unter"} ${fmt(sig.entry)} mit Stop bei ${fmt(sig.stop)} und Ziel ${fmt(sig.target)}.`;

  const macro = ind.beta > 1.2
    ? `Beta von ${fmt(ind.beta, 2)} — überproportional sensitiv gegenüber dem breiten Markt. Bei Risk-Off zuerst getroffen.`
    : ind.beta < 0.8
    ? `Beta von ${fmt(ind.beta, 2)} — defensiv, geringere Marktsensitivität.`
    : `Beta von ${fmt(ind.beta, 2)} — bewegt sich im Gleichschritt mit dem Markt.`;

  return [
    `**${name} (${symbol})** — Spot bei ${fmt(ind.price)} USD.`,
    sig.rationale.join(" "),
    macro,
    verdictLine,
    levels,
    `Konfidenz: **${sig.confidence.toFixed(0)}%**.`,
  ].join(" ");
}
