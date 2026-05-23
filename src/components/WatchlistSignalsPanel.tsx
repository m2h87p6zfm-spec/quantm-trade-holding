import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { fetchCandles, getApiKey } from "@/lib/finnhub";
import { findProduct } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, buildDecision, stabilizeDecision, type Decision } from "@/lib/analysis";
import { detectRegime, type MarketRegime } from "@/lib/ai-learning";
import { useSettings } from "@/lib/settings";

type SortKey = "confidence" | "perf1d" | "perf30d" | "volatility";
type FilterKey = "all" | "LONG" | "SHORT" | "NEUTRAL";

const toSignal = (d: Decision): "LONG" | "SHORT" | "NEUTRAL" =>
  d === "BUY" ? "LONG" : d === "SELL" ? "SHORT" : "NEUTRAL";

const ACCENT = {
  LONG:    { text: "text-[#22FF88]", bg: "bg-[#22FF88]/12", border: "border-[#22FF88]/40", stroke: "#22FF88", glow: "shadow-[0_0_40px_-12px_rgba(34,255,136,0.55)]" },
  SHORT:   { text: "text-[#FF3B5C]", bg: "bg-[#FF3B5C]/12", border: "border-[#FF3B5C]/40", stroke: "#FF3B5C", glow: "shadow-[0_0_40px_-12px_rgba(255,59,92,0.55)]" },
  NEUTRAL: { text: "text-[#8B9EFF]", bg: "bg-[#8B9EFF]/10", border: "border-[#8B9EFF]/30", stroke: "#8B9EFF", glow: "" },
} as const;

export function WatchlistSignalsPanel() {
  const { settings } = useSettings();
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const symbols = settings.watchlist;

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
      const p = findProduct(symbol) ?? { symbol, name: "Freier Ticker" };
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
  }, [candleQs, symbols, settings.risk]);

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
    <div className="space-y-8 text-white" style={{ fontFamily: "Inter, Satoshi, ui-sans-serif, system-ui" }}>
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight">Meine Watchlist</h2>
          <p className="mt-1.5 text-[13px] text-white/50">
            <span className="tabular-nums">{symbols.length}</span> Werte • <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#22FF88] shadow-[0_0_8px_#22FF88] animate-pulse" />Live aktualisiert</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen…"
              className="h-9 w-44 rounded-lg border border-[#1F1F1F] bg-[#111111] pl-9 pr-3 text-[13px] text-white placeholder:text-white/30 focus:border-[#22FF88]/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#1F1F1F] bg-[#111111] p-1">
            {([
              { k: "all", label: "Alle" },
              { k: "LONG", label: "Long" },
              { k: "SHORT", label: "Short" },
              { k: "NEUTRAL", label: "Neutral" },
            ] as { k: FilterKey; label: string }[]).map((f) => {
              const active = filter === f.k;
              const tone = f.k === "LONG" ? "text-[#22FF88]" : f.k === "SHORT" ? "text-[#FF3B5C]" : f.k === "NEUTRAL" ? "text-[#8B9EFF]" : "text-white";
              return (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${active ? `bg-white/5 ${tone}` : "text-white/60 hover:text-white"}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-lg border border-[#1F1F1F] bg-[#111111] px-3 text-[13px] text-white focus:border-[#22FF88]/60 focus:outline-none"
          >
            <option value="confidence">Konfidenz</option>
            <option value="perf1d">Performance 1T</option>
            <option value="perf30d">Performance 30T</option>
            <option value="volatility">Volatilität</option>
          </select>
        </div>
      </div>

      {/* CARD GRID */}
      {loading && <div className="py-12 text-center text-[13px] text-white/40">Lade Decision-Reports…</div>}
      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center text-[13px] text-white/40">Keine Werte erfüllen die Filter.</div>
      )}


      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => {
          const a = ACCENT[r.signal];
          const up = r.change >= 0;
          const strong = r.confidence >= 70;
          const initials = r.p.symbol.slice(0, 2);
          return (
            <div
              key={r.p.symbol}
              className={`group relative flex flex-col rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 ${strong ? a.glow : ""}`}
            >
              {/* Top bar */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/15 to-white/5 text-[11px] font-bold text-white ring-1 ring-white/10">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[18px] font-bold leading-tight">{r.p.symbol}</div>
                  <div className="truncate text-[13px] text-white/40">{r.p.name}</div>
                </div>
              </div>

              {/* Price */}
              <div className="mt-5">
                <div className="font-mono text-[30px] font-bold leading-none tabular-nums">
                  {r.last.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-[13px] font-semibold tabular-nums ${up ? "bg-[#22FF88]/12 text-[#22FF88]" : "bg-[#FF3B5C]/12 text-[#FF3B5C]"}`}>
                  <span className="font-mono">{up ? "+" : ""}{r.change.toFixed(2)}%</span>
                  <span className="font-mono text-white/50">{up ? "+" : ""}{r.changeAbs.toFixed(2)}</span>
                </div>
              </div>

              {/* Sparkline */}
              <div className="mt-4 h-[90px] -mx-1">
                <ResponsiveContainer>
                  <LineChart data={r.spark.map((v, i) => ({ i, v }))}>
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={up ? "#22FF88" : "#FF3B5C"}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Signal Pill */}
              <div className="mt-4">
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-bold tracking-wide ${a.bg} ${a.border} ${a.text}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.stroke, boxShadow: `0 0 8px ${a.stroke}` }} />
                  {r.signal} <span className="font-mono opacity-80">{r.confidence}%</span>
                </div>
              </div>

              {/* Metrics chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Chip label="Z" value={r.ind.zScore.toFixed(2)} />
                <Chip label="RSI" value={r.ind.rsi.toFixed(0)} />
                <Chip label="Vol" value={`${(r.ind.volatility * 100).toFixed(0)}%`} />
              </div>

              {/* Footer button */}
              <Link
                to="/produkte/$symbol"
                params={{ symbol: r.p.symbol }}
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#1F1F1F] bg-transparent text-[13px] font-semibold text-white/80 transition hover:border-[#22FF88]/60 hover:bg-[#22FF88]/5 hover:text-[#22FF88]"
              >
                Analyse öffnen
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#1F1F1F] bg-[#0A0A0A] px-2 py-1 text-[11px] text-white/60">
      <span className="text-white/40">{label}</span>
      <span className="font-mono tabular-nums text-white/90">{value}</span>
    </span>
  );
}
