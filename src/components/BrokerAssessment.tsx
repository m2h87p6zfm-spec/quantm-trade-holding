// Wall-Street-Broker Assessment Note — strukturierter, einsteigerfreundlicher
// Research-Block zu einer einzelnen Aktie. Ersetzt den alten Markdown-Blob.
import { ArrowDownRight, ArrowUpRight, Minus, BookOpen, Target, Shield, Activity, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { useState } from "react";
import type { IndicatorSet } from "@/lib/indicators";
import type { Signal } from "@/lib/analysis";
import { formatCurrencyFromUsd } from "@/lib/format";

type Tone = "bull" | "bear" | "neutral";

interface Section {
  id: string;
  title: string;
  value: string;
  tone: Tone;
  verdict: string;
  what: string;       // Was ist dieser Indikator?
  reading: string;    // Was bedeutet dieser Wert konkret?
  conclude: string;   // Was schließe ich daraus als Trader?
}

const fmt = (n: number, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

function buildSections(ind: IndicatorSet): Section[] {
  const s: Section[] = [];

  // RSI
  {
    let tone: Tone = "neutral"; let verdict = "Neutral"; let reading = ""; let conclude = "";
    if (ind.rsi >= 75) { tone = "bear"; verdict = "Überkauft"; reading = `Mit ${fmt(ind.rsi, 1)} liegt der RSI deutlich über 70 — die Käufer sind erschöpft.`; conclude = "Wahrscheinlichkeit für einen kurzfristigen Rücksetzer steigt. Antizyklisch denken, Gewinne sichern."; }
    else if (ind.rsi <= 25) { tone = "bull"; verdict = "Überverkauft"; reading = `Mit ${fmt(ind.rsi, 1)} liegt der RSI unter 30 — Panik-Verkäufe sind durch.`; conclude = "Technische Erholung ist statistisch überfällig. Mutige Käufer treten hier oft ein."; }
    else if (ind.rsi > 60) { tone = "bull"; verdict = "Starkes Momentum"; reading = `${fmt(ind.rsi, 1)} zeigt klar positives, aber noch gesundes Aufwärtsmomentum.`; conclude = "Trend ist intakt, aber je näher 70, desto höher das Korrekturrisiko."; }
    else if (ind.rsi < 40) { tone = "bear"; verdict = "Schwaches Momentum"; reading = `${fmt(ind.rsi, 1)} signalisiert nachlassende Käuferkraft.`; conclude = "Bodenbildung möglich, aber noch keine Trendwende bestätigt."; }
    else { reading = `Mit ${fmt(ind.rsi, 1)} liegt der RSI in der neutralen Zone (40–60).`; conclude = "Kein Extremzustand — andere Indikatoren entscheiden die Richtung."; }
    s.push({
      id: "rsi", title: "RSI — Momentum-Thermometer", value: fmt(ind.rsi, 1), tone, verdict,
      what: "Relative Strength Index (0–100). Misst, wie stark in den letzten 14 Tagen gekauft vs. verkauft wurde. Über 70 = überkauft, unter 30 = überverkauft.",
      reading, conclude,
    });
  }

  // Z-Score
  {
    let tone: Tone = "neutral"; let verdict = "Mittel"; let reading = ""; let conclude = "";
    if (ind.zScore <= -2) { tone = "bull"; verdict = "Statistisch zu billig"; reading = `Z-Score ${fmt(ind.zScore)} — der Kurs liegt mehr als 2 Standardabweichungen unter seinem 20-Tage-Mittel.`; conclude = "Mean-Reversion-Setup. Solche Extreme korrigieren historisch innerhalb weniger Tage zurück Richtung Mittelwert."; }
    else if (ind.zScore >= 2) { tone = "bear"; verdict = "Statistisch zu teuer"; reading = `Z-Score +${fmt(ind.zScore)} — der Kurs ist über 2 Standardabweichungen über dem 20-Tage-Mittel.`; conclude = "Statistisch überdehnt. Neue Long-Positionen hier sind nachlaufend und riskant."; }
    else if (ind.zScore < -1) { tone = "bull"; verdict = "Leicht günstig"; reading = `${fmt(ind.zScore)} — Kurs unter Durchschnitt.`; conclude = "Leichter Rückenwind für Käufer, aber kein Extrem."; }
    else if (ind.zScore > 1) { tone = "bear"; verdict = "Leicht teuer"; reading = `+${fmt(ind.zScore)} — Kurs über Durchschnitt.`; conclude = "Aufwärts-Pulver wird langsam knapp."; }
    else { reading = `${fmt(ind.zScore)} — Kurs nahe am 20-Tage-Mittel.`; conclude = "Statistisch fair bewertet, keine Mean-Reversion-Edge."; }
    s.push({
      id: "z", title: "Z-Score — Abweichung vom Mittel", value: fmt(ind.zScore), tone, verdict,
      what: "Wie weit der Kurs vom 20-Tage-Mittelwert entfernt ist, gemessen in Standardabweichungen. ±2 = statistisches Extrem (95% aller Fälle liegen dazwischen).",
      reading, conclude,
    });
  }

  // MACD
  {
    let tone: Tone = "neutral"; let verdict = "Unentschieden"; let reading = ""; let conclude = "";
    const h = ind.macd.histogram;
    if (h > 0 && ind.macd.macd > ind.macd.signal) { tone = "bull"; verdict = "Bullisches Kreuz"; reading = `Histogramm +${fmt(h, 3)}, MACD ${fmt(ind.macd.macd, 3)} > Signal ${fmt(ind.macd.signal, 3)}.`; conclude = "Kurzfristiger Durchschnitt hat den langfristigen nach oben gekreuzt — klassisches Kaufsignal."; }
    else if (h < 0 && ind.macd.macd < ind.macd.signal) { tone = "bear"; verdict = "Bärisches Kreuz"; reading = `Histogramm ${fmt(h, 3)}, MACD ${fmt(ind.macd.macd, 3)} < Signal ${fmt(ind.macd.signal, 3)}.`; conclude = "Trend kippt nach unten. Long-Positionen würde ich hier nicht mehr aufbauen."; }
    else { reading = `Histogramm ${fmt(h, 3)} — divergierendes Bild.`; conclude = "Kein klarer Trendwechsel, Markt sucht Richtung."; }
    s.push({
      id: "macd", title: "MACD — Trendwechsel-Indikator", value: fmt(h, 3), tone, verdict,
      what: "Differenz zwischen zwei gleitenden Durchschnitten (12 vs. 26 Perioden). Das Histogramm zeigt, ob der Trend gerade an Stärke gewinnt oder verliert.",
      reading, conclude,
    });
  }

  // Bollinger
  {
    let tone: Tone = "neutral"; let verdict = "Im Korridor"; let reading = ""; let conclude = "";
    if (ind.price >= ind.bollinger.upper) { tone = "bear"; verdict = "Oberes Band"; reading = `Kurs ${fmt(ind.price)} ≥ oberes Band ${fmt(ind.bollinger.upper)}.`; conclude = "Statistisch überdehnt nach oben. Rücksetzer in den Korridor sind die Regel, nicht die Ausnahme."; }
    else if (ind.price <= ind.bollinger.lower) { tone = "bull"; verdict = "Unteres Band"; reading = `Kurs ${fmt(ind.price)} ≤ unteres Band ${fmt(ind.bollinger.lower)}.`; conclude = "Rebound-Setup. Käufer greifen an dieser Linie historisch beherzt zu."; }
    else { reading = `Kurs ${fmt(ind.price)} zwischen ${fmt(ind.bollinger.lower)} und ${fmt(ind.bollinger.upper)}.`; conclude = "Normale Schwankung — kein statistisches Extrem."; }
    s.push({
      id: "boll", title: "Bollinger-Bänder — Volatilitätskorridor", value: `${fmt(ind.bollinger.lower)} – ${fmt(ind.bollinger.upper)}`, tone, verdict,
      what: "20-Tage-Durchschnitt plus/minus 2 Standardabweichungen. ~95% aller Kurse liegen innerhalb dieses Korridors — Berührungen der Ränder sind statistisch selten.",
      reading, conclude,
    });
  }

  // Trend SMA50/200
  if (!isNaN(ind.sma50) && !isNaN(ind.sma200)) {
    let tone: Tone = "neutral"; let verdict = "Gemischt"; let reading = ""; let conclude = "";
    if (ind.sma50 > ind.sma200 && ind.price > ind.sma50) { tone = "bull"; verdict = "Golden Cross intakt"; reading = `50-Tage (${fmt(ind.sma50)}) > 200-Tage (${fmt(ind.sma200)}), Kurs ${fmt(ind.price)} über beiden.`; conclude = "Primärer Aufwärtstrend gesund. Gegen diesen Trend zu shorten ist erfahrungsgemäß teuer."; }
    else if (ind.sma50 < ind.sma200 && ind.price < ind.sma50) { tone = "bear"; verdict = "Death Cross aktiv"; reading = `50-Tage (${fmt(ind.sma50)}) < 200-Tage (${fmt(ind.sma200)}), Kurs unter beiden.`; conclude = "Strukturell bärisch. Käufe sind hier antizyklisch und brauchen enge Stops."; }
    else { reading = `50-Tage ${fmt(ind.sma50)} / 200-Tage ${fmt(ind.sma200)} / Kurs ${fmt(ind.price)}.`; conclude = "Trendrichtung uneindeutig — Konsolidierungsphase, Geduld zahlt sich aus."; }
    s.push({
      id: "trend", title: "Trend — SMA 50 vs. SMA 200", value: `${fmt(ind.sma50)} / ${fmt(ind.sma200)}`, tone, verdict,
      what: "Die beiden wichtigsten Durchschnitte am Markt. SMA50 über SMA200 = Golden Cross (Bullenmarkt-Signal), umgekehrt = Death Cross.",
      reading, conclude,
    });
  }

  // Volatilität
  {
    let tone: Tone = "neutral"; let verdict = "Normal"; let reading = ""; let conclude = "";
    const v = ind.volatility;
    if (v > 0.5) { tone = "bear"; verdict = "Sehr hoch"; reading = `Annualisierte Vola ${fmt(v * 100, 1)}% — die Aktie schwankt heftig.`; conclude = "Positionsgröße halbieren, Stops weiter weg setzen, ansonsten wird man ausgestoppt bevor die These greift."; }
    else if (v < 0.2) { tone = "bull"; verdict = "Ruhig"; reading = `Vola ${fmt(v * 100, 1)}% — sehr ruhig.`; conclude = "Kleine Tagesbewegungen — gut für engere Stops und größere Positionen."; }
    else { reading = `Vola ${fmt(v * 100, 1)}% — im normalen Bereich.`; conclude = "Standard-Positionsgröße, keine Sonderregeln nötig."; }
    s.push({
      id: "vol", title: "Volatilität — Schwankungsbreite", value: `${fmt(v * 100, 1)}%`, tone, verdict,
      what: "Erwartete jährliche Kursschwankung. Hoch = mehr Risiko UND mehr Chance, niedrig = berechenbarer.",
      reading, conclude,
    });
  }

  // Sharpe
  {
    let tone: Tone = "neutral"; let verdict = "Akzeptabel"; let reading = ""; let conclude = "";
    if (ind.sharpe > 1.5) { tone = "bull"; verdict = "Exzellent"; reading = `Sharpe ${fmt(ind.sharpe)} — Rendite pro Risikoeinheit auf institutionellem Niveau.`; conclude = "Fundamentale Qualität. Solche Werte sind selten — Position rechtfertigt sich."; }
    else if (ind.sharpe < 0) { tone = "bear"; verdict = "Negativ"; reading = `Sharpe ${fmt(ind.sharpe)} — hat zuletzt mehr Risiko als Rendite geliefert.`; conclude = "Schlechter als ein Sparbuch nach Risiko. Sehr genau hinschauen."; }
    else { reading = `Sharpe ${fmt(ind.sharpe)} — solide.`; conclude = "Rendite kompensiert das Risiko ausreichend."; }
    s.push({
      id: "sharpe", title: "Sharpe Ratio — Rendite pro Risiko", value: fmt(ind.sharpe), tone, verdict,
      what: "Wie viel Rendite pro Einheit Risiko erzeugt wird. >1 = gut, >2 = exzellent, <0 = schlechter als risikofrei.",
      reading, conclude,
    });
  }

  // Beta
  {
    let tone: Tone = "neutral"; let verdict = "Marktkonform"; let reading = ""; let conclude = "";
    if (ind.beta > 1.2) { tone = "bear"; verdict = "Hochsensibel"; reading = `Beta ${fmt(ind.beta)} — schwingt ${fmt(ind.beta)}× stärker als der S&P 500.`; conclude = "Bei Crashes trifft es zuerst, bei Rallys profitiert es überproportional. Positionsgröße entsprechend dosieren."; }
    else if (ind.beta < 0.8) { tone = "bull"; verdict = "Defensiv"; reading = `Beta ${fmt(ind.beta)} — bewegt sich ruhiger als der Markt.`; conclude = "Gut für nervöse Marktphasen — Verluste in Korrekturen sind gedämpft."; }
    else { reading = `Beta ${fmt(ind.beta)} — bewegt sich im Gleichschritt mit dem Markt.`; conclude = "Keine besondere Markt-Sensitivität — Standard-Risikoprofil."; }
    s.push({
      id: "beta", title: "Beta — Marktsensitivität", value: fmt(ind.beta), tone, verdict,
      what: "Wie stark die Aktie auf den Gesamtmarkt (S&P 500) reagiert. 1 = wie Markt, >1 = stärker, <1 = defensiver.",
      reading, conclude,
    });
  }

  return s;
}

const toneStyles = {
  bull: { border: "border-bull/40", bg: "bg-bull/[0.05]", badge: "bg-bull/15 text-bull border-bull/30", dot: "bg-bull", icon: ArrowUpRight, label: "Bullish" },
  bear: { border: "border-bear/40", bg: "bg-bear/[0.05]", badge: "bg-bear/15 text-bear border-bear/30", dot: "bg-bear", icon: ArrowDownRight, label: "Bearish" },
  neutral: { border: "border-border", bg: "bg-muted/20", badge: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground", icon: Minus, label: "Neutral" },
} as const;

export function BrokerAssessment({ symbol, name, indicators, signal, currency = "USD", lang = "de" }: { symbol: string; name: string; indicators: IndicatorSet; signal: Signal; currency?: string; lang?: "de" | "en" }) {
  const [openGlossary, setOpenGlossary] = useState(false);
  const sections = buildSections(indicators);
  const bullCount = sections.filter((x) => x.tone === "bull").length;
  const bearCount = sections.filter((x) => x.tone === "bear").length;
  const neutralCount = sections.filter((x) => x.tone === "neutral").length;

  const verdictMeta = signal.verdict === "LONG"
    ? { label: lang === "en" ? "BUY" : "KAUFEN", sub: lang === "en" ? "Long position" : "Long-Position", tone: "bull" as Tone, headline: lang === "en" ? "Most statistical signals point to rising prices." : "Die Mehrheit der statistischen Signale spricht für steigende Kurse." }
    : signal.verdict === "SHORT"
    ? { label: lang === "en" ? "SELL" : "VERKAUFEN", sub: lang === "en" ? "Short position" : "Short-Position", tone: "bear" as Tone, headline: lang === "en" ? "Most signals point to falling prices." : "Die Mehrheit der Signale deutet auf fallende Kurse hin." }
    : { label: lang === "en" ? "HOLD" : "HALTEN", sub: lang === "en" ? "No setup" : "Kein Setup", tone: "neutral" as Tone, headline: lang === "en" ? "Signals are mixed — no clear probability edge." : "Signale sind gemischt — keine klare Wahrscheinlichkeit für eine Richtung." };
  const vStyle = toneStyles[verdictMeta.tone];

  return (
    <div className="space-y-4">
      {/* HEADER — Executive Summary */}
      <div className={`rounded-lg border-2 ${vStyle.border} ${vStyle.bg} p-4`}>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> {lang === "en" ? "Quantm Research Note" : "Quantm Research-Notiz"}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <h3 className="text-base font-bold">{name}</h3>
          <span className="text-xs text-muted-foreground">({symbol}) · {formatCurrencyFromUsd(indicators.price, currency)}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${vStyle.badge}`}>
            <vStyle.icon className="h-4 w-4" />
            <div className="leading-tight">
              <div className="text-sm font-bold">{verdictMeta.label}</div>
              <div className="text-[10px] opacity-80">{verdictMeta.sub}</div>
            </div>
          </div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{lang === "en" ? "Confidence" : "Konfidenz"}</div>
            <div className="font-mono text-base font-semibold">{signal.confidence.toFixed(0)}%</div>
          </div>
          <div className="ml-auto hidden gap-1.5 sm:flex">
            <span className="rounded border border-bull/30 bg-bull/10 px-1.5 py-0.5 text-[10px] font-semibold text-bull">▲ {bullCount}</span>
            <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">● {neutralCount}</span>
            <span className="rounded border border-bear/30 bg-bear/10 px-1.5 py-0.5 text-[10px] font-semibold text-bear">▼ {bearCount}</span>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{verdictMeta.headline}</p>
      </div>

      {/* BROKER TAKE — kurze persönliche Einschätzung */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Activity className="h-3 w-3" /> Broker-Sicht
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {brokerTake(verdictMeta.tone, bullCount, bearCount, indicators)}
        </p>
      </div>

      {/* INDIKATOR-BREAKDOWN */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> Indikator-Analyse · Stück für Stück erklärt
        </div>
        {sections.map((sec) => {
          const t = toneStyles[sec.tone];
          return (
            <div key={sec.id} className={`rounded-lg border ${t.border} ${t.bg} p-3.5`}>
              <div className="flex items-start gap-2">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h4 className="text-sm font-semibold">{sec.title}</h4>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{sec.value}</span>
                    <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${t.badge}`}>{sec.verdict}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] italic leading-snug text-muted-foreground">{sec.what}</p>
                  <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                    <div><span className="font-semibold text-foreground">Was der Wert sagt: </span><span className="text-foreground/85">{sec.reading}</span></div>
                    <div><span className="font-semibold text-foreground">Was ich daraus schließe: </span><span className="text-foreground/85">{sec.conclude}</span></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TRADE-PLAN */}
      {signal.verdict !== "NEUTRAL" && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
          <div className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Target className="h-3 w-3" /> Trade-Plan · Risk/Reward 1 : {signal.rr.toFixed(1)}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <PlanCell label="Entry" value={fmt(signal.entry)} sub="Einstieg" />
            <PlanCell label="Stop" value={fmt(signal.stop)} sub="Notausgang" tone="bear" />
            <PlanCell label="Target" value={fmt(signal.target)} sub="Gewinnmitnahme" tone="bull" />
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
            Pro 1 € Risiko stehen {signal.rr.toFixed(1)} € potenzieller Gewinn gegenüber. Faustregel: nie mehr als <strong className="text-foreground">1–2% des eigenen Kapitals</strong> pro Trade riskieren.
          </p>
        </div>
      )}

      {/* RISIKO-NOTIZ */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3 text-[12px] leading-relaxed text-foreground/85">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
          <AlertTriangle className="h-3 w-3" /> Risiko-Notiz
        </div>
        Keine Anlageberatung. Statistische Modelle beschreiben Wahrscheinlichkeiten, keine Gewissheiten. Jeder Trade kann verlieren — Positionsgröße passt sich dem Risiko an, nicht umgekehrt.
      </div>

      {/* GLOSSAR */}
      <details className="rounded-lg border border-border bg-card/60 p-3" open={openGlossary} onToggle={(e) => setOpenGlossary((e.target as HTMLDetailsElement).open)}>
        <summary className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpen className="h-3 w-3" /> Glossar · Was bedeuten die Indikatoren?
        </summary>
        <dl className="mt-3 space-y-2 text-[12px] leading-relaxed">
          <GlossaryItem term="RSI (Relative Strength Index)" def="Skala 0–100. Über 70 = überkauft (Korrektur möglich), unter 30 = überverkauft (Erholung möglich), ~50 neutral." />
          <GlossaryItem term="MACD-Histogramm" def="Differenz zweier gleitender Durchschnitte (12 vs. 26 Perioden). Positiv = Aufwärtsmomentum, Vorzeichenwechsel = potenzielle Trendwende." />
          <GlossaryItem term="Bollinger-Bänder" def="20-Tage-Durchschnitt ± 2 Standardabweichungen. Kurs am oberen Band = teuer, am unteren = günstig relativ zum kurzfristigen Trend." />
          <GlossaryItem term="Z-Score" def="Wie weit der Kurs vom Mittel abweicht, in Standardabweichungen. >+2 stark überkauft, <−2 stark überverkauft." />
          <GlossaryItem term="Volatilität (annualisiert)" def="Erwartete jährliche Schwankungsbreite. Hoch = mehr Risiko und mehr Chance." />
          <GlossaryItem term="Sharpe Ratio" def="Rendite pro Risiko-Einheit. >1 gut, >2 sehr gut, <0 schlechter als risikofrei." />
          <GlossaryItem term="Beta" def="Mitschwingen mit dem Gesamtmarkt. 1 = wie Markt, >1 stärker, <1 defensiver." />
          <GlossaryItem term="Golden / Death Cross" def="50-Tage-Durchschnitt kreuzt 200-Tage-Durchschnitt nach oben (Golden, bullish) bzw. unten (Death, bearish). Strukturelle Trendsignale." />
        </dl>
      </details>
    </div>
  );
}

function PlanCell({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: Tone }) {
  const color = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function GlossaryItem({ term, def }: { term: string; def: string }) {
  return (
    <div>
      <dt className="font-semibold text-foreground">{term}</dt>
      <dd className="text-muted-foreground">{def}</dd>
    </div>
  );
}

function brokerTake(tone: Tone, bull: number, bear: number, ind: IndicatorSet): string {
  const trendPart = !isNaN(ind.sma50) && !isNaN(ind.sma200)
    ? (ind.sma50 > ind.sma200 ? "in einem strukturellen Aufwärtstrend" : "in einem strukturellen Abwärtstrend")
    : "ohne klare Trendstruktur";
  if (tone === "bull") {
    return `Wir handeln ${trendPart} und das Setup spricht eine deutliche Sprache: ${bull} bullische gegen ${bear} bärische Signale. Das ist kein Garantieschein, aber genau die Konstellation, in der professionelle Bücher Risiko aufbauen — kontrolliert, mit hartem Stop, ohne Hebel-Übermut.`;
  }
  if (tone === "bear") {
    return `Wir handeln ${trendPart} und das Bild ist defensiv: ${bear} bärische gegen ${bull} bullische Signale. Wer long ist, sollte aktiv über Gewinnmitnahmen oder Hedges nachdenken. Neue Käufe brauchen sehr enge Stops oder explizite Mean-Reversion-Edge.`;
  }
  return `Wir handeln ${trendPart}, aber die Signale sind gemischt (${bull} bullisch, ${bear} bärisch). Das ist der ehrlichste aller Märkte: kein Edge, kein Trade. Bestehende Positionen verwalten, neue Setups abwarten. Geduld ist auch eine Position.`;
}
