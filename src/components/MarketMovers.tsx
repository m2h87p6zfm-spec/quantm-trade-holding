/**
 * MarketMovers — "Today's Market Movers" experience.
 *
 * Premium, Bloomberg/TradingView-inspired modular sections that sit
 * directly under the user's watchlist. Uses real data from the existing
 * Yahoo-proxy pipeline (useCockpitData) over a curated, highly liquid
 * universe — no hallucinated tickers.
 *
 * Sections (each collapsible):
 *   1. Biggest Gainers Today
 *   2. Biggest Losers Today
 *   3. Most Active Stocks
 *   4. AI Trade Opportunities
 *   5. Global Markets Snapshot
 *   6. Sector Heatmap
 *   7. Personalized Watchlist Insights
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bookmark,
  Brain,
  ChevronDown,
  Filter,
  Flame,
  Globe2,
  LineChart,
  ListPlus,
  PieChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCockpitData, type CockpitRow } from "@/lib/cockpit";
import { PRODUCTS } from "@/lib/products";
import { MiniSpark } from "@/components/MiniSpark";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { useTr } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

/* ---------------------------------------------------------------------- */
/*  Curated movers universe — ~50 highly liquid US large caps + key ETFs  */
/* ---------------------------------------------------------------------- */

const MOVERS_UNIVERSE = [
  // Mega cap tech
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "AMD",
  "AVGO", "ORCL", "CRM", "ADBE", "NFLX", "INTC", "QCOM", "MU",
  // Financials
  "JPM", "BAC", "GS", "MS", "WFC", "C", "V", "MA",
  // Energy
  "XOM", "CVX", "COP", "SLB", "OXY",
  // Healthcare
  "UNH", "JNJ", "PFE", "LLY", "MRK", "ABBV",
  // Consumer
  "WMT", "HD", "COST", "KO", "PEP", "MCD", "NKE", "DIS",
  // Industrial / Materials
  "BA", "CAT", "GE", "F", "GM",
  // High-beta / meme
  "PLTR", "COIN", "RIVN", "SOFI", "HOOD", "GME", "AMC",
];

const GLOBAL_SNAPSHOT_SYMBOLS = [
  { symbol: "SPY", label: "S&P 500", flag: "🇺🇸" },
  { symbol: "QQQ", label: "Nasdaq 100", flag: "🇺🇸" },
  { symbol: "DIA", label: "Dow Jones", flag: "🇺🇸" },
  { symbol: "EWG", label: "DAX (Germany)", flag: "🇩🇪" },
  { symbol: "EWJ", label: "Nikkei (Japan)", flag: "🇯🇵" },
  { symbol: "GLD", label: "Gold", flag: "🥇" },
  { symbol: "USO", label: "Oil (WTI)", flag: "🛢️" },
  { symbol: "BTC-USD", label: "Bitcoin", flag: "₿" },
  { symbol: "ETH-USD", label: "Ethereum", flag: "Ξ" },
  { symbol: "^VIX", label: "VIX", flag: "⚡" },
];

const PRODUCT_MAP = new Map(PRODUCTS.map((p) => [p.symbol, p]));

/* ---------------------------------------------------------------------- */
/*  Small primitives                                                       */
/* ---------------------------------------------------------------------- */

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card/60 backdrop-blur-sm transition-shadow hover:shadow-[0_0_30px_-15px_rgba(34,255,136,0.25)] ${className}`}
    >
      {children}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  accent = "#22FF88",
  defaultOpen = true,
  children,
  right,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle?: string;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassCard>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${accent} 14%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 35%, transparent)`,
              color: accent,
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {subtitle && (
              <p className="truncate text-[11px] text-muted-foreground/70">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="animate-fade-in border-t border-border px-5 pb-5 pt-4">{children}</div>
      )}
    </GlassCard>
  );
}

/* ---------------------------------------------------------------------- */
/*  Stock row used by Gainers / Losers / Most Active                       */
/* ---------------------------------------------------------------------- */

function StockRow({
  row,
  mode,
  rank,
  extra,
}: {
  row: CockpitRow;
  mode: "up" | "down" | "active";
  rank: number;
  extra?: React.ReactNode;
}) {
  const meta = PRODUCT_MAP.get(row.symbol);
  const up = row.change >= 0;
  const color = mode === "down" ? "#FF3B5C" : mode === "up" ? "#22FF88" : "#8B9EFF";
  const arrow = up ? "+" : "";

  const sparkData = useMemo(() => row.closes.slice(-30), [row.closes]);

  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol: row.symbol }}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-border hover:bg-background/60"
    >
      <span className="w-5 shrink-0 text-center font-mono text-[10px] text-muted-foreground/60 tabular-nums">
        {rank}
      </span>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background font-mono text-[11px] font-bold tracking-tight text-foreground/80"
        title={meta?.name}
      >
        {row.symbol.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[13px] font-semibold text-foreground">
            {row.symbol}
          </span>
          {meta?.sector && (
            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
              {meta.sector}
            </span>
          )}
        </div>
        <span className="block truncate text-[11px] text-muted-foreground/70">
          {meta?.name ?? row.symbol}
        </span>
      </div>
      <MiniSpark data={sparkData} color={color} className="h-7 w-20 shrink-0" />
      <div className="w-20 shrink-0 text-right">
        <div className="font-mono text-[13px] tabular-nums text-foreground">
          ${row.last.toFixed(2)}
        </div>
        <div
          className="flex items-center justify-end gap-0.5 font-mono text-[12px] font-semibold tabular-nums"
          style={{ color }}
        >
          {up ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {arrow}
          {row.change.toFixed(2)}%
        </div>
      </div>
      {extra && <div className="hidden w-24 shrink-0 text-right sm:block">{extra}</div>}
    </Link>
  );
}

/* ---------------------------------------------------------------------- */
/*  Helpers                                                                */
/* ---------------------------------------------------------------------- */

function avgVolume(row: CockpitRow): number {
  const vols = row.closes.slice(-20);
  return vols.length ? row.closes.slice(-20).reduce((s, v) => s + v, 0) / vols.length : 0;
}

function formatVolume(v: number | undefined): string {
  if (!v || !Number.isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

function volatility(closes: number[]): number {
  if (closes.length < 20) return 0;
  const slice = closes.slice(-20);
  const returns = slice.slice(1).map((c, i) => (c - slice[i]) / slice[i]);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/* ---------------------------------------------------------------------- */
/*  Main component                                                         */
/* ---------------------------------------------------------------------- */

export function MarketMovers() {
  const tr = useTr();
  const { settings } = useSettings();
  const rows = useCockpitData(MOVERS_UNIVERSE);
  const globalRows = useCockpitData(GLOBAL_SNAPSHOT_SYMBOLS.map((g) => g.symbol));
  const watchlistRows = useCockpitData(
    settings.watchlist.length ? settings.watchlist : ["AAPL", "MSFT", "NVDA"],
  );

  const [sectorFilter, setSectorFilter] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    if (!sectorFilter) return rows;
    return rows.filter((r) => PRODUCT_MAP.get(r.symbol)?.sector === sectorFilter);
  }, [rows, sectorFilter]);

  const gainers = useMemo(
    () =>
      [...filteredRows]
        .filter((r) => r.change > 0)
        .sort((a, b) => b.change - a.change)
        .slice(0, 10),
    [filteredRows],
  );

  const losers = useMemo(
    () =>
      [...filteredRows]
        .filter((r) => r.change < 0)
        .sort((a, b) => a.change - b.change)
        .slice(0, 10),
    [filteredRows],
  );

  const mostActive = useMemo(
    () =>
      [...filteredRows]
        .filter((r) => Number.isFinite(r.volume) && (r.volume ?? 0) > 0)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
        .slice(0, 10),
    [filteredRows],
  );

  const aiOpportunities = useMemo(
    () =>
      [...rows]
        .map((r) => ({
          row: r,
          confidence: Math.round(r.sig.confidence ?? 0),
          direction: (r.sig.score ?? 0) >= 0 ? "bullish" : "bearish",
          score: Math.abs(r.sig.score ?? 0) * (r.sig.confidence ?? 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [rows],
  );

  const heatmapCells = useMemo(
    () =>
      rows.map((r) => ({ symbol: r.symbol, change: r.change, price: r.last })),
    [rows],
  );

  /* -------------------- Personalized watchlist insights ---------------- */
  const watchlistInsights = useMemo(() => {
    const list = watchlistRows;
    if (!list.length) return [];
    const out: { icon: typeof Sparkles; text: string; tone: "good" | "warn" | "info" }[] = [];

    // 1. Sector concentration
    const sectorCount = new Map<string, number>();
    list.forEach((r) => {
      const s = PRODUCT_MAP.get(r.symbol)?.sector;
      if (s) sectorCount.set(s, (sectorCount.get(s) ?? 0) + 1);
    });
    const topSector = [...sectorCount.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topSector && topSector[1] / list.length > 0.5) {
      out.push({
        icon: PieChart,
        text: tr(
          `Deine Watchlist ist stark ${topSector[0]}-lastig (${Math.round((topSector[1] / list.length) * 100)}%).`,
          `Your watchlist is heavily ${topSector[0]}-exposed (${Math.round((topSector[1] / list.length) * 100)}%).`,
        ),
        tone: "warn",
      });
    }

    // 2. Momentum
    const avgChange = list.reduce((s, r) => s + r.change, 0) / list.length;
    if (avgChange > 1) {
      out.push({
        icon: TrendingUp,
        text: tr(
          `Starkes Momentum: Deine Watchlist liegt heute im Schnitt +${avgChange.toFixed(2)}%.`,
          `Strong momentum: your watchlist is up an average +${avgChange.toFixed(2)}% today.`,
        ),
        tone: "good",
      });
    } else if (avgChange < -1) {
      out.push({
        icon: TrendingDown,
        text: tr(
          `Druck im Markt: Deine Watchlist liegt im Schnitt ${avgChange.toFixed(2)}%.`,
          `Pressure across the market: your watchlist is averaging ${avgChange.toFixed(2)}% today.`,
        ),
        tone: "warn",
      });
    }

    // 3. Breakout candidates (near 52w high)
    const breakout = list.filter(
      (r) => r.high52 && r.last / r.high52 > 0.95,
    );
    if (breakout.length) {
      out.push({
        icon: Zap,
        text: tr(
          `${breakout.length} Werte nähern sich ihrer Breakout-Zone (52W-Hoch): ${breakout
            .slice(0, 3)
            .map((r) => r.symbol)
            .join(", ")}.`,
          `${breakout.length} names approaching breakout zones (52w high): ${breakout
            .slice(0, 3)
            .map((r) => r.symbol)
            .join(", ")}.`,
        ),
        tone: "good",
      });
    }

    // 4. Confidence average
    const avgConf = list.reduce((s, r) => s + (r.sig.confidence ?? 0), 0) / list.length;
    if (avgConf >= 70) {
      out.push({
        icon: Brain,
        text: tr(
          `KI-Konfidenz über deine Watchlist liegt bei ${Math.round(avgConf)}% — überdurchschnittlich klare Setups.`,
          `AI confidence across your watchlist sits at ${Math.round(avgConf)}% — above-average setup clarity.`,
        ),
        tone: "good",
      });
    }

    return out;
  }, [watchlistRows, tr]);

  /* -------------------- Sectors for filter chips ----------------------- */
  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const s = PRODUCT_MAP.get(r.symbol)?.sector;
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [rows]);

  /* -------------------- Render ---------------------------------------- */

  const loaded = rows.length;
  const total = MOVERS_UNIVERSE.length;
  const loading = loaded < total;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Flame className="h-3 w-3 text-[#FF6B35]" />
            {tr("Live", "Live")}
          </div>
          <h2 className="mt-2 text-[20px] font-bold tracking-tight sm:text-[24px]">
            {tr("Marktbewegungen heute", "Today's Market Movers")}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground/70 tabular-nums">
            {loading
              ? tr(`Lade Universum… ${loaded}/${total}`, `Loading universe… ${loaded}/${total}`)
              : tr(
                  `${loaded} liquide Werte analysiert · auto-aktualisiert`,
                  `${loaded} liquid names analyzed · auto-refreshed`,
                )}
          </p>
        </div>

        {/* Sector filter chips */}
        <div className="flex max-w-full flex-wrap items-center gap-1.5 overflow-x-auto">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <button
            onClick={() => setSectorFilter(null)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              sectorFilter === null
                ? "border-[#22FF88]/40 bg-[#22FF88]/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {tr("Alle", "All")}
          </button>
          {sectorOptions.map((s) => (
            <button
              key={s}
              onClick={() => setSectorFilter(s)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                sectorFilter === s
                  ? "border-[#22FF88]/40 bg-[#22FF88]/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column grid for Gainers + Losers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          icon={TrendingUp}
          accent="#22FF88"
          title={tr("Top-Gewinner heute", "Biggest Gainers Today")}
          subtitle={tr("Stärkste Tagesperformer", "Strongest daily performers")}
        >
          {gainers.length ? (
            <div className="space-y-1">
              {gainers.map((r, i) => (
                <StockRow key={r.symbol} row={r} mode="up" rank={i + 1} />
              ))}
            </div>
          ) : (
            <EmptyState text={tr("Noch keine Gewinner geladen.", "No gainers loaded yet.")} />
          )}
        </Section>

        <Section
          icon={TrendingDown}
          accent="#FF3B5C"
          title={tr("Top-Verlierer heute", "Biggest Losers Today")}
          subtitle={tr("Stärkste Tagesverlierer", "Steepest daily decliners")}
        >
          {losers.length ? (
            <div className="space-y-1">
              {losers.map((r, i) => (
                <StockRow key={r.symbol} row={r} mode="down" rank={i + 1} />
              ))}
            </div>
          ) : (
            <EmptyState text={tr("Noch keine Verlierer geladen.", "No losers loaded yet.")} />
          )}
        </Section>
      </div>

      {/* Most Active */}
      <Section
        icon={Activity}
        accent="#8B9EFF"
        title={tr("Aktivste Werte", "Most Active Stocks")}
        subtitle={tr("Höchstes Tagesvolumen + Volatilität", "Highest daily volume + volatility")}
      >
        {mostActive.length ? (
          <div className="space-y-1">
            {mostActive.map((r, i) => {
              const vol = volatility(r.closes);
              const unusual = (r.volume ?? 0) > avgVolume(r) * 2;
              const tags: { label: string; color: string }[] = [];
              if (unusual) tags.push({ label: tr("Ungewöhnl. Aktivität", "Unusual"), color: "#FFB020" });
              if (vol > 60) tags.push({ label: tr("Hohe Vola", "High Vol"), color: "#FF3B5C" });
              if ((r.volume ?? 0) > avgVolume(r) * 3)
                tags.push({ label: tr("Retail-Frenzy", "Retail Frenzy"), color: "#FF6B35" });
              return (
                <StockRow
                  key={r.symbol}
                  row={r}
                  mode="active"
                  rank={i + 1}
                  extra={
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatVolume(r.volume)}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1">
                        {tags.map((t) => (
                          <span
                            key={t.label}
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                            style={{
                              background: `color-mix(in oklab, ${t.color} 18%, transparent)`,
                              color: t.color,
                            }}
                          >
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState text={tr("Volumendaten laden…", "Volume data loading…")} />
        )}
      </Section>

      {/* AI Trade Opportunities */}
      <Section
        icon={Sparkles}
        accent="#22FF88"
        title={tr("KI-Trade-Setups", "AI Trade Opportunities")}
        subtitle={tr(
          "Aus Momentum, Technik & Konfidenz abgeleitet",
          "Derived from momentum, technicals & confidence",
        )}
      >
        {aiOpportunities.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aiOpportunities.map(({ row, confidence, direction }) => {
              const meta = PRODUCT_MAP.get(row.symbol);
              const bullish = direction === "bullish";
              const color = bullish ? "#22FF88" : "#FF3B5C";
              const rr = ((Math.abs(row.sig.score ?? 0) / 100) * 3 + 1).toFixed(1);
              return (
                <Link
                  key={row.symbol}
                  to="/produkte/$symbol"
                  params={{ symbol: row.symbol }}
                  className="group block rounded-xl border border-border bg-background/40 p-3 transition hover:border-[#22FF88]/40 hover:bg-background/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[13px] font-bold">{row.symbol}</div>
                      <div className="truncate text-[11px] text-muted-foreground/70">
                        {meta?.name}
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: `color-mix(in oklab, ${color} 18%, transparent)`,
                        color,
                      }}
                    >
                      {bullish ? tr("Long", "Long") : tr("Short", "Short")}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{tr("Konfidenz", "Confidence")}</span>
                        <span className="font-mono tabular-nums" style={{ color }}>
                          {confidence}%
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${confidence}%`, background: color }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {tr("Zeitrahmen", "Timeframe")}:{" "}
                        <span className="font-medium text-foreground/80">
                          {tr("1–4 Wochen", "1–4 weeks")}
                        </span>
                      </span>
                      <span>
                        R/R:{" "}
                        <span className="font-mono tabular-nums text-foreground/80">{rr}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState text={tr("KI berechnet Setups…", "AI computing setups…")} />
        )}
      </Section>

      {/* Global Markets Snapshot */}
      <Section
        icon={Globe2}
        accent="#FFB020"
        title={tr("Globale Märkte", "Global Markets Snapshot")}
        subtitle={tr("Indizes, Rohstoffe, Krypto, VIX", "Indices, commodities, crypto, VIX")}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {GLOBAL_SNAPSHOT_SYMBOLS.map((g) => {
            const row = globalRows.find((r) => r.symbol === g.symbol);
            const change = row?.change ?? null;
            const up = (change ?? 0) >= 0;
            const color =
              change == null ? "var(--muted-foreground)" : up ? "#22FF88" : "#FF3B5C";
            return (
              <div
                key={g.symbol}
                className="rounded-xl border border-border bg-background/40 p-3 transition hover:border-[#22FF88]/30"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{g.label}</span>
                  <span className="text-base">{g.flag}</span>
                </div>
                <div className="font-mono text-[14px] font-semibold tabular-nums">
                  {row ? row.last.toFixed(2) : "—"}
                </div>
                <div
                  className="font-mono text-[11px] font-semibold tabular-nums"
                  style={{ color }}
                >
                  {change == null
                    ? "—"
                    : `${up ? "+" : ""}${change.toFixed(2)}%`}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Sector Heatmap */}
      <Section
        icon={LineChart}
        accent="#8B9EFF"
        title={tr("Sektor-Heatmap", "Sector Heatmap")}
        subtitle={tr(
          "Stärkste und schwächste Sektoren heute",
          "Strongest and weakest sectors today",
        )}
      >
        <SectorHeatmap cells={heatmapCells} />
      </Section>

      {/* Personalized Insights */}
      {watchlistInsights.length > 0 && (
        <Section
          icon={Brain}
          accent="#22FF88"
          title={tr("Persönliche Watchlist-Insights", "Personalized Watchlist Insights")}
          subtitle={tr(
            "KI-Analyse deiner Werte in Echtzeit",
            "AI analysis of your holdings in real time",
          )}
        >
          <ul className="space-y-2">
            {watchlistInsights.map((ins, i) => {
              const color =
                ins.tone === "good" ? "#22FF88" : ins.tone === "warn" ? "#FFB020" : "#8B9EFF";
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: `color-mix(in oklab, ${color} 14%, transparent)`,
                      color,
                    }}
                  >
                    <ins.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[13px] leading-relaxed text-foreground/90">
                    {ins.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-6 text-[12px] text-muted-foreground/70">
      {text}
    </div>
  );
}
