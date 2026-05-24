import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { fetchCandles } from "@/lib/finnhub";
import { PRODUCTS, type Product } from "@/lib/products";
import { Flame, TrendingUp, TrendingDown, Activity, Zap, LayoutGrid, Boxes } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/heatmap")({ component: HeatmapPage });

const HEATMAP_SYMBOLS = [
  "AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AMD","INTC","ORCL","CRM","NFLX",
  "JPM","BAC","GS","V","MA","XOM","CVX","JNJ","PFE","UNH","BA","CAT","KO","PG",
  "SAP","SIE.DE","DBK.DE","VOW3.DE","BMW.DE","BAYN.DE","ASML",
  "SPY","QQQ","DIA",
];

type Range = "D" | "W" | "M";
type Mode = "grid" | "sector";

type Cell = {
  p: Product;
  pct: number | null;
  price: number | null;
  vol: number | null; // last volume (size proxy)
  loading: boolean;
  error: boolean;
};

function intensity(pct: number) {
  const abs = Math.min(Math.abs(pct), 8);
  return 0.18 + (abs / 8) * 0.6;
}

function colorFor(pct: number | null) {
  if (pct == null) return { bg: "color-mix(in oklab, var(--muted) 50%, transparent)", fg: "var(--muted-foreground)" };
  if (pct === 0)  return { bg: "color-mix(in oklab, var(--neutral-signal) 30%, transparent)", fg: "var(--foreground)" };
  const a = intensity(pct);
  const c = pct > 0 ? "var(--bull)" : "var(--bear)";
  return { bg: `color-mix(in oklab, ${c} ${Math.round(a * 100)}%, transparent)`, fg: "white" };
}

function HeatCell({ cell, big }: { cell: Cell; big?: boolean }) {
  const { p, pct, price, loading, error } = cell;
  const { bg, fg } = colorFor(pct);
  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol: p.symbol }}
      className={`heat-cell flex flex-col justify-between rounded-lg border border-border/40 p-2.5 transition-transform hover:scale-[1.03] hover:z-10 hover:shadow-lg ${big ? "min-h-[120px]" : "aspect-square"}`}
      style={{ backgroundColor: bg, color: fg }}
      title={`${p.name} — ${pct != null ? pct.toFixed(2) + "%" : "—"}`}
    >
      <div className="flex items-start justify-between">
        <span className={`truncate font-mono font-bold drop-shadow ${big ? "text-sm" : "text-xs"}`}>{p.symbol}</span>
        {pct != null && pct !== 0 && (
          pct > 0
            ? <TrendingUp className="h-3 w-3 opacity-80" />
            : <TrendingDown className="h-3 w-3 opacity-80" />
        )}
      </div>
      <div className="flex flex-col">
        <span className={`font-mono font-bold leading-none drop-shadow ${big ? "text-xl" : "text-base"}`}>
          {loading ? "…" : error ? "—" : pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
        </span>
        {price != null && (
          <span className="mt-1 truncate text-[10px] font-mono opacity-80">${price.toFixed(2)}</span>
        )}
      </div>
    </Link>
  );
}

export function HeatmapPage({ embedded = false }: { embedded?: boolean } = {}) {
  const t = useT();
  const [range, setRange] = useState<Range>("D");
  const [mode, setMode] = useState<Mode>("sector");

  const products = useMemo(
    () => HEATMAP_SYMBOLS.map((s) => PRODUCTS.find((p) => p.symbol === s)).filter(Boolean) as Product[],
    [],
  );

  const days = range === "D" ? 7 : range === "W" ? 30 : 90;

  const queries = useQueries({
    queries: products.map((p) => ({
      queryKey: ["heatmap-candles", p.symbol, range],
      queryFn: () => fetchCandles(p.symbol, "D", days),
      staleTime: 60 * 60 * 1000,
      gcTime: 2 * 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const cells: Cell[] = products.map((p, i) => {
    const q = queries[i];
    const c = q.data?.c ?? [];
    const v = q.data?.v ?? [];
    let pct: number | null = null;
    let price: number | null = null;
    if (c.length >= 2) {
      const last = c[c.length - 1];
      const lookback = range === "D" ? 2 : range === "W" ? 6 : 22;
      const prev = c[Math.max(0, c.length - lookback)];
      pct = ((last - prev) / prev) * 100;
      price = last;
    }
    return { p, pct, price, vol: v.length ? v[v.length - 1] : null, loading: q.isLoading, error: q.isError };
  });

  const loaded = cells.filter((c) => c.pct != null);
  const rising = loaded.filter((c) => (c.pct ?? 0) > 0).length;
  const falling = loaded.filter((c) => (c.pct ?? 0) < 0).length;
  const avg = loaded.length ? loaded.reduce((s, c) => s + (c.pct ?? 0), 0) / loaded.length : 0;
  const topUp = [...loaded].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
  const topDown = [...loaded].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];

  const sectors = useMemo(() => {
    const map = new Map<string, Cell[]>();
    for (const c of cells) {
      const key = c.p.sector;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([sector, list]) => {
      const loaded = list.filter((x) => x.pct != null);
      const avgPct = loaded.length ? loaded.reduce((s, x) => s + (x.pct ?? 0), 0) / loaded.length : 0;
      return { sector, list: list.sort((a, b) => (b.pct ?? -99) - (a.pct ?? -99)), avgPct };
    }).sort((a, b) => b.avgPct - a.avgPct);
  }, [cells]);

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-7xl space-y-8 p-6"}>
      {!embedded && (
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Flame className="h-3 w-3 text-bear" /> Marktpuls
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          {t("page.heatmap.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("page.heatmap.subtitle")}
        </p>
      </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {(["D", "W", "M"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${range === r ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              {r === "D" ? "1 Tag" : r === "W" ? "1 Woche" : "1 Monat"}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button onClick={() => setMode("sector")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${mode === "sector" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Boxes className="h-3 w-3" /> Sektoren
          </button>
          <button onClick={() => setMode("grid")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${mode === "grid" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="h-3 w-3" /> Grid
          </button>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Steigend" value={rising.toString()} hint={`von ${loaded.length}`} icon={<TrendingUp className="h-4 w-4" />} tint="bull" />
        <StatCard label="Fallend"  value={falling.toString()} hint={`von ${loaded.length}`} icon={<TrendingDown className="h-4 w-4" />} tint="bear" />
        <StatCard label="Ø Bewegung" value={`${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%`} hint="Marktbreite" icon={<Activity className="h-4 w-4" />} tint={avg >= 0 ? "bull" : "bear"} />
        <StatCard
          label="Top Mover"
          value={topUp ? `${topUp.p.symbol}` : "—"}
          hint={topUp ? `+${(topUp.pct ?? 0).toFixed(2)}%` : ""}
          icon={<Zap className="h-4 w-4" />}
          tint="gold"
        />
      </div>

      {mode === "grid" ? (
        <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {cells.map((c) => <HeatCell key={c.p.symbol} cell={c} />)}
          </div>
          <Legend topDown={topDown} />
        </div>
      ) : (
        <div className="space-y-4">
          {sectors.map(({ sector, list, avgPct }) => (
            <div key={sector} className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur animate-fade-up">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: avgPct >= 0 ? "var(--bull)" : "var(--bear)", boxShadow: `0 0 12px color-mix(in oklab, ${avgPct >= 0 ? "var(--bull)" : "var(--bear)"} 60%, transparent)` }} />
                  <h2 className="text-sm font-semibold uppercase tracking-wider">{sector}</h2>
                  <span className="text-[11px] text-muted-foreground">{list.length} Werte</span>
                </div>
                <span className={`font-mono text-sm font-bold ${avgPct >= 0 ? "text-bull" : "text-bear"}`}>
                  {avgPct >= 0 ? "+" : ""}{avgPct.toFixed(2)}% Ø
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                {list.map((c, i) => <HeatCell key={c.p.symbol} cell={c} big={i === 0 && Math.abs(c.pct ?? 0) > 0.5} />)}
              </div>
            </div>
          ))}
          <Legend topDown={topDown} />
        </div>
      )}
    </div>
  );
}

function Legend({ topDown }: { topDown?: Cell }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Stärker fallend</span>
        <div className="flex h-3 w-40 rounded-full overflow-hidden ring-1 ring-border">
          <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bear) 70%, transparent)" }} />
          <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bear) 35%, transparent)" }} />
          <div className="flex-1" style={{ background: "color-mix(in oklab, var(--neutral-signal) 30%, transparent)" }} />
          <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bull) 35%, transparent)" }} />
          <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bull) 70%, transparent)" }} />
        </div>
        <span>Stärker steigend</span>
      </div>
      {topDown && (
        <div className="text-[11px] text-muted-foreground">
          Schwächstes Symbol: <span className="font-mono text-bear">{topDown.p.symbol} {(topDown.pct ?? 0).toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint, icon, tint }: { label: string; value: string; hint?: string; icon: React.ReactNode; tint: "bull" | "bear" | "gold" | "primary" }) {
  const tintMap: Record<string, string> = { bull: "text-bull", bear: "text-bear", gold: "text-gold", primary: "text-primary" };
  return (
    <div className="card-glow rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className={tintMap[tint]}>{icon}</span>
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold ${tintMap[tint]}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
