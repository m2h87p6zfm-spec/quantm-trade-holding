import { useQuery } from "@tanstack/react-query";
import { fetchCandles, fetchQuote, getApiKey } from "./finnhub";
import { computeAll } from "./indicators";
import { BENCHMARK } from "./products";

export function useQuote(symbol: string, refetchMs = 15000) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
    refetchInterval: refetchMs,
    enabled: !!symbol && !!getApiKey(),
    retry: 1,
  });
}

export function useCandles(symbol: string) {
  return useQuery({
    queryKey: ["candles", symbol],
    queryFn: () => fetchCandles(symbol, "D", 365),
    enabled: !!symbol && !!getApiKey(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useAnalysis(symbol: string) {
  const candles = useCandles(symbol);
  const bench = useCandles(symbol === BENCHMARK ? "QQQ" : BENCHMARK);
  const quote = useQuote(symbol);
  const ready = candles.data && bench.data && quote.data;
  const indicators = ready ? computeAll(candles.data!.c, bench.data!.c) : null;
  // Live-Preis aus quote überschreiben falls vorhanden
  if (indicators && quote.data && quote.data.c > 0) indicators.price = quote.data.c;
  return { candles, bench, quote, indicators };
}
