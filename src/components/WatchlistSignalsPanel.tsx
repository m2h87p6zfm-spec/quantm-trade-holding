import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { MiniSpark } from "@/components/MiniSpark";
import { fetchCandles, getApiKey } from "@/lib/finnhub";
import { findProduct } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, buildDecision, stabilizeDecision, type Decision } from "@/lib/analysis";
import { detectRegime, type MarketRegime } from "@/lib/ai-learning";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { formatCurrencyFromUsd, convertFromUsd } from "@/lib/format";
import { MostViewedStocks } from "@/components/MostViewedStocks";


type SortKey = "confidence" | "perf1d" | "perf30d" | "volatility";
type FilterKey = "all" | "LONG" | "SHORT" | "NEUTRAL";

const toSignal = (d: Decision): "LONG" | "SHORT" | "NEUTRAL" =>
  d === "BUY" ? "LONG" : d === "SELL" ? "SHORT" : "NEUTRAL";

const ACCENT = {
  LONG:    { text: "text-[#22FF88]", bg: "bg-[#22FF88]/12", border: "border-[#22FF88]/40", stroke: "#22FF88", glow: "shadow-[0_0_40px_-12px_rgba(34,255,136,0.55)]" },
  SHORT:   { text: "text-[#FF3B5C]", bg: "bg-[#FF3B5C]/12", border: "border-[#FF3B5C]/40", stroke: "#FF3B5C", glow: "shadow-[0_0_40px_-12px_rgba(255,59,92,0.55)]" },
  NEUTRAL: { text: "text-[#8B9EFF]", bg: "bg-[#8B9EFF]/10", border: "border-[#8B9EFF]/30", stroke: "#8B9EFF", glow: "" },
} as const;

const SIGNAL_LABEL: Record<"LONG" | "SHORT" | "NEUTRAL", string> = {
  LONG: "Bullish",
  SHORT: "Bearish",
  NEUTRAL: "Neutral",
};

export function WatchlistSignalsPanel() {
  const { settings } = useSettings();
  const t = useT();
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const symbols = settings.watchlist;
  const locale = settings.language === "de" ? "de-DE" : "en-US";

  const candleQs = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ["candles", symbol],
      queryFn: () => fetchCandles(symbol, "D", 260),
      enabled: !!getApiKey(),
      staleTime: 12 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const rows = useMemo(() => {
    return symbols.map((symbol, i) => {
      const fallbackName = settings.language === "de" ? "Freier Ticker" : "Free ticker";
      const p = findProduct(symbol) ?? { symbol, name: fallbackName };


      const c = candleQs[i].data;
      if (!c) return null;
      const ind = computeAll(c.c);
      const sig = scoreIndicators(ind, settings.risk);
      const regime: MarketRegime = detectRegime(ind);
      const raw = buildDecision(p.symbol, p.name, ind, sig, regime);
      const stable = stabilizeDecision(p.symbol, raw.decision, raw.confidence);
      const report = stable.decision === raw.decision ? raw : { ...raw, decision: stable.decision };
      const last = c.c.at(-1) ?? 0;
      const prev = c.c.at(-2) ?? last;
      const change = prev ? ((last - prev) / prev) * 100 : 0;
      const changeAbs = last - prev;
      const spark = c.c.slice(-30);
      const first30 = spark[0] ?? last;
      const perf30 = first30 ? ((last - first30) / first30) * 100 : 0;
      const signal = toSignal(report.decision);
      return { p, ind, last, change, changeAbs, spark, perf30, signal, confidence: report.confidence };
    }).filter(Boolean) as Array<{
      p: { symbol: string; name: string };
      ind: ReturnType<typeof computeAll>;
      last: number; change: number; changeAbs: number;
      spark: number[]; perf30: number;
      signal: "LONG" | "SHORT" | "NEUTRAL"; confidence: number;
    }>;
  }, [candleQs, symbols, settings.risk, settings.language]);

  const counts = useMemo(() => {
    const c = { LONG: 0, SHORT: 0, NEUTRAL: 0 };
    rows.forEach((r) => c[r.signal]++);
    return c;
  }, [rows]);
  const total = rows.length || 1;

  const filtered = rows
    .filter((r) => filter === "all" || r.signal === filter)
    .filter((r) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return r.p.symbol.toLowerCase().includes(q) || r.p.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      switch (sortKey) {
        case "perf1d": return b.change - a.change;
        case "perf30d": return b.perf30 - a.perf30;
        case "volatility": return b.ind.volatility - a.ind.volatility;
        default: return b.confidence - a.confidence;
      }
    });

  const loading = candleQs.some((q) => q.isLoading);
  if (symbols.length === 0) return null;

  return (
    <div className="space-y-5 sm:space-y-8 text-foreground" style={{ fontFamily: "Inter, Satoshi, ui-sans-serif, system-ui" }}>
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-[22px] sm:text-[28px] font-bold leading-tight tracking-tight">{t("watchlist.title")}</h2>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            <span className="tabular-nums">{t("watchlist.subtitle.values", { n: symbols.length })}</span> • <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#22FF88] shadow-[0_0_8px_#22FF88] animate-pulse" />{t("watchlist.subtitle.live")}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search — full width on mobile */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("watchlist.search")}
              className="h-11 sm:h-9 w-full sm:w-44 rounded-lg border border-border bg-card pl-9 pr-3 text-[14px] sm:text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-[#22FF88]/60 focus:outline-none"
            />
          </div>

          {/* Filter chips — horizontal scroll on mobile */}
          <div className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:rounded-lg sm:border sm:border-border sm:bg-card sm:p-1 sm:px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              { k: "all", label: t("watchlist.filter.all") },
              { k: "LONG", label: t("watchlist.filter.long") },
              { k: "SHORT", label: t("watchlist.filter.short") },
              { k: "NEUTRAL", label: t("watchlist.filter.neutral") },
            ] as { k: FilterKey; label: string }[]).map((f) => {
              const active = filter === f.k;
              const tone = f.k === "LONG" ? "text-[#22FF88]" : f.k === "SHORT" ? "text-[#FF3B5C]" : f.k === "NEUTRAL" ? "text-[#8B9EFF]" : "text-foreground";
              return (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k)}
                  className={`shrink-0 rounded-full sm:rounded-md border border-border bg-card px-4 py-2 sm:border-0 sm:bg-transparent sm:px-3 sm:py-1.5 text-[13px] font-medium transition ${active ? `bg-foreground/5 ${tone} border-border sm:border-0` : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-11 sm:h-9 w-full sm:w-auto rounded-lg border border-border bg-card px-3 text-[14px] sm:text-[13px] text-foreground focus:border-[#22FF88]/60 focus:outline-none"
          >
            <option value="confidence">{t("watchlist.sort.confidence")}</option>
            <option value="perf1d">{t("watchlist.sort.perf1d")}</option>
            <option value="perf30d">{t("watchlist.sort.perf30d")}</option>
            <option value="volatility">{t("watchlist.sort.volatility")}</option>
          </select>
        </div>
      </div>

      {/* MOST VIEWED — community pulse based on local view history */}
      <MostViewedStocks limit={8} />

      {/* CARD GRID */}
      {loading && <div className="py-12 text-center text-[13px] text-muted-foreground/70">{t("watchlist.loading")}</div>}
      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center text-[13px] text-muted-foreground/70">{t("watchlist.empty")}</div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => {
          const a = ACCENT[r.signal];
          const up = r.change >= 0;
          const strong = r.confidence >= 70;
          const initials = r.p.symbol.slice(0, 2);
          return (
            <Link
              key={r.p.symbol}
              to="/produkte/$symbol"
              params={{ symbol: r.p.symbol }}
              className={`group relative flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:border-border ${strong ? a.glow : ""}`}
            >
              {/* MOBILE: compact horizontal row */}
              <div className="flex items-center gap-3 sm:hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/15 to-white/5 text-[12px] font-bold text-foreground ring-1 ring-white/10">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[16px] font-bold leading-tight">{r.p.symbol}</div>
                    <div className="font-mono text-[18px] font-bold leading-none tabular-nums">
                      {formatCurrencyFromUsd(r.last, settings.currency)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${a.bg} ${a.border} border ${a.text}`}>
                      <span className="h-1 w-1 rounded-full" style={{ background: a.stroke }} />
                      {SIGNAL_LABEL[r.signal]} <span className="font-mono opacity-80">{r.confidence}%</span>
                    </span>
                    <span className={`font-mono text-[13px] font-semibold tabular-nums ${up ? "text-[#22FF88]" : "text-[#FF3B5C]"}`}>
                      {up ? "+" : ""}{r.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="hidden xs:block h-10 w-16 shrink-0">
                  <MiniSpark data={r.spark} color={up ? "#22FF88" : "#FF3B5C"} strokeWidth={2} className="h-full w-full" />
                </div>
              </div>

              {/* DESKTOP: full card */}
              <div className="hidden sm:flex sm:flex-col">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/15 to-white/5 text-[11px] font-bold text-foreground ring-1 ring-white/10">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[18px] font-bold leading-tight">{r.p.symbol}</div>
                    <div className="truncate text-[13px] text-muted-foreground/70">{r.p.name}</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="font-mono text-[30px] font-bold leading-none tabular-nums">
                    {formatCurrencyFromUsd(r.last, settings.currency)}
                  </div>
                  <div className={`mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-[13px] font-semibold tabular-nums ${up ? "bg-[#22FF88]/12 text-[#22FF88]" : "bg-[#FF3B5C]/12 text-[#FF3B5C]"}`}>
                    <span className="font-mono">{up ? "+" : ""}{r.change.toFixed(2)}%</span>
                    <span className="font-mono text-muted-foreground">{up ? "+" : ""}{convertFromUsd(r.changeAbs, settings.currency).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 h-[90px] -mx-1">
                  <MiniSpark data={r.spark} color={up ? "#22FF88" : "#FF3B5C"} strokeWidth={2} className="h-full w-full" />
                </div>

                <div className="mt-4">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-bold tracking-wide ${a.bg} ${a.border} ${a.text}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.stroke, boxShadow: `0 0 8px ${a.stroke}` }} />
                    {SIGNAL_LABEL[r.signal]} <span className="font-mono opacity-80">{r.confidence}%</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Chip label={t("watchlist.metric.z")} value={r.ind.zScore.toFixed(2)} />
                  <Chip label={t("watchlist.metric.rsi")} value={r.ind.rsi.toFixed(0)} />
                  <Chip label={t("watchlist.metric.vol")} value={`${(r.ind.volatility * 100).toFixed(0)}%`} />
                </div>

                <div className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent text-[13px] font-semibold text-foreground/80 transition group-hover:border-[#22FF88]/60 group-hover:bg-[#22FF88]/5 group-hover:text-[#22FF88]">
                  {t("watchlist.card.analyse")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="font-mono tabular-nums text-foreground/90">{value}</span>
    </span>
  );
}
