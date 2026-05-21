import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Swords, Plus, X } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { fetchCandles } from "@/lib/finnhub";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, setupScore } from "@/lib/analysis";
import { ProChart } from "@/components/ProChart";
import { SignalBadge } from "@/components/SignalBadge";
import { useSettings } from "@/lib/settings";
import { PRODUCTS, findProduct } from "@/lib/products";

export const Route = createFileRoute("/war-room")({
  component: WarRoom,
  head: () => ({
    meta: [
      { title: "War Room — Apex Trades" },
      { name: "description", content: "Mehrere Pro-Charts gleichzeitig: Smart-Zones, Sub-Indikatoren und Signal-Status auf einen Blick." },
    ],
  }),
});

function WarRoom() {
  const { settings, toggleWatch } = useSettings();
  const defaults = ["AAPL", "NVDA", "MSFT", "SPY"];
  const base = settings.watchlist.length >= 2 ? settings.watchlist.slice(0, 8) : defaults;
  const [symbols, setSymbols] = useState<string[]>(base);
  const [pick, setPick] = useState("");

  const queries = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["candles", s],
      queryFn: () => fetchCandles(s, "D", 260),
      staleTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  function add() {
    const sym = pick.trim().toUpperCase();
    if (!sym) return;
    if (symbols.includes(sym)) return;
    setSymbols((arr) => [...arr, sym].slice(0, 8));
    setPick("");
  }
  function drop(s: string) { setSymbols((arr) => arr.filter((x) => x !== s)); }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <Swords className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">War Room</h1>
            <p className="text-sm text-muted-foreground">Pro-Charts mit Smart-Zones, Volumen, RSI & MACD — gesynct, parallel, max 8.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            list="war-symbols"
            value={pick}
            onChange={(e) => setPick(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Symbol hinzufügen…"
            className="w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <datalist id="war-symbols">{PRODUCTS.map((p) => <option key={p.symbol} value={p.symbol}>{p.name}</option>)}</datalist>
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={symbols.length >= 8}>
            <Plus className="h-4 w-4" /> Hinzufügen
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {symbols.map((s, i) => (
          <WarTile
            key={s}
            symbol={s}
            query={queries[i]}
            onRemove={() => drop(s)}
            onWatch={() => toggleWatch(s)}
            watched={settings.watchlist.includes(s)}
          />
        ))}
        {symbols.length === 0 && (
          <div className="md:col-span-2 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Keine Symbole geladen. Füge oben Werte hinzu.
          </div>
        )}
      </div>
    </div>
  );
}

function WarTile({
  symbol, query, onRemove, onWatch, watched,
}: {
  symbol: string;
  query: { data?: any; isLoading: boolean };
  onRemove: () => void; onWatch: () => void; watched: boolean;
}) {
  const prod = findProduct(symbol);
  const data = query.data as { c: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[]; t: number[] } | undefined;

  const stat = useMemo(() => {
    if (!data?.c?.length) return null;
    const ind = computeAll(data.c);
    const sig = scoreIndicators(ind, "ausgewogen");
    const alpha = setupScore(ind);
    return { ind, sig, alpha };
  }, [data]);

  return (
    <div className="card-glow rounded-xl border border-border bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5">
        <div className="min-w-0 flex items-center gap-3">
          <Link to="/produkte/$symbol" params={{ symbol }} className="font-bold text-sm hover:text-primary">{symbol}</Link>
          <span className="truncate text-xs text-muted-foreground">{prod?.name ?? "Freier Ticker"}</span>
        </div>
        <div className="flex items-center gap-2">
          {stat && <SignalBadge verdict={stat.sig.verdict} confidence={stat.sig.confidence} />}
          <button onClick={onWatch} className="text-[11px] text-muted-foreground hover:text-foreground">
            {watched ? "★" : "☆"}
          </button>
          <button onClick={onRemove} className="text-muted-foreground hover:text-bear" aria-label="Entfernen">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-3">
        {query.isLoading && <div className="h-[260px] animate-pulse rounded-md bg-muted/30" />}
        {!query.isLoading && data?.c?.length ? (
          <ProChart
            data={data}
            height={300}
            overlays={["ema20", "ema50", "bbands"]}
            subcharts={["volume", "rsi"]}
            compact
            showZones
          />
        ) : !query.isLoading ? (
          <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">Keine Daten verfügbar.</div>
        ) : null}
        {stat && (
          <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
            <Mini k="Setup-Score" v={stat.alpha.toFixed(0)} tone={stat.alpha > 0 ? "up" : stat.alpha < 0 ? "down" : "n"} />
            <Mini k="RSI" v={stat.ind.rsi.toFixed(0)} tone={stat.ind.rsi > 70 ? "down" : stat.ind.rsi < 30 ? "up" : "n"} />
            <Mini k="Z-Score" v={stat.ind.zScore.toFixed(2)} tone={stat.ind.zScore > 1 ? "down" : stat.ind.zScore < -1 ? "up" : "n"} />
            <Mini k="Vola" v={(stat.ind.volatility * 100).toFixed(1) + "%"} tone="n" />
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ k, v, tone }: { k: string; v: string; tone: "up" | "down" | "n" }) {
  const c = tone === "up" ? "text-bull" : tone === "down" ? "text-bear" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={`font-mono text-sm font-semibold tabular-nums ${c}`}>{v}</div>
    </div>
  );
}
