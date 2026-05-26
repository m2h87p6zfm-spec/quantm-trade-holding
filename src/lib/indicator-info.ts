// Indikator-Erklärungen für den Info-Button (ℹ️), dynamisch + ampelbasiert.
// Jeder Eintrag liefert: name, what (statisch), und compute(raw) → currentText, derivation, signal.

export type InfoSignal = "pos" | "neu" | "neg";

export type IndicatorInfoEntry = {
  name: string;
  what: string;
  compute: (raw: any) => { currentText: string; derivation: string; signal: InfoSignal };
};

function fmt(n: number, d = 2): string {
  if (n == null || !isFinite(n)) return "-";
  return n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number, d = 1): string {
  if (n == null || !isFinite(n)) return "-";
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
}

export const INDICATOR_INFO: Record<string, IndicatorInfoEntry> = {
  rsi: {
    name: "RSI (Relative Strength Index)",
    what: "Misst auf einer Skala von 0–100, ob eine Aktie überkauft oder überverkauft ist.",
    compute: (v: number) => {
      if (!isFinite(v)) return { currentText: "Kein Wert verfügbar.", derivation: "Über 70 = überkauft, unter 30 = überverkauft, 30–70 = neutral.", signal: "neu" };
      const currentText = `Ein RSI von ${fmt(v, 1)} bedeutet, dass die Aktie ${v >= 70 ? "klar im überkauften Bereich liegt. Korrekturrisiko erhöht." : v >= 60 ? "in den überkauften Bereich gerät, aber noch kein klares Verkaufssignal vorliegt." : v <= 30 ? "klar überverkauft ist, eine technische Erholung wird wahrscheinlicher." : v <= 40 ? "leicht in den überverkauften Bereich rutscht, aber noch ohne klares Kaufsignal." : "im neutralen Bereich liegt, weder überkauft noch überverkauft."}`;
      return {
        currentText,
        derivation: "Steigt der RSI über 70, gilt die Aktie als überkauft und ein Kursrückgang wird wahrscheinlicher. Fällt er unter 30, gilt sie als überverkauft und eine Erholung ist möglich.",
        signal: v <= 30 ? "pos" : v >= 70 ? "neg" : "neu",
      };
    },
  },
  stochRsi: {
    name: "Stochastic RSI",
    what: "Verfeinerte Variante des RSI. Misst Extreme noch präziser auf einer Skala von 0–100.",
    compute: (v: number) => ({
      currentText: `Aktueller Wert: ${fmt(v, 1)}, ${v >= 80 ? "stark überkauft." : v <= 20 ? "stark überverkauft." : "im neutralen Bereich."}`,
      derivation: "Über 80 = überkauft, unter 20 = überverkauft. Reagiert schneller als der normale RSI, aber anfälliger für Fehlsignale.",
      signal: v <= 20 ? "pos" : v >= 80 ? "neg" : "neu",
    }),
  },
  macd: {
    name: "MACD (Moving Average Convergence Divergence)",
    what: "Zeigt die Beziehung zweier gleitender Durchschnitte und signalisiert Trendwenden.",
    compute: (raw: { histogram: number; macd: number; signal: number }) => {
      const h = raw?.histogram ?? NaN;
      const bull = h > 0 && raw.macd > raw.signal;
      const bear = h < 0 && raw.macd < raw.signal;
      return {
        currentText: `Histogramm ${h >= 0 ? "+" : ""}${fmt(h, 3)}, ${bull ? "MACD über Signallinie, Aufwärtsmomentum bestätigt." : bear ? "MACD unter Signallinie, Abwärtsmomentum bestätigt." : "kein klarer Trendwechsel sichtbar."}`,
        derivation: "Positiver MACD = aufwärts Momentum. Negativer MACD = abwärts Momentum. Kreuzung der Signallinie = möglicher Trendwechsel.",
        signal: bull ? "pos" : bear ? "neg" : "neu",
      };
    },
  },
  bollinger: {
    name: "Bollinger Bänder",
    what: "Zeigen die Volatilität anhand eines Mittelwerts und zweier Bänder darüber und darunter.",
    compute: (raw: { price: number; lower: number; upper: number }) => {
      const { price, lower, upper } = raw;
      const atUpper = price >= upper;
      const atLower = price <= lower;
      return {
        currentText: `Kurs ${fmt(price)} liegt ${atUpper ? `über dem oberen Band (${fmt(upper)}), überdehnt nach oben.` : atLower ? `unter dem unteren Band (${fmt(lower)}), überdehnt nach unten.` : `im Korridor (${fmt(lower)} – ${fmt(upper)}).`}`,
        derivation: "Kurs nahe oberem Band = möglicherweise überkauft. Kurs nahe unterem Band = möglicherweise überverkauft. Enge Bänder = geringe Volatilität, oft vor einer starken Bewegung.",
        signal: atLower ? "pos" : atUpper ? "neg" : "neu",
      };
    },
  },
  sma20: {
    name: "Gleitender Durchschnitt 20 (SMA 20)",
    what: "Durchschnittlicher Schlusskurs der letzten 20 Handelstage, sehr kurzfristiger Trend.",
    compute: (raw: { price: number; sma: number }) => {
      const above = raw.price > raw.sma;
      return {
        currentText: `SMA 20 liegt bei ${fmt(raw.sma)}, Kurs ${above ? "darüber" : "darunter"} (${fmt(raw.price)}).`,
        derivation: "Kurs über SMA 20 = sehr kurzfristig bullisch. Kurs darunter = kurzfristige Schwäche.",
        signal: above ? "pos" : "neg",
      };
    },
  },
  sma50: {
    name: "Gleitender Durchschnitt 50 (MA50)",
    what: "Durchschnittlicher Schlusskurs der letzten 50 Handelstage, glättet kurzfristige Schwankungen.",
    compute: (raw: { price: number; sma: number }) => {
      const above = raw.price > raw.sma;
      return {
        currentText: `MA50 liegt bei ${fmt(raw.sma)}, Kurs ${above ? "darüber" : "darunter"} (${fmt(raw.price)}).`,
        derivation: "Kurs über MA50 = kurzfristiger Aufwärtstrend. Kurs unter MA50 = kurzfristiger Abwärtstrend.",
        signal: above ? "pos" : "neg",
      };
    },
  },
  sma200: {
    name: "Gleitender Durchschnitt 200 (MA200)",
    what: "Durchschnittlicher Schlusskurs der letzten 200 Handelstage, zeigt den langfristigen Trend.",
    compute: (raw: { price: number; sma200: number; sma50?: number }) => {
      const above = raw.price > raw.sma200;
      const golden = raw.sma50 != null && raw.sma50 > raw.sma200;
      const cross = raw.sma50 != null ? (golden ? ". Golden Cross aktiv (bullisch)." : ". Death Cross aktiv (bärisch).") : "";
      return {
        currentText: `MA200 liegt bei ${fmt(raw.sma200)}, Kurs ${above ? "darüber" : "darunter"} (${fmt(raw.price)}).${cross}`,
        derivation: "Kurs über MA200 = langfristiger Aufwärtstrend (bullisch). Darunter = bärisch. MA50 über MA200 = Golden Cross, darunter = Death Cross.",
        signal: above && (raw.sma50 == null || golden) ? "pos" : !above && (raw.sma50 == null || !golden) ? "neg" : "neu",
      };
    },
  },
  smaTrend: {
    name: "SMA-Trend (50 / 200)",
    what: "Verhältnis von MA50 zu MA200, definiert den primären Markttrend.",
    compute: (raw: { sma50: number; sma200: number; price: number }) => {
      const up = raw.sma50 > raw.sma200 && raw.price > raw.sma50;
      const down = raw.sma50 < raw.sma200 && raw.price < raw.sma50;
      return {
        currentText: `MA50 ${fmt(raw.sma50)} vs. MA200 ${fmt(raw.sma200)}, ${up ? "Golden Cross + Kurs über beiden." : down ? "Death Cross + Kurs unter beiden." : "Trend uneindeutig."}`,
        derivation: "Golden Cross (MA50 > MA200) = primärer Aufwärtstrend. Death Cross = primärer Abwärtstrend.",
        signal: up ? "pos" : down ? "neg" : "neu",
      };
    },
  },
  momentum: {
    name: "Momentum (10 Tage)",
    what: "Misst die prozentuale Kursveränderung über die letzten 10 Handelstage.",
    compute: (v: number) => ({
      currentText: `Aktuelles Momentum: ${fmtPct(v * 100)}, ${v > 0.05 ? "deutlicher Aufwärtsschub." : v > 0.02 ? "leicht positives Momentum." : v < -0.05 ? "deutlicher Abwärtsdruck." : v < -0.02 ? "leicht negatives Momentum." : "flach, keine ausgeprägte Bewegung."}`,
      derivation: "Positives Momentum (> +2 %) zeigt Käufer-Dominanz, negatives (< −2 %) Verkäufer-Dominanz. Werte nahe 0 = Seitwärtsphase.",
      signal: v > 0.02 ? "pos" : v < -0.02 ? "neg" : "neu",
    }),
  },
  volume: {
    name: "Volumen vs. Durchschnitt",
    what: "Zeigt das heutige Handelsvolumen relativ zum Durchschnitt der letzten Tage.",
    compute: (raw: { ratio: number }) => ({
      currentText: `Volumenverhältnis ${fmt(raw.ratio, 2)}×, ${raw.ratio >= 1.5 ? "deutlich überdurchschnittlich, starkes Interesse." : raw.ratio <= 0.6 ? "unterdurchschnittlich, wenig Überzeugung." : "im normalen Bereich."}`,
      derivation: "Hohes Volumen bei steigendem Kurs = starkes Kaufinteresse. Hohes Volumen bei fallendem Kurs = starker Verkaufsdruck. Niedriges Volumen = wenig Überzeugung hinter der Bewegung.",
      signal: raw.ratio >= 1.5 ? "pos" : raw.ratio <= 0.6 ? "neg" : "neu",
    }),
  },
  atr: {
    name: "ATR (Average True Range)",
    what: "Misst die durchschnittliche tägliche Kursschwankung, ein Maß für Volatilität.",
    compute: (raw: { atr: number; price: number }) => {
      const pct = (raw.atr / raw.price) * 100;
      return {
        currentText: `ATR ${fmt(raw.atr)} entspricht ${fmt(pct, 2)} % Tagesbewegung.`,
        derivation: "Hoher ATR = Aktie schwankt stark, höheres Risiko aber auch höhere Chancen. Niedriger ATR = ruhige Aktie, geringeres Risiko.",
        signal: "neu",
      };
    },
  },
  volatility: {
    name: "Volatilität (annualisiert)",
    what: "Standardabweichung der Tagesrenditen, hochgerechnet aufs Jahr. Maß für Schwankungsbreite.",
    compute: (v: number) => ({
      currentText: `Annualisierte Volatilität ${fmtPct(v * 100, 1)}, ${v > 0.5 ? "sehr hoch, Position kleiner halten." : v < 0.2 ? "niedrig, ruhiger Wert." : "moderat."}`,
      derivation: "Über 50 % = hohes Risiko, Positionsgröße reduzieren. Unter 20 % = defensiv und stabil. Werte dazwischen = Marktdurchschnitt.",
      signal: v > 0.5 ? "neg" : v < 0.2 ? "pos" : "neu",
    }),
  },
  zScore: {
    name: "Z-Faktor (Z-Score 20)",
    what: "Misst, wie weit der aktuelle Kurs vom statistischen 20-Tage-Mittel abweicht, in Standardabweichungen.",
    compute: (v: number) => ({
      currentText: `Z-Faktor ${v >= 0 ? "+" : ""}${fmt(v, 2)}, ${v >= 2 ? "statistisch ungewöhnlich hoch, Rückkehr zum Mittelwert wahrscheinlich." : v <= -2 ? "statistisch ungewöhnlich niedrig, Erholung wahrscheinlich." : Math.abs(v) >= 1 ? "auffällig, aber noch kein Extrem." : "im statistischen Normalbereich."}`,
      derivation: "Z-Faktor über +2 = Kurs statistisch zu hoch, Mean-Reversion nach unten überfällig. Unter −2 = Kurs zu niedrig, Erholung wahrscheinlich. Zwischen −1 und +1 = neutral.",
      signal: v <= -1 ? "pos" : v >= 1 ? "neg" : "neu",
    }),
  },
  sharpe: {
    name: "Sharpe Ratio",
    what: "Verhältnis von Rendite zu eingegangenem Risiko. Qualitätsmaß für ein Investment.",
    compute: (v: number) => ({
      currentText: `Sharpe Ratio ${fmt(v, 2)}, ${v > 1 ? "institutionell attraktive Qualität." : v < 0 ? "unattraktiv, Rendite kompensiert Risiko nicht." : "akzeptabel."}`,
      derivation: "Über 1,0 = sehr gutes Rendite/Risiko-Profil. Unter 0 = das Risiko wird nicht durch Rendite kompensiert.",
      signal: v > 1 ? "pos" : v < 0 ? "neg" : "neu",
    }),
  },
  beta: {
    name: "Beta",
    what: "Misst die Schwankung der Aktie relativ zum Gesamtmarkt (Markt = 1,0).",
    compute: (v: number) => ({
      currentText: `Beta ${fmt(v, 2)}, ${v > 1.2 ? "deutlich volatiler als der Markt (aggressiv)." : v < 0.8 ? "weniger volatil als der Markt (defensiv)." : "marktnah."}`,
      derivation: "Beta > 1,2 = stärkere Bewegungen als der Markt. Beta < 0,8 = ruhiger als der Markt. Hilft bei Positionsgrößen-Entscheidungen.",
      signal: v > 1.2 ? "neg" : v < 0.8 ? "pos" : "neu",
    }),
  },
  marketCap: {
    name: "Marktkapitalisierung",
    what: "Gesamtwert aller Aktien eines Unternehmens. Kurs × ausstehende Aktien.",
    compute: () => ({
      currentText: "Zeigt die Unternehmensgröße. Über 10 Mrd. = Large Cap, 2–10 Mrd. = Mid Cap, unter 2 Mrd. = Small Cap.",
      derivation: "Large Caps sind stabiler, Small Caps volatiler aber wachstumsstärker. Liquidität korreliert meist mit Marktkapitalisierung.",
      signal: "neu",
    }),
  },
  high52: {
    name: "52-Wochen-Hoch",
    what: "Höchster Kurs der letzten 12 Monate, wichtiger psychologischer Widerstand.",
    compute: () => ({
      currentText: "Aktien nahe am 52-W-Hoch zeigen Stärke; ein Ausbruch darüber gilt als bullisches Signal.",
      derivation: "Nähe zum ATH = Momentum-Stärke. Deutlich darunter = möglicher Wertbereich oder anhaltende Schwäche.",
      signal: "neu",
    }),
  },
  low52: {
    name: "52-Wochen-Tief",
    what: "Niedrigster Kurs der letzten 12 Monate, wichtiger psychologischer Support.",
    compute: () => ({
      currentText: "Nähe zum 52-W-Tief deutet auf Schwäche, kann aber auch eine antizyklische Kaufgelegenheit sein.",
      derivation: "Bricht der Kurs unter das 52-W-Tief = bärisches Signal. Hält der Support = potenzielle Bodenbildung.",
      signal: "neu",
    }),
  },
  price: {
    name: "Aktueller Kurs",
    what: "Letzter gehandelter Preis der Aktie.",
    compute: (raw: { changePct?: number }) => ({
      currentText: raw?.changePct != null ? `Tagesveränderung ${fmtPct(raw.changePct)}.` : "Live-Kurs der letzten Handelsperiode.",
      derivation: "Tagesveränderung in % zeigt kurzfristige Marktreaktion. Im Kontext der Indikatoren bewerten.",
      signal: raw?.changePct != null ? (raw.changePct >= 0 ? "pos" : "neg") : "neu",
    }),
  },
  pe: {
    name: "KGV (Kurs-Gewinn-Verhältnis)",
    what: "Wie viel Anleger pro 1 € Gewinn zahlen. Standard-Bewertungskennzahl.",
    compute: (v: number) => ({
      currentText: `KGV ${fmt(v, 1)}, ${v > 30 ? "hoch bewertet, Wachstumserwartung eingepreist." : v < 10 ? "günstig bewertet oder Marktskepsis." : "Marktdurchschnitt."}`,
      derivation: "Niedriges KGV = günstig oder problematisch. Hohes KGV = teuer oder hohe Wachstumserwartung. Immer im Branchenvergleich werten.",
      signal: v > 0 && v < 15 ? "pos" : v > 30 ? "neg" : "neu",
    }),
  },
  ps: {
    name: "KUV (Kurs-Umsatz-Verhältnis)",
    what: "Marktkapitalisierung im Verhältnis zum Jahresumsatz.",
    compute: (v: number) => ({
      currentText: `KUV ${fmt(v, 2)}, ${v > 10 ? "sehr hoch bewertet." : v < 1 ? "günstig bewertet." : "Marktdurchschnitt."}`,
      derivation: "Unter 1 = günstig. Über 10 = Wachstums-Premium nötig, um Bewertung zu rechtfertigen.",
      signal: v > 0 && v < 2 ? "pos" : v > 10 ? "neg" : "neu",
    }),
  },
  eps: {
    name: "EPS (Gewinn pro Aktie)",
    what: "Jahresgewinn pro ausstehender Aktie. Basis für KGV-Berechnung.",
    compute: (v: number) => ({
      currentText: `EPS ${fmt(v, 2)}, ${v > 0 ? "profitabel." : "Verlust pro Aktie."}`,
      derivation: "Steigendes EPS über mehrere Quartale = Qualitätssignal. Negatives EPS = Aktie ohne Gewinn (Wachstums- oder Krisen-Story).",
      signal: v > 0 ? "pos" : "neg",
    }),
  },
  generic: {
    name: "Indikator",
    what: "Kennzahl zur Bewertung des Wertpapiers.",
    compute: () => ({
      currentText: "Wird im Kontext der Gesamtanalyse interpretiert.",
      derivation: "Jeder Indikator liefert eine Teilperspektive, erst die Kombination ergibt ein robustes Bild.",
      signal: "neu",
    }),
  },
};

export type IndicatorKey = keyof typeof INDICATOR_INFO;

export function getIndicatorInfo(key: string, raw: any) {
  const entry = INDICATOR_INFO[key] ?? INDICATOR_INFO.generic;
  let computed;
  try {
    computed = entry.compute(raw);
  } catch {
    computed = { currentText: "-", derivation: entry.what, signal: "neu" as InfoSignal };
  }
  return { name: entry.name, what: entry.what, ...computed };
}
