import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star, StarOff } from "lucide-react";
import { findProduct } from "@/lib/products";
import { useAnalysis } from "@/lib/useMarketData";
import { brokerNarrative, scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { SignalBadge } from "@/components/SignalBadge";
import { MacdChart, PriceChart, RsiChart } from "@/components/PriceChart";
import { DisclaimerInline } from "@/components/Disclaimer";

export const Route = createFileRoute("/produkte/$symbol")({ component: ProductDetail });

function ProductDetail() {
  const { symbol } = Route.useParams();
  const product = findProduct(symbol);
  const { indicators, candles, quote } = useAnalysis(symbol);
  const { settings, toggleWatch } = useSettings();

  if (!product) return <div className="p-6">Produkt nicht gefunden. <Link to="/produkte" className="text-primary underline">Zurück</Link></div>;

  const watched = settings.watchlist.includes(symbol);
  const sig = indicators ? scoreIndicators(indicators, settings.risk) : null;
  const text = indicators && sig ? brokerNarrative(symbol, product.name, indicators, sig) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to="/produkte" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{product.symbol}</h1>
            <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground">{product.sector}</span>
          </div>
          <p className="text-sm text-muted-foreground">{product.name}</p>
        </div>
        <button onClick={() => toggleWatch(symbol)} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
          {watched ? <><Star className="h-4 w-4 fill-current text-primary" /> In Watchlist</> : <><StarOff className="h-4 w-4" /> Watchlist hinzufügen</>}
        </button>
      </div>

      {candles.error && <div className="rounded-md border border-bear/40 bg-bear/10 p-4 text-sm text-bear">{(candles.error as Error).message}</div>}

      {indicators && sig && quote.data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <div className="font-mono text-3xl font-bold tabular-nums">{indicators.price.toFixed(2)}</div>
                  <div className={`font-mono text-sm ${quote.data.dp >= 0 ? "text-bull" : "text-bear"}`}>
                    {quote.data.dp >= 0 ? "+" : ""}{quote.data.dp.toFixed(2)}% ({quote.data.d >= 0 ? "+" : ""}{quote.data.d.toFixed(2)})
                  </div>
                </div>
                <SignalBadge verdict={sig.verdict} confidence={sig.confidence} />
              </div>
              {candles.data && <PriceChart closes={candles.data.c} times={candles.data.t} />}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">RSI (14)</div>
              {candles.data && <RsiChart closes={candles.data.c} />}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">MACD (12/26/9)</div>
              {candles.data && <MacdChart closes={candles.data.c} />}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broker-Einschätzung</div>
              {text && <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />}
              <DisclaimerInline />
            </div>

            {sig.verdict !== "NEUTRAL" && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trade-Setup</div>
                <div className="space-y-2 text-sm">
                  <Row k="Entry" v={sig.entry.toFixed(2)} />
                  <Row k="Stop" v={sig.stop.toFixed(2)} klass="text-bear" />
                  <Row k="Target" v={sig.target.toFixed(2)} klass="text-bull" />
                  <Row k="Risk/Reward" v={`1 : ${sig.rr.toFixed(1)}`} />
                  <Row k="Risiko abs." v={sig.risk.toFixed(2)} />
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Indikatoren</div>
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
