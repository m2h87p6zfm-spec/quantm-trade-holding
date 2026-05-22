import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star, StarOff } from "lucide-react";
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

export const Route = createFileRoute("/produkte/$symbol")({ component: ProductDetail });

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to="/produkte" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{symbol}</h1>
            <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground">{product?.sector ?? "Ticker"}</span>
          </div>
          <p className="text-sm text-muted-foreground">{product?.name ?? "Freies Symbol aus dem Datenfeed"}</p>
        </div>
        <button onClick={() => guardedAdd(symbol)} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
          {watched ? <><Star className="h-4 w-4 fill-current text-primary" /> In Watchlist</> : <><StarOff className="h-4 w-4" /> Watchlist hinzufügen</>}
        </button>
      </div>

      {(candles.isError || candles.data?.stale) && (
        <div className="rounded-md border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          Live-Daten werden aktualisiert… letzte gültige Werte werden angezeigt.
        </div>
      )}

      {indicators && sig && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border/70 bg-gradient-to-br from-card/90 to-card/40 p-5 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <SignalBadge verdict={sig.verdict} confidence={sig.confidence} />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{symbol} · Yahoo Finance</div>
              </div>
              <AssetChart symbol={symbol} height={420} defaultTf="1Y" currency="$" />
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Technische Analyse · Candles & Indikatoren
              </div>
              {candles.data && (
                <ProChart
                  data={candles.data}
                  height={520}
                  overlays={["ema20", "ema50", "sma200", "bbands"]}
                  subcharts={["volume", "rsi", "macd"]}
                  showZones
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <BrokerAssessment symbol={symbol} name={product?.name ?? symbol} indicators={indicators} signal={sig} />

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rohdaten — Indikatoren</div>
              <div className="space-y-1.5 text-sm">
                <Row k="Z-Score (20)" v={indicators.zScore.toFixed(2)} />
                <Row k="RSI (14)" v={indicators.rsi.toFixed(1)} />
                <Row k="MACD" v={indicators.macd.macd.toFixed(3)} />
                <Row k="MACD Signal" v={indicators.macd.signal.toFixed(3)} />
                <Row k="MACD Histogramm" v={indicators.macd.histogram.toFixed(3)} />
                <Row k="Bollinger Upper" v={indicators.bollinger.upper.toFixed(2)} />
                <Row k="Bollinger Lower" v={indicators.bollinger.lower.toFixed(2)} />
                <Row k="Vola annualisiert" v={(indicators.volatility * 100).toFixed(1) + "%"} />
                <Row k="Momentum 10P" v={(indicators.momentum * 100).toFixed(2) + "%"} />
                <Row k="Sharpe Ratio" v={indicators.sharpe.toFixed(2)} />
                <Row k="Beta vs. SPY" v={indicators.beta.toFixed(2)} />
                <Row k="SMA 20 / 50 / 200" v={`${indicators.sma20.toFixed(1)} / ${isNaN(indicators.sma50) ? "—" : indicators.sma50.toFixed(1)} / ${isNaN(indicators.sma200) ? "—" : indicators.sma200.toFixed(1)}`} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, klass }: { k: string; v: string; klass?: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 pb-1 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-mono tabular-nums ${klass ?? ""}`}>{v}</span>
    </div>
  );
}
