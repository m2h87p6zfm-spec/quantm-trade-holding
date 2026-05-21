import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Star, StarOff } from "lucide-react";
import { PRODUCTS, SECTORS, searchProducts } from "@/lib/products";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/produkte/")({ component: KatalogPage });

function KatalogPage() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>("Alle");
  const { settings, toggleWatch } = useSettings();

  let list = searchProducts(q);
  if (sector !== "Alle") list = list.filter((p) => p.sector === sector);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Produktkatalog</h1>
        <p className="text-sm text-muted-foreground">{PRODUCTS.length} handelbare Produkte. Aktien & Indizes.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche Ticker oder Name…" className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option>Alle</option>
          {SECTORS.map((s) => <option key={s}>{s}</option>)}
          <option>Index</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const watched = settings.watchlist.includes(p.symbol);
          return (
            <div key={p.symbol} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition">
              <Link to="/produkte/$symbol" params={{ symbol: p.symbol }} className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.symbol}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{p.sector}</span>
                </div>
                <div className="text-xs text-muted-foreground">{p.name}</div>
              </Link>
              <button onClick={() => toggleWatch(p.symbol)} className={`rounded p-1.5 ${watched ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} aria-label="Watchlist">
                {watched ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
