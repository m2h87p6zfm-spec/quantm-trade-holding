// Dynamischer Prompt-Builder: priorisiert Indikator-Befunde nach Stärke/Extremheit,
// damit APEX pro Frage einen indikatorspezifischen Fokus erhält statt generisch zu antworten.
import type { IndicatorSet } from "./indicators";
import type { MarketRegime } from "./ai-learning";
import { regimeLabel } from "./ai-learning";

export type IndicatorFinding = {
  key: "zscore" | "rsi" | "macd" | "bollinger" | "momentum" | "volatility" | "trend";
  severity: number; // 0..1 — Wie ausgeprägt ist der Befund?
  headline: string; // kurzer Fakt mit Zahl
  implication: string; // was bedeutet das für die Handlungsempfehlung
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function rankIndicatorFindings(ind: IndicatorSet, regime: MarketRegime): IndicatorFinding[] {
  const findings: IndicatorFinding[] = [];

  // Z-Score (20d) — Mean-Reversion-Signal
  {
    const z = ind.zScore;
    const sev = clamp01(Math.abs(z) / 3);
    let impl = "neutrales Mean-Reversion-Setup";
    if (z <= -2) impl = "statistisch überverkauft → mögliches Long-Reversal, aber Trend-Confirm prüfen";
    else if (z <= -1) impl = "unter dem 20-Tage-Mittel — antizyklische Long-Beobachtung";
    else if (z >= 2) impl = "statistisch überkauft → erhöhtes Pullback-Risiko, keine neuen Longs ohne Trigger";
    else if (z >= 1) impl = "über dem 20-Tage-Mittel — bestehende Longs eng absichern";
    findings.push({
      key: "zscore",
      severity: sev,
      headline: `Z-Score(20) = ${z.toFixed(2)} σ`,
      implication: impl,
    });
  }

  // RSI(14)
  {
    const r = ind.rsi;
    const sev = clamp01(Math.abs(r - 50) / 35);
    let impl = "neutraler Momentum-Bereich";
    if (r <= 25) impl = "tiefe Überverkauftheit — divergenz- und volumenbasiert auf Bottom-Trigger achten";
    else if (r <= 35) impl = "überverkauft — frühe Long-Beobachtung";
    else if (r >= 75) impl = "tiefe Überkauftheit — Distribution möglich, kein Trend-Folgen mehr";
    else if (r >= 65) impl = "starkes Momentum — Trendfolge erlaubt, Stop nachziehen";
    findings.push({
      key: "rsi",
      severity: sev,
      headline: `RSI(14) = ${r.toFixed(0)}`,
      implication: impl,
    });
  }

  // MACD-Histogramm
  {
    const h = ind.macd.histogram;
    const ref = Math.max(1e-6, Math.abs(ind.price) * 0.01);
    const sev = clamp01(Math.abs(h) / ref);
    const dir = h > 0 ? "bullish" : h < 0 ? "bearish" : "flach";
    const impl =
      h > 0
        ? "Momentum dreht/bestätigt nach oben — Long-Setups bevorzugt"
        : h < 0
          ? "Momentum dreht/bestätigt nach unten — Long-Einstiege zurückstellen"
          : "kein klares Momentum — auf Trigger warten";
    findings.push({
      key: "macd",
      severity: sev,
      headline: `MACD-Hist = ${h.toFixed(3)} (${dir})`,
      implication: impl,
    });
  }

  // Bollinger-Position
  {
    const { upper, lower, middle, width } = ind.bollinger;
    const range = Math.max(1e-6, upper - lower);
    const pos = (ind.price - lower) / range; // 0 = unteres Band, 1 = oberes
    const sev = clamp01(Math.max(0 - pos, pos - 1, Math.abs(pos - 0.5) - 0.4));
    let impl = `innerhalb des Bandes (Mittel ${middle.toFixed(2)}, Breite ${(width * 100).toFixed(1)} %)`;
    if (pos <= 0.05) impl = "am/unter dem unteren Band — Squeeze-Bounce oder Trendbruch nach unten";
    else if (pos >= 0.95) impl = "am/über dem oberen Band — Blow-off-Risiko, keine Chase-Longs";
    findings.push({
      key: "bollinger",
      severity: sev,
      headline: `BB-Position ${(pos * 100).toFixed(0)} % (Breite ${(width * 100).toFixed(1)} %)`,
      implication: impl,
    });
  }

  // Momentum (10d)
  {
    const m = ind.momentum;
    const sev = clamp01(Math.abs(m) / 0.15);
    const impl = m > 0.05 ? "klar positives 10-Tage-Momentum" : m < -0.05 ? "klar negatives 10-Tage-Momentum" : "kein nennenswertes Momentum";
    findings.push({
      key: "momentum",
      severity: sev,
      headline: `Momentum(10) = ${(m * 100).toFixed(1)} %`,
      implication: impl,
    });
  }

  // Volatilität (ann.)
  {
    const v = ind.volatility;
    const sev = clamp01(Math.abs(v - 0.2) / 0.3);
    const impl =
      v > 0.45
        ? "Volatilität extrem hoch → Positionsgröße halbieren, Stops weiter setzen"
        : v < 0.12
          ? "Volatilität niedrig → Squeeze-Setup, Breakout-Watch"
          : "Volatilität im Normalbereich";
    findings.push({
      key: "volatility",
      severity: sev,
      headline: `ann. Vola = ${(v * 100).toFixed(0)} %`,
      implication: impl,
    });
  }

  // Trend (SMA50 vs SMA200)
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    const diff = (ind.sma50 - ind.sma200) / ind.sma200;
    const sev = clamp01(Math.abs(diff) / 0.1);
    const impl =
      diff > 0.02
        ? "SMA50 > SMA200 (Golden-Cross-Regime) — Long-Bias"
        : diff < -0.02
          ? "SMA50 < SMA200 (Death-Cross-Regime) — Short/Defensiv-Bias"
          : "SMA50 ≈ SMA200 — kein klarer Trend";
    findings.push({
      key: "trend",
      severity: sev,
      headline: `SMA50/200-Spread = ${(diff * 100).toFixed(1)} %`,
      implication: impl,
    });
  }

  // Regime-Boost: in Hochvol/Bär verstärken Risiko-Indikatoren ihre Relevanz
  if (regime === "high_vol") {
    findings.forEach((f) => {
      if (f.key === "volatility" || f.key === "bollinger") f.severity = clamp01(f.severity + 0.2);
    });
  }
  if (regime === "bear") {
    findings.forEach((f) => {
      if (f.key === "trend" || f.key === "macd") f.severity = clamp01(f.severity + 0.15);
    });
  }

  return findings.sort((a, b) => b.severity - a.severity);
}

export function buildIndicatorPrompt(
  symbol: string,
  ind: IndicatorSet,
  regime: MarketRegime,
  topN = 3,
): string {
  const ranked = rankIndicatorFindings(ind, regime);
  const top = ranked.slice(0, topN);
  const rest = ranked.slice(topN);

  const lines: string[] = [];
  lines.push(`## INDIKATOR-FOKUS für ${symbol} (Regime: ${regimeLabel(regime)})`);
  lines.push(
    `Priorisiere in deiner Antwort die folgenden ${top.length} Befunde — sie sind aktuell die statistisch auffälligsten. Beginne die Analyse explizit mit dem stärksten Befund, statt allgemein zu antworten.`,
  );
  lines.push("");
  top.forEach((f, i) => {
    lines.push(`${i + 1}. **${f.headline}** (Stärke ${(f.severity * 100).toFixed(0)} %) — ${f.implication}`);
  });
  if (rest.length > 0) {
    lines.push("");
    lines.push("Sekundär (nur erwähnen, wenn relevant):");
    rest.forEach((f) => lines.push(`- ${f.headline} — ${f.implication}`));
  }
  lines.push("");
  lines.push(
    "REGEL: Die Reihenfolge deiner Argumentation MUSS der Priorisierung oben folgen. Wenn die Top-Befunde widersprüchlich sind (z. B. RSI überverkauft, aber Trend bearish), nenne den Konflikt explizit und gewichte ihn quantitativ.",
  );
  return lines.join("\n");
}
