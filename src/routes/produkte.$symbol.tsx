import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { trackView } from "@/lib/popularity-tracker";
import { ArrowLeft, Star, StarOff, TrendingUp, TrendingDown, LayoutDashboard, LineChart, Newspaper, CalendarDays, Database } from "lucide-react";
import { findProduct } from "@/lib/products";
import { useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { useWatchlistLimit } from "@/lib/featureGate";
import { useLang } from "@/lib/i18n";
import { SignalBadge } from "@/components/SignalBadge";
import { ProChart } from "@/components/ProChart";
import { AssetChart } from "@/components/AssetChart";
import { BrokerAssessment } from "@/components/BrokerAssessment";
import { MarketConsensus } from "@/components/MarketConsensus";
import { ExplainAiButton } from "@/components/ExplainAiButton";
import { AssetNewsPanel } from "@/components/AssetNewsPanel";
import { AssetEventsPanel } from "@/components/AssetEventsPanel";
import { RealtimeStatusBadge } from "@/components/RealtimeStatusBadge";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { usePickVerdict } from "@/hooks/usePickVerdict";
import { convertFromUsd, formatCurrencyFromUsd, formatSignedAbs, axisDecimals } from "@/lib/format";
import { QuantFinancePanel } from "@/components/QuantFinancePanel";


export const Route = createFileRoute("/produkte/$symbol")({
  head: ({ params }) => {
    const symbol = params.symbol;
    const product = findProduct(symbol);
    const name = product?.name ?? symbol;
    const sector = product?.sector ?? "Aktie";
    const title = `${symbol} · ${name} — Quant-Analyse & Signal | Quantm Trade`;
    const description = `Live ${name} (${symbol}) Quant-Analyse: RSI, MACD, Bollinger, Z-Score und Wall-Street-Broker-Konsens. Sektor: ${sector}. Aktualisiert minütlich.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: ProductDetail,
});

/* ─────────────────── Plain-language one-liner ─────────────────── */

function plainVerdict(
  verdict: string,
  confidence: number,
  rsi: number,
  zScore: number,
  lang: "de" | "en",
): string {
  // Pick the ONE indicator currently driving the decision and explain it in 1 sentence.
  const overbought = rsi > 70;
  const oversold = rsi < 30;
  const stretchedUp = zScore > 1.5;
  const stretchedDown = zScore < -1.5;

  if (lang === "en") {
    if (verdict === "LONG") {
      if (oversold) return `Price looks oversold (RSI ${rsi.toFixed(0)}). The model expects a bounce — confidence ${confidence}%.`;
      if (stretchedDown) return `Price is unusually far below its recent average. Statistics favour a recovery — confidence ${confidence}%.`;
      return `Momentum and trend align bullish — confidence ${confidence}%.`;
    }
    if (verdict === "SHORT") {
      if (overbought) return `Price looks overbought (RSI ${rsi.toFixed(0)}). The model expects a pullback — confidence ${confidence}%.`;
      if (stretchedUp) return `Price is unusually far above its recent average. Statistics favour a cooldown — confidence ${confidence}%.`;
      return `Momentum and trend align bearish — confidence ${confidence}%.`;
    }
    return `No strong edge in either direction — sit tight or wait for confirmation.`;
  }

  // German
  if (verdict === "LONG") {
    if (oversold) return `Preis wirkt überverkauft (RSI ${rsi.toFixed(0)}). Das Modell erwartet eine Erholung — Konfidenz ${confidence}%.`;
    if (stretchedDown) return `Preis liegt ungewöhnlich weit unter dem Schnitt. Statistik spricht für Rückkehr — Konfidenz ${confidence}%.`;
    return `Momentum und Trend zeigen bullisch — Konfidenz ${confidence}%.`;
  }
  if (verdict === "SHORT") {
    if (overbought) return `Preis wirkt überkauft (RSI ${rsi.toFixed(0)}). Das Modell erwartet einen Rücksetzer — Konfidenz ${confidence}%.`;
    if (stretchedUp) return `Preis liegt ungewöhnlich weit über dem Schnitt. Statistik spricht für Abkühlung — Konfidenz ${confidence}%.`;
    return `Momentum und Trend zeigen bärisch — Konfidenz ${confidence}%.`;
  }
  return `Keine klare Tendenz erkennbar — abwarten oder Bestätigung suchen.`;
}

/* ─────────────────── Component ─────────────────── */

function ProductDetail() {
  const { symbol } = Route.useParams();
  const product = findProduct(symbol);
  // Popularity tracking for "Most viewed stocks" widget
  useEffect(() => {
    if (symbol) trackView("stock", symbol);
  }, [symbol]);
  const { indicators, candles } = useAnalysis(symbol);
  const { settings } = useSettings();
  const { guardedAdd } = useWatchlistLimit();
  const lang = useLang();
  // Echtzeit-Feed: nur das aktuell geöffnete Symbol abonnieren.
  const live = useLiveQuotes([symbol], true);

  const watched = settings.watchlist.includes(symbol);
  const sig = indicators ? scoreIndicators(indicators, settings.risk) : null;
  const closes = candles.data?.c ?? [];
  const last = closes.at(-1) ?? indicators?.price ?? 0;
  const prev = closes.at(-2) ?? last;
  const abs = last - prev;
  const change = prev ? (abs / prev) * 100 : 0;
  const changeUp = abs >= 0;
  const displayLast = convertFromUsd(last, settings.currency);
  const displayAbs = convertFromUsd(abs, settings.currency);

  const t = {
    back: lang === "en" ? "Back" : "Zurück",
    watchlist: lang === "en" ? "Watchlist" : "Watchlist",
    freeSymbol: lang === "en" ? "Free symbol" : "Freies Symbol",
    ticker: lang === "en" ? "Ticker" : "Ticker",
    updating: lang === "en" ? "Live data updating… last valid values shown." : "Live-Daten werden aktualisiert… letzte gültige Werte werden angezeigt.",
    verdictLabel: lang === "en" ? "Today's read" : "Heutige Einschätzung",
    advChart: lang === "en" ? "Advanced chart" : "Erweiterter Chart",
    advChartCtx: lang === "en" ? "Candles, EMAs, Bollinger, RSI, MACD" : "Candles, EMAs, Bollinger, RSI, MACD",
    rawData: lang === "en" ? "Raw indicators" : "Rohdaten — Indikatoren",
    volatility: lang === "en" ? "Volatility (annualised)" : "Vola annualisiert",
    momentum: lang === "en" ? "Momentum 10 periods" : "Momentum 10P",
    tabs: {
      overview: lang === "en" ? "Overview" : "Übersicht",
      chart: lang === "en" ? "Chart & Analysis" : "Chart & Analyse",
      news: lang === "en" ? "News & Sentiment" : "News & Sentiment",
      events: lang === "en" ? "Events" : "Events",
      data: lang === "en" ? "Data" : "Daten",
    },
  };

  type TabKey = "overview" | "chart" | "news" | "events" | "data";
  const [tab, setTab] = useState<TabKey>("overview");

  const tabList: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: t.tabs.overview, icon: LayoutDashboard },
    { key: "chart", label: t.tabs.chart, icon: LineChart },
    { key: "news", label: t.tabs.news, icon: Newspaper },
    { key: "events", label: t.tabs.events, icon: CalendarDays },
    { key: "data", label: t.tabs.data, icon: Database },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* ─── Sticky compact header ─── */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/produkte" className="text-muted-foreground hover:text-foreground" aria-label={t.back}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{symbol}</h1>
              <span className="hidden rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground sm:inline">
                {product?.sector ?? t.ticker}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{product?.name ?? t.freeSymbol}</p>
          </div>

          {indicators && (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums sm:text-2xl">{formatCurrencyFromUsd(last, settings.currency)}</span>
              <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${changeUp ? "text-emerald-400" : "text-rose-400"}`}>
                {changeUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {formatSignedAbs(displayAbs, axisDecimals(displayLast))} ({changeUp ? "+" : ""}{change.toFixed(2)}%)
              </span>
              <RealtimeStatusBadge tier={live.tier} connected={live.connected} compact />
            </div>
          )}


          <button
            onClick={() => guardedAdd(symbol)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent sm:text-sm"
          >
            {watched ? <Star className="h-4 w-4 fill-current text-primary" /> : <StarOff className="h-4 w-4" />}
            {t.watchlist}
          </button>
        </div>

        {/* ─── Tab nav ─── */}
        <div className="mt-3 -mb-px flex gap-1 overflow-x-auto">
          {tabList.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {(candles.isError || candles.data?.stale) && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          {t.updating}
        </div>
      )}

      {indicators && sig && (
        <>
          {tab === "overview" && (
            <>
              <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-card/95 to-card/40 p-6 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t.verdictLabel}
                  </div>
                  <SignalBadge verdict={sig.verdict} confidence={sig.confidence} />
                </div>
                <p className="text-lg leading-relaxed text-foreground sm:text-xl">
                  {plainVerdict(sig.verdict, sig.confidence, indicators.rsi, indicators.zScore, lang)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <ExplainAiButton
                    topic={lang === "en" ? `Why ${symbol} is rated ${sig.verdict}` : `Warum ${symbol} als ${sig.verdict} bewertet wird`}
                    context={`RSI ${indicators.rsi.toFixed(1)}, Z-Score ${indicators.zScore.toFixed(2)}, MACD ${indicators.macd.macd.toFixed(2)}, Vol ${(indicators.volatility * 100).toFixed(1)}%, Confidence ${sig.confidence}%.`}
                    label={lang === "en" ? "Explain in detail" : "Im Detail erklären"}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5">
                <AssetChart symbol={symbol} height={320} defaultTf="1Y" currency={settings.currency} />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <MarketConsensus symbol={symbol} indicators={indicators} />
                <BrokerAssessment symbol={symbol} name={product?.name ?? symbol} indicators={indicators} signal={sig} currency={settings.currency} lang={lang} />
              </section>
            </>
          )}

          {tab === "chart" && (
            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.advChart}
                </div>
                <ExplainAiButton topic={t.advChart} context={`${t.advChartCtx} — ${symbol}.`} />
              </div>
              {candles.data && (
                <ProChart
                  data={candles.data}
                  height={560}
                  overlays={["ema20", "ema50", "sma200", "bbands"]}
                  subcharts={["volume", "rsi", "macd"]}
                  showZones
                />
              )}
            </section>
          )}

          {tab === "news" && (
            <section className="space-y-4">
              <AssetNewsPanel symbol={symbol} />
            </section>
          )}

          {tab === "events" && (
            <section className="space-y-4">
              <AssetEventsPanel symbol={symbol} />
            </section>
          )}

          {tab === "data" && (
            <section className="rounded-2xl border border-border/70 bg-card/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.rawData}
                </div>
                <ExplainAiButton
                  topic={lang === "en" ? "Technical indicators overview" : "Technische Indikatoren Übersicht"}
                  context={`RSI ${indicators.rsi.toFixed(1)}, MACD ${indicators.macd.macd.toFixed(2)}, Vola ${(indicators.volatility * 100).toFixed(1)}%`}
                />
              </div>
              <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                <Row k="Z-Score (20)" v={indicators.zScore.toFixed(2)} explain="Z-Score" ctx={`Aktuell ${indicators.zScore.toFixed(2)} für ${symbol}.`} />
                <Row k="RSI (14)" v={indicators.rsi.toFixed(1)} explain="RSI (Relative Strength Index)" ctx={`RSI aktuell ${indicators.rsi.toFixed(1)} für ${symbol}.`} />
                <Row k="MACD" v={indicators.macd.macd.toFixed(3)} explain="MACD" ctx={`MACD-Linie ${indicators.macd.macd.toFixed(3)}, Signal ${indicators.macd.signal.toFixed(3)}.`} />
                <Row k="MACD Signal" v={indicators.macd.signal.toFixed(3)} />
                <Row k="MACD Histogramm" v={indicators.macd.histogram.toFixed(3)} />
                <Row k="Bollinger Upper" v={formatCurrencyFromUsd(indicators.bollinger.upper, settings.currency)} explain="Bollinger Bands" ctx={`Upper ${formatCurrencyFromUsd(indicators.bollinger.upper, settings.currency)}, Lower ${formatCurrencyFromUsd(indicators.bollinger.lower, settings.currency)}, Preis ${formatCurrencyFromUsd(last, settings.currency)}.`} />
                <Row k="Bollinger Lower" v={formatCurrencyFromUsd(indicators.bollinger.lower, settings.currency)} />
                <Row k={t.volatility} v={(indicators.volatility * 100).toFixed(1) + "%"} explain="Volatilität" ctx={`Annualisierte Vola ${(indicators.volatility * 100).toFixed(1)}% für ${symbol}.`} />
                <Row k={t.momentum} v={(indicators.momentum * 100).toFixed(2) + "%"} explain="Momentum" ctx={`10-Perioden-Momentum ${(indicators.momentum * 100).toFixed(2)}%.`} />
                <Row k="Sharpe Ratio" v={indicators.sharpe.toFixed(2)} explain="Sharpe Ratio" ctx={`Sharpe Ratio ${indicators.sharpe.toFixed(2)}.`} />
                <Row k="Beta vs. SPY" v={indicators.beta.toFixed(2)} explain="Beta" ctx={`Beta ${indicators.beta.toFixed(2)} gegen S&P 500.`} />
                <Row k="SMA 20 / 50 / 200" v={`${formatCurrencyFromUsd(indicators.sma20, settings.currency)} / ${isNaN(indicators.sma50) ? "—" : formatCurrencyFromUsd(indicators.sma50, settings.currency)} / ${isNaN(indicators.sma200) ? "—" : formatCurrencyFromUsd(indicators.sma200, settings.currency)}`} explain="SMA & EMA (Gleitende Durchschnitte)" ctx={`SMA20 ${formatCurrencyFromUsd(indicators.sma20, settings.currency)}, SMA50 ${formatCurrencyFromUsd(indicators.sma50, settings.currency)}, SMA200 ${formatCurrencyFromUsd(indicators.sma200, settings.currency)}.`} />
              </div>

              {candles.data && candles.data.c.length >= 30 && (
                <div className="mt-5">
                  <QuantFinancePanel
                    symbol={symbol}
                    candleObjs={candles.data.t.map((t, i) => ({
                      t,
                      o: candles.data!.o[i],
                      h: candles.data!.h[i],
                      l: candles.data!.l[i],
                      c: candles.data!.c[i],
                      v: candles.data!.v[i],
                    }))}
                    price={indicators.price}
                  />
                </div>
              )}
            </section>
          )}

        </>
      )}
    </div>
  );
}

function Row({ k, v, klass, explain, ctx }: { k: string; v: string; klass?: string; explain?: string; ctx?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {k}
        {explain && <ExplainAiButton topic={explain} context={ctx} variant="icon" />}
      </span>
      <span className={`font-mono tabular-nums ${klass ?? ""}`}>{v}</span>
    </div>
  );
}
