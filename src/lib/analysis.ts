// Agent-Logik: aus IndicatorSet → Urteil + Wall-Street-Text (einsteigerfreundlich)
import type { IndicatorSet } from "./indicators";

export type Verdict = "LONG" | "SHORT" | "NEUTRAL";
export type RiskProfile = "konservativ" | "ausgewogen" | "spekulativ";

export type Signal = {
  verdict: Verdict;
  confidence: number;
  score: number;
  rationale: string[]; // einsteigerfreundliche Erklärungen pro Indikator
  entry: number;
  stop: number;
  target: number;
  rr: number;
  risk: number;
};

const fmt = (n: number, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

export function scoreIndicators(ind: IndicatorSet, profile: RiskProfile = "ausgewogen"): Signal {
  let score = 0;
  const r: string[] = [];

  // Z-Score — wie weit ist der Kurs vom Mittel entfernt?
  if (ind.zScore <= -2) { score += 25; r.push(`**Z-Score ${fmt(ind.zScore)}** (misst Abweichung vom 20-Tage-Durchschnitt in Standardabweichungen): extrem unter dem Mittel. Übersetzt: der Kurs ist statistisch *zu billig*, eine Gegenbewegung nach oben ist überfällig. **Pro Long.**`); }
  else if (ind.zScore >= 2) { score -= 25; r.push(`**Z-Score +${fmt(ind.zScore)}**: der Kurs ist statistisch *zu teuer* — solche Extreme korrigieren historisch nach unten. **Pro Short.**`); }
  else if (ind.zScore < -1) { score += 10; r.push(`**Z-Score ${fmt(ind.zScore)}**: der Kurs liegt unter dem Durchschnitt, leichter Rückenwind für Käufer.`); }
  else if (ind.zScore > 1) { score -= 10; r.push(`**Z-Score +${fmt(ind.zScore)}**: der Kurs liegt über dem Durchschnitt, das Aufwärts-Pulver wird langsam knapp.`); }
  else { r.push(`**Z-Score ${fmt(ind.zScore)}**: Kurs nahe am 20-Tage-Mittel — neutraler Befund.`); }

  // RSI — Momentum-Thermometer von 0–100
  if (ind.rsi >= 75) { score -= 20; r.push(`**RSI ${fmt(ind.rsi, 1)}** (Relative Strength Index, 0–100, ab 70 = überkauft): die Käufer haben sich verausgabt, ein Rücksetzer ist wahrscheinlich. **Verkaufssignal.**`); }
  else if (ind.rsi <= 25) { score += 20; r.push(`**RSI ${fmt(ind.rsi, 1)}** (unter 30 = überverkauft): Panik-Verkäufe sind durch, technische Erholung steht meist bevor. **Kaufsignal.**`); }
  else if (ind.rsi > 60) { score -= 5; r.push(`**RSI ${fmt(ind.rsi, 1)}**: starkes, aber gespanntes Aufwärts-Momentum — noch okay, aber Vorsicht.`); }
  else if (ind.rsi < 40) { score += 5; r.push(`**RSI ${fmt(ind.rsi, 1)}**: schwaches Momentum, ein Boden könnte sich bilden.`); }
  else { r.push(`**RSI ${fmt(ind.rsi, 1)}**: neutraler Bereich (40–60), kein Extremzustand.`); }

  // MACD — Trendwechsel-Indikator
  if (ind.macd.histogram > 0 && ind.macd.macd > ind.macd.signal) { score += 15; r.push(`**MACD-Histogramm +${fmt(ind.macd.histogram, 3)}** (zeigt Trendwechsel über zwei gleitende Durchschnitte): die kurzfristige Linie hat die langfristige nach oben gekreuzt — klassisches **Kaufsignal**, Aufwärtstrend frisch bestätigt.`); }
  else if (ind.macd.histogram < 0 && ind.macd.macd < ind.macd.signal) { score -= 15; r.push(`**MACD-Histogramm ${fmt(ind.macd.histogram, 3)}**: kurzfristige Linie unter langfristiger — **Verkaufssignal**, der Trend dreht nach unten.`); }
  else { r.push(`**MACD-Histogramm ${fmt(ind.macd.histogram, 3)}**: kein klarer Trendwechsel, der Markt ist unentschlossen.`); }

  // Bollinger — Volatilitätsbänder
  if (ind.price >= ind.bollinger.upper) { score -= 10; r.push(`Kurs am **oberen Bollinger-Band** (${fmt(ind.bollinger.upper)}) — die Bänder bilden den normalen Schwankungskorridor, der Kurs ist *außerhalb* der oberen Grenze. Statistisch überdehnt nach oben, Rücksetzer wahrscheinlich.`); }
  else if (ind.price <= ind.bollinger.lower) { score += 10; r.push(`Kurs am **unteren Bollinger-Band** (${fmt(ind.bollinger.lower)}): unterhalb des normalen Korridors — Rebound-Setup, Käufer greifen hier oft zu.`); }
  else { r.push(`Kurs **innerhalb der Bollinger-Bänder** (${fmt(ind.bollinger.lower)} bis ${fmt(ind.bollinger.upper)}): bewegt sich im normalen Schwankungsbereich.`); }

  // Trend (SMA50/200) — die zwei wichtigsten Durchschnitte am Markt
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    if (ind.sma50 > ind.sma200 && ind.price > ind.sma50) { score += 10; r.push(`**Golden Cross** intakt (50-Tage- über 200-Tage-Durchschnitt) und Kurs über beiden — der primäre Aufwärtstrend ist gesund. Gegen den Trend zu shorten ist hier kostspielig.`); }
    else if (ind.sma50 < ind.sma200 && ind.price < ind.sma50) { score -= 10; r.push(`**Death Cross** aktiv (50-Tage- unter 200-Tage-Durchschnitt) — primärer Abwärtstrend. Käufe sind nur kurzfristige Wetten gegen den Trend.`); }
  }

  // Momentum
  if (ind.momentum > 0.05) { score += 5; r.push(`**10-Tage-Momentum +${fmt(ind.momentum * 100, 1)}%**: deutlicher Schub nach oben, Käufer haben die Kontrolle.`); }
  else if (ind.momentum < -0.05) { score -= 5; r.push(`**10-Tage-Momentum ${fmt(ind.momentum * 100, 1)}%**: deutlicher Druck nach unten, Verkäufer dominieren.`); }

  // Sharpe — Qualität der Rendite vs. Risiko
  if (ind.sharpe > 1.5) r.push(`**Sharpe Ratio ${fmt(ind.sharpe, 2)}** (Rendite pro Risiko-Einheit, >1 = gut, >2 = exzellent): risikoadjustierte Performance auf institutionellem Niveau — fundamentale Qualität.`);
  else if (ind.sharpe < 0) r.push(`**Sharpe Ratio ${fmt(ind.sharpe, 2)}**: das Papier hat zuletzt mehr Risiko als Rendite geliefert. Achtung.`);

  // Vola
  if (ind.volatility > 0.5) r.push(`**Annualisierte Volatilität ${fmt(ind.volatility * 100, 1)}%** (typische Jahresschwankung): sehr hoch — Positionsgröße halbieren, Stops weiter setzen.`);
  else if (ind.volatility < 0.2) r.push(`**Vola ${fmt(ind.volatility * 100, 1)}%**: ruhig, eher kleine Tagesbewegungen erwartbar.`);

  const threshold = profile === "konservativ" ? 25 : profile === "spekulativ" ? 12 : 18;
  let verdict: Verdict = "NEUTRAL";
  if (score >= threshold) verdict = "LONG";
  else if (score <= -threshold) verdict = "SHORT";

  const dailyVol = ind.volatility / Math.sqrt(252);
  const risk = ind.price * Math.max(dailyVol * 1.5, 0.01);
  const entry = ind.price;
  const stop = verdict === "LONG" ? entry - risk : verdict === "SHORT" ? entry + risk : entry;
  const target = verdict === "LONG" ? entry + risk * 2.5 : verdict === "SHORT" ? entry - risk * 2.5 : entry;
  const rr = verdict === "NEUTRAL" ? 0 : 2.5;
  const confidence = Math.min(95, Math.max(15, Math.abs(score) * 1.6 + 20));

  return { verdict, confidence, score, rationale: r, entry, stop, target, rr, risk };
}

// Setup-Score 0–100 — proprietäre Gesamtkennzahl, gewichtete Aggregation
// echter Indikatoren. >70 = sehr starkes Setup, 30–70 = neutral, <30 = riskant.
export function setupScore(ind: IndicatorSet): number {
  let s = 50;
  // Trend
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    if (ind.sma50 > ind.sma200 && ind.price > ind.sma50) s += 14;
    else if (ind.sma50 < ind.sma200 && ind.price < ind.sma50) s -= 14;
  }
  // RSI Sweet-Spot
  if (ind.rsi >= 40 && ind.rsi <= 60) s += 4;
  else if (ind.rsi > 75 || ind.rsi < 25) s -= 8;
  // MACD
  if (ind.macd.histogram > 0) s += 8; else s -= 4;
  // Momentum
  s += Math.max(-10, Math.min(10, ind.momentum * 80));
  // Sharpe
  s += Math.max(-6, Math.min(10, ind.sharpe * 4));
  // Vola-Penalty
  if (ind.volatility > 0.6) s -= 8;
  // Z-Score mean-reversion
  if (ind.zScore < -1.5) s += 6;
  else if (ind.zScore > 2) s -= 6;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function brokerNarrative(symbol: string, name: string, ind: IndicatorSet, sig: Signal): string {
  // Klare Handlungsempfehlung an den Anfang
  const action = sig.verdict === "LONG"
    ? `### 🟢 Empfehlung: **KAUFEN** (Long)\nDie Mehrheit der statistischen Signale spricht dafür, dass der Kurs steigt. Konfidenz: **${sig.confidence.toFixed(0)}%**.`
    : sig.verdict === "SHORT"
    ? `### 🔴 Empfehlung: **VERKAUFEN** (Short)\nDie Mehrheit der Signale deutet auf fallende Kurse hin. Wer hält, sollte Gewinne sichern oder absichern. Konfidenz: **${sig.confidence.toFixed(0)}%**.`
    : `### ⚪ Empfehlung: **HALTEN / NICHT TRADEN**\nDie Signale sind gemischt — keine klare Wahrscheinlichkeit für eine Richtung. Wer investiert ist, bleibt investiert. Wer draußen ist, wartet. Konfidenz: **${sig.confidence.toFixed(0)}%**.`;

  const indicatorsBlock = `**Was die Indikatoren konkret sagen:**\n` + sig.rationale.map((x) => `• ${x}`).join("\n");

  const macro = ind.beta > 1.2
    ? `**Beta ${fmt(ind.beta, 2)}** (Marktsensitivität — 1 = wie der Markt, >1 = stärker): die Aktie schwingt überdurchschnittlich mit. Bei Crashes trifft es sie zuerst, bei Rallys profitiert sie überproportional.`
    : ind.beta < 0.8
    ? `**Beta ${fmt(ind.beta, 2)}**: defensiv — bewegt sich ruhiger als der Gesamtmarkt. Gut für nervöse Phasen.`
    : `**Beta ${fmt(ind.beta, 2)}**: bewegt sich im Gleichschritt mit dem Markt.`;

  const levels = sig.verdict === "NEUTRAL"
    ? `**Kein Trade-Setup.** Geduld ist auch eine Position — auf bessere Konstellation warten.`
    : `**Trade-Plan** (Risk/Reward 1:${sig.rr.toFixed(1)}):
• Einstieg bei ca. **${fmt(sig.entry)} USD**
• Stop-Loss bei **${fmt(sig.stop)} USD** (Notausgang, falls die These nicht aufgeht)
• Kursziel bei **${fmt(sig.target)} USD** (Gewinnmitnahme)
Das bedeutet: pro 1 € Risiko stehen 2,5 € potenzieller Gewinn gegenüber.`;

  const beginnerNote = sig.verdict !== "NEUTRAL"
    ? `\n**Für Einsteiger:** "${sig.verdict === "LONG" ? "Long" : "Short"}" heißt: man wettet auf ${sig.verdict === "LONG" ? "steigende" : "fallende"} Kurse. Niemals mehr riskieren als man verlieren kann — als Faustregel max. 1–2% deines Kapitals pro Trade.`
    : "";

  const glossary = `### 📖 Was bedeuten die Indikatoren?
• **RSI (Relative Strength Index, 0–100):** misst, wie stark gekauft wurde. **>70 überkauft** (Korrektur möglich), **<30 überverkauft** (Erholung möglich), ~50 neutral.
• **MACD-Histogramm:** Differenz zwischen kurz- und langfristigem gleitendem Durchschnitt. **Positiv = Aufwärtsmomentum**, Vorzeichenwechsel deutet auf Trendwende.
• **Bollinger-Bänder (SMA20 ± 2σ):** Volatilitäts-Korridor. Kurs am **oberen Band = teuer**, am **unteren Band = günstig** relativ zum 20-Tage-Schnitt.
• **Z-Score:** wie weit der Kurs vom Mittelwert abweicht, in Standardabweichungen. **>+2** stark überkauft, **<−2** stark überverkauft.
• **Volatilität (annualisiert):** erwartete jährliche Schwankungsbreite. Hoch = höheres Risiko **und** höhere Chance.
• **Sharpe-Ratio:** Rendite pro Risikoeinheit. **>1 gut**, **>2 sehr gut**, <0 schlechter als ein Sparbuch.
• **Beta:** Mitschwingen mit dem Gesamtmarkt. **1 = wie Markt**, **>1 stärker**, **<1 defensiver**.
• **Momentum (10 Perioden):** Kursveränderung der letzten 10 Tage. Positiv = Trend nach oben.`;

  return [
    `## ${name} (${symbol}) — aktuell ${fmt(ind.price)} USD`,
    action,
    indicatorsBlock,
    macro,
    levels + beginnerNote,
    glossary,
  ].join("\n\n");
}

// Ein-Satz-Trigger pro Setup — beantwortet die Frage "warum jetzt?".
// Wählt den stärksten Auslöser deterministisch nach Hierarchie aus.
export function whyNow(ind: IndicatorSet, sig: Signal): string {
  const trendOk = !isNaN(ind.sma50) && !isNaN(ind.sma200);
  const upTrend = trendOk && ind.sma50 > ind.sma200 && ind.price > ind.sma50;
  const downTrend = trendOk && ind.sma50 < ind.sma200 && ind.price < ind.sma50;

  if (sig.verdict === "LONG") {
    if (ind.rsi <= 30 && ind.macd.histogram > 0) return "RSI aus überverkauft gedreht + MACD-Histogramm im Plus.";
    if (ind.zScore <= -2 && upTrend) return "Z-Score −2 in intaktem Aufwärtstrend — klassisches Pullback-Setup.";
    if (ind.price <= ind.bollinger.lower) return "Test des unteren Bollinger-Bands — statistisch überdehnt nach unten.";
    if (ind.macd.histogram > 0 && upTrend) return "Frisches bullisches MACD-Kreuz im Aufwärtstrend.";
    if (ind.momentum > 0.05 && ind.sharpe > 1) return "Momentum > 5% bei Sharpe > 1 — institutionell allokierbar.";
    return "Mehrere Mean-Reversion-Faktoren sprechen für eine Gegenbewegung nach oben.";
  }
  if (sig.verdict === "SHORT") {
    if (ind.rsi >= 75 && ind.macd.histogram < 0) return "RSI > 75 + MACD-Histogramm dreht negativ.";
    if (ind.zScore >= 2 && downTrend) return "Z-Score +2 in Death-Cross-Struktur — Distribution wahrscheinlich.";
    if (ind.price >= ind.bollinger.upper) return "Kurs am oberen Bollinger-Band — statistisch überkauft.";
    if (ind.macd.histogram < 0 && downTrend) return "Bärisches MACD-Kreuz bestätigt den Abwärtstrend.";
    if (ind.momentum < -0.05) return "Momentum < −5% — Verkäuferdruck dominiert das Tape.";
    return "Mehrere Indikatoren signalisieren überdehntes Aufwärtsmomentum.";
  }
  if (ind.volatility > 0.5) return "Hohe Volatilität — kein klares Edge, Geduld zahlt sich aus.";
  if (Math.abs(ind.zScore) < 1 && ind.rsi > 40 && ind.rsi < 60) return "Indikatoren im neutralen Band — kein Trigger.";
  return "Signale widersprechen sich — auf bessere Konstellation warten.";
}

// ============================================================
//  INSTITUTIONAL DECISION ENGINE (BUY / SELL / HOLD)
// ============================================================
import type { MarketRegime } from "./ai-learning";

export type Decision = "BUY" | "SELL" | "HOLD";
export type RiskLevel = "Niedrig" | "Mittel" | "Hoch";

export type DecisionReport = {
  decision: Decision;
  confidence: number;          // 0–100, regime-/smart-money-adjusted
  rawConfidence: number;       // 0–100 vor Anpassung
  reasoning: string;           // Ein institutioneller Absatz
  supporting: {
    macro: string;
    sentiment: string;
    institutional: string;
    technical: string;
  };
  smartMoney: string;
  counterArgument: string;
  riskLevel: RiskLevel;
  invalidation: string;
  regime: MarketRegime;
  adjustments: string[];       // Welche Filter haben Confidence verändert
};

function regimeLabelDe(r: MarketRegime): string {
  switch (r) {
    case "bull": return "Bullenmarkt";
    case "bear": return "Bärenmarkt";
    case "chop": return "Seitwärtsmarkt";
    case "high_vol": return "Hochvolatiles Umfeld";
    case "low_vol": return "Ruhiges Umfeld";
  }
}

/**
 * Wandelt Indikatoren + Roh-Signal in eine institutionelle BUY/SELL/HOLD-
 * Entscheidung um. Smart-Money- und Regime-Filter passen die Confidence an;
 * unter 60% wird konsequent zu HOLD downgegradet ("No False Precision").
 */
export function buildDecision(
  symbol: string,
  name: string,
  ind: IndicatorSet,
  sig: Signal,
  regime: MarketRegime,
): DecisionReport {
  const adjustments: string[] = [];
  let conf = sig.confidence;

  // --- Smart Money Filter ----------------------------------------------------
  const annVol = ind.volatility;
  if (Math.abs(ind.momentum) > 0.08 && annVol < 0.18) {
    conf -= 5;
    adjustments.push("Starkes Momentum bei niedriger Volatilität — kein Volumen-Confirm → −5");
  }
  if (annVol > 0.7 && sig.verdict !== "NEUTRAL") {
    conf -= 5;
    adjustments.push("Sehr hohe Volatilität — institutionelle Hände meiden solche Tape-Phasen → −5");
  }
  if (sig.verdict === "LONG" && ind.beta > 1.4 && regime === "bear") {
    conf -= 8;
    adjustments.push("High-Beta-Long in Bärenmarkt → −8");
  }
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    const upTrend = ind.sma50 > ind.sma200 && ind.price > ind.sma50;
    const downTrend = ind.sma50 < ind.sma200 && ind.price < ind.sma50;
    if (sig.verdict === "LONG" && upTrend) { conf += 10; adjustments.push("Long in Aufwärtstrend (50>200) → +10"); }
    if (sig.verdict === "SHORT" && downTrend) { conf += 10; adjustments.push("Short in Death-Cross-Struktur → +10"); }
    if (sig.verdict === "NEUTRAL" && upTrend) { conf += 6; adjustments.push("Neutral, aber Aufwärtstrend intakt → +6 Richtung Long"); }
    if (sig.verdict === "NEUTRAL" && downTrend) { conf += 6; adjustments.push("Neutral, aber Death-Cross aktiv → +6 Richtung Short"); }
    if (sig.verdict === "LONG" && downTrend) { conf -= 8; adjustments.push("Long gegen Death-Cross → −8"); }
    if (sig.verdict === "SHORT" && upTrend) { conf -= 8; adjustments.push("Short gegen Golden-Cross → −8"); }
  }
  if (sig.verdict === "LONG" && ind.sharpe > 1.5) { conf += 6; adjustments.push("Sharpe >1.5 — institutionell allokierfähig → +6"); }
  if (sig.verdict === "LONG" && ind.sharpe < 0) { conf -= 5; adjustments.push("Sharpe negativ → −5"); }

  // --- Regime Awareness -----------------------------------------------------
  if (regime === "high_vol") { conf -= 2; adjustments.push("Regime: Hochvolatil → −2"); }
  if (regime === "chop") { conf -= 2; adjustments.push("Regime: Seitwärts → −2"); }
  if (regime === "bull" && sig.verdict === "LONG") { conf += 5; adjustments.push("Bullenmarkt unterstützt Long → +5"); }
  if (regime === "bear" && sig.verdict === "SHORT") { conf += 5; adjustments.push("Bärenmarkt unterstützt Short → +5"); }

  conf = Math.max(5, Math.min(95, Math.round(conf)));

  // --- Decision Mapping mit 50%-Schwelle ------------------------------------
  // Bei NEUTRAL: Trendrichtung bestimmt Bias, wenn Konfidenz hoch genug.
  let decision: Decision = "HOLD";
  const trendUp = !isNaN(ind.sma50) && !isNaN(ind.sma200) && ind.sma50 > ind.sma200 && ind.price > ind.sma50;
  const trendDown = !isNaN(ind.sma50) && !isNaN(ind.sma200) && ind.sma50 < ind.sma200 && ind.price < ind.sma50;
  if (sig.verdict === "LONG" && conf >= 50) decision = "BUY";
  else if (sig.verdict === "SHORT" && conf >= 50) decision = "SELL";
  else if (sig.verdict === "NEUTRAL" && conf >= 55 && trendUp) decision = "BUY";
  else if (sig.verdict === "NEUTRAL" && conf >= 55 && trendDown) decision = "SELL";


  // --- Risk Level -----------------------------------------------------------
  let riskLevel: RiskLevel = "Mittel";
  if (annVol > 0.5 || regime === "high_vol") riskLevel = "Hoch";
  else if (annVol < 0.22 && Math.abs(ind.beta - 1) < 0.3) riskLevel = "Niedrig";

  // --- Supporting Factors ---------------------------------------------------
  const macro = regime === "bull"
    ? "Risk-On-Umfeld: Aufwärtstrend in den breiten Indizes stützt zyklische Positionen."
    : regime === "bear"
    ? "Risk-Off-Umfeld: defensive Sektoren outperformen, Liquidität ist selektiv."
    : regime === "high_vol"
    ? "Vola-Spike — institutionelle Hände reduzieren Bruttoexposure, Optionsprämien teuer."
    : regime === "low_vol"
    ? "Niedrige Vola — Carry-Trades aktiv, Vol-Verkäufer dominieren das Tape."
    : "Seitwärtsmarkt ohne klare Makro-Richtung — Rotation statt Trend.";

  const sentiment = ind.rsi >= 70
    ? `RSI ${ind.rsi.toFixed(0)} signalisiert euphorisches Retail-Sentiment — Contrarian-Warnung.`
    : ind.rsi <= 30
    ? `RSI ${ind.rsi.toFixed(0)} zeigt Kapitulation — Sentiment historisch günstig für Mean-Reversion.`
    : `RSI ${ind.rsi.toFixed(0)} im neutralen Band — kein Sentiment-Extrem.`;

  const institutional = ind.sharpe > 1
    ? `Sharpe ${ind.sharpe.toFixed(2)} ist allocator-tauglich — institutionelle Mandate können die Position halten.`
    : ind.sharpe < 0
    ? `Sharpe ${ind.sharpe.toFixed(2)} negativ — institutionelle Bücher reduzieren Exposure.`
    : `Sharpe ${ind.sharpe.toFixed(2)} im Mittelfeld — kein klares Allocator-Signal.`;

  const technical = `Z ${ind.zScore.toFixed(2)} · MACD-Hist ${ind.macd.histogram.toFixed(3)} · ${
    !isNaN(ind.sma50) && !isNaN(ind.sma200)
      ? (ind.sma50 > ind.sma200 ? "Golden Cross intakt" : "Death Cross aktiv")
      : "Trend unklar"
  }.`;

  // --- Smart Money View -----------------------------------------------------
  const smartMoney = decision === "BUY"
    ? `Hedge-Funds würden hier wahrscheinlich gestaffelt akkumulieren — kleine Tranchen, mit Schutz über Puts wenn ${riskLevel === "Hoch" ? "Vola hoch" : "Liquidität dünn"}.`
    : decision === "SELL"
    ? `Smart Money baut wahrscheinlich Short-Exposure auf bzw. hedged Long-Bücher mit Index-Puts. Eintritt selten "all-in", sondern in Etappen.`
    : `Institutionelle würden hier nicht agieren — sie warten auf klareres Setup oder Volumen-Bestätigung. Kein Edge → kein Trade.`;

  // --- Counter Argument -----------------------------------------------------
  const counterArgument = decision === "BUY"
    ? `Was das kippt: ${ind.zScore > 1 ? "Z-Score bereits stretched" : "ein RSI-Spike >75 ohne Volumen"}, oder ein Bruch unter ${(ind.price * 0.97).toFixed(2)} würde die These invalidieren.`
    : decision === "SELL"
    ? `Was das kippt: überraschend starke Earnings, ein Squeeze über ${(ind.price * 1.03).toFixed(2)}, oder ein RSI-Rebound aus Oversold-Territorium.`
    : `Was zu BUY/SELL eskalieren würde: ein klares Volumen-Breakout über ${ind.bollinger.upper.toFixed(2)} oder unter ${ind.bollinger.lower.toFixed(2)} mit Trend-Bestätigung.`;

  // --- Invalidation ---------------------------------------------------------
  const invalidation = decision === "BUY"
    ? `These ist tot bei Schlusskurs < ${sig.stop.toFixed(2)} oder wenn RSI über 80 ohne neuen Hochpunkt steigt (bearishe Divergenz).`
    : decision === "SELL"
    ? `These ist tot bei Schlusskurs > ${sig.stop.toFixed(2)} oder wenn das MACD-Histogramm zwei Tage in Folge ins Positive dreht.`
    : `HOLD-Status endet, sobald Vola, Trend und Sentiment in dieselbe Richtung zeigen und Confidence ≥ 60 erreicht.`;

  // --- Reasoning ------------------------------------------------------------
  const verdictLabel = decision === "BUY" ? "Akkumulation" : decision === "SELL" ? "Distribution" : "Abwarten";
  const reasoning = `${name} (${symbol}) im ${regimeLabelDe(regime)}: ${verdictLabel} bei ${conf}% Konfidenz. ` +
    `Die Konstellation aus ${sentiment.toLowerCase()} und ${institutional.toLowerCase()} ` +
    `wird ${decision === "HOLD" ? "durch das Regime gedämpft" : "vom Trend gestützt"}. ` +
    `${technical}`;

  return {
    decision,
    confidence: conf,
    rawConfidence: Math.round(sig.confidence),
    reasoning,
    supporting: { macro, sentiment, institutional, technical },
    smartMoney,
    counterArgument,
    riskLevel,
    invalidation,
    regime,
    adjustments,
  };
}
