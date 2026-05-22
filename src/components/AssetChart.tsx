import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MarketDataReconnectingError } from "@/lib/finnhub";
import { formatPrice, formatPercent, formatSignedAbs, formatCompact, pctChange, absChange, axisDecimals } from "@/lib/format";

/**
 * Premium interactive chart with timeframe switcher.
 * Backed by /api/public/candles (Yahoo proxy, cached).
 */

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "5Y" | "MAX";

const TIMEFRAMES: { id: Timeframe; label: string; interval: string; range: string; refetchMs: number }[] = [
  { id: "1D",  label: "1T",  interval: "5m",  range: "1d",  refetchMs: 60_000 },
  { id: "1W",  label: "1W",  interval: "15m", range: "5d",  refetchMs: 120_000 },
  { id: "1M",  label: "1M",  interval: "30m", range: "1mo", refetchMs: 300_000 },
  { id: "3M",  label: "3M",  interval: "1d",  range: "3mo", refetchMs: 0 },
  { id: "YTD", label: "YTD", interval: "1d",  range: "ytd", refetchMs: 0 },
  { id: "1Y",  label: "1J",  interval: "1d",  range: "1y",  refetchMs: 0 },
  { id: "5Y",  label: "5J",  interval: "1wk", range: "5y",  refetchMs: 0 },
  { id: "MAX", label: "MAX", interval: "1mo", range: "max", refetchMs: 0 },
];

type CandlesResp = {
  c?: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[]; t?: number[];
  stale?: boolean; lastUpdated?: number;
  status?: string; message?: string;
};

async function fetchTfCandles(symbol: string, interval: string, range: string): Promise<CandlesResp> {
  const res = await fetch(`/api/public/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as CandlesResp;
  if (j.status === "reconnecting") throw new MarketDataReconnectingError(j.message);
  if (!j.c || !j.t || !j.c.length) throw new MarketDataReconnectingError("Keine Daten");
  return j;
}

export type AssetChartProps = {
  symbol: string;
  /** Currency symbol shown next to prices (defaults to "$"). */
  currency?: string;
  /** Chart pixel height (default 380). */
  height?: number;
  /** Initial timeframe (default 1Y). */
  defaultTf?: Timeframe;
};

export const AssetChart = memo(function AssetChart({
  symbol,
  currency = "$",
  height = 380,
  defaultTf = "1Y",
}: AssetChartProps) {
  const [tf, setTf] = useState<Timeframe>(defaultTf);
  const cfg = useMemo(() => TIMEFRAMES.find((t) => t.id === tf)!, [tf]);

  const q = useQuery({
    queryKey: ["asset-chart", symbol, cfg.interval, cfg.range],
    queryFn: () => fetchTfCandles(symbol, cfg.interval, cfg.range),
    enabled: !!symbol,
    refetchInterval: cfg.refetchMs || false,
    refetchOnWindowFocus: false,
    staleTime: cfg.refetchMs || 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: (n, e) => (e instanceof MarketDataReconnectingError ? n < 6 : n < 2),
    retryDelay: (n, e) => (e instanceof MarketDataReconnectingError ? 1500 : 800 * 2 ** n),
    placeholderData: keepPreviousData,
  });

  const data = useMemo(() => {
    if (!q.data?.c || !q.data?.t) return [];
    const c = q.data.c;
    const t = q.data.t;
    const v = q.data.v ?? [];
    return c.map((close, i) => ({
      t: t[i] * 1000,
      close,
      volume: v[i] ?? 0,
    }));
  }, [q.data]);

  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? 0;
  const changeAbs = absChange(first, last);
  const changePct = pctChange(first, last);
  const up = changeAbs >= 0;

  const { min, max } = useMemo(() => {
    if (!data.length) return { min: 0, max: 1 };
    let mn = Infinity, mx = -Infinity;
    for (const d of data) { if (d.close < mn) mn = d.close; if (d.close > mx) mx = d.close; }
    const pad = (mx - mn) * 0.08 || mx * 0.01 || 1;
    return { min: mn - pad, max: mx + pad };
  }, [data]);

  const fmtPrice = useCallback((n: number) => formatPrice(n, currency), [currency]);
  const fmtAxis = useCallback((n: number) => formatPrice(n, currency, axisDecimals(n)), [currency]);

  const xTickFmt = useCallback((ms: number) => {
    const d = new Date(ms);
    if (tf === "1D") return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (tf === "1W" || tf === "1M") return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
    if (tf === "5Y" || tf === "MAX") return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
  }, [tf]);

  const lineColor = up ? "var(--bull)" : "var(--bear)";
  const gradientId = `assetChartGrad-${up ? "up" : "dn"}-${symbol.replace(/[^a-z0-9]/gi, "")}-${tf}`;

  const perfLabel = {
    "1D": "heute", "1W": "letzte Woche", "1M": "letzten Monat", "3M": "letzte 3 Monate",
    "YTD": "seit Jahresanfang", "1Y": "letztes Jahr", "5Y": "letzte 5 Jahre", "MAX": "gesamter Verlauf",
  }[tf];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
        <div>
          <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
            {fmtPrice(last)}
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-sm tabular-nums">
            <span className={up ? "text-bull" : "text-bear"}>
              {formatSignedAbs(changeAbs, axisDecimals(last))} ({formatPercent(changePct)})
            </span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{perfLabel}</span>
            {q.data?.stale && (
              <span className="ml-1 flex items-center gap-1 text-[10px] text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                stale
              </span>
            )}
          </div>
        </div>
        <TimeframeBar value={tf} onChange={setTf} loading={q.isFetching} />
      </div>

      {/* Chart */}
      <div style={{ height }} className="relative w-full">
        {data.length === 0 && q.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            <div className="h-full w-full animate-pulse rounded-md bg-gradient-to-b from-card/40 to-card/10" />
          </div>
        )}
        {data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                  <stop offset="60%" stopColor={lineColor} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 6" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={xTickFmt}
                tick={{ fill: "var(--chart-axis)", fontSize: 10, fontFamily: "ui-monospace, monospace" }}
                tickLine={false}
                axisLine={false}
                minTickGap={48}
              />
              <YAxis
                domain={[min, max]}
                tickFormatter={fmtAxis}
                tick={{ fill: "var(--chart-axis)", fontSize: 10, fontFamily: "ui-monospace, monospace" }}
                tickLine={false}
                axisLine={false}
                width={72}
                orientation="right"
              />
              <ReferenceLine y={first} stroke="var(--chart-axis)" strokeDasharray="2 4" strokeOpacity={0.5} />
              <Tooltip
                cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "2 3", strokeOpacity: 0.8 }}
                content={(props: any) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload}
                    base={first}
                    currency={currency}
                    tf={tf}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive
                animationDuration={420}
                animationEasing="ease-out"
                activeDot={{ r: 3, stroke: lineColor, strokeWidth: 1.5, fill: "var(--background)" }}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

/* --- Timeframe bar --- */
const TimeframeBar = memo(function TimeframeBar({
  value, onChange, loading,
}: { value: Timeframe; onChange: (v: Timeframe) => void; loading: boolean }) {
  return (
    <div
      role="tablist"
      aria-label="Zeitraum"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/60 p-0.5 backdrop-blur"
    >
      {TIMEFRAMES.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={[
              "relative h-7 min-w-[34px] px-2 rounded-md font-mono text-[11px] font-semibold tabular-nums transition-all duration-200",
              active
                ? "bg-primary/15 text-foreground ring-1 ring-primary/40 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.55)]"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
            ].join(" ")}
          >
            {t.label}
            {active && loading && (
              <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
});

/* --- Tooltip --- */
function ChartTooltip({
  active, payload, base, currency, tf,
}: {
  active?: boolean;
  payload?: any[];
  base: number;
  currency: string;
  tf: Timeframe;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const pct = base ? ((p.close - base) / base) * 100 : 0;
  const up = pct >= 0;
  const d = new Date(p.t);
  const dateStr =
    tf === "1D"
      ? d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : tf === "1W" || tf === "1M"
        ? d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

  const fmt = (n: number) =>
    `${currency}${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{dateStr}</div>
      <div className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">{fmt(p.close)}</div>
      <div className={`mt-0.5 font-mono text-[11px] tabular-nums ${up ? "text-bull" : "text-bear"}`}>
        {up ? "+" : ""}{pct.toFixed(2)} % seit Periodenstart
      </div>
      {p.volume > 0 && (
        <div className="mt-1 font-mono text-[10px] text-muted-foreground tabular-nums">
          Vol {formatCompact(p.volume)}
        </div>
      )}
    </div>
  );
}


/* prefetch hook (optional) */
export function useAssetChartPrefetch(_symbol: string) {
  // placeholder for future cross-route prefetch
  useEffect(() => {}, []);
}
