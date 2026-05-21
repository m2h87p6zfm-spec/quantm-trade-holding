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
