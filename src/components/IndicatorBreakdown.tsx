import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { IndicatorSet } from "@/lib/indicators";
import { IndicatorInfoButton } from "@/components/IndicatorInfo";

type Tone = "bull" | "bear" | "neutral";

type Row = {
  name: string;
  value: string;
  definition: string;
  reading: string;
  tone: Tone;
  verdict: string;
  infoKey?: string;
  rawValue?: any;
};

const fmt = (n: number, d = 2) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

function buildRows(ind: IndicatorSet): Row[] {
  const rows: Row[] = [];

  // RSI
  {
    const v = ind.rsi;
    let tone: Tone = "neutral";
    let reading = "";
    let verdict = "Neutral";
    if (v >= 75) { tone = "bear"; verdict = "Überkauft"; reading = "Käufer sind erschöpft, ein Rücksetzer ist statistisch wahrscheinlich."; }
    else if (v >= 60) { tone = "bull"; verdict = "Stark, aber gespannt"; reading = "Aufwärtsmomentum ist intakt — noch okay, aber Vorsicht vor Korrektur."; }
    else if (v >= 40) { tone = "neutral"; verdict = "Neutral"; reading = "Weder überkauft noch überverkauft — kein Extrem, keine klare Richtung."; }
    else if (v >= 25) { tone = "bull"; verdict = "Schwach, Boden möglich"; reading = "Momentum lässt nach, ein technischer Boden könnte sich bilden."; }
    else { tone = "bull"; verdict = "Überverkauft"; reading = "Panik ist durch — historisch folgt oft eine technische Erholung."; }
    rows.push({
      name: "RSI (14)",
      value: fmt(v, 1),
      definition: "Relative Strength Index, 0–100. Misst, wie stark gekauft oder verkauft wurde. >70 überkauft, <30 überverkauft.",
      reading,
      tone,
      verdict,
      infoKey: "rsi", rawValue: v,
    });
  }

  // Z-Score
  {
    const v = ind.zScore;
    let tone: Tone = "neutral";
    let verdict = "Im Mittel";
    let reading = "Kurs liegt nahe am 20-Tage-Durchschnitt — statistisch unauffällig.";
    if (v <= -2) { tone = "bull"; verdict = "Stark überverkauft"; reading = "Kurs ist statistisch zu billig — Mean-Reversion nach oben überfällig."; }
    else if (v <= -1) { tone = "bull"; verdict = "Unter dem Mittel"; reading = "Leichter Rückenwind für Käufer, noch kein Extremzustand."; }
    else if (v >= 2) { tone = "bear"; verdict = "Stark überkauft"; reading = "Kurs ist statistisch zu teuer — Korrektur historisch wahrscheinlich."; }
    else if (v >= 1) { tone = "bear"; verdict = "Über dem Mittel"; reading = "Aufwärts-Pulver wird knapp, Rücksetzer-Risiko steigt."; }
    rows.push({
      name: "Z-Score (20)",
      value: (v >= 0 ? "+" : "") + fmt(v),
      definition: "Wie weit der Kurs vom 20-Tage-Mittel entfernt ist, in Standardabweichungen. >+2 oder <−2 = statistisches Extrem.",
      reading,
      tone,
      verdict,
      infoKey: "zScore", rawValue: v,
    });
  }

  // MACD
  {
    const h = ind.macd.histogram;
    let tone: Tone = "neutral";
    let verdict = "Unentschieden";
    let reading = "Kein klarer Trendwechsel — der Markt sucht eine Richtung.";
    if (h > 0 && ind.macd.macd > ind.macd.signal) { tone = "bull"; verdict = "Bullisches Cross"; reading = "Kurzfristige Linie über langfristiger — frisches Kaufsignal, Aufwärtstrend bestätigt."; }
    else if (h < 0 && ind.macd.macd < ind.macd.signal) { tone = "bear"; verdict = "Bärisches Cross"; reading = "Kurzfristige Linie unter langfristiger — Verkaufssignal, Trend dreht nach unten."; }
    rows.push({
      name: "MACD-Histogramm",
      value: (h >= 0 ? "+" : "") + fmt(h, 3),
      definition: "Trendwechsel-Indikator aus zwei gleitenden Durchschnitten. Vorzeichenwechsel = potenzielle Trendwende.",
      reading,
      tone,
      verdict,
      infoKey: "macd", rawValue: ind.macd,
    });
  }

  // Bollinger
  {
    const lo = ind.bollinger.lower, hi = ind.bollinger.upper, p = ind.price;
    let tone: Tone = "neutral";
    let verdict = "Im Korridor";
    let reading = `Kurs bewegt sich im normalen Schwankungsbereich (${fmt(lo)} – ${fmt(hi)}).`;
    if (p >= hi) { tone = "bear"; verdict = "Oberes Band"; reading = `Kurs (${fmt(p)}) über dem oberen Band (${fmt(hi)}) — überdehnt nach oben, Rücksetzer wahrscheinlich.`; }
    else if (p <= lo) { tone = "bull"; verdict = "Unteres Band"; reading = `Kurs (${fmt(p)}) unter dem unteren Band (${fmt(lo)}) — Rebound-Setup, Käufer greifen hier oft zu.`; }
    rows.push({
      name: "Bollinger-Bänder",
      value: `${fmt(lo)} / ${fmt(hi)}`,
      definition: "Volatilitäts-Korridor um den 20-Tage-Schnitt (±2σ). Kurs am oberen Band = teuer, am unteren = günstig.",
      reading,
      tone,
      verdict,
      infoKey: "bollinger", rawValue: { price: p, lower: lo, upper: hi },
    });
  }

  // Trend SMA50/200
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    const up = ind.sma50 > ind.sma200 && ind.price > ind.sma50;
    const down = ind.sma50 < ind.sma200 && ind.price < ind.sma50;
    let tone: Tone = "neutral";
    let verdict = "Trend unklar";
    let reading = "Gleitende Durchschnitte verlaufen ohne klare Hierarchie — Seitwärtsphase.";
    if (up) { tone = "bull"; verdict = "Golden Cross"; reading = "50-Tage über 200-Tage, Kurs über beiden — primärer Aufwärtstrend gesund."; }
    else if (down) { tone = "bear"; verdict = "Death Cross"; reading = "50-Tage unter 200-Tage, Kurs unter beiden — primärer Abwärtstrend aktiv."; }
    rows.push({
      name: "Trend (SMA 50 / 200)",
      value: `${fmt(ind.sma50)} / ${fmt(ind.sma200)}`,
      definition: "Die zwei wichtigsten Durchschnitte am Markt. Ihre Reihenfolge definiert primären Trend (Golden Cross / Death Cross).",
      reading,
      tone,
      verdict,
    });
  }

  // Momentum
  {
    const m = ind.momentum;
    let tone: Tone = "neutral";
    let verdict = "Flach";
    let reading = "Keine ausgeprägte Bewegung in den letzten 10 Perioden.";
    if (m > 0.05) { tone = "bull"; verdict = "Aufwärtsschub"; reading = "Deutlicher Schub nach oben — Käufer haben die Kontrolle."; }
    else if (m > 0.02) { tone = "bull"; verdict = "Leicht positiv"; reading = "Sanfter Aufwärtsdruck, noch kein starkes Signal."; }
    else if (m < -0.05) { tone = "bear"; verdict = "Abwärtsdruck"; reading = "Deutlicher Druck nach unten — Verkäufer dominieren."; }
    else if (m < -0.02) { tone = "bear"; verdict = "Leicht negativ"; reading = "Sanfter Abwärtsdruck, noch kein Crash-Signal."; }
    rows.push({
      name: "Momentum (10 P)",
      value: (m >= 0 ? "+" : "") + fmt(m * 100, 1) + " %",
      definition: "Kursveränderung der letzten 10 Perioden in Prozent. Misst Geschwindigkeit der Bewegung.",
      reading,
      tone,
      verdict,
    });
  }

  // Volatilität
  {
    const v = ind.volatility;
    let tone: Tone = "neutral";
    let verdict = "Normal";
    let reading = "Erwartbares Schwankungsbild, keine Stress-Signale.";
    if (v > 0.5) { tone = "bear"; verdict = "Sehr hoch"; reading = "Stress im Tape — Positionsgröße halbieren, Stops weiter setzen."; }
    else if (v > 0.35) { tone = "neutral"; verdict = "Erhöht"; reading = "Überdurchschnittliche Schwankungen — auf saubere Setups warten."; }
    else if (v < 0.18) { tone = "bull"; verdict = "Ruhig"; reading = "Niedrige Vola — kleinere Tagesbewegungen, planbarere Setups."; }
    rows.push({
      name: "Volatilität (ann.)",
      value: fmt(v * 100, 1) + " %",
      definition: "Annualisierte Volatilität — erwartete jährliche Schwankungsbreite. Hoch = höheres Risiko und höhere Chance.",
      reading,
      tone,
      verdict,
    });
  }

  // Sharpe
  {
    const s = ind.sharpe;
    let tone: Tone = "neutral";
    let verdict = "Mittelmaß";
    let reading = "Rendite pro Risikoeinheit im Mittelfeld — kein klares Allocator-Signal.";
    if (s > 2) { tone = "bull"; verdict = "Exzellent"; reading = "Institutionelles Niveau — risikoadjustiert hochwertig."; }
    else if (s > 1) { tone = "bull"; verdict = "Gut"; reading = "Solide risikoadjustierte Performance — allocator-tauglich."; }
    else if (s < 0) { tone = "bear"; verdict = "Negativ"; reading = "Mehr Risiko als Rendite geliefert — Allocator-No-Go."; }
    rows.push({
      name: "Sharpe Ratio",
      value: (s >= 0 ? "+" : "") + fmt(s),
      definition: "Rendite pro Risikoeinheit. >1 gut, >2 exzellent, <0 schlechter als risikofrei.",
      reading,
      tone,
      verdict,
    });
  }

  // Beta
  {
    const b = ind.beta;
    let tone: Tone = "neutral";
    let verdict = "Marktnah";
    let reading = "Bewegt sich im Gleichschritt mit dem breiten Markt.";
    if (b > 1.4) { tone = "bear"; verdict = "Hochzyklisch"; reading = "Überdurchschnittlich marktsensitiv — bei Crashes trifft es zuerst, bei Rallys profitiert überproportional."; }
    else if (b > 1.2) { tone = "neutral"; verdict = "Sensitiv"; reading = "Etwas stärker als der Markt — höhere Beta, höheres Risiko und Chance."; }
    else if (b < 0.8) { tone = "bull"; verdict = "Defensiv"; reading = "Schwankt ruhiger als der Markt — gut für nervöse Phasen."; }
    rows.push({
      name: "Beta",
      value: fmt(b),
      definition: "Sensitivität zum Gesamtmarkt. 1 = wie Markt, >1 schwankt stärker, <1 defensiver.",
      reading,
      tone,
      verdict,
    });
  }

  return rows;
}

const toneStyles: Record<Tone, { card: string; badge: string; bar: string; label: string }> = {
  bull: {
    card: "border-bull/30 bg-bull/5",
    badge: "bg-bull/15 text-bull border-bull/40",
    bar: "bg-bull",
    label: "Bullish",
  },
  bear: {
    card: "border-bear/30 bg-bear/5",
    badge: "bg-bear/15 text-bear border-bear/40",
    bar: "bg-bear",
    label: "Bearish",
  },
  neutral: {
    card: "border-border bg-muted/20",
    badge: "bg-muted text-muted-foreground border-border",
    bar: "bg-muted-foreground/40",
    label: "Neutral",
  },
};

export function IndicatorBreakdown({ ind }: { ind: IndicatorSet }) {
  const [expanded, setExpanded] = useState(false);
  const rows = buildRows(ind);

  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.tone]: acc[r.tone] + 1 }),
    { bull: 0, bear: 0, neutral: 0 } as Record<Tone, number>,
  );

  // Wichtigste zuerst: nicht-neutrale Signale priorisieren
  const sorted = [...rows].sort((a, b) => {
    const score = (t: Tone) => (t === "neutral" ? 1 : 0);
    return score(a.tone) - score(b.tone);
  });
  const PREVIEW = 3;
  const visible = expanded ? sorted : sorted.slice(0, PREVIEW);
  const hidden = sorted.length - PREVIEW;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">Indikator-Stimmen:</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-bull/40 bg-bull/15 px-2 py-0.5 text-bull">
          <span className="font-bold">{counts.bull}</span> bullish
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground">
          <span className="font-bold">{counts.neutral}</span> neutral
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-bear/40 bg-bear/15 px-2 py-0.5 text-bear">
          <span className="font-bold">{counts.bear}</span> bearish
        </span>
      </div>

      {!expanded && (
        <p className="text-[11px] text-muted-foreground">
          Die <span className="font-semibold text-foreground">{Math.min(PREVIEW, sorted.length)} wichtigsten</span> Signale für diese Aktie. Für Anfänger: grün = spricht für Kaufen, rot = spricht für Verkaufen, grau = neutral.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((r) => {
          const s = toneStyles[r.tone];
          return (
            <div key={r.name} className={`relative overflow-hidden rounded-lg border ${s.card} p-3`}>
              <span className={`absolute left-0 top-0 h-full w-1 ${s.bar}`} />
              <div className="pl-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.name}</div>
                    <div className="font-mono text-lg font-bold tabular-nums leading-tight">{r.value}</div>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}>
                    {r.verdict}
                  </span>
                </div>
                {expanded && (
                  <div className="text-[11px] leading-snug text-muted-foreground italic">
                    {r.definition}
                  </div>
                )}
                <div className="text-xs leading-snug">
                  <span className="font-semibold text-muted-foreground">Heißt jetzt: </span>
                  {r.reading}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Weniger anzeigen
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Mehr anzeigen ({hidden} weitere Indikatoren)
            </>
          )}
        </button>
      )}
    </div>
  );
}
