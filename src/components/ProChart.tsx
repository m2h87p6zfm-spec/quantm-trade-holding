import { useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  IPriceLine,
} from "lightweight-charts";
import { computeZones, type Zone } from "@/lib/zones";
import { ema, sma, bollinger as bb, rsi as rsiCalc } from "@/lib/indicators";
import { formatNumber, formatPercent, axisDecimals } from "@/lib/format";
import { chartCssVar } from "@/lib/chartColors";
import { attachTimeScaleContainment, configureContainedTimeScale, showFullDataRange } from "@/lib/chartTimeScale";
import { useLang } from "@/lib/i18n";

type CandlesIn = { c: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[]; t: number[] };
type Overlay = "ema20" | "ema50" | "sma200" | "bbands";
type Sub = "volume" | "rsi" | "macd";

export type ProChartProps = {
  data: CandlesIn;
  height?: number;
  overlays?: Overlay[];
  subcharts?: Sub[];
  showZones?: boolean;
  compact?: boolean;
};

type Hover = {
  o: number; h: number; l: number; c: number; t: number; v: number;
} | null;

export function ProChart({
  data,
  height = 360,
  overlays = ["ema20", "ema50", "bbands"],
  subcharts = ["volume", "rsi", "macd"],
  showZones = true,
  compact = false,
}: ProChartProps) {
  const lang = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const subRefs = useRef<Record<Sub, HTMLDivElement | null>>({ volume: null, rsi: null, macd: null });

  const closes = data.c;
  const opens = data.o ?? closes;
  const highs = data.h ?? closes;
  const lows = data.l ?? closes;
  const vols = data.v ?? closes.map(() => 0);
  const N = closes.length;

  const subH = compact ? 70 : 90;
  const mainH = Math.max(180, height - subcharts.length * subH);

  const last = closes[N - 1] ?? 0;
  const lastChange = N > 1 ? ((closes[N - 1] - closes[N - 2]) / closes[N - 2]) * 100 : 0;

  // Precompute indicators
  const ind = useMemo(() => ({
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    sma200: sma(closes, 200),
    bb: closes.map((_, i) => i < 19 ? null : bb(closes.slice(0, i + 1), 20, 2)),
  }), [closes]);

  const rsiArr = useMemo(() => {
    const r: number[] = [];
    for (let i = 0; i < N; i++) r.push(i < 14 ? NaN : rsiCalc(closes.slice(0, i + 1), 14));
    return r;
  }, [closes, N]);

  const macd = useMemo(() => {
    const e12 = ema(closes, 12); const e26 = ema(closes, 26);
    const line = closes.map((_, i) => e12[i] - e26[i]);
    const sig = ema(line, 9);
    const hist = line.map((v, i) => v - sig[i]);
    return { line, sig, hist };
  }, [closes]);

  const zones: Zone[] = useMemo(
    () => (showZones ? computeZones(highs, lows, closes) : []),
    [highs, lows, closes, showZones],
  );

  const [hover, setHover] = useState<Hover>(null);

  /* ---------------- charts setup ---------------- */
  const chartsRef = useRef<{ chart: IChartApi; key: string }[]>([]);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ohlcMapRef = useRef<Map<number, { o: number; h: number; l: number; c: number; v: number }>>(new Map());
  const zonePriceLinesRef = useRef<IPriceLine[]>([]);

  // Build / rebuild whenever structural inputs change. Library is dynamically
  // imported on the client to keep SSR safe.
  useEffect(() => {
    if (!mainRef.current) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    let createdSnapshot: { chart: IChartApi; key: string }[] = [];
    const timeScaleCleanups: Array<() => void> = [];
    const el = mainRef.current;

    (async () => {
      const lib = await import("lightweight-charts");
      if (cancelled || !el.isConnected) return;
      const {
        createChart, CandlestickSeries, LineSeries, HistogramSeries,
        ColorType, CrosshairMode, LineStyle,
      } = lib;

      const grid = chartCssVar(el, "--chart-grid", "rgba(255,255,255,0.06)");
      const axis = chartCssVar(el, "--chart-axis", "rgba(255,255,255,0.45)");
      const fg = chartCssVar(el, "--foreground", "#fff");
      const bull = chartCssVar(el, "--bull", "#22FF88");
      const bear = chartCssVar(el, "--bear", "#FF3B5C");
      const c1 = chartCssVar(el, "--chart-1", "#7AA2FF");
      const c2 = chartCssVar(el, "--chart-2", "#FFB347");
      const c3 = chartCssVar(el, "--chart-3", "#C29BFF");
      const c4 = chartCssVar(el, "--chart-4", "#5EE4D1");

      const baseLayout = {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: axis,
        fontFamily: "ui-monospace, monospace",
        attributionLogo: false,
      } as const;
      const baseGrid = {
        vertLines: { visible: false },
        horzLines: { color: grid, style: LineStyle.Dotted },
      };
      const baseCrosshair = {
        mode: CrosshairMode.Magnet,
        vertLine: { color: axis, width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: fg },
        horzLine: { color: axis, width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: fg },
      };

      const created: { chart: IChartApi; key: string }[] = [];

      // === Main ===
      const main = createChart(el, {
        width: el.clientWidth || 600, height: mainH,
        layout: baseLayout,
        grid: baseGrid,
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
        timeScale: { borderVisible: false, timeVisible: false, secondsVisible: false },
        crosshair: baseCrosshair,
      });
      configureContainedTimeScale(main);
      timeScaleCleanups.push(attachTimeScaleContainment(main, () => data.t.length));
      created.push({ chart: main, key: "main" });

      const candles = main.addSeries(CandlestickSeries, {
        upColor: bull, downColor: bear,
        borderUpColor: bull, borderDownColor: bear,
        wickUpColor: bull, wickDownColor: bear,
        priceLineColor: lastChange >= 0 ? bull : bear,
        priceLineStyle: LineStyle.Dotted,
      });
      candleSeriesRef.current = candles;

      const candleData = closes.map((c, i) => ({
        time: data.t[i] as UTCTimestamp,
        open: opens[i], high: highs[i], low: lows[i], close: c,
      }));
      candles.setData(candleData);

      ohlcMapRef.current = new Map(
        data.t.map((t, i) => [t, { o: opens[i], h: highs[i], l: lows[i], c: closes[i], v: vols[i] }]),
      );

      const addLine = (color: string, vals: number[], width: 1 | 2 = 1, dashed = false) => {
        const s = main.addSeries(LineSeries, {
          color, lineWidth: width,
          lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        s.setData(vals.map((v, i) => ({ time: data.t[i] as UTCTimestamp, value: v }))
          .filter((p) => Number.isFinite(p.value)));
      };

      if (overlays.includes("ema20")) addLine(c1, ind.ema20, 2);
      if (overlays.includes("ema50")) addLine(c2, ind.ema50, 1);
      if (overlays.includes("sma200")) addLine(c3, ind.sma200, 1, true);
      if (overlays.includes("bbands")) {
        const upArr = ind.bb.map((b) => b == null ? NaN : b.upper);
        const loArr = ind.bb.map((b) => b == null ? NaN : b.lower);
        addLine(c4, upArr, 1, true);
        addLine(c4, loArr, 1, true);
      }

      zonePriceLinesRef.current = [];
      for (const z of zones) {
        const mid = (z.high + z.low) / 2;
        const color = z.type === "support" ? bull : bear;
        const pl = candles.createPriceLine({
          price: mid, color, lineWidth: 1, lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `${z.type === "support" ? "S" : "R"} ${z.touches}×`,
        });
        zonePriceLinesRef.current.push(pl);
      }

      main.subscribeCrosshairMove((param) => {
        if (!param.time) { setHover(null); return; }
        const rec = ohlcMapRef.current.get(param.time as number);
        if (!rec) { setHover(null); return; }
        setHover({ o: rec.o, h: rec.h, l: rec.l, c: rec.c, v: rec.v, t: param.time as number });
      });

      // === Subcharts ===
      for (const sub of subcharts) {
        const target = subRefs.current[sub];
        if (!target) continue;
        const subChart = createChart(target, {
          width: target.clientWidth || 600, height: subH,
          layout: baseLayout,
          grid: baseGrid,
          rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.08 } },
          timeScale: { borderVisible: false, timeVisible: false, visible: sub === subcharts[subcharts.length - 1] },
          crosshair: baseCrosshair,
        });
        configureContainedTimeScale(subChart);
        timeScaleCleanups.push(attachTimeScaleContainment(subChart, () => data.t.length));
        created.push({ chart: subChart, key: sub });

        if (sub === "volume") {
          const v = subChart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceLineVisible: false });
          v.setData(vols.map((vv, i) => ({
            time: data.t[i] as UTCTimestamp,
            value: vv,
            color: closes[i] >= opens[i] ? bull : bear,
          })));
        } else if (sub === "rsi") {
          const r = subChart.addSeries(LineSeries, {
            color: c1, lineWidth: 2, priceLineVisible: false, lastValueVisible: false,
            priceFormat: { type: "price", precision: 0, minMove: 1 },
          });
          r.setData(rsiArr.map((v, i) => ({ time: data.t[i] as UTCTimestamp, value: v }))
            .filter((p) => Number.isFinite(p.value)));
          r.createPriceLine({ price: 70, color: bear, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "70" });
          r.createPriceLine({ price: 30, color: bull, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "30" });
          r.createPriceLine({ price: 50, color: axis, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "" });
        } else if (sub === "macd") {
          const hist = subChart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
          hist.setData(macd.hist.map((v, i) => ({
            time: data.t[i] as UTCTimestamp,
            value: v,
            color: v >= 0 ? bull : bear,
          })));
          const macdLine = subChart.addSeries(LineSeries, { color: c1, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          macdLine.setData(macd.line.map((v, i) => ({ time: data.t[i] as UTCTimestamp, value: v })));
          const sigLine = subChart.addSeries(LineSeries, { color: c2, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sigLine.setData(macd.sig.map((v, i) => ({ time: data.t[i] as UTCTimestamp, value: v })));
        }
      }

      chartsRef.current = created;
      createdSnapshot = created;

      // Sync time scales across all panes
      const syncing = { v: false };
      const charts = created.map((c) => c.chart);
      charts.forEach((src) => {
        src.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (!range || syncing.v) return;
          syncing.v = true;
          charts.forEach((tgt) => { if (tgt !== src) tgt.timeScale().setVisibleLogicalRange(range); });
          syncing.v = false;
        });
      });

      created.forEach(({ chart }) => showFullDataRange(chart, data.t.length));

      ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        if (!cr) return;
        const w = Math.max(120, cr.width);
        main.resize(w, mainH);
        for (const sub of subcharts) {
          const target = subRefs.current[sub];
          const c = created.find((x) => x.key === sub);
          if (target && c) c.chart.resize(w, subH);
        }
      });
      if (wrapRef.current) ro.observe(wrapRef.current);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      timeScaleCleanups.forEach((cleanup) => cleanup());
      createdSnapshot.forEach((c) => { try { c.chart.remove(); } catch { /* noop */ } });
      chartsRef.current = [];
      candleSeriesRef.current = null;
      zonePriceLinesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, overlays.join(","), subcharts.join(","), showZones, mainH, subH]);


  /* ---------------- render ---------------- */
  return (
    <div ref={wrapRef} className="w-full select-none">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2 pb-2 text-xs">
        <div className="flex items-baseline gap-3">
          <div className="font-mono text-2xl font-bold tabular-nums">{formatNumber(last, axisDecimals(last))}</div>
          <div className={`font-mono tabular-nums ${lastChange >= 0 ? "text-bull" : "text-bear"}`}>
            {formatPercent(lastChange)}
          </div>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {hover ? (
            <>
              <span>O <b className="text-foreground">{formatNumber(hover.o, axisDecimals(hover.o))}</b></span>
              <span className="ml-2">H <b className="text-foreground">{formatNumber(hover.h, axisDecimals(hover.h))}</b></span>
              <span className="ml-2">L <b className="text-foreground">{formatNumber(hover.l, axisDecimals(hover.l))}</b></span>
              <span className="ml-2">C <b className="text-foreground">{formatNumber(hover.c, axisDecimals(hover.c))}</b></span>
              <span className="ml-3 opacity-60">{new Date(hover.t * 1000).toLocaleDateString(lang === "en" ? "en-US" : "de-DE")}</span>
            </>
          ) : (
            <span className="opacity-60">{lang === "en" ? "Move the cursor over the chart for OHLC." : "Bewege den Cursor über den Chart für OHLC."}</span>
          )}
        </div>
      </div>

      {/* Main pane */}
      <div ref={mainRef} style={{ height: mainH }} className="w-full" />

      {/* Subcharts */}
      {subcharts.map((sub) => (
        <div key={sub} className="mt-1">
          <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {sub === "volume" ? (lang === "en" ? "Volume" : "Volumen") : sub === "rsi" ? "RSI (14)" : "MACD (12/26/9)"}
          </div>
          <div
            ref={(el) => { subRefs.current[sub] = el; }}
            style={{ height: subH }}
            className="w-full"
          />
        </div>
      ))}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        {overlays.includes("ema20") && (
          <Legend swatch="var(--chart-1)" label="EMA 20" info={lang === "en" ? "Exponential moving average of the last 20 periods. Faster than the SMA — short-term trend indicator. Price above it = short-term bullish." : "Exponentieller gleitender Durchschnitt der letzten 20 Perioden. Reagiert schneller als die SMA — kurzfristiger Trend-Indikator. Kurs darüber = kurzfristig bullish."} />
        )}
        {overlays.includes("ema50") && (
          <Legend swatch="var(--chart-2)" label="EMA 50" info={lang === "en" ? "Medium-term trend filter. Institutions often use it as a dynamic support/resistance line." : "Mittelfristiger Trend-Filter. Institutionelle nutzen ihn als dynamische Support-/Resistance-Linie."} />
        )}
        {overlays.includes("sma200") && (
          <Legend swatch="var(--chart-3)" label="SMA 200" info={lang === "en" ? "Key long-term trend marker. Price above SMA 200 = bullish market bias, below = bearish bias." : "Wichtigster Langfrist-Trendmarker. Kurs über SMA 200 = Bullenmarkt-Bias, darunter = Bärenmarkt-Bias."} />
        )}
        {overlays.includes("bbands") && (
          <Legend swatch="var(--chart-4)" label="Bollinger 20·2σ" info={lang === "en" ? "Bands around the 20-period SMA, ±2σ. Narrow = calm, often before a breakout; wide = high volatility." : "Bänder rund um die 20-Perioden-SMA, ±2 σ. Eng = ruhig (oft vor Ausbruch), weit = hohe Volatilität."} />
        )}
        {showZones && zones.length > 0 && (
          <Legend swatch="var(--bull)" label={`${zones.length} Smart-Zones`} info={lang === "en" ? "Algorithmically detected support/resistance zones from price reactions and volume clusters." : "Algorithmisch erkannte Support-/Resistance-Zonen aus Kursreaktionen und Volumen-Clustern."} />
        )}
      </div>
    </div>
  );
}

function Legend({ swatch, label, info }: { swatch: string; label: string; info?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-[2px] w-3 rounded-sm" style={{ background: swatch }} />
      {label}
      {info && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Erklärung zu ${label}`}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Info className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-72 text-xs leading-relaxed">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-[3px] w-4 rounded-sm" style={{ background: swatch }} />
              <span className="font-semibold text-foreground">{label}</span>
            </div>
            <p className="text-muted-foreground">{info}</p>
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}
