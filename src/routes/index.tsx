import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Star, X, TrendingUp, TrendingDown, Activity, Zap, Plus, Search, ListPlus, Briefcase, Sparkles } from "lucide-react";
import { useSettings, MARKET_WATCH_DEFAULTS } from "@/lib/settings";
import { SignalBadge } from "@/components/SignalBadge";
import { Sparkline } from "@/components/Sparkline";
import { findProduct } from "@/lib/products";
import { TickerBand } from "@/components/TickerBand";
import { MarketPulseHeader } from "@/components/MarketPulseHeader";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { AlphaScoreGauge } from "@/components/AlphaScoreGauge";
import { SignalOfDay } from "@/components/SignalOfDay";
import { useCockpitData, type CockpitRow } from "@/lib/cockpit";
import { MarketAiInsight } from "@/components/MarketAiInsight";
import { SymbolSearch } from "@/components/SymbolSearch";
import { WatchlistSwitcher } from "@/components/WatchlistSwitcher";
import { ManageWatchlistDialog } from "@/components/ManageWatchlistDialog";
import { EditPortfolioDialog } from "@/components/EditPortfolioDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { getPortfolioLimit, limitLabel } from "@/lib/portfolio-limits";
import { formatCompact } from "@/lib/format";
import { WatchlistSignalsPanel } from "@/components/WatchlistSignalsPanel";


export const Route = createFileRoute("/")({ component: Cockpit });

const DEFAULT_SET = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "JPM", "XOM", "SPY", "QQQ"];

function Cockpit() {
  const { settings, addSymbols, removeSymbol } = useSettings();
  const { tier } = useSubscription();
  const [manageOpen, setManageOpen] = useState(false);
  const [editPortfolioOpen, setEditPortfolioOpen] = useState(false);
  const usingDefault = settings.watchlist.length === 0 && settings.portfolioSymbols.length === 0;

  const portfolioSymbols = settings.portfolioSymbols;
  const portfolioSet = useMemo(() => new Set(portfolioSymbols), [portfolioSymbols]);
  const marketWatchSymbols = useMemo(() => {
    const others = settings.watchlist.filter((s) => !portfolioSet.has(s));
    const defaults = MARKET_WATCH_DEFAULTS.filter((s) => !portfolioSet.has(s) && !others.includes(s));
    return [...others, ...defaults];
  }, [settings.watchlist, portfolioSet]);

  const cockpitSymbols = usingDefault
    ? DEFAULT_SET
    : Array.from(new Set([...portfolioSymbols, ...marketWatchSymbols]));
  const rows = useCockpitData(cockpitSymbols);
  const rowMap = new Map(rows.map((r) => [r.symbol, r]));
  const portfolioLimit = getPortfolioLimit(tier);

  const longCount = rows.filter((r) => r.sig.verdict === "LONG").length;
  const shortCount = rows.filter((r) => r.sig.verdict === "SHORT").length;
  const neutralCount = rows.filter((r) => r.sig.verdict === "NEUTRAL").length;

  const featured = [...rows].sort((a, b) =>
    (Math.abs(b.sig.score) * b.sig.confidence) - (Math.abs(a.sig.score) * a.sig.confidence)
  )[0];

  const heatmapCells = rows.map((r) => ({ symbol: r.symbol, change: r.change, price: r.last }));
  const loaded = rows.length;
  const total = cockpitSymbols.length;
  const loading = loaded < total;

  const avgConfidence = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.sig.confidence ?? 0), 0) / rows.length)
    : 0;
  const avgChange = rows.length
    ? rows.reduce((s, r) => s + r.change, 0) / rows.length
    : 0;

  return (
    <div className="pb-12">
      <TickerBand />

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-64 bg-terminal-grid pointer-events-none" />

        <div className="relative mx-auto max-w-7xl space-y-6 px-6 pt-6">
          {/* Hero strip */}
          <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-bull animate-pulse" />
                Live · Cockpit
              </div>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                {usingDefault ? "Markt-Cockpit" : "Watchlist"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground num">
                {loading ? `Sync ${loaded}/${total}` : `${loaded} Werte aktiv`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WatchlistSwitcher />
              <button
                onClick={() => setManageOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 transition-colors"
              >
                <ListPlus className="h-3.5 w-3.5" /> Verwalten
              </button>
              <Link to="/produkte" className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 transition-colors">
                <Search className="h-3.5 w-3.5" /> Katalog
              </Link>
            </div>
          </div>


          {/* Global search — any Yahoo Finance ticker */}
          <div className="animate-fade-up" style={{ animationDelay: "20ms" }}>
            <SymbolSearch existing={settings.watchlist} onAdd={(syms) => addSymbols(syms)} />
          </div>


          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: "40ms" }}>
            <div className="kpi-tile">
              <div className="kpi-label">Long Signale</div>
              <div className="kpi-value text-bull">{longCount}</div>
              <div className="kpi-delta text-muted-foreground">von {total}</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Short Signale</div>
              <div className="kpi-value text-bear">{shortCount}</div>
              <div className="kpi-delta text-muted-foreground">von {total}</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Ø Konfidenz</div>
              <div className="kpi-value">{avgConfidence}<span className="text-sm text-muted-foreground">%</span></div>
              <div className="kpi-delta text-muted-foreground">{neutralCount} neutral</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Ø Tag Δ</div>
              <div className={`kpi-value ${avgChange >= 0 ? "text-bull" : "text-bear"}`}>
                {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}<span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="kpi-delta text-muted-foreground">Watchlist</div>
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            <MarketPulseHeader rows={rows} />
          </div>

          {/* BENTO — Signal of Day · Setup-Score · AI Insight */}
          <div className="bento animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="col-span-12 lg:col-span-8">
              {featured ? (
                <SignalOfDay symbol={featured.symbol} ind={featured.ind} sig={featured.sig} closes={featured.closes} />
              ) : (
                <SkeletonCard label="Signal des Tages" />
              )}
            </div>
            <div className="col-span-12 lg:col-span-4">
              {featured ? (
                <AlphaScoreGauge score={featured.alpha} label={`Setup-Score · ${featured.symbol}`} />
              ) : (
                <SkeletonCard label="Setup-Score" />
              )}
            </div>
            <div className="col-span-12">
              <MarketAiInsight rows={rows} />
            </div>
          </div>

          {/* Watchlist — primary data panel */}
          <div className="surface overflow-hidden animate-fade-up" style={{ animationDelay: "160ms" }}>
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <div className="panel-title">
                  {usingDefault ? "Demo-Auswahl" : "Watchlist"}
                </div>
                {usingDefault && (
                  <span className="rounded-sm bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold ring-1 ring-gold/30">
                    leer
                  </span>
                )}
                {loading && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <Activity className="h-2.5 w-2.5 animate-pulse" /> Stream
                  </span>
                )}
              </div>
              <div className="text-[10px] num text-muted-foreground">{total} Werte</div>
            </div>
            <div className="hidden sm:grid grid-cols-12 gap-2 border-b border-border/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <div className="col-span-3">Symbol</div>
              <div className="col-span-2">Kurs</div>
              <div className="col-span-2">Tag Δ</div>
              <div className="col-span-2">30T Trend</div>
              <div className="col-span-3 text-right">Signal</div>
            </div>
            {cockpitSymbols.map((s, i) => (
              <RowItem key={s} symbol={s} idx={i} showRemove={!usingDefault} row={rowMap.get(s)} onRemove={() => removeSymbol(s)} />
            ))}
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <SectorHeatmap cells={heatmapCells} />
          </div>
        </div>
      </div>
      <ManageWatchlistDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}



function RowItem({ symbol, idx, showRemove, row, onRemove }: { symbol: string; idx: number; showRemove: boolean; row?: CockpitRow; onRemove: () => void }) {
  const product = findProduct(symbol);
  const change = row?.change ?? 0;
  const sig = row?.sig;
  const price = row?.last;
  const closes = row?.closes ?? [];
  const abs = row ? row.last - row.prev : 0;
  const ready = !!row;

  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol }}
      className="group grid grid-cols-12 items-center gap-2 border-b border-border/40 px-4 py-3 hover:bg-accent/30 transition-all animate-fade-up"
      style={{ animationDelay: `${Math.min(idx * 25, 400)}ms` }}
    >
      <div className="col-span-12 sm:col-span-3 flex items-center gap-3">
        {showRemove && (
          <button
            onClick={(e) => { e.preventDefault(); onRemove(); }}
            className="text-muted-foreground hover:text-bear hover:scale-110 transition opacity-0 group-hover:opacity-100"
            aria-label="Entfernen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-cyan-accent/10 border border-border/60 font-bold text-[10px] tracking-tight ${!ready ? "animate-pulse" : ""}`}>
          {symbol.slice(0, 4)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{symbol}</div>
          <div className="text-[11px] text-muted-foreground truncate">{product?.name ?? "Freier Ticker"}</div>
        </div>
        {/* Mobile: kurzer Status rechts neben dem Symbol */}
        <div className="sm:hidden flex items-center gap-2">
          <span className={`font-mono text-sm tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>
            {ready ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}
          </span>
        </div>
      </div>
      <div className="hidden sm:block col-span-2 font-mono text-sm tabular-nums">
        {ready ? price!.toFixed(2) : <span className="inline-block h-3 w-14 rounded bg-muted animate-pulse" />}
      </div>
      <div className={`hidden sm:block col-span-2 font-mono text-sm tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>
        {ready ? (
          <>
            <div className="flex items-center gap-1">
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{abs >= 0 ? "+" : ""}{abs.toFixed(2)}</div>
          </>
        ) : (
          <div className="space-y-1">
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            <div className="h-2 w-10 rounded bg-muted/60 animate-pulse" />
          </div>
        )}
      </div>
      <div className="hidden sm:block col-span-2">
        {ready ? <Sparkline data={closes.slice(-30)} up={change >= 0} /> : <div className="h-8 w-full rounded bg-muted/40 animate-pulse" />}
      </div>
      <div className="hidden sm:flex col-span-3 justify-end">
        {sig ? (
          <SignalBadge verdict={sig.verdict} confidence={sig.confidence} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3 animate-pulse" /> lädt…
          </span>
        )}
      </div>
    </Link>
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
