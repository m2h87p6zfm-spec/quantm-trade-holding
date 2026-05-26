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
import { MarketMovers } from "@/components/MarketMovers";
import { useT } from "@/lib/i18n";
import { HeartManifestHero } from "@/components/HeartManifestHero";
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
        {/* Manifest hero — Quantm Picks + Analysis Agent spotlight */}
        <HeartManifestHero />

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


        {/* BEREICH 1 — Markt-Überblick (kompakt) */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("cockpit.section.market")}</h2>
            <span className="text-[12px] text-muted-foreground/60 tabular-nums">{t("cockpit.section.analyzed", { n: rows.length })}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Sentiment */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">{t("cockpit.sentiment.title")}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground/60">
                  {sentimentTotal} {sentimentTotal === 1 ? "Wert" : "Werte"}
                </span>
              </div>
              {/* Drei Stat-Karten: Label oben, große Zahl mittig, Prozent unten – klar gruppiert */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: t("cockpit.sentiment.bullish"), v: longCount, color: "#22FF88", tint: "rgba(34,255,136,0.08)", border: "rgba(34,255,136,0.25)", tip: "Bullish: Aktien mit positivem Signal – Kursanstieg wahrscheinlich (Long-Setup)." },
                  { k: t("cockpit.sentiment.neutral"), v: neutralCount, color: "#8B9EFF", tint: "rgba(139,158,255,0.10)", border: "rgba(139,158,255,0.30)", tip: "Neutral: Kein klares Signal – Seitwärtsbewegung oder abwarten." },
                  { k: t("cockpit.sentiment.bearish"), v: shortCount, color: "#FF3B5C", tint: "rgba(255,59,92,0.08)", border: "rgba(255,59,92,0.25)", tip: "Bearish: Aktien mit negativem Signal – Kursrückgang wahrscheinlich (Short-Setup)." },
                ].map((s) => {
                  const pct = sentimentTotal > 0 ? Math.round((s.v / sentimentTotal) * 100) : 0;
                  return (
                    <div
                      key={s.k}
                      title={s.tip}
                      className="flex cursor-help flex-col items-center justify-between gap-2 rounded-xl border px-2 py-3 text-center"
                      style={{ background: s.tint, borderColor: s.border }}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground/80">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                        {s.k}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-2xl font-bold leading-none tabular-nums" style={{ color: s.color }}>
                          {s.v}
                        </span>
                        <span className="text-[10px] tabular-nums text-muted-foreground/70">/ {sentimentTotal}</span>
                      </div>
                      <span className="text-[10px] tabular-nums" style={{ color: s.color, opacity: 0.85 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
              {/* Verteilungsbalken darunter als visuelle Zusammenfassung */}
              <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-[#22FF88]" style={{ width: sentimentTotal > 0 ? `${(longCount / sentimentTotal) * 100}%` : "0%" }} />
                <div className="h-full bg-[#8B9EFF]/60" style={{ width: sentimentTotal > 0 ? `${(neutralCount / sentimentTotal) * 100}%` : "0%" }} />
                <div className="h-full bg-[#FF3B5C]" style={{ width: sentimentTotal > 0 ? `${(shortCount / sentimentTotal) * 100}%` : "0%" }} />
              </div>
              {/* Kurze Legende, damit die Begriffe sofort verständlich sind */}
              <ul className="mt-3 space-y-1 text-[11px] leading-snug text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#22FF88" }} />
                  <span><span className="font-medium text-foreground/85">Bullish</span> – positives Signal, Long-Setup (Kursanstieg erwartet).</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#8B9EFF" }} />
                  <span><span className="font-medium text-foreground/85">Neutral</span> – kein klares Signal, Seitwärtsphase oder abwarten.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#FF3B5C" }} />
                  <span><span className="font-medium text-foreground/85">Bearish</span> – negatives Signal, Short-Setup (Kursrückgang erwartet).</span>
                </li>
              </ul>

            </div>



            {/* Indizes */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">{t("cockpit.indices.title")}</span>
              </div>
              {/* Mobile: horizontal scroll chips */}
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {indices.map((i) => {
                  const up = (i.change ?? 0) >= 0;
                  return (
                    <div key={i.symbol} className="flex shrink-0 flex-col gap-1 rounded-xl border border-border bg-background px-3 py-2 min-w-[120px]">
                      <span className="text-[11px] text-muted-foreground">{i.label}</span>
                      <span className={`font-mono text-[14px] font-semibold tabular-nums ${i.change == null ? "text-muted-foreground/60" : up ? "text-[#22FF88]" : "text-[#FF3B5C]"}`}>
                        {i.change == null ? "—" : `${up ? "+" : ""}${i.change.toFixed(2)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Desktop: grid */}
              <div className="hidden sm:grid grid-cols-2 gap-x-6 gap-y-3">
                {indices.map((i) => {
                  const up = (i.change ?? 0) >= 0;
                  return (
                    <div key={i.symbol} className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground/70">{i.label}</span>
                      <span className={`font-mono text-[13px] font-semibold tabular-nums ${i.change == null ? "text-muted-foreground/60" : up ? "text-[#22FF88]" : "text-[#FF3B5C]"}`}>
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

        {/* BEREICH 2b — Today's Market Movers */}
        <MarketMovers />

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



