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
import { QuantFinancePanel } from "@/components/QuantFinancePanel";
import { fetchNewsSentiment } from "@/lib/news-sentiment";
import { useSubscription } from "@/hooks/useSubscription";
import { useTr, useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";

type Signal = "pos" | "neg" | "neu";

function locale(lang: Lang): string {
  return lang === "en" ? "en-US" : "de-DE";
}
function fmt(n: number | undefined | null, d = 2, lang: Lang = "de"): string {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString(locale(lang), { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number | undefined | null, d = 1, lang: Lang = "de"): string {
  if (n == null || !isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toLocaleString(locale(lang), { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
}
function fmtBig(n: number | undefined | null, lang: Lang = "de"): string {
  if (n == null || !isFinite(n)) return "—";
  const units = lang === "en"
    ? { t: "T", g: "B", m: "M" }
    : { t: "Bio.", g: "Mrd.", m: "Mio." };
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} ${units.t}`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} ${units.g}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} ${units.m}`;
  return n.toLocaleString(locale(lang));
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

function technicalSignals(
  ind: IndicatorSet,
  stoch: number,
  atrVal: number,
  avgVol: number,
  lastVol: number,
  tr: (de: string, en: string) => string,
  lang: Lang,
) {
  const rows: Array<{ label: string; value: string; sub?: string; signal: Signal; infoKey?: string; rawValue?: any }> = [];
  const overbought = tr("überkauft", "overbought");
  const oversold = tr("überverkauft", "oversold");
  const neutral = tr("neutral", "neutral");
  const above = tr("Kurs darüber", "price above");
  const below = tr("Kurs darunter", "price below");
  // RSI
  rows.push({
    label: "RSI (14)",
    value: fmt(ind.rsi, 1, lang),
    sub: ind.rsi >= 70 ? overbought : ind.rsi <= 30 ? oversold : neutral,
    signal: ind.rsi <= 30 ? "pos" : ind.rsi >= 70 ? "neg" : "neu",
    infoKey: "rsi", rawValue: ind.rsi,
  });
  // Stoch RSI
  rows.push({
    label: "Stochastic RSI",
    value: fmt(stoch, 1, lang),
    sub: stoch >= 80 ? overbought : stoch <= 20 ? oversold : neutral,
    signal: stoch <= 20 ? "pos" : stoch >= 80 ? "neg" : "neu",
    infoKey: "stochRsi", rawValue: stoch,
  });
  // MACD
  const macdSig: Signal = ind.macd.histogram > 0 && ind.macd.macd > ind.macd.signal ? "pos"
    : ind.macd.histogram < 0 && ind.macd.macd < ind.macd.signal ? "neg" : "neu";
  rows.push({
    label: tr("MACD-Histogramm", "MACD Histogram"),
    value: fmt(ind.macd.histogram, 3, lang),
    sub: `${tr("Signal", "Signal")} ${fmt(ind.macd.signal, 3, lang)}`,
    signal: macdSig,
    infoKey: "macd", rawValue: ind.macd,
  });
  // Bollinger
  const boll: Signal = ind.price <= ind.bollinger.lower ? "pos" : ind.price >= ind.bollinger.upper ? "neg" : "neu";
  rows.push({
    label: tr("Bollinger-Position", "Bollinger Position"),
    value: ind.price <= ind.bollinger.lower
      ? tr("unteres Band", "lower band")
      : ind.price >= ind.bollinger.upper
      ? tr("oberes Band", "upper band")
      : tr("im Korridor", "in range"),
    sub: `${fmt(ind.bollinger.lower, 2, lang)} – ${fmt(ind.bollinger.upper, 2, lang)}`,
    signal: boll,
    infoKey: "bollinger", rawValue: { price: ind.price, lower: ind.bollinger.lower, upper: ind.bollinger.upper },
  });
  // Z-Score
  const zSig: Signal = ind.zScore <= -1 ? "pos" : ind.zScore >= 1 ? "neg" : "neu";
  rows.push({
    label: "Z-Score (20)",
    value: fmt(ind.zScore, 2, lang),
    sub: Math.abs(ind.zScore) >= 2
      ? tr("extrem", "extreme")
      : Math.abs(ind.zScore) >= 1
      ? tr("auffällig", "notable")
      : neutral,
    signal: zSig,
    infoKey: "zScore", rawValue: ind.zScore,
  });
  // SMA 20
  const sma20Sig: Signal = ind.price > ind.sma20 ? "pos" : ind.price < ind.sma20 ? "neg" : "neu";
  rows.push({ label: "SMA 20", value: fmt(ind.sma20, 2, lang), sub: ind.price > ind.sma20 ? above : below, signal: sma20Sig, infoKey: "sma20", rawValue: { price: ind.price, sma: ind.sma20 } });
  // SMA 50
  if (!isNaN(ind.sma50)) {
    const sig: Signal = ind.price > ind.sma50 ? "pos" : "neg";
    rows.push({ label: "SMA 50", value: fmt(ind.sma50, 2, lang), sub: ind.price > ind.sma50 ? above : below, signal: sig, infoKey: "sma50", rawValue: { price: ind.price, sma: ind.sma50 } });
  }
  // SMA 200
  if (!isNaN(ind.sma200)) {
    const sig: Signal = ind.price > ind.sma200 ? "pos" : "neg";
    rows.push({ label: "SMA 200", value: fmt(ind.sma200, 2, lang), sub: ind.sma50 > ind.sma200 ? "Golden Cross" : "Death Cross", signal: sig, infoKey: "sma200", rawValue: { price: ind.price, sma200: ind.sma200, sma50: ind.sma50 } });
  }
  // Momentum
  const momSig: Signal = ind.momentum > 0.02 ? "pos" : ind.momentum < -0.02 ? "neg" : "neu";
  rows.push({ label: tr("Momentum (10 T.)", "Momentum (10d)"), value: fmtPct(ind.momentum * 100, 1, lang), signal: momSig, infoKey: "momentum", rawValue: ind.momentum });
  // ATR
  rows.push({
    label: "ATR (14)",
    value: fmt(atrVal, 2, lang),
    sub: `${fmt((atrVal / ind.price) * 100, 2, lang)}${tr("% v. Kurs", "% of price")}`,
    signal: "neu",
    infoKey: "atr", rawValue: { atr: atrVal, price: ind.price },
  });
  // Volatility
  const volSig: Signal = ind.volatility > 0.5 ? "neg" : ind.volatility < 0.2 ? "pos" : "neu";
  rows.push({ label: tr("Volatilität (annual.)", "Volatility (annual.)"), value: fmtPct(ind.volatility * 100, 1, lang), signal: volSig, infoKey: "volatility", rawValue: ind.volatility });
  // Volume
  const volRatio = avgVol > 0 ? lastVol / avgVol : 1;
  const vSig: Signal = volRatio >= 1.5 ? "pos" : volRatio <= 0.6 ? "neg" : "neu";
  rows.push({
    label: tr("Volumen vs. Ø", "Volume vs. avg."),
    value: `${fmt(volRatio, 2, lang)}×`,
    sub: `${fmtBig(lastVol, lang)} ${tr("heute", "today")}`,
    signal: vSig,
    infoKey: "volume", rawValue: { ratio: volRatio },
  });
  // Sharpe
  const shSig: Signal = ind.sharpe > 1 ? "pos" : ind.sharpe < 0 ? "neg" : "neu";
  rows.push({ label: "Sharpe Ratio", value: fmt(ind.sharpe, 2, lang), signal: shSig, infoKey: "sharpe", rawValue: ind.sharpe });
  // Beta
  const bSig: Signal = ind.beta > 1.2 ? "neg" : ind.beta < 0.8 ? "pos" : "neu";
  rows.push({
    label: "Beta",
    value: fmt(ind.beta, 2, lang),
    sub: ind.beta > 1.2 ? tr("aggressiv", "aggressive") : ind.beta < 0.8 ? tr("defensiv", "defensive") : tr("marktnah", "market-like"),
    signal: bSig,
    infoKey: "beta", rawValue: ind.beta,
  });

  return rows;
}

// ---------- News ----------
type NewsItem = { uuid: string; title: string; link: string; publishedAt: number; publisher: string; sentiment?: "bullish" | "bearish" | "neutral" };
function useTopNews(symbol: string) {
  const { isPro, loading: subLoading } = useSubscription();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (subLoading) return;
    if (!isPro) { setItems([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetchNewsSentiment({ symbols: [symbol], tier1Only: false })
      .then((r) => { if (alive) { setItems((r.items as NewsItem[]).slice(0, 3)); setLoading(false); } })
      .catch(() => { if (alive) { setItems([]); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol, isPro, subLoading]);
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
  const tr = useTr();
  const lang = useLang();

  // Reconstruct candle objects
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
    () => technicalSignals(indicators, stoch, atrVal, avgVol, lastVol, tr, lang),
    [indicators, stoch, atrVal, avgVol, lastVol, tr, lang],
  );
  const posCount = techRows.filter((r) => r.signal === "pos").length;
  const negCount = techRows.filter((r) => r.signal === "neg").length;
  const neuCount = techRows.length - posCount - negCount;
  const techVerdict: Signal = posCount > negCount + 1 ? "pos" : negCount > posCount + 1 ? "neg" : "neu";

  // Verdict mapping
  const verdictColor = decision.decision === "BUY"
    ? { bg: "bg-emerald-500/15 border-emerald-500/50", text: "text-emerald-400", bar: "bg-emerald-500", icon: TrendingUp, label: tr("KAUFEN", "BUY") }
    : decision.decision === "SELL"
    ? { bg: "bg-rose-500/15 border-rose-500/50", text: "text-rose-400", bar: "bg-rose-500", icon: TrendingDown, label: tr("VERKAUFEN", "SELL") }
    : { bg: "bg-amber-400/15 border-amber-400/50", text: "text-amber-300", bar: "bg-amber-400", icon: MinusCircle, label: tr("HALTEN", "HOLD") };
  const VerdictIcon = verdictColor.icon;

  // Fundamentals
  const fundamentals: Array<{ label: string; value: string; sub?: string; signal: Signal; infoKey?: string; rawValue?: any }> = [
    { label: tr("Aktueller Kurs", "Current price"), value: `${fmt(indicators.price, 2, lang)} ${quote?.currency ?? ""}`, sub: quote?.dp != null ? fmtPct(quote.dp, 1, lang) : undefined, signal: (quote?.dp ?? 0) >= 0 ? "pos" : "neg" as Signal, infoKey: "price", rawValue: { changePct: quote?.dp } },
    { label: tr("Marktkapitalisierung", "Market cap"), value: quote?.marketCap ? fmtBig(quote.marketCap, lang) : "—", signal: "neu" as Signal, infoKey: "marketCap" },
    { label: tr("52-W-Hoch", "52-week high"), value: quote?.h52 ? fmt(quote.h52, 2, lang) : "—", sub: quote?.h52 ? `${fmtPct((indicators.price / quote.h52 - 1) * 100, 1, lang)} ${tr("v. ATH", "vs ATH")}` : undefined, signal: "neu" as Signal, infoKey: "high52" },
    { label: tr("52-W-Tief", "52-week low"), value: quote?.l52 ? fmt(quote.l52, 2, lang) : "—", sub: quote?.l52 ? `${fmtPct((indicators.price / quote.l52 - 1) * 100, 1, lang)} ${tr("ü. ATL", "vs ATL")}` : undefined, signal: "neu" as Signal, infoKey: "low52" },
    { label: tr("Beta vs. Markt", "Beta vs. market"), value: fmt(indicators.beta, 2, lang), signal: indicators.beta > 1.2 ? "neg" : indicators.beta < 0.8 ? "pos" : "neu" as Signal, infoKey: "beta", rawValue: indicators.beta },
    { label: tr("Sharpe Ratio (Qualität)", "Sharpe Ratio (quality)"), value: fmt(indicators.sharpe, 2, lang), sub: indicators.sharpe > 1 ? tr("institutionell", "institutional") : indicators.sharpe < 0 ? tr("unattraktiv", "unattractive") : tr("akzeptabel", "acceptable"), signal: indicators.sharpe > 1 ? "pos" : indicators.sharpe < 0 ? "neg" : "neu" as Signal, infoKey: "sharpe", rawValue: indicators.sharpe },
  ];
  const fundamentalVerdict: Signal = fundamentals.filter((f) => f.signal === "pos").length >= fundamentals.filter((f) => f.signal === "neg").length ? "pos" : "neg";

  // News
  const news = useTopNews(symbol);

  // Risks
  type RiskLevel = "high" | "medium" | "low";
  const levelLabel = (lv: RiskLevel) => lv === "high" ? tr("Hoch", "High") : lv === "medium" ? tr("Mittel", "Medium") : tr("Niedrig", "Low");
  const risks: Array<{ title: string; desc: string; level: RiskLevel }> = [];
  risks.push({
    title: tr("Marktrisiko", "Market risk"),
    desc: regime === "bear"
      ? tr("Risk-Off-Umfeld — defensive Sektoren outperformen.", "Risk-off environment — defensive sectors outperform.")
      : regime === "high_vol"
      ? tr("Hohe Marktvolatilität, institutionelle Hände reduzieren Exposure.", "High market volatility — institutional players reduce exposure.")
      : tr("Marktphase stützt zyklische Positionen.", "Market phase supports cyclical positions."),
    level: regime === "bear" || regime === "high_vol" ? "high" : regime === "chop" ? "medium" : "low",
  });
  risks.push({
    title: tr("Volatilitätsrisiko", "Volatility risk"),
    desc: tr(
      `Annualisierte Schwankung ${fmtPct(indicators.volatility * 100, 1, lang)} — ATR ${fmt(atrVal, 2, lang)} entspricht ${fmt((atrVal / indicators.price) * 100, 2, lang)} % Tagesbewegung.`,
      `Annualized volatility ${fmtPct(indicators.volatility * 100, 1, lang)} — ATR ${fmt(atrVal, 2, lang)} equals ${fmt((atrVal / indicators.price) * 100, 2, lang)}% daily move.`,
    ),
    level: indicators.volatility > 0.5 ? "high" : indicators.volatility > 0.3 ? "medium" : "low",
  });
  risks.push({
    title: tr("Trend- & Momentum-Risiko", "Trend & momentum risk"),
    desc: indicators.rsi >= 75
      ? tr("RSI überkauft — Korrektur-Wahrscheinlichkeit erhöht.", "RSI overbought — correction probability elevated.")
      : indicators.rsi <= 25
      ? tr("RSI überverkauft — kurzfristige Erholung möglich, mittelfristiger Trend bleibt schwach.", "RSI oversold — short-term bounce possible, mid-term trend remains weak.")
      : !isNaN(indicators.sma50) && !isNaN(indicators.sma200) && indicators.sma50 < indicators.sma200
      ? tr("Death Cross aktiv — Trend strukturell negativ.", "Death Cross active — trend structurally negative.")
      : tr("Momentum-Lage neutral.", "Momentum is neutral."),
    level: indicators.rsi >= 75 || indicators.rsi <= 25 ? "high" : "medium",
  });

  // Price forecast (3 scenarios, ATR-based over ~30 trading days)
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
              <span className="text-muted-foreground">{tr("Konfidenz", "Confidence")}</span>
              <span className={`font-mono font-bold ${verdictColor.text}`}>{decision.confidence}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/60">
              <div className={`h-full rounded-full ${verdictColor.bar} transition-all`} style={{ width: `${decision.confidence}%` }} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{decision.reasoning}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:h-full">

      <SectionCard icon={BarChart3} title={tr("📈 Technische & statistische Analyse", "📈 Technical & statistical analysis")}>
        <div className="divide-y divide-border/40">
          {techRows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} sub={r.sub} signal={r.signal} infoKey={r.infoKey} rawValue={r.rawValue} />
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-background/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">{tr("Technisches Gesamturteil", "Technical verdict")}</span>
          <span className="font-semibold">
            <span className="text-emerald-400">🟢 {posCount} {tr("positiv", "positive")}</span>{" · "}
            <span className="text-amber-300">🟡 {neuCount} {tr("neutral", "neutral")}</span>{" · "}
            <span className="text-rose-400">🔴 {negCount} {tr("negativ", "negative")}</span>
            {" → "}
            <span className={techVerdict === "pos" ? "text-emerald-400" : techVerdict === "neg" ? "text-rose-400" : "text-amber-300"}>
              {techVerdict === "pos" ? tr("bullisches Bild", "bullish picture") : techVerdict === "neg" ? tr("bärisches Bild", "bearish picture") : tr("neutrales Bild", "neutral picture")}
            </span>
          </span>
        </div>
      </SectionCard>

      <QuantFinancePanel symbol={symbol} candleObjs={candleObjs} price={indicators.price} />

      <SectionCard icon={Landmark} title={tr("💰 Fundamentalanalyse", "💰 Fundamentals")}>
        <div className="divide-y divide-border/40">
          {fundamentals.map((f) => (
            <Row key={f.label} label={f.label} value={f.value} sub={f.sub} signal={f.signal} infoKey={f.infoKey} rawValue={f.rawValue} />
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-background/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">{tr("Fundamentales Gesamturteil", "Fundamental verdict")}</span>
          <span className={`font-semibold ${fundamentalVerdict === "pos" ? "text-emerald-400" : "text-rose-400"}`}>
            {fundamentalVerdict === "pos"
              ? tr("Solides Qualitäts- und Risiko-Profil.", "Solid quality and risk profile.")
              : tr("Erhöhtes Risiko — Marktsensitivität und Renditequalität beachten.", "Elevated risk — watch market sensitivity and return quality.")}
          </span>
        </div>
      </SectionCard>

      <SectionCard icon={Newspaper} title={tr("📰 Nachrichten & Katalysatoren", "📰 News & catalysts")}>
        {news.loading && <div className="px-4 py-6 text-sm text-muted-foreground">{tr("News werden geladen…", "Loading news…")}</div>}
        {!news.loading && news.items.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">{tr("Aktuell keine verifizierten Live-News.", "No verified live news right now.")}</div>
        )}
        <div className="divide-y divide-border/40">
          {news.items.map((n) => {
            const impact: Signal = n.sentiment === "bullish" ? "pos" : n.sentiment === "bearish" ? "neg" : "neu";
            const impactLabel = n.sentiment === "bullish" ? tr("Positiv", "Positive") : n.sentiment === "bearish" ? tr("Negativ", "Negative") : tr("Neutral", "Neutral");
            return (
              <a key={n.uuid} href={n.link} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 hover:bg-muted/30">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(n.publishedAt).toLocaleDateString(locale(lang))} · {n.publisher}</span>
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

      <SectionCard icon={AlertTriangle} title={tr("⚠️ Risiko-Analyse", "⚠️ Risk analysis")}>
        <div className="divide-y divide-border/40">
          {risks.map((r) => {
            const color = r.level === "high" ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
              : r.level === "medium" ? "text-amber-300 bg-amber-400/10 border-amber-400/30"
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
            return (
              <div key={r.title} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
                <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${color}`}>
                  {levelLabel(r.level)}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>
      </div>


      <SectionCard icon={Target} title={tr("🔮 APEX Preisprognose · 30 Handelstage", "🔮 APEX price forecast · 30 trading days")}>
        <div className="divide-y divide-border/40">
          {[
            { name: tr("🟢 Bullisch", "🟢 Bullish"), price: bullPrice, pct: bullPct, prob: probs[0], color: "text-emerald-400" },
            { name: tr("🟡 Basisszenario", "🟡 Base case"), price: basePrice, pct: basePct, prob: probs[1], color: "text-amber-300" },
            { name: tr("🔴 Bärisch", "🔴 Bearish"), price: bearPrice, pct: bearPct, prob: probs[2], color: "text-rose-400" },
          ].map((s) => (
            <div key={s.name} className="grid grid-cols-3 items-center px-3 py-3 text-sm">
              <div className={`font-semibold ${s.color}`}>{s.name}</div>
              <div className="text-right">
                <div className="font-mono text-base font-bold">{fmt(s.price, 2, lang)}</div>
                <div className={`text-[10px] ${s.pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtPct(s.pct, 1, lang)}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base font-semibold">{s.prob}%</div>
                <div className="text-[10px] text-muted-foreground">{tr("Wahrscheinlichkeit", "Probability")}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 bg-background/30 px-4 py-2 text-[10px] text-muted-foreground">
          {tr("Modellbasiert (ATR/Volatilitäts-Drift, 2σ-Korridor) — keine Anlageberatung.", "Model-based (ATR / volatility drift, 2σ corridor) — not investment advice.")}
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
