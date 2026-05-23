import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

function resolveColor(el: HTMLElement, color: string): string {
  const m = color.match(/^var\((--[^)]+)\)$/);
  if (!m) return color;
  const v = getComputedStyle(el).getPropertyValue(m[1]).trim();
  return v || color;
}

/**
 * Tiny dependency-free sparkline backed by lightweight-charts.
 * Autosizes to its container. Pass any className for sizing.
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

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: ref.current.clientHeight,
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
    seriesRef.current = chart.addSeries(LineSeries, {
      color: resolveColor(ref.current, color),
      lineWidth: strokeWidth as 1 | 2 | 3 | 4,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) chart.resize(Math.max(20, cr.width), Math.max(16, cr.height));
    });
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update color when prop changes
  useEffect(() => {
    if (!ref.current || !seriesRef.current) return;
    seriesRef.current.applyOptions({
      color: resolveColor(ref.current, color),
      lineWidth: strokeWidth as 1 | 2 | 3 | 4,
    });
  }, [color, strokeWidth]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const points = data.map((v, i) => ({
      time: (1_700_000_000 + i * 86_400) as UTCTimestamp,
      value: v,
    }));
    seriesRef.current.setData(points);
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return <div ref={ref} className={className} />;
}
