import { useQuery } from "@tanstack/react-query";
import { fetchCandles, fetchQuote, getApiKey } from "./finnhub";
import { computeAll } from "./indicators";
import { BENCHMARK } from "./products";

export function useQuote(symbol: string, refetchMs = 60000) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
    refetchInterval: refetchMs,
    refetchOnWindowFocus: false,
    enabled: !!symbol && !!getApiKey(),
    staleTime: 30 * 1000,
    retry: (n, e: any) => (e?.status === 429 ? n < 3 : false),
    retryDelay: (n) => 8000 * (n + 1),
  });
}

export function useCandles(symbol: string) {
  return useQuery({
    queryKey: ["candles", symbol],
    queryFn: () => fetchCandles(symbol, "D", 365),
    enabled: !!symbol && !!getApiKey(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (n, e: any) => (e?.status === 429 ? n < 3 : false),
    retryDelay: (n) => 8000 * (n + 1),
  });
}

export function useAnalysis(symbol: string) {
  const candles = useCandles(symbol);
  const bench = useCandles(symbol === BENCHMARK ? "QQQ" : BENCHMARK);
  const quote = useQuote(symbol);
  // Candles sind Pflicht. Bench (für Beta) ist optional — bei Rate-Limit weglassen.
  const ready = !!candles.data;
  const indicators = ready ? computeAll(candles.data!.c, bench.data?.c) : null;
  if (indicators && quote.data && quote.data.c > 0) indicators.price = quote.data.c;
  return { candles, bench, quote, indicators };
}
