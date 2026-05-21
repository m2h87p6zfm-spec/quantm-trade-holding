import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchCandles, fetchQuote, MarketDataReconnectingError } from "./finnhub";
import { computeAll } from "./indicators";

// Bei Reconnect-Signalen niemals retrien — der Server liefert dann sowieso
// nur „reconnecting" zurück, bis Yahoo wieder antwortet. Andere Fehler bis
// zu 3× mit exponentiellem Backoff.
function retryPolicy(failureCount: number, error: unknown) {
  if (error instanceof MarketDataReconnectingError) return false;
  return failureCount < 3;
}
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000);

export function useQuote(symbol: string, refetchMs = 0) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
    refetchInterval: refetchMs || false,
    refetchOnWindowFocus: false,
    enabled: !!symbol,
    staleTime: 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: retryPolicy,
    retryDelay,
    // Charts/Karten dürfen während Refetch NIE leer werden.
    placeholderData: keepPreviousData,
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
    retry: retryPolicy,
    retryDelay,
    placeholderData: keepPreviousData,
  });
}

export function useAnalysis(symbol: string) {
  const candles = useCandles(symbol);
  const ready = !!candles.data;
  const indicators = ready ? computeAll(candles.data!.c) : null;
  return { candles, indicators };
}
