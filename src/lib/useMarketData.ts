import { useQuery } from "@tanstack/react-query";
import { fetchCandles, fetchQuote, getApiKey } from "./finnhub";
import { computeAll } from "./indicators";

export function useQuote(symbol: string, refetchMs = 0) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
    refetchInterval: refetchMs || false,
    refetchOnWindowFocus: false,
    enabled: !!symbol && !!getApiKey(),
    staleTime: 10 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useCandles(symbol: string) {
  return useQuery({
    queryKey: ["candles", symbol],
    queryFn: () => fetchCandles(symbol, "D", 260),
    enabled: !!symbol && !!getApiKey(),
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useAnalysis(symbol: string) {
  const candles = useCandles(symbol);
  const ready = !!candles.data;
  const indicators = ready ? computeAll(candles.data!.c) : null;
  return { candles, indicators };
}
