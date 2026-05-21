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
      refetchInterval: false,
      staleTime: 10 * 60 * 1000,
      gcTime: 2 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });
}

function SectorBlock({ sector }: { sector: string }) {
  const list = PRODUCTS.filter((p) => p.sector === sector);
  const preview = list.slice(0, 12);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{sector}</h3>
      <div className="mb-3 text-xs text-muted-foreground">{list.length} Vorlagen — Kursdaten werden erst in Analyse, Watchlist oder Detailansicht geladen.</div>
      <div className="grid grid-cols-3 gap-1.5">
        {preview.map((p) => (
          <Link key={p.symbol} to="/produkte/$symbol" params={{ symbol: p.symbol }} className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs font-mono hover:border-primary/50 hover:text-cyan-accent">
            {p.symbol}
          </Link>
        ))}
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
