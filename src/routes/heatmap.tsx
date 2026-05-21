import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { fetchCandles } from "@/lib/finnhub";
import { PRODUCTS, type Product } from "@/lib/products";
import { Flame, TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/heatmap")({ component: HeatmapPage });

// Kuratierte Top-Symbole für die Heatmap. Bewusst klein gehalten, damit der
// Yahoo-Proxy nicht in ein Rate-Limit (HTTP 429) läuft, wenn mehrere Nutzer
// gleichzeitig die Seite öffnen.
const HEATMAP_SYMBOLS = [
  "AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AMD",
  "JPM","V","XOM","LLY","UNH","KO","WMT","DIS",
  "SPY","QQQ","DIA","SAP",
];

type Cell = { p: Product; pct: number | null; price: number | null; loading: boolean; error: boolean };

function intensity(pct: number) {
  const abs = Math.min(Math.abs(pct), 5);
  return 0.18 + (abs / 5) * 0.55; // 0.18 - 0.73
}

function colorFor(pct: number | null) {
  if (pct == null) return { bg: "color-mix(in oklab, var(--muted) 50%, transparent)", fg: "var(--muted-foreground)" };
  if (pct === 0)  return { bg: "color-mix(in oklab, var(--neutral-signal) 30%, transparent)", fg: "var(--foreground)" };
  const a = intensity(pct);
  const c = pct > 0 ? "var(--bull)" : "var(--bear)";
  return { bg: `color-mix(in oklab, ${c} ${Math.round(a * 100)}%, transparent)`, fg: "white" };
}

function HeatCell({ cell }: { cell: Cell }) {
  const { p, pct, price, loading, error } = cell;
  const { bg, fg } = colorFor(pct);
  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol: p.symbol }}
      className="heat-cell flex aspect-square flex-col justify-between rounded-lg border border-border/40 p-2.5"
      style={{ backgroundColor: bg, color: fg }}
      title={`${p.name} — ${pct != null ? pct.toFixed(2) + "%" : "—"}`}
    >
      <div className="flex items-start justify-between">
        <span className="truncate font-mono text-xs font-bold drop-shadow">{p.symbol}</span>
        {pct != null && pct !== 0 && (
          pct > 0
            ? <TrendingUp className="h-3 w-3 opacity-80" />
            : <TrendingDown className="h-3 w-3 opacity-80" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-base font-bold leading-none drop-shadow">
          {loading ? "…" : error ? "—" : pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
        </span>
        {price != null && (
          <span className="mt-1 truncate text-[10px] font-mono opacity-80">${price.toFixed(2)}</span>
        )}
      </div>
    </Link>
  );
}

function HeatmapPage() {
  const [range, setRange] = useState<"D" | "W">("D");

  const symbols = HEATMAP_SYMBOLS;
  const products = useMemo(
    () => symbols.map((s) => PRODUCTS.find((p) => p.symbol === s)).filter(Boolean) as Product[],
    [symbols],
  );

  const queries = useQueries({
    queries: products.map((p) => ({
      queryKey: ["heatmap-candles", p.symbol, range],
      queryFn: () => fetchCandles(p.symbol, "D", range === "D" ? 7 : 30),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const cells: Cell[] = products.map((p, i) => {
    const q = queries[i];
    const c = q.data?.c ?? [];
    let pct: number | null = null;
    let price: number | null = null;
    if (c.length >= 2) {
      const last = c[c.length - 1];
      const prev = range === "D" ? c[c.length - 2] : c[Math.max(0, c.length - 6)];
      pct = ((last - prev) / prev) * 100;
      price = last;
    }
    return { p, pct, price, loading: q.isLoading, error: q.isError };
  });

  const loaded = cells.filter((c) => c.pct != null);
  const rising = loaded.filter((c) => (c.pct ?? 0) > 0).length;
  const falling = loaded.filter((c) => (c.pct ?? 0) < 0).length;
  const avg = loaded.length ? loaded.reduce((s, c) => s + (c.pct ?? 0), 0) / loaded.length : 0;
  const topUp = [...loaded].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
  const topDown = [...loaded].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Hero */}
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Flame className="h-3 w-3 text-bear" /> Marktpuls
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Live <span className="text-gradient-bull">Heatmap</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Visuelle Momentaufnahme von {products.length} Top-Symbolen. Grün = Käufer dominieren,
          rot = Verkäufer drücken. Intensität zeigt die Stärke der Bewegung.
        </p>

        <div className="mt-4 inline-flex rounded-lg border border-border bg-card p-1">
          {(["D", "W"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                range === r ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "D" ? "1 Tag" : "1 Woche"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
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

      {/* Heatmap grid */}
      <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {cells.map((c) => <HeatCell key={c.p.symbol} cell={c} />)}
        </div>

        {/* Legende */}
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
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, icon, tint }: { label: string; value: string; hint?: string; icon: React.ReactNode; tint: "bull" | "bear" | "gold" | "primary" }) {
  const tintMap: Record<string, string> = {
    bull: "text-bull", bear: "text-bear", gold: "text-gold", primary: "text-primary",
  };
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
