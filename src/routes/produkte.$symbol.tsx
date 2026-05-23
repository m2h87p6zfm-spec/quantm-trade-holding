import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star, StarOff, TrendingUp, TrendingDown } from "lucide-react";
import { findProduct } from "@/lib/products";
import { useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { useWatchlistLimit } from "@/lib/featureGate";
import { SignalBadge } from "@/components/SignalBadge";
import { ProChart } from "@/components/ProChart";
import { AssetChart } from "@/components/AssetChart";
import { BrokerAssessment } from "@/components/BrokerAssessment";
import { MarketConsensus } from "@/components/MarketConsensus";
import { ExplainAiButton } from "@/components/ExplainAiButton";
import { AssetNewsPanel } from "@/components/AssetNewsPanel";
import { AssetEventsPanel } from "@/components/AssetEventsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function ProductDetail() {
  const { symbol } = Route.useParams();
  const product = findProduct(symbol);
  const { indicators, candles } = useAnalysis(symbol);
  const { settings } = useSettings();
  const { guardedAdd } = useWatchlistLimit();

  const watched = settings.watchlist.includes(symbol);
  const sig = indicators ? scoreIndicators(indicators, settings.risk) : null;
  const closes = candles.data?.c ?? [];
  const last = closes.at(-1) ?? indicators?.price ?? 0;
  const prev = closes.at(-2) ?? last;
  const abs = last - prev;
  const change = prev ? (abs / prev) * 100 : 0;

  const changeUp = abs >= 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {/* Sticky compact header */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/produkte" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{symbol}</h1>
              <span className="hidden rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground sm:inline">{product?.sector ?? "Ticker"}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{product?.name ?? "Freies Symbol"}</p>
          </div>

          {indicators && (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums sm:text-2xl">${last.toFixed(2)}</span>
              <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${changeUp ? "text-emerald-400" : "text-rose-400"}`}>
                {changeUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {changeUp ? "+" : ""}{abs.toFixed(2)} ({changeUp ? "+" : ""}{change.toFixed(2)}%)
              </span>
            </div>
          )}

          {sig && <div className="hidden sm:block"><SignalBadge verdict={sig.verdict} confidence={sig.confidence} /></div>}

          <button onClick={() => guardedAdd(symbol)} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent sm:text-sm">
            {watched ? <><Star className="h-4 w-4 fill-current text-primary" /> Watchlist</> : <><StarOff className="h-4 w-4" /> Watchlist</>}
          </button>
        </div>
        {sig && <div className="mt-2 sm:hidden"><SignalBadge verdict={sig.verdict} confidence={sig.confidence} /></div>}
      </div>

      {(candles.isError || candles.data?.stale) && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          Live-Daten werden aktualisiert… letzte gültige Werte werden angezeigt.
        </div>
      )}

      {indicators && sig && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="analyse">Analyse</TabsTrigger>
            <TabsTrigger value="events">Events & News</TabsTrigger>
          </TabsList>

          {/* ÜBERSICHT — schneller Eindruck */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/70 bg-gradient-to-br from-card/90 to-card/40 p-5 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <SignalBadge verdict={sig.verdict} confidence={sig.confidence} />
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{symbol} · Yahoo Finance</div>
              </div>
              <AssetChart symbol={symbol} height={360} defaultTf="1Y" currency="$" />
            </div>
            <MarketConsensus symbol={symbol} indicators={indicators} />
          </TabsContent>

          {/* CHART — alle Indikatoren */}
          <TabsContent value="chart" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pro-Chart · Candles, EMAs, Bollinger, RSI, MACD
                </div>
                <ExplainAiButton topic="Advanced Chart mit Indikatoren" context={`Chart für ${symbol} mit EMA20, EMA50, SMA200, Bollinger Bands, Volumen, RSI und MACD.`} />
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
            </div>
          </TabsContent>

          {/* ANALYSE — Broker + Rohdaten */}
          <TabsContent value="analyse" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <BrokerAssessment symbol={symbol} name={product?.name ?? symbol} indicators={indicators} signal={sig} />
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rohdaten — Indikatoren</div>
                  <ExplainAiButton topic="Technische Indikatoren Übersicht" context={`RSI ${indicators.rsi.toFixed(1)}, MACD ${indicators.macd.macd.toFixed(2)}, Vola ${(indicators.volatility*100).toFixed(1)}%`} />
                </div>
                <div className="space-y-1.5 text-sm">
                  <Row k="Z-Score (20)" v={indicators.zScore.toFixed(2)} explain="Z-Score" ctx={`Aktuell ${indicators.zScore.toFixed(2)} für ${symbol}.`} />
                  <Row k="RSI (14)" v={indicators.rsi.toFixed(1)} explain="RSI (Relative Strength Index)" ctx={`RSI aktuell ${indicators.rsi.toFixed(1)} für ${symbol}.`} />
                  <Row k="MACD" v={indicators.macd.macd.toFixed(3)} explain="MACD" ctx={`MACD-Linie ${indicators.macd.macd.toFixed(3)}, Signal ${indicators.macd.signal.toFixed(3)}.`} />
                  <Row k="MACD Signal" v={indicators.macd.signal.toFixed(3)} />
                  <Row k="MACD Histogramm" v={indicators.macd.histogram.toFixed(3)} />
                  <Row k="Bollinger Upper" v={indicators.bollinger.upper.toFixed(2)} explain="Bollinger Bands" ctx={`Upper ${indicators.bollinger.upper.toFixed(2)}, Lower ${indicators.bollinger.lower.toFixed(2)}, Preis ${last.toFixed(2)}.`} />
                  <Row k="Bollinger Lower" v={indicators.bollinger.lower.toFixed(2)} />
                  <Row k="Vola annualisiert" v={(indicators.volatility * 100).toFixed(1) + "%"} explain="Volatilität (Volatility Score)" ctx={`Annualisierte Vola ${(indicators.volatility*100).toFixed(1)}% für ${symbol}.`} />
                  <Row k="Momentum 10P" v={(indicators.momentum * 100).toFixed(2) + "%"} explain="Momentum" ctx={`10-Perioden-Momentum ${(indicators.momentum*100).toFixed(2)}%.`} />
                  <Row k="Sharpe Ratio" v={indicators.sharpe.toFixed(2)} explain="Sharpe Ratio" ctx={`Sharpe Ratio ${indicators.sharpe.toFixed(2)}.`} />
                  <Row k="Beta vs. SPY" v={indicators.beta.toFixed(2)} explain="Beta" ctx={`Beta ${indicators.beta.toFixed(2)} gegen S&P 500.`} />
                  <Row k="SMA 20 / 50 / 200" v={`${indicators.sma20.toFixed(1)} / ${isNaN(indicators.sma50) ? "—" : indicators.sma50.toFixed(1)} / ${isNaN(indicators.sma200) ? "—" : indicators.sma200.toFixed(1)}`} explain="SMA & EMA (Gleitende Durchschnitte)" ctx={`SMA20 ${indicators.sma20.toFixed(1)}, SMA50 ${indicators.sma50.toFixed(1)}, SMA200 ${indicators.sma200.toFixed(1)}.`} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* EVENTS & NEWS */}
          <TabsContent value="events" className="mt-4 space-y-4">
            <AssetEventsPanel symbol={symbol} />
            <AssetNewsPanel symbol={symbol} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Row({ k, v, klass, explain, ctx }: { k: string; v: string; klass?: string; explain?: string; ctx?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-1 last:border-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {k}
        {explain && <ExplainAiButton topic={explain} context={ctx} variant="icon" />}
      </span>
      <span className={`font-mono tabular-nums ${klass ?? ""}`}>{v}</span>
    </div>
  );
}
