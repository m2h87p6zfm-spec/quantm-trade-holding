import { useQuery } from "@tanstack/react-query";
import { fetchCandles, fetchQuote } from "./finnhub";
import { computeAll } from "./indicators";

export function useQuote(symbol: string, refetchMs = 0) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
    refetchInterval: refetchMs || false,
    refetchOnWindowFocus: false,
    enabled: !!symbol,
    staleTime: 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useCandles(symbol: string) {
  return useQuery({
    queryKey: ["candles", symbol],
    queryFn: () => fetchCandles(symbol, "D", 260),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useAnalysis(symbol: string) {
  const candles = useCandles(symbol);
  const ready = !!candles.data;
  const indicators = ready ? computeAll(candles.data!.c) : null;
  return { candles, indicators };
}

