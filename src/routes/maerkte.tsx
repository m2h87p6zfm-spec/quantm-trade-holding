import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { fetchQuote, getApiKey } from "@/lib/finnhub";
import { INDICES, PRODUCTS, SECTORS } from "@/lib/products";

export const Route = createFileRoute("/maerkte")({ component: MaerkteePage });

function useQuotes(symbols: string[]) {
  return useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["quote", s],
      queryFn: () => fetchQuote(s),
      enabled: !!getApiKey(),
      refetchInterval: 30000,
    })),
  });
}

function SectorBlock({ sector }: { sector: string }) {
  const list = PRODUCTS.filter((p) => p.sector === sector);
  const symbols = list.map((p) => p.symbol);
  const qs = useQuotes(symbols);
  const enriched = list.map((p, i) => ({ p, q: qs[i].data })).filter((x) => x.q);
  const sorted = [...enriched].sort((a, b) => (b.q!.dp ?? 0) - (a.q!.dp ?? 0));
  const top = sorted.slice(0, 3);
  const flop = sorted.slice(-3).reverse();

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{sector}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-[10px] font-semibold text-bull">TOP 3</div>
          {top.length ? top.map((x) => (
            <Link key={x.p.symbol} to="/produkte/$symbol" params={{ symbol: x.p.symbol }} className="flex justify-between text-xs py-0.5 hover:text-cyan-accent">
              <span>{x.p.symbol}</span>
              <span className="font-mono text-bull">+{x.q!.dp.toFixed(2)}%</span>
            </Link>
          )) : <div className="text-xs text-muted-foreground">—</div>}
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold text-bear">FLOP 3</div>
          {flop.length ? flop.map((x) => (
            <Link key={x.p.symbol} to="/produkte/$symbol" params={{ symbol: x.p.symbol }} className="flex justify-between text-xs py-0.5 hover:text-cyan-accent">
              <span>{x.p.symbol}</span>
              <span className="font-mono text-bear">{x.q!.dp.toFixed(2)}%</span>
            </Link>
          )) : <div className="text-xs text-muted-foreground">—</div>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-0.5">
        {enriched.map((x) => {
          const dp = x.q!.dp;
          const intensity = Math.min(1, Math.abs(dp) / 4);
          const color = dp >= 0 ? `color-mix(in oklab, var(--bull) ${15 + intensity * 70}%, transparent)` : `color-mix(in oklab, var(--bear) ${15 + intensity * 70}%, transparent)`;
          return (
            <Link key={x.p.symbol} to="/produkte/$symbol" params={{ symbol: x.p.symbol }} title={`${x.p.symbol} ${dp.toFixed(2)}%`} className="aspect-square rounded-sm flex items-center justify-center text-[9px] font-mono" style={{ background: color }}>
              {x.p.symbol.slice(0, 4)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MaerkteePage() {
  const indexSyms = INDICES.map((i) => i.symbol);
  const idxQuotes = useQuotes(indexSyms);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Märkte & Sektoren</h1>
        <p className="text-sm text-muted-foreground">Globale Indizes und Sektor-Rotation in Echtzeit.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {INDICES.map((idx, i) => {
          const q = idxQuotes[i].data;
          const dp = q?.dp ?? 0;
          return (
            <Link key={idx.symbol} to="/produkte/$symbol" params={{ symbol: idx.symbol }} className="rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{idx.name}</div>
              <div className="mt-1 font-mono text-lg">{q ? q.c.toFixed(2) : "—"}</div>
              <div className={`text-xs font-mono ${dp >= 0 ? "text-bull" : "text-bear"}`}>{dp >= 0 ? "+" : ""}{dp.toFixed(2)}%</div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SECTORS.filter((s) => PRODUCTS.some((p) => p.sector === s)).map((s) => <SectorBlock key={s} sector={s} />)}
      </div>
    </div>
  );
}
