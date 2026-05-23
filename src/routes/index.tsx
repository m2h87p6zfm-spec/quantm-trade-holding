import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ListPlus, Search, Sparkles } from "lucide-react";
import { useSettings, MARKET_WATCH_DEFAULTS } from "@/lib/settings";
import { TickerBand } from "@/components/TickerBand";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { AlphaScoreGauge } from "@/components/AlphaScoreGauge";
import { SignalOfDay } from "@/components/SignalOfDay";
import { useCockpitData } from "@/lib/cockpit";
import { MarketAiInsight } from "@/components/MarketAiInsight";
import { WatchlistSwitcher } from "@/components/WatchlistSwitcher";
import { ManageWatchlistDialog } from "@/components/ManageWatchlistDialog";
import { WatchlistSignalsPanel } from "@/components/WatchlistSignalsPanel";



export const Route = createFileRoute("/")({ component: Cockpit });

const DEFAULT_SET = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "JPM", "XOM", "SPY", "QQQ"];

function Cockpit() {
  const { settings, removeSymbol } = useSettings();
  const [manageOpen, setManageOpen] = useState(false);
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

  const indices = useMemo(() => {
    const wanted = ["SPY", "QQQ", "DIA", "IWM"];
    const labels: Record<string, string> = { SPY: "S&P 500", QQQ: "Nasdaq 100", DIA: "Dow Jones", IWM: "Russell 2000" };
    return wanted.map((s) => {
      const r = rowMap.get(s);
      return { symbol: s, label: labels[s], change: r?.change ?? null, last: r?.last ?? null };
    });
  }, [rowMap]);
  const sentimentTotal = (longCount + shortCount + neutralCount) || 1;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-16 text-white" style={{ fontFamily: "Inter, Satoshi, ui-sans-serif, system-ui" }}>
      <TickerBand />

      <div className="mx-auto max-w-7xl space-y-12 px-6 pt-10">
        {/* Hero strip */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1F1F1F] bg-[#111111] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22FF88] animate-pulse" />
              Live · Cockpit
            </div>
            <h1 className="mt-3 text-[32px] font-bold tracking-tight">{usingDefault ? "Markt-Cockpit" : "Watchlist"}</h1>
            <p className="mt-1 text-[13px] text-white/40 tabular-nums">
              {loading ? `Sync ${loaded}/${total}` : `${loaded} Werte aktiv`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WatchlistSwitcher />
            <button
              onClick={() => setManageOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F1F1F] bg-[#111111] px-3 py-2 text-[13px] font-medium text-white/80 transition hover:border-[#22FF88]/40 hover:text-white"
            >
              <ListPlus className="h-3.5 w-3.5" /> Verwalten
            </button>
            <Link to="/produkte" className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#1F1F1F] bg-[#111111] px-3 py-2 text-[13px] font-medium text-white/80 transition hover:border-[#22FF88]/40 hover:text-white">
              <Search className="h-3.5 w-3.5" /> Katalog
            </Link>
          </div>
        </div>

        {/* BEREICH 1 — Markt-Überblick (kompakt) */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold uppercase tracking-[0.18em] text-white/60">Markt-Überblick</h2>
            <span className="text-[12px] text-white/30 tabular-nums">{rows.length} analysiert</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Sentiment */}
            <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-white/60">Markt-Stimmung</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-[#1F1F1F]">
                <div className="h-full bg-[#22FF88]" style={{ width: `${(longCount / sentimentTotal) * 100}%` }} />
                <div className="h-full bg-white/30" style={{ width: `${(neutralCount / sentimentTotal) * 100}%` }} />
                <div className="h-full bg-[#FF3B5C]" style={{ width: `${(shortCount / sentimentTotal) * 100}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
                {[
                  { k: "Bullish", v: longCount, c: "#22FF88" },
                  { k: "Neutral", v: neutralCount, c: "rgba(255,255,255,0.5)" },
                  { k: "Bearish", v: shortCount, c: "#FF3B5C" },
                ].map((s) => (
                  <div key={s.k} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-white/70">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
                      {s.k}
                    </span>
                    <span className="font-mono tabular-nums font-semibold" style={{ color: s.c }}>
                      {s.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Indizes */}
            <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-white/60">Wichtige Indizes</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {indices.map((i) => {
                  const up = (i.change ?? 0) >= 0;
                  return (
                    <div key={i.symbol} className="flex items-center justify-between">
                      <span className="text-[13px] text-white/70">{i.label}</span>
                      <span className={`font-mono text-[13px] font-semibold tabular-nums ${i.change == null ? "text-white/30" : up ? "text-[#22FF88]" : "text-[#FF3B5C]"}`}>
                        {i.change == null ? "—" : `${up ? "+" : ""}${i.change.toFixed(2)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* BEREICH 2 — Watchlist (Hauptfokus) */}
        <section>
          <WatchlistSignalsPanel />
        </section>

        {/* BEREICH 3 — Zusätzliche Insights (collapsible) */}
        <section>
          <details className="group rounded-2xl border border-[#1F1F1F] bg-[#111111]/40 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/60 transition hover:text-white">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#8B9EFF]" /> Quant-Signale &amp; Smart Money</span>
              <span className="text-[11px] font-normal tracking-normal text-white/40 group-open:hidden">Einblenden ↓</span>
              <span className="hidden text-[11px] font-normal tracking-normal text-white/40 group-open:inline">Einklappen ↑</span>
            </summary>
            <div className="space-y-8 border-t border-[#1F1F1F] p-5">
              {featured && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <SignalOfDay symbol={featured.symbol} ind={featured.ind} sig={featured.sig} closes={featured.closes} />
                  </div>
                  <div className="lg:col-span-4">
                    <AlphaScoreGauge score={featured.alpha} label={`Setup-Score · ${featured.symbol}`} />
                  </div>
                </div>
              )}
              <MarketAiInsight rows={rows} />
              <SectorHeatmap cells={heatmapCells} />
            </div>
          </details>
        </section>
      </div>
      <ManageWatchlistDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}



