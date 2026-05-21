import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, X, TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { SignalBadge } from "@/components/SignalBadge";
import { Sparkline } from "@/components/Sparkline";
import { findProduct } from "@/lib/products";
import { TickerBand } from "@/components/TickerBand";
import { MarketPulse } from "@/components/MarketPulse";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { AlphaScoreGauge } from "@/components/AlphaScoreGauge";
import { SignalOfDay } from "@/components/SignalOfDay";
import { useCockpitData } from "@/lib/cockpit";

export const Route = createFileRoute("/")({ component: Cockpit });

// Default-Set wenn Watchlist leer ist — damit das Cockpit nie tot wirkt.
const DEFAULT_SET = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "JPM", "XOM", "SPY", "QQQ"];





function Cockpit() {
  const { settings } = useSettings();
  const cockpitSymbols = settings.watchlist.length > 0 ? settings.watchlist : DEFAULT_SET;
  const rows = useCockpitData(cockpitSymbols);

  // Aggregationen
  const longCount = rows.filter((r) => r.sig.verdict === "LONG").length;
  const shortCount = rows.filter((r) => r.sig.verdict === "SHORT").length;
  const neutralCount = rows.filter((r) => r.sig.verdict === "NEUTRAL").length;

  // Signal des Tages: höchste |score| × Konfidenz
  const featured = [...rows].sort((a, b) =>
    (Math.abs(b.sig.score) * b.sig.confidence) - (Math.abs(a.sig.score) * a.sig.confidence)
  )[0];

  const heatmapCells = rows.map((r) => ({ symbol: r.symbol, change: r.change, price: r.last }));
  const usingDefault = settings.watchlist.length === 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Live-Ticker-Band — sticky-feel direkt unter der Topbar */}
      <TickerBand />

      <div className="mx-auto max-w-7xl space-y-6 px-6">
        {/* Hero */}
        <div className="pt-2 animate-fade-up">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Zap className="h-3 w-3 text-gold" /> Live Cockpit
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
                Markt-<span className="text-gradient-primary">Cockpit</span>.
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Echtzeit-Aggregation aller statistischen Signale über{" "}
                <span className="text-foreground font-semibold">{rows.length}</span> Werte
                {usingDefault && <> · Demo-Auswahl, da Watchlist leer</>}.
              </p>
            </div>
            <Link
              to="/produkte"
              className="group inline-flex items-center gap-2 self-start rounded-lg bg-gradient-to-br from-primary to-cyan-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
            >
              <Star className="h-4 w-4 group-hover:rotate-12 transition-transform" />
              Watchlist verwalten
            </Link>
          </div>
        </div>

        {/* Top-Row: Signal of the Day (groß) + Pulse + Gauge */}
        <div className="grid gap-4 lg:grid-cols-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="lg:col-span-2">
            {featured ? (
              <SignalOfDay symbol={featured.symbol} ind={featured.ind} sig={featured.sig} closes={featured.closes} />
            ) : (
              <SkeletonCard label="Signal des Tages" />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MarketPulse long={longCount} short={shortCount} neutral={neutralCount} />
            {featured ? (
              <AlphaScoreGauge score={featured.alpha} label={`AlphaEdge · ${featured.symbol}`} />
            ) : (
              <SkeletonCard label="AlphaEdge Score" />
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <SectorHeatmap cells={heatmapCells} />
        </div>

        {/* Watchlist-Tabelle */}
        <div className="card-glow rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {usingDefault ? "Top Werte (Demo)" : "Meine Watchlist"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {rows.length} aktiv · Long {longCount} · Short {shortCount} · Neutral {neutralCount}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 border-b border-border/60 bg-muted/15 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3">Symbol</div>
            <div className="col-span-2">Kurs</div>
            <div className="col-span-2">Tag Δ</div>
            <div className="col-span-2">30T Trend</div>
            <div className="col-span-3 text-right">Signal</div>
          </div>
          {cockpitSymbols.length === 0 ? (
            <EmptyWatchlist />
          ) : (
            cockpitSymbols.map((s, i) => <Row key={s} symbol={s} idx={i} showRemove={!usingDefault} />)
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ symbol, idx, showRemove }: { symbol: string; idx: number; showRemove: boolean }) {
  const product = findProduct(symbol);
  const { toggleWatch } = useSettings();
  const rows = useCockpitData([symbol]);
  const r = rows[0];
  const change = r?.change ?? 0;
  const sig = r?.sig;
  const price = r?.last;
  const closes = r?.closes ?? [];
  const abs = price && r ? r.last - r.prev : 0;

  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol }}
      className="group grid grid-cols-12 items-center gap-2 border-b border-border/40 px-4 py-3.5 hover:bg-accent/30 transition-all animate-fade-up"
      style={{ animationDelay: `${idx * 30}ms` }}
    >
      <div className="col-span-3 flex items-center gap-3">
        {showRemove && (
          <button
            onClick={(e) => { e.preventDefault(); toggleWatch(symbol); }}
            className="text-muted-foreground hover:text-bear hover:scale-110 transition opacity-0 group-hover:opacity-100"
            aria-label="Entfernen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-cyan-accent/10 border border-border/60 font-bold text-[10px] tracking-tight">
          {symbol.slice(0, 4)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{symbol}</div>
          <div className="text-[11px] text-muted-foreground truncate">{product?.name ?? "Freier Ticker"}</div>
        </div>
      </div>
      <div className="col-span-2 font-mono text-sm tabular-nums">
        {price ? price.toFixed(2) : <span className="shimmer-text">—————</span>}
      </div>
      <div className={`col-span-2 font-mono text-sm tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>
        <div className="flex items-center gap-1">
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
        </div>
        <div className="text-[10px] text-muted-foreground">{abs >= 0 ? "+" : ""}{abs.toFixed(2)}</div>
      </div>
      <div className="col-span-2">
        <Sparkline data={closes.slice(-30)} up={change >= 0} />
      </div>
      <div className="col-span-3 flex justify-end">
        {sig ? <SignalBadge verdict={sig.verdict} confidence={sig.confidence} /> : (
          <span className="text-xs text-muted-foreground">aktualisiert…</span>
        )}
      </div>
    </Link>
  );
}

function EmptyWatchlist() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Star className="h-5 w-5 text-primary" />
      </div>
      <div className="text-sm font-medium">Watchlist ist leer</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Füge Werte aus dem <Link to="/produkte" className="text-primary hover:underline">Produktkatalog</Link> hinzu.
      </div>
    </div>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <div className="card-glow rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <Activity className="h-4 w-4 text-primary animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center min-h-[180px]">
        <div className="shimmer-text text-xs">Daten werden geladen…</div>
      </div>
    </div>
  );
}
