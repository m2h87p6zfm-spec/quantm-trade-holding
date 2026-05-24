import { useQueries } from "@tanstack/react-query";
import { fetchCandles } from "@/lib/finnhub";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { TrendingUp, TrendingDown } from "lucide-react";

// Live-Ticker-Band — SSE-Stream alle 3s + Fallback auf Tageskerzen für %-Veränderung.
const TICKER_SYMBOLS = [
  "SPY", "QQQ", "DIA", "IWM", "VTI",
  "EWG", "FEZ", "EWJ", "VEA",
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA",
];

type Item = { symbol: string; price: number; change: number; ok: boolean };

export function TickerBand() {
  // Live-Stream (Pro-Plan: 3-Sekunden-Ticks via SSE)
  const { quotes: live } = useLiveQuotes(TICKER_SYMBOLS);

  // Tageskerzen als Fallback + Basis für Tagesveränderung (langer Cache)
  const results = useQueries({
    queries: TICKER_SYMBOLS.map((s) => ({
      queryKey: ["candles", s],
      queryFn: () => fetchCandles(s, "D", 30),
      staleTime: 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  const items: Item[] = TICKER_SYMBOLS.map((symbol, i) => {
    const closes = results[i].data?.c ?? [];
    const lastCandle = closes.at(-1) ?? 0;
    const prevCandle = closes.at(-2) ?? lastCandle;
    const liveQ = live[symbol];
    const price = liveQ?.c ?? lastCandle;
    // Wenn Live verfügbar: Live-Preis vs. gestriger Close, sonst Candle-vs-Candle
    const baseline = liveQ ? (liveQ.pc || prevCandle) : prevCandle;
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
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{it.price.toFixed(2)}</span>
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
