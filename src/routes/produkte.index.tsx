import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Star, StarOff } from "lucide-react";
import { PRODUCTS, SECTORS, searchProducts } from "@/lib/products";
import { useSettings } from "@/lib/settings";
import { useWatchlistLimit } from "@/lib/featureGate";

export const Route = createFileRoute("/produkte/")({ component: KatalogPage });

type AssetKind = "all" | "stocks" | "etfs";

function KatalogPage() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>("Alle");
  const [kind, setKind] = useState<AssetKind>("all");
  const { settings } = useSettings();
  const { guardedAdd } = useWatchlistLimit();
  const customSymbol = q.trim().toUpperCase().replace(/\s+/g, "");
  const exactMatch = listHasExactSymbol(searchProducts(q), customSymbol);

  let list = searchProducts(q);
  if (kind === "stocks") list = list.filter((p) => p.sector !== "Index");
  else if (kind === "etfs") list = list.filter((p) => p.sector === "Index");
  if (sector !== "Alle") list = list.filter((p) => p.sector === sector);

  const kindOptions: { v: AssetKind; label: string }[] = [
    { v: "all", label: "Alle" },
    { v: "stocks", label: "Aktien" },
    { v: "etfs", label: "ETFs" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Produktkatalog</h1>
          <p className="text-sm text-muted-foreground">{PRODUCTS.length}+ Vorlagen. Zusätzlich kannst du jeden vom Datenfeed unterstützten Ticker direkt eingeben.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Finanzart">
        {kindOptions.map((k) => {
          const active = kind === k.v;
          return (
            <button
              key={k.v}
              role="tab"
              aria-selected={active}
              onClick={() => setKind(k.v)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {k.label}
            </button>
          );
        })}
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

      {customSymbol.length >= 1 && !exactMatch && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
          <div>
            <div className="font-semibold">Freien Ticker verwenden: {customSymbol}</div>
            <div className="text-xs text-muted-foreground">Wenn Twelve Data das Symbol kennt, lädt die App Analyse und Chart trotzdem.</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => guardedAdd(customSymbol)} className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">
              {settings.watchlist.includes(customSymbol) ? "Aus Watchlist entfernen" : "Zur Watchlist"}
            </button>
            <Link to="/produkte/$symbol" params={{ symbol: customSymbol }} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Analysieren
            </Link>
          </div>
        </div>
      )}

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
              <button onClick={() => guardedAdd(p.symbol)} className={`rounded p-1.5 ${watched ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} aria-label="Watchlist">
                {watched ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function listHasExactSymbol(list: ReturnType<typeof searchProducts>, symbol: string) {
  return list.some((p) => p.symbol.toUpperCase() === symbol);
}
