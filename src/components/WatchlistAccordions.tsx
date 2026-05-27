/**
 * WatchlistAccordions — Terminal-precision dashboard grid.
 *
 * Sits below the Watchlist hero on /. Twelve-column tiered grid:
 *   • Priority sentiment + indices row (col-4 + col-8)
 *   • Watchlist full-width row (col-12)
 *   • Priority movers row: Winners / Losers / Gainers (col-4 each)
 *   • Compact stats row: Top Volume / Most Active / 52w Highs / 52w Lows (col-3 each)
 *
 * Visual language: bg-zinc-950 surfaces, sharp rounded-sm corners,
 * uppercase tracking, JetBrains Mono for numbers, accent-colored hover
 * borders. Every card stays click-to-expand to reveal the full ranked list.
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
/*  Liquid universe                                                       */
/* --------------------------------------------------------------------- */

const MOVERS_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "AMD",
  "AVGO", "ORCL", "CRM", "ADBE", "NFLX", "INTC", "QCOM", "MU",
  "JPM", "BAC", "GS", "MS", "WFC", "C", "V", "MA",
  "XOM", "CVX", "COP", "SLB", "OXY",
  "UNH", "JNJ", "PFE", "LLY", "MRK", "ABBV",
  "WMT", "HD", "COST", "KO", "PEP", "MCD", "NKE", "DIS",
  "BA", "CAT", "GE", "F", "GM",
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

const COL_SPAN: Record<3 | 4 | 6 | 8 | 12, string> = {
  3: "col-span-12 sm:col-span-6 lg:col-span-3",
  4: "col-span-12 sm:col-span-6 lg:col-span-4",
  6: "col-span-12 lg:col-span-6",
  8: "col-span-12 lg:col-span-8",
  12: "col-span-12",
};

/* --------------------------------------------------------------------- */
/*  Stock row (used inside expanded body)                                 */
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
      className="group flex items-center gap-2.5 rounded-sm px-2 py-1.5 transition hover:bg-zinc-900/60"
    >
      <span className="w-4 shrink-0 text-center font-mono text-[10px] text-zinc-600 tabular-nums">
        {rank}
      </span>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-zinc-800 bg-zinc-900 font-mono text-[10px] font-bold tracking-tight text-zinc-300"
        title={meta?.name}
      >
        {row.symbol.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12px] font-semibold text-zinc-100">
          {row.symbol}
        </div>
        <div className="truncate text-[10px] text-zinc-500">
          {meta?.name ?? row.symbol}
        </div>
      </div>
      <div className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-500">
        {formatVolume(row.volume)}
      </div>
      <div className="w-16 shrink-0 text-right">
        <div className="font-mono text-[11px] tabular-nums text-zinc-200">
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
/*  Section card (movers, list-based)                                     */
/* --------------------------------------------------------------------- */

type Tier = "priority" | "compact";

type SectionDef = {
  id: string;
  icon: typeof TrendingUp;
  accent: string;
  title: string;
  rows: CockpitRow[];
  emphasis: "up" | "down" | "neutral";
  tier: Tier;
  colSpan: 3 | 4 | 6 | 8 | 12;
};

const accentHoverBorder = (hex: string) => `hover:border-[${hex}]/50`;

function AccordionSection({
  def,
  open,
  onToggle,
}: {
  def: SectionDef;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = def.icon;
  const top = def.rows[0];
  const topPctColor =
    def.emphasis === "down" ? "text-[#FF3B5C]" : def.emphasis === "up" ? "text-[#22FF88]" : "text-zinc-300";
  const topPct =
    top !== undefined
      ? `${top.change >= 0 ? "+" : ""}${top.change.toFixed(2)}%`
      : "—";
  const tickerStrip = def.rows.slice(0, 3).map((r) => r.symbol).join(", ") || "—";

  return (
    <div className={COL_SPAN[def.colSpan]}>
      <div
        className="group h-full overflow-hidden rounded-sm border border-zinc-800/80 bg-zinc-950 transition-all duration-300 hover:bg-zinc-900/40"
        style={{
          // dynamic accent border on hover
          // tailwind arbitrary hover doesn't accept dynamic hex, so use inline border-color via CSS var
          ["--accent" as never]: def.accent,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="block w-full text-left"
        >
          {def.tier === "priority" ? (
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-sm border"
                  style={{
                    background: `color-mix(in oklab, ${def.accent} 10%, transparent)`,
                    borderColor: `color-mix(in oklab, ${def.accent} 20%, transparent)`,
                    color: def.accent,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono text-[10px] font-medium tabular-nums ${topPctColor}`}>
                    {topPct}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-tighter text-zinc-400">
                  {def.title}
                </h3>
                <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">{tickerStrip}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-tighter text-zinc-500">
                  {def.title}
                </h3>
                <ChevronDown
                  className={`h-3 w-3 text-zinc-700 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                {def.rows.slice(0, 2).map((r) => {
                  const up = r.change >= 0;
                  const color =
                    def.emphasis === "down"
                      ? "text-[#FF3B5C]"
                      : def.emphasis === "up"
                        ? "text-[#22FF88]"
                        : up
                          ? "text-[#22FF88]"
                          : "text-[#FF3B5C]";
                  return (
                    <div key={r.symbol} className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-300">{r.symbol}</span>
                      <span className={`font-mono tabular-nums ${color}`}>
                        {up ? "+" : ""}
                        {r.change.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
                {def.rows.length === 0 && (
                  <div className="text-[10px] text-zinc-600">—</div>
                )}
              </div>
            </div>
          )}
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-zinc-800/80 p-2">
              {def.rows.length ? (
                <div className="space-y-0.5">
                  {def.rows.map((r, i) => (
                    <StockRow key={r.symbol} row={r} rank={i + 1} emphasis={def.emphasis} />
                  ))}
                </div>
              ) : (
                <div className="px-2 py-4 text-center text-[11px] text-zinc-600">—</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/*  Custom (children-based) card                                          */
/* --------------------------------------------------------------------- */

export type CustomAccordionItem = {
  id: string;
  icon: typeof TrendingUp;
  accent: string;
  title: string;
  /** Inline summary shown next to the title (collapsed state). */
  summary?: React.ReactNode;
  /** Optional one-line label under the title. */
  subtitle?: string;
  /** Body shown only when expanded. */
  content: React.ReactNode;
  colSpan?: 3 | 4 | 6 | 8 | 12;
};

function CustomCard({
  item,
  open,
  onToggle,
}: {
  item: CustomAccordionItem;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;
  const span = item.colSpan ?? 6;
  return (
    <div className={COL_SPAN[span]}>
      <div className="group h-full overflow-hidden rounded-sm border border-zinc-800/80 bg-zinc-950 transition-all duration-300 hover:bg-zinc-900/40">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border"
              style={{
                background: `color-mix(in oklab, ${item.accent} 10%, transparent)`,
                borderColor: `color-mix(in oklab, ${item.accent} 20%, transparent)`,
                color: item.accent,
              }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold text-zinc-100">{item.title}</h3>
              {item.subtitle && (
                <p className="truncate text-[10px] uppercase tracking-widest text-zinc-500">
                  {item.subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {item.summary}
            <ChevronDown
              className={`h-4 w-4 text-zinc-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-zinc-800/80 p-4">{item.content}</div>
          </div>
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
      { id: "winners", icon: Trophy, accent: "#FFB020", title: tr("Markt-Gewinner", "Market Winners"), rows: winners, emphasis: "up", tier: "priority", colSpan: 4, rowGroup: "movers" },
      { id: "losers", icon: TrendingDown, accent: "#FF3B5C", title: tr("Größte Verlierer", "Biggest Losers"), rows: losers, emphasis: "down", tier: "priority", colSpan: 4, rowGroup: "movers" },
      { id: "gainers", icon: TrendingUp, accent: "#22FF88", title: tr("Top-Gewinner heute", "Top Gainers Today"), rows: gainers, emphasis: "up", tier: "priority", colSpan: 4, rowGroup: "movers" },
      { id: "volume", icon: BarChart3, accent: "#8B9EFF", title: tr("Top-Volumen", "Top Volume"), rows: topVolume, emphasis: "neutral", tier: "compact", colSpan: 3, rowGroup: "stats" },
      { id: "active", icon: Activity, accent: "#FF6B35", title: tr("Aktivste Werte", "Most Active"), rows: mostActive, emphasis: "neutral", tier: "compact", colSpan: 3, rowGroup: "stats" },
      { id: "highs", icon: Flame, accent: "#22FF88", title: tr("52-Wochen-Hochs", "52-Week Highs"), rows: highs52, emphasis: "up", tier: "compact", colSpan: 3, rowGroup: "stats" },
      { id: "lows", icon: TrendingDown, accent: "#FF3B5C", title: tr("52-Wochen-Tiefs", "52-Week Lows"), rows: lows52, emphasis: "down", tier: "compact", colSpan: 3, rowGroup: "stats" },
    ];
  }, [rows, tr]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setOpenMap((m) => {
      const section = sections.find((s) => s.id === id);
      if (section?.rowGroup) {
        const groupIds = sections.filter((s) => s.rowGroup === section.rowGroup).map((s) => s.id);
        const next = !m[id];
        const updated = { ...m };
        for (const gid of groupIds) updated[gid] = next;
        return updated;
      }
      return { ...m, [id]: !m[id] };
    });
  const allIds = [...prependItems.map((p) => p.id), ...sections.map((s) => s.id)];
  const expandAll = () => setOpenMap(Object.fromEntries(allIds.map((id) => [id, true])));
  const collapseAll = () => setOpenMap({});

  const analysedCount = rows.length;

  return (
    <section className="space-y-5">
      {/* Section header — eyebrow + h1 + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800/60 pb-4">
        <div>
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            {tr("Markt-Überblick", "Market Overview")}
          </h2>
          <h1 className="text-xl font-semibold text-zinc-100">
            {tr("Märkte & Watchlist", "Markets & Watchlist")}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 tabular-nums">
            {tr(`${analysedCount} analysiert`, `${analysedCount} Analysed`)}
          </span>
          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <ChevronsUpDown className="h-3 w-3" />
              {tr("Alle öffnen", "Expand All")}
            </button>
            <button
              onClick={collapseAll}
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <ChevronsDownUp className="h-3 w-3" />
              {tr("Alle schließen", "Collapse All")}
            </button>
          </div>
        </div>
      </div>

      {/* 12-column tiered grid */}
      <div className="grid grid-cols-12 gap-3">
        {prependItems.map((item) => (
          <CustomCard
            key={item.id}
            item={item}
            open={!!openMap[item.id]}
            onToggle={() => toggle(item.id)}
          />
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
