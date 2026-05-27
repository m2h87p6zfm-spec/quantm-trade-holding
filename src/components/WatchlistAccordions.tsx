/**
 * WatchlistAccordions — Compact, information-dense accordion sections that
 * sit below the user's "My Watchlist" on the Watchlist page (/).
 *
 * Sections (in order):
 *   1. Market Winners        – best weekly performers
 *   2. Biggest Losers        – worst day performers
 *   3. Top Gainers Today     – best day performers
 *   4. Top Volume            – highest raw daily volume
 *   5. Most Active           – volume × volatility composite
 *   6. 52-Week Highs         – closest to 52w high
 *   7. 52-Week Lows          – closest to 52w low
 *
 * Each header shows a tiny preview (top 3 tickers + % change). Tap to expand
 * for the full list with logo, ticker, company, price, % change and volume.
 * Includes "Expand All" / "Collapse All" controls.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Flame,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useCockpitData, type CockpitRow } from "@/lib/cockpit";
import { PRODUCTS } from "@/lib/products";
import { useTr } from "@/lib/i18n";

/* --------------------------------------------------------------------- */
/*  Liquid universe used to compute movers                                */
/* --------------------------------------------------------------------- */

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

const PRODUCT_MAP = new Map(PRODUCTS.map((p) => [p.symbol, p]));

/* --------------------------------------------------------------------- */
/*  Helpers                                                               */
/* --------------------------------------------------------------------- */

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
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function weeklyChange(row: CockpitRow): number {
  const c = row.closes;
  if (c.length < 6) return row.change;
  const last = c[c.length - 1];
  const prev = c[c.length - 6];
  if (!prev) return row.change;
  return ((last - prev) / prev) * 100;
}

function pctToHigh52(row: CockpitRow): number {
  if (!row.high52 || row.high52 <= 0) return 0;
  return (row.last / row.high52) * 100;
}

function pctToLow52(row: CockpitRow): number {
  if (!row.low52 || row.low52 <= 0) return Infinity;
  return (row.last / row.low52) * 100;
}

/* --------------------------------------------------------------------- */
/*  Stock row                                                             */
/* --------------------------------------------------------------------- */

function StockRow({
  row,
  rank,
  emphasis,
}: {
  row: CockpitRow;
  rank: number;
  emphasis: "up" | "down" | "neutral";
}) {
  const meta = PRODUCT_MAP.get(row.symbol);
  const up = row.change >= 0;
  const color =
    emphasis === "down" ? "#FF3B5C" : emphasis === "up" ? "#22FF88" : up ? "#22FF88" : "#FF3B5C";

  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol: row.symbol }}
      className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-background/60"
    >
      <span className="w-4 shrink-0 text-center font-mono text-[10px] text-muted-foreground/60 tabular-nums">
        {rank}
      </span>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background font-mono text-[10px] font-bold tracking-tight text-foreground/80"
        title={meta?.name}
      >
        {row.symbol.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12px] font-semibold text-foreground">
          {row.symbol}
        </div>
        <div className="truncate text-[10px] text-muted-foreground/70">
          {meta?.name ?? row.symbol}
        </div>
      </div>
      <div className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {formatVolume(row.volume)}
      </div>
      <div className="w-16 shrink-0 text-right">
        <div className="font-mono text-[12px] tabular-nums text-foreground">
          ${row.last.toFixed(2)}
        </div>
        <div
          className="flex items-center justify-end gap-0.5 font-mono text-[11px] font-semibold tabular-nums"
          style={{ color }}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {up ? "+" : ""}
          {row.change.toFixed(2)}%
        </div>
      </div>
    </Link>
  );
}

/* --------------------------------------------------------------------- */
/*  Accordion section                                                     */
/* --------------------------------------------------------------------- */

type SectionDef = {
  id: string;
  icon: typeof TrendingUp;
  accent: string;
  title: string;
  rows: CockpitRow[];
  emphasis: "up" | "down" | "neutral";
  metric?: (r: CockpitRow) => string;
};

function AccordionSection({
  def,
  open,
  onToggle,
}: {
  def: SectionDef;
  open: boolean;
  onToggle: () => void;
}) {
  const top3 = def.rows.slice(0, 3);
  const Icon = def.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-colors">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-background/40 sm:px-4"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklab, ${def.accent} 14%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${def.accent} 35%, transparent)`,
            color: def.accent,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="shrink-0 text-[13px] font-semibold tracking-tight text-foreground">
          {def.title}
        </h3>
        {/* Preview chips */}
        <div className="ml-auto flex min-w-0 items-center gap-1 overflow-hidden">
          {top3.map((r) => {
            const up = r.change >= 0;
            const c = def.emphasis === "down" ? "#FF3B5C" : def.emphasis === "up" ? "#22FF88" : up ? "#22FF88" : "#FF3B5C";
            return (
              <span
                key={r.symbol}
                className="hidden items-center gap-1 rounded-md border border-border bg-background/60 px-1.5 py-0.5 text-[10px] sm:inline-flex"
              >
                <span className="font-mono font-semibold text-foreground/85">{r.symbol}</span>
                <span className="font-mono tabular-nums" style={{ color: c }}>
                  {up ? "+" : ""}
                  {r.change.toFixed(1)}%
                </span>
              </span>
            );
          })}
          {/* Mobile compact preview */}
          <span className="flex items-center gap-1 sm:hidden">
            {top3.map((r) => {
              const up = r.change >= 0;
              const c = def.emphasis === "down" ? "#FF3B5C" : def.emphasis === "up" ? "#22FF88" : up ? "#22FF88" : "#FF3B5C";
              return (
                <span key={r.symbol} className="font-mono text-[10px] tabular-nums" style={{ color: c }}>
                  {r.symbol} {up ? "+" : ""}{r.change.toFixed(1)}%
                </span>
              );
            }).reduce<React.ReactNode[]>((acc, el, i) => {
              if (i > 0) acc.push(<span key={`sep-${i}`} className="text-muted-foreground/40">·</span>);
              acc.push(el);
              return acc;
            }, [])}
          </span>
        </div>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-2 py-2 sm:px-3">
            {def.rows.length ? (
              <div className="space-y-0.5">
                {def.rows.map((r, i) => (
                  <StockRow key={r.symbol} row={r} rank={i + 1} emphasis={def.emphasis} />
                ))}
              </div>
            ) : (
              <div className="px-2 py-4 text-center text-[11px] text-muted-foreground/70">
                —
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/*  Custom (children-based) accordion section                             */
/* --------------------------------------------------------------------- */

export type CustomAccordionItem = {
  id: string;
  icon: typeof TrendingUp;
  accent: string;
  title: string;
  preview?: React.ReactNode;
  content: React.ReactNode;
  /** Make the box span more columns in the grid. */
  span?: "default" | "wide" | "full";
};

function CustomAccordionSection({
  item,
  open,
  onToggle,
}: {
  item: CustomAccordionItem;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-colors">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-background/40 sm:px-4"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklab, ${item.accent} 14%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${item.accent} 35%, transparent)`,
            color: item.accent,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="shrink-0 text-[13px] font-semibold tracking-tight text-foreground">
          {item.title}
        </h3>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] text-muted-foreground/80">
          {item.preview}
        </div>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border p-3 sm:p-4">{item.content}</div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/*  Main                                                                  */
/* --------------------------------------------------------------------- */

export function WatchlistAccordions({
  prependItems = [],
}: {
  prependItems?: CustomAccordionItem[];
}) {
  const tr = useTr();
  const rows = useCockpitData(MOVERS_UNIVERSE);

  const sections: SectionDef[] = useMemo(() => {
    const withVol = rows.filter((r) => Number.isFinite(r.volume) && (r.volume ?? 0) > 0);

    const winners = [...rows].sort((a, b) => weeklyChange(b) - weeklyChange(a)).slice(0, 10);
    const losers = [...rows].filter((r) => r.change < 0).sort((a, b) => a.change - b.change).slice(0, 10);
    const gainers = [...rows].filter((r) => r.change > 0).sort((a, b) => b.change - a.change).slice(0, 10);
    const topVolume = [...withVol].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 10);
    const mostActive = [...withVol]
      .sort((a, b) => (b.volume ?? 0) * volatility(b.closes) - (a.volume ?? 0) * volatility(a.closes))
      .slice(0, 10);
    const highs52 = [...rows].filter((r) => r.high52).sort((a, b) => pctToHigh52(b) - pctToHigh52(a)).slice(0, 10);
    const lows52 = [...rows].filter((r) => r.low52).sort((a, b) => pctToLow52(a) - pctToLow52(b)).slice(0, 10);

    return [
      { id: "winners", icon: Trophy, accent: "#FFB020", title: tr("Markt-Gewinner", "Market Winners"), rows: winners, emphasis: "up" },
      { id: "losers", icon: TrendingDown, accent: "#FF3B5C", title: tr("Größte Verlierer", "Biggest Losers"), rows: losers, emphasis: "down" },
      { id: "gainers", icon: TrendingUp, accent: "#22FF88", title: tr("Top-Gewinner heute", "Top Gainers Today"), rows: gainers, emphasis: "up" },
      { id: "volume", icon: BarChart3, accent: "#8B9EFF", title: tr("Top-Volumen", "Top Volume"), rows: topVolume, emphasis: "neutral" },
      { id: "active", icon: Activity, accent: "#FF6B35", title: tr("Aktivste Werte", "Most Active"), rows: mostActive, emphasis: "neutral" },
      { id: "highs", icon: Flame, accent: "#22FF88", title: tr("52-Wochen-Hochs", "52-Week Highs"), rows: highs52, emphasis: "up" },
      { id: "lows", icon: TrendingDown, accent: "#FF3B5C", title: tr("52-Wochen-Tiefs", "52-Week Lows"), rows: lows52, emphasis: "down" },
    ];
  }, [rows, tr]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  const allIds = [...prependItems.map((p) => p.id), ...sections.map((s) => s.id)];
  const expandAll = () => setOpenMap(Object.fromEntries(allIds.map((id) => [id, true])));
  const collapseAll = () => setOpenMap({});

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {tr("Märkte & Watchlist", "Markets & Watchlist")}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={expandAll}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-[#22FF88]/40 hover:text-foreground"
          >
            <ChevronsUpDown className="h-3 w-3" />
            {tr("Alle öffnen", "Expand All")}
          </button>
          <button
            onClick={collapseAll}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-[#22FF88]/40 hover:text-foreground"
          >
            <ChevronsDownUp className="h-3 w-3" />
            {tr("Alle schließen", "Collapse All")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {prependItems.map((item) => (
          <div
            key={item.id}
            className={
              item.span === "full"
                ? "md:col-span-2 xl:col-span-3"
                : item.span === "wide"
                  ? "md:col-span-2 xl:col-span-2"
                  : ""
            }
          >
            <CustomAccordionSection
              item={item}
              open={!!openMap[item.id]}
              onToggle={() => toggle(item.id)}
            />
          </div>
        ))}
        {sections.map((s) => (
          <AccordionSection
            key={s.id}
            def={s}
            open={!!openMap[s.id]}
            onToggle={() => toggle(s.id)}
          />
        ))}
      </div>
    </section>
  );
}
