// Premium "Bloomberg-Moment" Header über dem Cockpit:
// Index-Tiles (S&P, Nasdaq, Dow, Russell, VIX, Gold) + Breadth-Gauge
// (Fear & Greed Proxy aus eigener Watchlist) + Top Movers.
import { useQueries } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, Activity, Flame } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fetchCandles } from "@/lib/finnhub";
import type { CockpitRow } from "@/lib/cockpit";

const INDEX_TILES = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
  { symbol: "IWM", label: "Russell 2000" },
  { symbol: "^VIX", label: "VIX · Angst", invert: true },
  { symbol: "GLD", label: "Gold" },
];

export function MarketPulseHeader({ rows }: { rows: CockpitRow[] }) {
  const qs = useQueries({
    queries: INDEX_TILES.map((t) => ({
      queryKey: ["candles", t.symbol],
      queryFn: () => fetchCandles(t.symbol, "D", 30),
      staleTime: 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  // Breadth-basiertes "Fear & Greed" aus eigener Watchlist:
  // Mittlere RSI + Verhältnis Long zu Short.
  const greed = (() => {
    if (rows.length === 0) return { score: 50, mood: "neutral", color: "text-muted-foreground", ringColor: "stroke-muted-foreground" };
    const avgRsi = rows.reduce((s, r) => s + r.ind.rsi, 0) / rows.length;
    const long = rows.filter((r) => r.sig.verdict === "LONG").length;
    const short = rows.filter((r) => r.sig.verdict === "SHORT").length;
    const breadth = long - short;
    // 0 = extreme Angst, 100 = extreme Gier
    const score = Math.max(0, Math.min(100, Math.round((avgRsi - 30) / 40 * 100 * 0.7 + (50 + breadth * 5) * 0.3)));
    if (score >= 75) return { score, mood: "Extreme Gier", color: "text-bear", ringColor: "stroke-bear" };
    if (score >= 60) return { score, mood: "Gier", color: "text-bull", ringColor: "stroke-bull" };
    if (score >= 40) return { score, mood: "Neutral", color: "text-muted-foreground", ringColor: "stroke-muted-foreground" };
    if (score >= 25) return { score, mood: "Angst", color: "text-amber-400", ringColor: "stroke-amber-400" };
    return { score, mood: "Extreme Angst", color: "text-bull", ringColor: "stroke-bull" };
  })();

  // Top Movers aus rows
  const sorted = [...rows].filter((r) => Number.isFinite(r.change));
  const gainers = [...sorted].sort((a, b) => b.change - a.change).slice(0, 3);
  const losers = [...sorted].sort((a, b) => a.change - b.change).slice(0, 3);

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Index-Tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {INDEX_TILES.map((t, i) => {
          const closes = qs[i].data?.c ?? [];
          const last = closes.at(-1);
          const prev = closes.at(-2) ?? last;
          const change = last && prev ? ((last - prev) / prev) * 100 : 0;
          const ready = last != null;
          const positive = change >= 0;
          const visualPositive = t.invert ? !positive : positive;
          return (
            <div key={t.symbol} className="rounded-lg border border-border/60 bg-card/60 backdrop-blur px-3 py-2.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="font-semibold">{t.label}</span>
                {ready && (visualPositive
                  ? <ArrowUpRight className="h-3 w-3 text-bull" />
                  : <ArrowDownRight className="h-3 w-3 text-bear" />)}
              </div>
              {ready ? (
                <>
                  <div className="mt-1 font-mono text-sm font-semibold tabular-nums">{last!.toFixed(2)}</div>
                  <div className={`font-mono text-[11px] tabular-nums ${visualPositive ? "text-bull" : "text-bear"}`}>
                    {positive ? "+" : ""}{change.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className="space-y-1 mt-1">
                  <div className="h-3 w-14 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-10 rounded bg-muted/60 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sentiment-Gauge + Top Movers */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Fear & Greed Gauge */}
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur p-4 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" className="fill-none stroke-muted/40" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9"
                className={`fill-none ${greed.ringColor} transition-all duration-700`}
                strokeWidth="3"
                strokeDasharray={`${greed.score}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-bold text-lg tabular-nums ${greed.color}`}>{greed.score}</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Watchlist-Sentiment
            </div>
            <div className={`mt-1 text-base font-bold ${greed.color}`}>{greed.mood}</div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Aggregat aus RSI-Mittel und Long/Short-Breadth deiner Werte.
            </p>
          </div>
        </div>

        {/* Top Gainers */}
        <MoversCard title="Top Gainers" icon={<Flame className="h-3 w-3 text-bull" />} items={gainers} positive />
        {/* Top Losers */}
        <MoversCard title="Top Losers" icon={<Flame className="h-3 w-3 text-bear" />} items={losers} positive={false} />
      </div>
    </div>
  );
}

function MoversCard({ title, icon, items, positive }: { title: string; icon: React.ReactNode; items: CockpitRow[]; positive: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <div className="text-[11px] text-muted-foreground py-2">Daten laden…</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((r) => (
            <li key={r.symbol}>
              <Link
                to="/produkte/$symbol"
                params={{ symbol: r.symbol }}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-accent/40 transition-colors"
              >
                <span className="font-semibold text-xs">{r.symbol}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{r.last.toFixed(2)}</span>
                <span className={`font-mono text-xs font-semibold tabular-nums ${positive ? "text-bull" : "text-bear"}`}>
                  {r.change >= 0 ? "+" : ""}{r.change.toFixed(2)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
