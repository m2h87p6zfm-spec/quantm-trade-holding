import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, X, TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { SignalBadge } from "@/components/SignalBadge";
import { Sparkline } from "@/components/Sparkline";
import { findProduct } from "@/lib/products";
import { useMemo } from "react";

export const Route = createFileRoute("/")({ component: Watchlist });

function useRowData(symbol: string) {
  const { indicators, candles } = useAnalysis(symbol);
  const { settings } = useSettings();
  const sig = indicators ? scoreIndicators(indicators, settings.risk) : null;
  const closes = candles.data?.c ?? [];
  const last = closes.at(-1) ?? indicators?.price ?? 0;
  const prev = closes.at(-2) ?? last;
  const abs = last - prev;
  const change = prev ? (abs / prev) * 100 : 0;
  const price = indicators?.price ?? last;
  return { sig, closes, last, prev, abs, change, price, candles, indicators };
}

function Row({ symbol, idx }: { symbol: string; idx: number }) {
  const product = findProduct(symbol);
  const { toggleWatch } = useSettings();
  const { sig, abs, change, price, candles } = useRowData(symbol);

  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol }}
      className="group grid grid-cols-12 items-center gap-2 border-b border-border/50 px-4 py-3.5 hover:bg-accent/30 transition-all animate-fade-up"
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <div className="col-span-3 flex items-center gap-3">
        <button
          onClick={(e) => { e.preventDefault(); toggleWatch(symbol); }}
          className="text-muted-foreground hover:text-bear hover:scale-110 transition opacity-0 group-hover:opacity-100"
          aria-label="Entfernen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
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
        <Sparkline data={(candles.data?.c ?? []).slice(-30)} up={change >= 0} />
      </div>
      <div className="col-span-3 flex justify-end">
        {sig ? <SignalBadge verdict={sig.verdict} confidence={sig.confidence} /> : (
          <span className="text-xs text-muted-foreground">{candles.isLoading ? "lädt…" : candles.error ? "Fehler" : "—"}</span>
        )}
      </div>
    </Link>
  );
}

function StatCard({ label, value, sublabel, icon: Icon, tone = "default", delay = 0 }: {
  label: string; value: string; sublabel?: string; icon: any; tone?: "default" | "bull" | "bear" | "primary"; delay?: number;
}) {
  const toneClasses = {
    default: "text-foreground",
    bull: "text-bull",
    bear: "text-bear",
    primary: "text-gradient-primary",
  };
  return (
    <div className="card-glow rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-primary"}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${toneClasses[tone]}`}>{value}</div>
      {sublabel && <div className="mt-1 text-[11px] text-muted-foreground">{sublabel}</div>}
    </div>
  );
}

function Watchlist() {
  const { settings } = useSettings();
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Hero */}
      <div className="relative pt-4 animate-fade-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Zap className="h-3 w-3 text-primary" /> Helios Terminal
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Deine <span className="text-gradient-primary">Watchlist</span>.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Echtzeit-Kurse, statistische Signale und Trendverlauf — gespeist aus dem
              <span className="text-foreground"> Yahoo-Finance-Edge-Cache</span>. Kein Setup, kein API-Key.
            </p>
          </div>
          <Link
            to="/produkte"
            className="group inline-flex items-center gap-2 self-start rounded-lg bg-gradient-to-br from-primary to-cyan-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
          >
            <Star className="h-4 w-4 group-hover:rotate-12 transition-transform" /> Produkte hinzufügen
          </Link>
        </div>
      </div>

      {/* Stats */}
      <WatchlistStats symbols={settings.watchlist} />

      {/* Tabelle */}
      <div className="card-glow rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="grid grid-cols-12 gap-2 border-b border-border/60 bg-muted/30 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Symbol</div>
          <div className="col-span-2">Kurs</div>
          <div className="col-span-2">Tag Δ</div>
          <div className="col-span-2">30T Trend</div>
          <div className="col-span-3 text-right">Signal</div>
        </div>
        {settings.watchlist.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm font-medium">Watchlist ist leer</div>
            <div className="mt-1 text-xs text-muted-foreground">Füge Werte aus dem <Link to="/produkte" className="text-primary hover:underline">Produktkatalog</Link> hinzu, um Signale zu sehen.</div>
          </div>
        ) : (
          settings.watchlist.map((s, i) => <Row key={s} symbol={s} idx={i} />)
        )}
      </div>
    </div>
  );
}

function WatchlistStats({ symbols }: { symbols: string[] }) {
  // Lightweight aggregate, ohne extra Calls — nutzt vorhandene Query-Caches
  return useMemo(() => (
    <StatsGrid symbols={symbols} />
  ), [symbols.join(",")]);
}

function StatsGrid({ symbols }: { symbols: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Watchlist" value={String(symbols.length)} sublabel="aktive Werte" icon={Activity} tone="primary" delay={50} />
      <AggregateStats symbols={symbols} />
    </div>
  );
}

function AggregateStats({ symbols }: { symbols: string[] }) {
  // Aggregat aus react-query Cache der Zeilen (sie laden sowieso)
  const all = symbols.map((s) => ({ s, d: useRowData(s) })); // eslint-disable-line react-hooks/rules-of-hooks
  const ready = all.filter((x) => x.d.indicators);
  const bulls = ready.filter((x) => x.d.change > 0).length;
  const bears = ready.filter((x) => x.d.change < 0).length;
  const top = [...ready].sort((a, b) => Math.abs(b.d.change) - Math.abs(a.d.change))[0];
  return (
    <>
      <StatCard label="Steigend" value={`${bulls}`} sublabel={`von ${ready.length}`} icon={TrendingUp} tone="bull" delay={100} />
      <StatCard label="Fallend" value={`${bears}`} sublabel={`von ${ready.length}`} icon={TrendingDown} tone="bear" delay={150} />
      <StatCard
        label="Top Mover"
        value={top ? `${top.d.change >= 0 ? "+" : ""}${top.d.change.toFixed(1)}%` : "—"}
        sublabel={top?.s ?? "wartet"}
        icon={Zap}
        tone={top && top.d.change >= 0 ? "bull" : "bear"}
        delay={200}
      />
    </>
  );
}
