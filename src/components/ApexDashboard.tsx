import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2, ExternalLink,
  Gauge, Landmark, MinusCircle, Newspaper, Target, TrendingDown, TrendingUp, XCircle,
} from "lucide-react";
import type { IndicatorSet, Candle } from "@/lib/indicators";
import { rsi as rsiCalc, stddev, mean } from "@/lib/indicators";
import type { Candles, Quote } from "@/lib/finnhub";
import type { DecisionReport } from "@/lib/analysis";
import type { MarketRegime } from "@/lib/ai-learning";
import { IndicatorInfoButton } from "@/components/IndicatorInfo";

type Signal = "pos" | "neg" | "neu";

function fmt(n: number | undefined | null, d = 2): string {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number | undefined | null, d = 1): string {
  if (n == null || !isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
}
function fmtBig(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} Bio.`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Mrd.`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} Mio.`;
  return n.toLocaleString("de-DE");
}

function SignalDot({ s }: { s: Signal }) {
  const cls = s === "pos" ? "bg-emerald-500" : s === "neg" ? "bg-rose-500" : "bg-amber-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function Row({ label, value, sub, signal, infoKey, rawValue }: { label: string; value: string; sub?: string; signal: Signal; infoKey?: string; rawValue?: any }) {
  const textColor = signal === "pos" ? "text-emerald-400" : signal === "neg" ? "text-rose-400" : "text-amber-300";
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-b-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SignalDot s={signal} />
        <span>{label}</span>
        {infoKey && <IndicatorInfoButton infoKey={infoKey} rawValue={rawValue} />}
      </div>
      <div className="text-right">
        <div className={`font-mono text-base font-semibold ${textColor}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, accent, children }: { icon: React.ComponentType<{ className?: string }>; title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 shadow-sm">
      <div className={`flex items-center gap-2 border-b border-border/60 px-4 py-3 ${accent ?? ""}`}>
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ---------- Berechnungen ----------
function stochRsi(closes: number[], period = 14): number {
  // Stoch-RSI = (RSI - minRSI) / (maxRSI - minRSI) der letzten N Perioden
  if (closes.length < period * 2) return 50;
  const rsis: number[] = [];
  for (let i = period; i <= closes.length; i++) {
    rsis.push(rsiCalc(closes.slice(0, i), period));
  }
  const slice = rsis.slice(-period);
  const mn = Math.min(...slice);
  const mx = Math.max(...slice);
  const cur = rsis[rsis.length - 1];
  if (mx === mn) return 50;
  return ((cur - mn) / (mx - mn)) * 100;
}
function atr(candles: Candle[] | undefined, period = 14): number {
  if (!candles || candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].h, l = candles[i].l, pc = candles[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return mean(trs.slice(-period));
}

function technicalSignals(ind: IndicatorSet, stoch: number, atrVal: number, avgVol: number, lastVol: number) {
  const rows: Array<{ label: string; value: string; sub?: string; signal: Signal; infoKey?: string; rawValue?: any }> = [];
  // RSI
  rows.push({
    label: "RSI (14)",
    value: fmt(ind.rsi, 1),
    sub: ind.rsi >= 70 ? "überkauft" : ind.rsi <= 30 ? "überverkauft" : "neutral",
    signal: ind.rsi <= 30 ? "pos" : ind.rsi >= 70 ? "neg" : "neu",
    infoKey: "rsi", rawValue: ind.rsi,
  });
  // Stoch RSI
  rows.push({
    label: "Stochastic RSI",
    value: fmt(stoch, 1),
    sub: stoch >= 80 ? "überkauft" : stoch <= 20 ? "überverkauft" : "neutral",
    signal: stoch <= 20 ? "pos" : stoch >= 80 ? "neg" : "neu",
    infoKey: "stochRsi", rawValue: stoch,
  });
  // MACD
  const macdSig: Signal = ind.macd.histogram > 0 && ind.macd.macd > ind.macd.signal ? "pos"
    : ind.macd.histogram < 0 && ind.macd.macd < ind.macd.signal ? "neg" : "neu";
  rows.push({
    label: "MACD-Histogramm",
    value: fmt(ind.macd.histogram, 3),
    sub: `Signal ${fmt(ind.macd.signal, 3)}`,
    signal: macdSig,
    infoKey: "macd", rawValue: ind.macd,
  });
  // Bollinger
  const boll: Signal = ind.price <= ind.bollinger.lower ? "pos" : ind.price >= ind.bollinger.upper ? "neg" : "neu";
  rows.push({
    label: "Bollinger-Position",
    value: ind.price <= ind.bollinger.lower ? "unteres Band" : ind.price >= ind.bollinger.upper ? "oberes Band" : "im Korridor",
    sub: `${fmt(ind.bollinger.lower)} – ${fmt(ind.bollinger.upper)}`,
    signal: boll,
    infoKey: "bollinger", rawValue: { price: ind.price, lower: ind.bollinger.lower, upper: ind.bollinger.upper },
  });
  // Z-Score
  const zSig: Signal = ind.zScore <= -1 ? "pos" : ind.zScore >= 1 ? "neg" : "neu";
  rows.push({
    label: "Z-Score (20)",
    value: fmt(ind.zScore, 2),
    sub: Math.abs(ind.zScore) >= 2 ? "extrem" : Math.abs(ind.zScore) >= 1 ? "auffällig" : "neutral",
    signal: zSig,
    infoKey: "zScore", rawValue: ind.zScore,
  });
  // SMA 20
  const sma20Sig: Signal = ind.price > ind.sma20 ? "pos" : ind.price < ind.sma20 ? "neg" : "neu";
  rows.push({ label: "SMA 20", value: fmt(ind.sma20), sub: ind.price > ind.sma20 ? "Kurs darüber" : "Kurs darunter", signal: sma20Sig, infoKey: "sma20", rawValue: { price: ind.price, sma: ind.sma20 } });
  // SMA 50
  if (!isNaN(ind.sma50)) {
    const sig: Signal = ind.price > ind.sma50 ? "pos" : "neg";
    rows.push({ label: "SMA 50", value: fmt(ind.sma50), sub: ind.price > ind.sma50 ? "Kurs darüber" : "Kurs darunter", signal: sig, infoKey: "sma50", rawValue: { price: ind.price, sma: ind.sma50 } });
  }
  // SMA 200
  if (!isNaN(ind.sma200)) {
    const sig: Signal = ind.price > ind.sma200 ? "pos" : "neg";
    rows.push({ label: "SMA 200", value: fmt(ind.sma200), sub: ind.sma50 > ind.sma200 ? "Golden Cross" : "Death Cross", signal: sig, infoKey: "sma200", rawValue: { price: ind.price, sma200: ind.sma200, sma50: ind.sma50 } });
  }
  // Momentum
  const momSig: Signal = ind.momentum > 0.02 ? "pos" : ind.momentum < -0.02 ? "neg" : "neu";
  rows.push({ label: "Momentum (10 T.)", value: fmtPct(ind.momentum * 100), signal: momSig, infoKey: "momentum", rawValue: ind.momentum });
  // ATR
  rows.push({
    label: "ATR (14)",
    value: fmt(atrVal),
    sub: `${fmt((atrVal / ind.price) * 100, 2)}% v. Kurs`,
    signal: "neu",
    infoKey: "atr", rawValue: { atr: atrVal, price: ind.price },
  });
  // Volatilität
  const volSig: Signal = ind.volatility > 0.5 ? "neg" : ind.volatility < 0.2 ? "pos" : "neu";
  rows.push({ label: "Volatilität (annual.)", value: fmtPct(ind.volatility * 100, 1), signal: volSig, infoKey: "volatility", rawValue: ind.volatility });
  // Volumen
  const volRatio = avgVol > 0 ? lastVol / avgVol : 1;
  const vSig: Signal = volRatio >= 1.5 ? "pos" : volRatio <= 0.6 ? "neg" : "neu";
  rows.push({
    label: "Volumen vs. Ø",
    value: `${fmt(volRatio, 2)}×`,
    sub: `${fmtBig(lastVol)} heute`,
    signal: vSig,
    infoKey: "volume", rawValue: { ratio: volRatio },
  });
  // Sharpe
  const shSig: Signal = ind.sharpe > 1 ? "pos" : ind.sharpe < 0 ? "neg" : "neu";
  rows.push({ label: "Sharpe Ratio", value: fmt(ind.sharpe, 2), signal: shSig, infoKey: "sharpe", rawValue: ind.sharpe });
  // Beta
  const bSig: Signal = ind.beta > 1.2 ? "neg" : ind.beta < 0.8 ? "pos" : "neu";
  rows.push({ label: "Beta", value: fmt(ind.beta, 2), sub: ind.beta > 1.2 ? "aggressiv" : ind.beta < 0.8 ? "defensiv" : "marktnah", signal: bSig, infoKey: "beta", rawValue: ind.beta });

  return rows;
}

// ---------- News ----------
type NewsItem = { uuid: string; title: string; link: string; publishedAt: number; publisher: string; sentiment?: "bullish" | "bearish" | "neutral" };
function useTopNews(symbol: string) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/public/news-sentiment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: [symbol], tier1Only: false }),
    })
      .then((r) => r.json())
      .then((j) => { if (alive) { setItems((j.items ?? []).slice(0, 3)); setLoading(false); } })
      .catch(() => { if (alive) { setItems([]); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol]);
  return { items, loading };
}

// ---------- Hauptkomponente ----------
export function ApexDashboard({
  symbol, name, decision, indicators, candles, quote, regime,
}: {
  symbol: string;
  name: string;
  decision: DecisionReport;
  indicators: IndicatorSet;
  candles: Candles;
  quote?: Quote;
  regime: MarketRegime;
}) {
  // Candle-Objekte rekonstruieren
  const candleObjs: Candle[] = useMemo(() => candles.t.map((t, i) => ({
    t, o: candles.o[i], h: candles.h[i], l: candles.l[i], c: candles.c[i], v: candles.v[i],
  })), [candles]);

  const stoch = useMemo(() => stochRsi(candles.c, 14), [candles]);
  const atrVal = useMemo(() => atr(candleObjs, 14), [candleObjs]);
  const avgVol = useMemo(() => {
    const v = candles.v.slice(-20).filter((x) => x > 0);
    return v.length ? mean(v) : 0;
  }, [candles]);
  const lastVol = candles.v[candles.v.length - 1] ?? 0;

  const techRows = useMemo(
    () => technicalSignals(indicators, stoch, atrVal, avgVol, lastVol),
    [indicators, stoch, atrVal, avgVol, lastVol],
  );
  const posCount = techRows.filter((r) => r.signal === "pos").length;
  const negCount = techRows.filter((r) => r.signal === "neg").length;
  const neuCount = techRows.length - posCount - negCount;
  const techVerdict: Signal = posCount > negCount + 1 ? "pos" : negCount > posCount + 1 ? "neg" : "neu";

  // Verdict mapping
  const verdictColor = decision.decision === "BUY"
    ? { bg: "bg-emerald-500/15 border-emerald-500/50", text: "text-emerald-400", bar: "bg-emerald-500", icon: TrendingUp, label: "KAUFEN" }
    : decision.decision === "SELL"
    ? { bg: "bg-rose-500/15 border-rose-500/50", text: "text-rose-400", bar: "bg-rose-500", icon: TrendingDown, label: "VERKAUFEN" }
    : { bg: "bg-amber-400/15 border-amber-400/50", text: "text-amber-300", bar: "bg-amber-400", icon: MinusCircle, label: "HALTEN" };
  const VerdictIcon = verdictColor.icon;

  // Fundamentals
  const fundamentals: Array<{ label: string; value: string; sub?: string; signal: Signal; infoKey?: string; rawValue?: any }> = [
    { label: "Aktueller Kurs", value: `${fmt(indicators.price)} ${quote?.currency ?? ""}`, sub: quote?.dp != null ? fmtPct(quote.dp) : undefined, signal: (quote?.dp ?? 0) >= 0 ? "pos" : "neg" as Signal, infoKey: "price", rawValue: { changePct: quote?.dp } },
    { label: "Marktkapitalisierung", value: quote?.marketCap ? fmtBig(quote.marketCap) : "—", signal: "neu" as Signal, infoKey: "marketCap" },
    { label: "52-W-Hoch", value: quote?.h52 ? fmt(quote.h52) : "—", sub: quote?.h52 ? `${fmtPct((indicators.price / quote.h52 - 1) * 100)} v. ATH` : undefined, signal: "neu" as Signal, infoKey: "high52" },
    { label: "52-W-Tief", value: quote?.l52 ? fmt(quote.l52) : "—", sub: quote?.l52 ? `${fmtPct((indicators.price / quote.l52 - 1) * 100)} ü. ATL` : undefined, signal: "neu" as Signal, infoKey: "low52" },
    { label: "Beta vs. Markt", value: fmt(indicators.beta, 2), signal: indicators.beta > 1.2 ? "neg" : indicators.beta < 0.8 ? "pos" : "neu" as Signal, infoKey: "beta", rawValue: indicators.beta },
    { label: "Sharpe Ratio (Qualität)", value: fmt(indicators.sharpe, 2), sub: indicators.sharpe > 1 ? "institutionell" : indicators.sharpe < 0 ? "unattraktiv" : "akzeptabel", signal: indicators.sharpe > 1 ? "pos" : indicators.sharpe < 0 ? "neg" : "neu" as Signal, infoKey: "sharpe", rawValue: indicators.sharpe },
  ];
  const fundamentalVerdict: Signal = fundamentals.filter((f) => f.signal === "pos").length >= fundamentals.filter((f) => f.signal === "neg").length ? "pos" : "neg";

  // News
  const news = useTopNews(symbol);

  // Risiken
  const risks: Array<{ title: string; desc: string; level: "Hoch" | "Mittel" | "Niedrig" }> = [];
  risks.push({
    title: "Marktrisiko",
    desc: regime === "bear" ? `Risk-Off-Umfeld — defensive Sektoren outperformen.` : regime === "high_vol" ? "Hohe Marktvolatilität, institutionelle Hände reduzieren Exposure." : "Marktphase stützt zyklische Positionen.",
    level: regime === "bear" || regime === "high_vol" ? "Hoch" : regime === "chop" ? "Mittel" : "Niedrig",
  });
  risks.push({
    title: "Volatilitätsrisiko",
    desc: `Annualisierte Schwankung ${fmtPct(indicators.volatility * 100, 1)} — ATR ${fmt(atrVal)} entspricht ${fmt((atrVal / indicators.price) * 100, 2)} % Tagesbewegung.`,
    level: indicators.volatility > 0.5 ? "Hoch" : indicators.volatility > 0.3 ? "Mittel" : "Niedrig",
  });
  risks.push({
    title: "Trend- & Momentum-Risiko",
    desc: indicators.rsi >= 75 ? "RSI überkauft — Korrektur-Wahrscheinlichkeit erhöht." : indicators.rsi <= 25 ? "RSI überverkauft — kurzfristige Erholung möglich, mittelfristiger Trend bleibt schwach." : !isNaN(indicators.sma50) && !isNaN(indicators.sma200) && indicators.sma50 < indicators.sma200 ? "Death Cross aktiv — Trend strukturell negativ." : "Momentum-Lage neutral.",
    level: indicators.rsi >= 75 || indicators.rsi <= 25 ? "Hoch" : "Mittel",
  });

  // Preisprognose (3 Szenarien, ATR-basiert über ~30 Handelstage)
  const horizonDays = 30;
  const sigmaDay = indicators.volatility / Math.sqrt(252);
  const drift = decision.decision === "BUY" ? sigmaDay * 0.6 : decision.decision === "SELL" ? -sigmaDay * 0.6 : 0;
  const bullPct = (drift * horizonDays + 2 * sigmaDay * Math.sqrt(horizonDays)) * 100;
  const basePct = drift * horizonDays * 100;
  const bearPct = (drift * horizonDays - 2 * sigmaDay * Math.sqrt(horizonDays)) * 100;
  const bullPrice = indicators.price * (1 + bullPct / 100);
  const basePrice = indicators.price * (1 + basePct / 100);
  const bearPrice = indicators.price * (1 + bearPct / 100);
  const probs = decision.decision === "BUY" ? [50, 35, 15] : decision.decision === "SELL" ? [15, 35, 50] : [25, 50, 25];

  return (
    <div className="space-y-4">
      {/* APEX VERDICT */}
      <div className={`rounded-2xl border-2 p-5 shadow-md ${verdictColor.bg}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">APEX Verdict</div>
          <div className="text-[10px] text-muted-foreground">{name} · {symbol}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-3xl font-extrabold tracking-tight ${verdictColor.text}`}>
            <VerdictIcon className="h-7 w-7" />
            {verdictColor.label}
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Confidence</span>
              <span className={`font-mono font-bold ${verdictColor.text}`}>{decision.confidence}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/60">
              <div className={`h-full rounded-full ${verdictColor.bar} transition-all`} style={{ width: `${decision.confidence}%` }} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{decision.reasoning}</p>
      </div>

      {/* TECHNISCHE & STATISTISCHE ANALYSE */}
      <SectionCard icon={BarChart3} title="📈 Technische & statistische Analyse">
        <div className="divide-y divide-border/40">
          {techRows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} sub={r.sub} signal={r.signal} />
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-background/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">Technisches Gesamturteil</span>
          <span className="font-semibold">
            <span className="text-emerald-400">🟢 {posCount} positiv</span>{" · "}
            <span className="text-amber-300">🟡 {neuCount} neutral</span>{" · "}
            <span className="text-rose-400">🔴 {negCount} negativ</span>
            {" → "}
            <span className={techVerdict === "pos" ? "text-emerald-400" : techVerdict === "neg" ? "text-rose-400" : "text-amber-300"}>
              {techVerdict === "pos" ? "bullisches Bild" : techVerdict === "neg" ? "bärisches Bild" : "neutrales Bild"}
            </span>
          </span>
        </div>
      </SectionCard>

      {/* FUNDAMENTALANALYSE */}
      <SectionCard icon={Landmark} title="💰 Fundamentalanalyse">
        <div className="divide-y divide-border/40">
          {fundamentals.map((f) => (
            <Row key={f.label} label={f.label} value={f.value} sub={f.sub} signal={f.signal} />
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-background/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">Fundamentales Gesamturteil</span>
          <span className={`font-semibold ${fundamentalVerdict === "pos" ? "text-emerald-400" : "text-rose-400"}`}>
            {fundamentalVerdict === "pos"
              ? "Solides Qualitäts- und Risiko-Profil."
              : "Erhöhtes Risiko — Marktsensitivität und Renditequalität beachten."}
          </span>
        </div>
      </SectionCard>

      {/* NACHRICHTEN */}
      <SectionCard icon={Newspaper} title="📰 Nachrichten & Katalysatoren">
        {news.loading && <div className="px-4 py-6 text-sm text-muted-foreground">News werden geladen…</div>}
        {!news.loading && news.items.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">Aktuell keine verifizierten Live-News.</div>
        )}
        <div className="divide-y divide-border/40">
          {news.items.map((n) => {
            const impact: Signal = n.sentiment === "bullish" ? "pos" : n.sentiment === "bearish" ? "neg" : "neu";
            const impactLabel = n.sentiment === "bullish" ? "Positiv" : n.sentiment === "bearish" ? "Negativ" : "Neutral";
            return (
              <a key={n.uuid} href={n.link} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 hover:bg-muted/30">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(n.publishedAt).toLocaleDateString("de-DE")} · {n.publisher}</span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${impact === "pos" ? "text-emerald-400" : impact === "neg" ? "text-rose-400" : "text-amber-300"}`}>
                    <SignalDot s={impact} /> {impactLabel}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="flex-1">{n.title}</span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </div>
              </a>
            );
          })}
        </div>
      </SectionCard>

      {/* RISIKEN */}
      <SectionCard icon={AlertTriangle} title="⚠️ Risiko-Analyse">
        <div className="divide-y divide-border/40">
          {risks.map((r) => {
            const color = r.level === "Hoch" ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
              : r.level === "Mittel" ? "text-amber-300 bg-amber-400/10 border-amber-400/30"
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
            return (
              <div key={r.title} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
                <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${color}`}>
                  {r.level}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* PREISPROGNOSE */}
      <SectionCard icon={Target} title="🔮 APEX Preisprognose · 30 Handelstage">
        <div className="divide-y divide-border/40">
          {[
            { name: "🟢 Bullisch", price: bullPrice, pct: bullPct, prob: probs[0], color: "text-emerald-400" },
            { name: "🟡 Basisszenario", price: basePrice, pct: basePct, prob: probs[1], color: "text-amber-300" },
            { name: "🔴 Bärisch", price: bearPrice, pct: bearPct, prob: probs[2], color: "text-rose-400" },
          ].map((s) => (
            <div key={s.name} className="grid grid-cols-3 items-center px-3 py-3 text-sm">
              <div className={`font-semibold ${s.color}`}>{s.name}</div>
              <div className="text-right">
                <div className="font-mono text-base font-bold">{fmt(s.price)}</div>
                <div className={`text-[10px] ${s.pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtPct(s.pct)}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base font-semibold">{s.prob}%</div>
                <div className="text-[10px] text-muted-foreground">Wahrscheinlichkeit</div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 bg-background/30 px-4 py-2 text-[10px] text-muted-foreground">
          Modellbasiert (ATR/Volatilitäts-Drift, 2σ-Korridor) — keine Anlageberatung.
        </div>
      </SectionCard>
    </div>
  );
}

// ---------- Loading Animation ----------
export function ApexLoading({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-primary/10">
          <Gauge className="h-7 w-7 animate-pulse text-primary" />
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-bold tracking-wide">APEX analysiert {name}…</div>
        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <Activity className="h-3 w-3 animate-pulse" />
          Indikatoren · Fundamentaldaten · Live-News
        </div>
      </div>
    </div>
  );
}

// Unused exports below to silence tree-shake warnings for icons used conditionally
export const _icons = { CheckCircle2, XCircle };
