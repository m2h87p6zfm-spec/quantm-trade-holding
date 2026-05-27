import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ListPlus, Search, Sparkles, Activity, ListChecks } from "lucide-react";
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
import { WatchlistAccordions, type CustomAccordionItem } from "@/components/WatchlistAccordions";
import { useT } from "@/lib/i18n";

import { scoreIndicators, buildDecision, stabilizeDecision } from "@/lib/analysis";
import { detectRegime } from "@/lib/ai-learning";




export const Route = createFileRoute("/")({ component: Cockpit });

const DEFAULT_SET = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "JPM", "XOM", "SPY", "QQQ"];

function Cockpit() {
  const { settings } = useSettings();
  const t = useT();

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

  // Sentiment NUR über die tatsächliche User-Watchlist (nicht über versteckte Markt-Defaults
  // wie SPY/QQQ/DIA/IWM, die zusätzlich im Cockpit-Set stecken). Verwendet exakt dieselbe
  // Pipeline wie die Watchlist-Karten unten (gleiche Risk-Einstellung + stabilisierte
  // Decision) — sonst zeigen Markt-Stimmung und Karten unterschiedliche Verdicts.
  const watchlistSymbols = usingDefault ? DEFAULT_SET : settings.watchlist;
  const watchlistRows = rows.filter((r) => watchlistSymbols.includes(r.symbol));
  const watchlistVerdicts = useMemo(() => {
    return watchlistRows.map((r) => {
      const ind = r.ind;
      const sig = scoreIndicators(ind, settings.risk);
      const regime = detectRegime(ind);
      const raw = buildDecision(r.symbol, r.symbol, ind, sig, regime);
      const stable = stabilizeDecision(r.symbol, raw.decision, raw.confidence);
      return stable.decision; // "BUY" | "SELL" | "HOLD"
    });
  }, [watchlistRows, settings.risk]);
  const longCount = watchlistVerdicts.filter((d) => d === "BUY").length;
  const shortCount = watchlistVerdicts.filter((d) => d === "SELL").length;
  const neutralCount = watchlistVerdicts.filter((d) => d === "HOLD").length;

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
    <div className="min-h-screen bg-background pb-16 text-foreground" style={{ fontFamily: "Inter, Satoshi, ui-sans-serif, system-ui" }}>
      <TickerBand />

      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:space-y-12 sm:px-6 sm:pt-10">



        {/* Hero strip */}
        <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22FF88] animate-pulse" />
              {t("cockpit.live")}
            </div>
            <h1 className="mt-3 text-[24px] sm:text-[32px] font-bold tracking-tight">{usingDefault ? t("cockpit.title.market") : t("cockpit.title.watchlist")}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground/70 tabular-nums">
              {loading ? t("cockpit.sync", { loaded, total }) : t("cockpit.activeValues", { n: loaded })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WatchlistSwitcher />
            <button
              onClick={() => setManageOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground/80 transition hover:border-[#22FF88]/40 hover:text-foreground"
            >
              <ListPlus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("cockpit.manage")}</span>
            </button>
            <Link to="/produkte" className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground/80 transition hover:border-[#22FF88]/40 hover:text-foreground">
              <Search className="h-3.5 w-3.5" /> {t("cockpit.catalog")}
            </Link>
          </div>
        </div>


        {/* Markets & Watchlist — terminal-precision tiered grid.
            Sentiment (col-4) + Indices (col-8) + Watchlist (col-12) sit side-by-side
            with the priority movers (col-4) and compact stat cards (col-3). */}
        <WatchlistAccordions
          prependItems={[
            {
              id: "sentiment",
              icon: Activity,
              accent: "#22FF88",
              title: t("cockpit.sentiment.title"),
              colSpan: 4,
              summary: (
                <span className="hidden items-center gap-1.5 font-mono text-[10px] tabular-nums sm:inline-flex">
                  <span className="text-[#22FF88]">{longCount}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400">{neutralCount}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-[#FF3B5C]">{shortCount}</span>
                </span>
              ),
              content: (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { k: t("cockpit.sentiment.bullish"), v: longCount, color: "#22FF88" },
                      { k: t("cockpit.sentiment.neutral"), v: neutralCount, color: "#8B9EFF" },
                      { k: t("cockpit.sentiment.bearish"), v: shortCount, color: "#FF3B5C" },
                    ].map((s) => {
                      const pct = sentimentTotal > 0 ? Math.round((s.v / sentimentTotal) * 100) : 0;
                      return (
                        <div
                          key={s.k}
                          className="flex flex-col items-center gap-1 rounded-sm border border-zinc-800 bg-zinc-900/50 px-2 py-2 text-center"
                        >
                          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                            <span className="h-1 w-1 rounded-full" style={{ background: s.color }} />
                            {s.k}
                          </span>
                          <span className="font-mono text-xl font-bold leading-none tabular-nums" style={{ color: s.color }}>
                            {s.v}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums" style={{ color: s.color, opacity: 0.85 }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex h-1 overflow-hidden bg-zinc-800">
                    <div className="h-full bg-[#22FF88]" style={{ width: sentimentTotal > 0 ? `${(longCount / sentimentTotal) * 100}%` : "0%" }} />
                    <div className="h-full bg-zinc-600" style={{ width: sentimentTotal > 0 ? `${(neutralCount / sentimentTotal) * 100}%` : "0%" }} />
                    <div className="h-full bg-[#FF3B5C]" style={{ width: sentimentTotal > 0 ? `${(shortCount / sentimentTotal) * 100}%` : "0%" }} />
                  </div>
                </div>
              ),
            },
            {
              id: "indices",
              icon: Sparkles,
              accent: "#8B9EFF",
              title: t("cockpit.indices.title"),
              colSpan: 8,
              colSpan: 8,
              summary: (
                <span className="hidden items-center gap-4 sm:inline-flex">
                  {indices.slice(0, 3).map((i) => {
                    const up = (i.change ?? 0) >= 0;
                    return (
                      <span key={i.symbol} className="flex flex-col items-end font-mono">
                        <span className="text-[10px] uppercase text-zinc-500">{i.symbol}</span>
                        <span className={`text-xs tabular-nums ${i.change == null ? "text-zinc-600" : up ? "text-[#22FF88]" : "text-[#FF3B5C]"}`}>
                          {i.change == null ? "—" : `${up ? "+" : ""}${i.change.toFixed(2)}%`}
                        </span>
                      </span>
                    );
                  })}
                </span>
              ),
              content: (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                  {indices.map((i) => {
                    const up = (i.change ?? 0) >= 0;
                    return (
                      <div key={i.symbol} className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500">{i.label}</span>
                        <span className={`font-mono text-[13px] font-semibold tabular-nums ${i.change == null ? "text-zinc-600" : up ? "text-[#22FF88]" : "text-[#FF3B5C]"}`}>
                          {i.change == null ? "—" : `${up ? "+" : ""}${i.change.toFixed(2)}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ),
            },
            {
              id: "watchlist",
              icon: ListChecks,
              accent: "#22FF88",
              title: t("watchlist.title"),
              subtitle: t("watchlist.subtitle.live"),
              colSpan: 12,
              summary: (
                <span className="rounded-sm bg-zinc-800 px-2 py-0.5 font-mono text-[10px] tabular-nums text-zinc-300">
                  {settings.watchlist.length} {settings.watchlist.length === 1 ? "symbol" : "symbols"}
                </span>
              ),
              content: <WatchlistSignalsPanel />,
            },
          ] satisfies CustomAccordionItem[]}
        />




        {/* BEREICH 3 — Zusätzliche Insights (collapsible) */}
        <section>
          <details className="group rounded-2xl border border-border bg-card/40 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#8B9EFF]" /> {t("cockpit.insights.title")}</span>
              <span className="text-[11px] font-normal tracking-normal text-muted-foreground/70 group-open:hidden">{t("cockpit.insights.expand")}</span>
              <span className="hidden text-[11px] font-normal tracking-normal text-muted-foreground/70 group-open:inline">{t("cockpit.insights.collapse")}</span>
            </summary>
            <div className="space-y-8 border-t border-border p-5">
              {featured && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <SignalOfDay symbol={featured.symbol} ind={featured.ind} sig={featured.sig} closes={featured.closes} />
                  </div>
                  <div className="lg:col-span-4">
                    <AlphaScoreGauge score={featured.alpha} label={t("cockpit.setupScore", { symbol: featured.symbol })} />
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



