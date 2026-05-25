import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { resolveChartColor } from "@/lib/chartColors";

function fillTimeScale(chart: IChartApi, width: number, points: number) {
  const safePoints = Math.max(points, 2);
  const barSpacing = Math.max(1, width / safePoints);
  chart.timeScale().applyOptions({
    rightOffset: 0,
    minBarSpacing: 0.5,
    barSpacing,
    fixLeftEdge: true,
    fixRightEdge: true,
    lockVisibleTimeRangeOnResize: true,
  });
  chart.timeScale().fitContent();
}

/**
 * Tiny dependency-free sparkline backed by lightweight-charts.
 * Library is dynamically imported on the client to keep SSR safe.
 */
export function MiniSpark({
  data,
  color,
  strokeWidth = 1.5,
  className = "h-8 w-24",
}: {
  data: number[];
  color: string;
  strokeWidth?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const dataRef = useRef<number[]>(data);
  const colorRef = useRef<string>(color);
  const strokeRef = useRef<number>(strokeWidth);

  // Keep refs current
  dataRef.current = data;
  colorRef.current = color;
  strokeRef.current = strokeWidth;

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    const el = ref.current;

    (async () => {
      const { createChart, LineSeries, ColorType } = await import("lightweight-charts");
      if (cancelled || !el.isConnected) return;
      const chart = createChart(el, {
        width: el.clientWidth || 100,
        height: el.clientHeight || 32,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "transparent",
          attributionLogo: false,
        },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        rightPriceScale: { visible: false, borderVisible: false },
        timeScale: { visible: false, borderVisible: false },
        crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
        handleScroll: false,
        handleScale: false,
      });
      chartRef.current = chart;
      const series = chart.addSeries(LineSeries, {
        color: resolveChartColor(el, colorRef.current),
        lineWidth: strokeRef.current as 1 | 2 | 3 | 4,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesRef.current = series;
      series.setData(
        dataRef.current.map((v, i) => ({
          time: (1_700_000_000 + i * 86_400) as UTCTimestamp,
          value: v,
        })),
      );
      fillTimeScale(chart, el.clientWidth || 100, dataRef.current.length);

      ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        if (cr) {
          chart.resize(Math.max(20, cr.width), Math.max(16, cr.height));
          fillTimeScale(chart, Math.max(20, cr.width), dataRef.current.length);
        }
      });
      ro.observe(el);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ref.current || !seriesRef.current) return;
    seriesRef.current.applyOptions({
      color: resolveChartColor(ref.current, color),
      lineWidth: strokeWidth as 1 | 2 | 3 | 4,
    });
  }, [color, strokeWidth]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(
      data.map((v, i) => ({
        time: (1_700_000_000 + i * 86_400) as UTCTimestamp,
        value: v,
      })),
    );
    fillTimeScale(chartRef.current, ref.current?.clientWidth || 100, data.length);
  }, [data]);

  return <div ref={ref} className={className} />;
}
