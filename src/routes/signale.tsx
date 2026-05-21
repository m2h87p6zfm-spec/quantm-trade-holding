import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchCandles, fetchQuote, getApiKey } from "@/lib/finnhub";
import { PRODUCTS } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { SignalBadge } from "@/components/SignalBadge";

export const Route = createFileRoute("/signale")({ component: SignalsPage });

type SortKey = "confidence" | "zscore" | "rsi" | "volatility";

function SignalsPage() {
  const { settings } = useSettings();
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [side, setSide] = useState<"all" | "LONG" | "SHORT">("all");

  const candleQs = useQueries({
    queries: PRODUCTS.map((p) => ({
      queryKey: ["candles", p.symbol],
      queryFn: () => fetchCandles(p.symbol, "D", 365),
      enabled: !!getApiKey(),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const quoteQs = useQueries({
    queries: PRODUCTS.map((p) => ({
      queryKey: ["quote", p.symbol],
      queryFn: () => fetchQuote(p.symbol),
      enabled: !!getApiKey(),
      refetchInterval: 60000,
    })),
  });

  const rows = useMemo(() => {
    return PRODUCTS.map((p, i) => {
      const c = candleQs[i].data;
      const q = quoteQs[i].data;
      if (!c) return null;
      const ind = computeAll(c.c);
      if (q?.c) ind.price = q.c;
      const sig = scoreIndicators(ind, settings.risk);
      return { p, ind, sig, change: q?.dp ?? 0 };
    }).filter(Boolean) as { p: typeof PRODUCTS[number]; ind: ReturnType<typeof computeAll>; sig: ReturnType<typeof scoreIndicators>; change: number }[];
  }, [candleQs, quoteQs, settings.risk]);

  const filtered = rows
    .filter((r) => side === "all" || r.sig.verdict === side)
    .filter((r) => r.sig.confidence >= settings.minConfidence || side !== "all")
    .sort((a, b) => {
      switch (sortKey) {
        case "zscore": return Math.abs(b.ind.zScore) - Math.abs(a.ind.zScore);
        case "rsi": return Math.abs(b.ind.rsi - 50) - Math.abs(a.ind.rsi - 50);
        case "volatility": return b.ind.volatility - a.ind.volatility;
        default: return b.sig.confidence - a.sig.confidence;
      }
    });

  const loading = candleQs.some((q) => q.isLoading);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Trends & Signale</h1>
        <p className="text-sm text-muted-foreground">Automatisch generiert aus allen statistischen Indikatoren. Mindestkonfidenz ≥ {settings.minConfidence}%.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "LONG", "SHORT"] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${side === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-accent"}`}>
            {s === "all" ? "Alle" : s}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sortieren nach:</span>
          {(["confidence", "zscore", "rsi", "volatility"] as SortKey[]).map((k) => (
            <button key={k} onClick={() => setSortKey(k)} className={`rounded-md border px-2 py-1 ${sortKey === k ? "border-primary text-primary" : "border-border"}`}>
              {k === "confidence" ? "Konfidenz" : k === "zscore" ? "Z-Score" : k === "rsi" ? "RSI" : "Vola"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Symbol</div>
          <div className="col-span-1 text-right">Z</div>
          <div className="col-span-1 text-right">RSI</div>
          <div className="col-span-2 text-right">Vola</div>
          <div className="col-span-2 text-right">Tag Δ</div>
          <div className="col-span-3 text-right">Signal</div>
        </div>
        {loading && <div className="p-6 text-center text-sm text-muted-foreground">Berechne Signale für {PRODUCTS.length} Produkte…</div>}
        {!loading && filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Keine Signale erfüllen die Filter.</div>}
        {filtered.map(({ p, ind, sig, change }) => (
          <Link key={p.symbol} to="/produkte/$symbol" params={{ symbol: p.symbol }} className="grid grid-cols-12 gap-2 border-b border-border px-4 py-2.5 hover:bg-accent/40 text-sm">
            <div className="col-span-3"><span className="font-semibold">{p.symbol}</span> <span className="text-xs text-muted-foreground">{p.name}</span></div>
            <div className={`col-span-1 text-right font-mono tabular-nums ${Math.abs(ind.zScore) > 2 ? (ind.zScore > 0 ? "text-bear" : "text-bull") : ""}`}>{ind.zScore.toFixed(2)}</div>
            <div className={`col-span-1 text-right font-mono tabular-nums ${ind.rsi > 70 ? "text-bear" : ind.rsi < 30 ? "text-bull" : ""}`}>{ind.rsi.toFixed(0)}</div>
            <div className="col-span-2 text-right font-mono tabular-nums text-muted-foreground">{(ind.volatility * 100).toFixed(1)}%</div>
            <div className={`col-span-2 text-right font-mono tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</div>
            <div className="col-span-3 text-right"><SignalBadge verdict={sig.verdict} confidence={sig.confidence} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
