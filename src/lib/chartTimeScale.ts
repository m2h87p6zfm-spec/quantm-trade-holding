import type { IChartApi } from "lightweight-charts";

type LogicalRangeLike = { from: number; to: number };

function getDataLogicalRange(points: number): LogicalRangeLike | null {
  if (points <= 0) return null;
  return { from: -0.5, to: Math.max(0.5, points - 0.5) };
}

export function configureContainedTimeScale(chart: IChartApi) {
  chart.timeScale().applyOptions({
    rightOffset: 0,
    fixLeftEdge: true,
    fixRightEdge: true,
    lockVisibleTimeRangeOnResize: true,
  });
}

export function showFullDataRange(chart: IChartApi, points: number) {
  const range = getDataLogicalRange(points);
  if (!range) return;
  chart.timeScale().setVisibleLogicalRange(range);
}

export function attachTimeScaleContainment(chart: IChartApi, getPointCount: () => number) {
  let syncing = false;

  const clampRange = (range: LogicalRangeLike | null) => {
    if (!range || syncing) return;

    const bounds = getDataLogicalRange(getPointCount());
    if (!bounds) return;

    const maxSpan = bounds.to - bounds.from;
    const span = range.to - range.from;
    let nextFrom = range.from;
    let nextTo = range.to;

    if (span >= maxSpan) {
      nextFrom = bounds.from;
      nextTo = bounds.to;
    } else {
      if (nextFrom < bounds.from) {
        nextTo += bounds.from - nextFrom;
        nextFrom = bounds.from;
      }
      if (nextTo > bounds.to) {
        nextFrom -= nextTo - bounds.to;
        nextTo = bounds.to;
      }
      if (nextFrom < bounds.from) nextFrom = bounds.from;
      if (nextTo > bounds.to) nextTo = bounds.to;
    }

    const changed = Math.abs(nextFrom - range.from) > 0.001 || Math.abs(nextTo - range.to) > 0.001;
    if (!changed) return;

    syncing = true;
    chart.timeScale().setVisibleLogicalRange({ from: nextFrom, to: nextTo });
    syncing = false;
  };

  chart.timeScale().subscribeVisibleLogicalRangeChange(clampRange);
  return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(clampRange);
}