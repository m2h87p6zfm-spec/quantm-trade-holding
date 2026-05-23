import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";
import { MarketDataReconnectingError } from "@/lib/finnhub";
import { formatPrice, formatPercent, formatSignedAbs, formatCompact, pctChange, absChange, axisDecimals } from "@/lib/format";
import { chartCssVar, resolveChartColor } from "@/lib/chartColors";

/**
 * Premium interactive chart with timeframe switcher.
 * Backed by /api/public/candles (Yahoo proxy, cached).
 * Powered by lightweight-charts.
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
  currency?: string;
  height?: number;
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
    return c.map((close, i) => ({ time: t[i] as number, close, volume: v[i] ?? 0 }));
  }, [q.data]);

  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? 0;
  const changeAbs = absChange(first, last);
  const changePct = pctChange(first, last);
  const up = changeAbs >= 0;

  const perfLabel = {
    "1D": "heute", "1W": "letzte Woche", "1M": "letzten Monat", "3M": "letzte 3 Monate",
    "YTD": "seit Jahresanfang", "1Y": "letztes Jahr", "5Y": "letzte 5 Jahre", "MAX": "gesamter Verlauf",
  }[tf];

  /* ------------ lightweight-charts setup (dynamic import; client-only) ------------ */
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const baseLineRef = useRef<ReturnType<NonNullable<typeof seriesRef.current>["createPriceLine"]> | null>(null);
  const volMapRef = useRef<Map<number, number>>(new Map());
  const libRef = useRef<typeof import("lightweight-charts") | null>(null);

  // Keep latest values reachable from async setup
  const upRef = useRef(up);
  const lastRef = useRef(last);
  const tfRef = useRef(tf);
  const dataRef = useRef(data);
  const firstRef = useRef(first);
  upRef.current = up;
  lastRef.current = last;
  tfRef.current = tf;
  dataRef.current = data;
  firstRef.current = first;

  const [hover, setHover] = useState<{ time: number; close: number; volume: number } | null>(null);
  const [ready, setReady] = useState(false);

  // Mount: dynamic-import the lib and build the chart
  useEffect(() => {
    if (!wrapRef.current) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    const el = wrapRef.current;

    (async () => {
      const lib = await import("lightweight-charts");
      if (cancelled || !el.isConnected) return;
      libRef.current = lib;
      const { createChart, ColorType, CrosshairMode, LineStyle } = lib;
      const grid = chartCssVar(el, "--chart-grid", "rgba(255,255,255,0.06)");
      const axis = chartCssVar(el, "--chart-axis", "rgba(255,255,255,0.45)");
      const fg = chartCssVar(el, "--foreground", "#fff");

      const chart = createChart(el, {
        width: el.clientWidth || 600,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: axis,
          fontFamily: "ui-monospace, monospace",
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: grid, style: LineStyle.Dotted },
        },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.05 } },
        timeScale: { borderVisible: false, timeVisible: tfRef.current === "1D", secondsVisible: false },
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: { color: axis, width: 1, style: LineStyle.Dashed, labelBackgroundColor: fg },
          horzLine: { color: axis, width: 1, style: LineStyle.Dashed, labelBackgroundColor: fg },
        },
        handleScale: { axisPressedMouseMove: false },
      });
      chartRef.current = chart;

      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !seriesRef.current) { setHover(null); return; }
        const d = param.seriesData.get(seriesRef.current) as { value: number } | undefined;
        if (!d) { setHover(null); return; }
        const t = param.time as number;
        setHover({ time: t, close: d.value, volume: volMapRef.current.get(t) ?? 0 });
      });

      ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        if (cr) chart.resize(Math.max(120, cr.width), height);
      });
      ro.observe(el);

      setReady(true);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      baseLineRef.current = null;
      setReady(false);
    };
  }, [height]);

  // (Re)create area series when direction flips
  useEffect(() => {
    if (!ready || !chartRef.current || !wrapRef.current || !libRef.current) return;
    const { AreaSeries, LineStyle } = libRef.current;
    const el = wrapRef.current;
    const bull = chartCssVar(el, "--bull", "#22FF88");
    const bear = chartCssVar(el, "--bear", "#FF3B5C");
    const lineColor = up ? bull : bear;

    if (seriesRef.current) {
      try { chartRef.current.removeSeries(seriesRef.current); } catch { /* noop */ }
      seriesRef.current = null;
      baseLineRef.current = null;
    }
    const series = chartRef.current.addSeries(AreaSeries, {
      lineColor,
      lineWidth: 2,
      topColor: resolveChartColor(el, `color-mix(in oklab, ${lineColor} 35%, transparent)`, "rgba(34,255,136,0.35)"),
      bottomColor: "rgba(0, 0, 0, 0)",
      priceLineColor: lineColor,
      priceLineStyle: LineStyle.Dotted,
      priceLineWidth: 1,
      crosshairMarkerBorderColor: chartCssVar(el, "--background", "#000"),
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerRadius: 4,
      priceFormat: { type: "price", precision: axisDecimals(last), minMove: 1 / Math.pow(10, axisDecimals(last)) },
    });
    seriesRef.current = series;
  }, [ready, up, last]);

  // Update data
  useEffect(() => {
    if (!ready || !seriesRef.current || !chartRef.current || !libRef.current) return;
    if (data.length === 0) return;
    const { LineStyle } = libRef.current;
    const points = data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.close,
    }));
    volMapRef.current = new Map(data.map((d) => [d.time, d.volume]));
    seriesRef.current.setData(points);

    if (baseLineRef.current) {
      try { seriesRef.current.removePriceLine(baseLineRef.current); } catch { /* noop */ }
      baseLineRef.current = null;
    }
    if (first > 0 && wrapRef.current) {
      const axis = chartCssVar(wrapRef.current, "--chart-axis", "rgba(255,255,255,0.45)");
      baseLineRef.current = seriesRef.current.createPriceLine({
        price: first,
        color: axis,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });
    }
    chartRef.current.timeScale().fitContent();
  }, [ready, data, first]);

  // Time-axis format on timeframe change
  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: { timeVisible: tf === "1D", secondsVisible: false },
    });
  }, [tf]);


  /* ------------ render ------------ */
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
        <div>
          <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
            {formatPrice(last, currency)}
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
          <div className="absolute inset-0 animate-pulse rounded-md bg-gradient-to-b from-card/40 to-card/10" />
        )}
        <div ref={wrapRef} className="h-full w-full" />

        {/* Hover overlay */}
        {hover && (
          <div className="pointer-events-none absolute left-3 top-3 min-w-[180px] rounded-md border border-border/70 bg-[color:var(--chart-tooltip)] px-3 py-2.5 text-xs shadow-2xl backdrop-blur-md">
            <HoverTooltip hover={hover} base={first} currency={currency} tf={tf} />
          </div>
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
                ? "bg-primary/15 text-foreground ring-1 ring-primary/40 shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
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
function HoverTooltip({
  hover, base, currency, tf,
}: {
  hover: { time: number; close: number; volume: number };
  base: number;
  currency: string;
  tf: Timeframe;
}) {
  const pct = pctChange(base, hover.close);
  const abs = absChange(base, hover.close);
  const up = pct >= 0;
  const d = new Date(hover.time * 1000);
  const dateStr =
    tf === "1D" || tf === "1W" || tf === "1M"
      ? d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{dateStr}</div>
      <div className="mt-1.5 font-mono text-base font-semibold tabular-nums text-foreground">
        {formatPrice(hover.close, currency)}
      </div>
      <div className={`mt-0.5 flex items-center gap-1.5 font-mono text-[11px] tabular-nums ${up ? "text-bull" : "text-bear"}`}>
        <span>{formatSignedAbs(abs, axisDecimals(hover.close))}</span>
        <span>·</span>
        <span>{formatPercent(pct)}</span>
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">seit Periodenstart</div>
      {hover.volume > 0 && (
        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          <span className="uppercase tracking-wider">Vol</span>
          <span className="text-foreground/80">{formatCompact(hover.volume, 2)}</span>
        </div>
      )}
    </>
  );
}

/* prefetch hook (optional) */
export function useAssetChartPrefetch(_symbol: string) {
  useEffect(() => {}, []);
}
