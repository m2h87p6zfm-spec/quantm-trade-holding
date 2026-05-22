import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchCandles } from "./finnhub";
import { computeAll } from "./indicators";
import { scoreIndicators, setupScore } from "./analysis";

export type CockpitRow = {
  symbol: string;
  closes: number[];
  last: number;
  prev: number;
  change: number;
  volume?: number;
  high52?: number;
  low52?: number;
  ind: ReturnType<typeof computeAll>;
  sig: ReturnType<typeof scoreIndicators>;
  alpha: number;
};

export function useCockpitData(symbols: string[]): CockpitRow[] {
  const results = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["candles", s],
      queryFn: () => fetchCandles(s, "D", 260),
      staleTime: 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const rows: CockpitRow[] = [];
    for (let i = 0; i < symbols.length; i++) {
      const data = results[i].data;
      if (!data || !data.c || !data.c.length) continue;
      const closes = data.c;
      const last = closes[closes.length - 1];
      const prev = closes[closes.length - 2] ?? last;
      const change = prev ? ((last - prev) / prev) * 100 : 0;
      const ind = computeAll(closes);
      const sig = scoreIndicators(ind, "ausgewogen");
      const alpha = setupScore(ind);
      // Volume = last bar, 52w high/low from the rolling window
      const vols = (data.v || []).filter((x: any) => Number.isFinite(x));
      const volume = vols.length ? vols[vols.length - 1] : undefined;
      const highs = (data.h || []).filter((x: any) => Number.isFinite(x));
      const lows = (data.l || []).filter((x: any) => Number.isFinite(x));
      const high52 = highs.length ? Math.max(...highs.slice(-252)) : undefined;
      const low52 = lows.length ? Math.min(...lows.slice(-252)) : undefined;
      rows.push({ symbol: symbols[i], closes, last, prev, change, volume, high52, low52, ind, sig, alpha });
    }
    return rows;
  }, [results.map((r) => r.dataUpdatedAt).join(","), symbols.join(",")]);
}
