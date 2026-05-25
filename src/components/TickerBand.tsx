import { useQuery } from "@tanstack/react-query";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { formatCurrencyFromUsd } from "@/lib/format";

// Live-Ticker-Band — SSE-Stream alle 3s + Batch-Quote als Fallback/Baseline.
const TICKER_SYMBOLS = [
  "SPY", "QQQ", "DIA", "IWM", "VTI",
  "EWG", "FEZ", "EWJ", "VEA",
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA",
];

type Item = { symbol: string; price: number; change: number; ok: boolean };

type BatchQuote = { c: number; pc: number; dp?: number };
type BatchResp = { quotes: Record<string, BatchQuote> };

export function TickerBand() {
  const { settings } = useSettings();
  // Live-Stream (Pro-Plan: 3-Sekunden-Ticks via SSE)
  const { quotes: live } = useLiveQuotes(TICKER_SYMBOLS);

  // Batch-Quote — EIN Twelve-Data-Call für alle 16 Symbole statt 16 einzelne
  // Candles-Calls. Spart ~94 % Credits gegenüber dem alten useQueries-Ansatz.
  const { data } = useQuery<BatchResp>({
    queryKey: ["ticker-band-batch", TICKER_SYMBOLS.join(",")],
    queryFn: async () => {
      const { authedFetch } = await import("@/lib/authed-fetch");
      const res = await authedFetch(`/api/public/quotes-batch?symbols=${TICKER_SYMBOLS.join(",")}`);
      if (!res.ok) throw new Error("batch failed");
      return res.json();
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    retry: 1,
  });

  const batchQuotes = data?.quotes ?? {};

  const items: Item[] = TICKER_SYMBOLS.map((symbol) => {
    const batch = batchQuotes[symbol];
    const liveQ = live[symbol];
    const price = liveQ?.c ?? batch?.c ?? 0;
    const baseline = liveQ?.pc || batch?.pc || 0;
    const change = baseline ? ((price - baseline) / baseline) * 100 : 0;
    return { symbol, price, change, ok: !!price };
  });

  const ready = items.filter((x) => x.ok);
  if (ready.length === 0) {
    return (
      <div className="relative overflow-hidden border-y border-border/60 bg-card/50 backdrop-blur-sm py-2.5">
        <div className="text-center text-[11px] uppercase tracking-widest text-muted-foreground shimmer-text">
          Live-Feed verbindet sich…
        </div>
      </div>
    );
  }

  const loop = [...ready, ...ready];

  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-gradient-to-r from-card/80 via-card/40 to-card/80 backdrop-blur-sm">
      <div className="absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      <div className="flex w-max animate-ticker py-2.5">
        {loop.map((it, i) => (
          <div key={i} className="flex items-center gap-2 px-5 border-r border-border/40">
            <span className="font-bold text-xs tracking-tight">{it.symbol}</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatCurrencyFromUsd(it.price, settings.currency)}</span>
            <span className={`flex items-center gap-0.5 font-mono text-xs tabular-nums font-semibold ${it.change >= 0 ? "text-bull" : "text-bear"}`}>
              {it.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {it.change >= 0 ? "+" : ""}{it.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
