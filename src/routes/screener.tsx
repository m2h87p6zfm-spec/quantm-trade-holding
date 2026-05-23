import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { PRODUCTS, type Product } from "@/lib/products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/screener")({
  head: () => ({
    meta: [
      { title: "Stock Screener — Filter 500+ Aktien | Quantm Trade" },
      { name: "description", content: "Filtere über 500 Aktien nach Sektor, Region und Symbol. Finde in Sekunden die Werte, die deinem Profil entsprechen." },
      { property: "og:title", content: "Stock Screener — Quantm Trade" },
      { property: "og:description", content: "Filtere über 500 Aktien nach Sektor, Region und Symbol." },
      { name: "twitter:title", content: "Stock Screener — Quantm Trade" },
      { name: "twitter:description", content: "Filtere über 500 Aktien nach Sektor, Region und Symbol." },
    ],
  }),
  component: ScreenerPage,
});

const SECTORS = ["Technologie", "Energie", "Finanzen", "Gesundheit", "Konsum", "Industrie", "Rohstoffe", "Index"] as const;
const REGIONS = ["US", "DE", "EU", "UK", "JP"] as const;

function ScreenerPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const filtered = useMemo<Product[]>(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (sector && p.sector !== sector) return false;
      if (region && p.region !== region) return false;
      if (q && !p.symbol.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, sector, region]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <header className="space-y-2">
        <span className="label-eyebrow">Stock Screener</span>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Finde deine nächste Position
        </h1>
        <p className="text-sm text-muted-foreground">
          {PRODUCTS.length.toLocaleString("de-DE")} Assets · Sektor, Region, Symbol — kombinierbar
        </p>
      </header>

      <div className="surface p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Symbol oder Name suchen (z.B. AAPL, Tesla, SAP)…"
              className="pl-9 h-10 bg-background/60 border-border/60 focus-visible:border-primary/50"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setQuery(""); setSector(null); setRegion(null); }}
            disabled={!query && !sector && !region}
            className="h-10"
          >
            Zurücksetzen
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <SlidersHorizontal className="h-3 w-3" /> Sektor
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SECTORS.map((s) => (
              <button
                key={s}
                onClick={() => setSector(sector === s ? null : s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  sector === s
                    ? "bg-primary text-primary-foreground shadow-[0_0_18px_-4px_var(--primary)]"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Region
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(region === r ? null : r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  region === r
                    ? "bg-primary text-primary-foreground shadow-[0_0_18px_-4px_var(--primary)]"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="text-foreground font-mono font-semibold">{filtered.length}</span> Treffer
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Klicken für Detailanalyse</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.slice(0, 120).map((p) => (
          <Link
            key={p.symbol}
            to="/produkte/$symbol"
            params={{ symbol: p.symbol }}
            className="surface surface-hover p-4 group block"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-mono font-bold tracking-tight">{p.symbol}</div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-sm text-foreground/80 truncate">{p.name}</div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{p.sector}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{p.region}</span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length > 120 && (
        <div className="text-center text-sm text-muted-foreground">
          {filtered.length - 120} weitere Treffer — Filter verfeinern für genauere Auswahl.
        </div>
      )}

      {filtered.length === 0 && (
        <div className="surface p-12 text-center text-muted-foreground">
          Keine Treffer für die aktuelle Filter-Kombination.
        </div>
      )}
    </div>
  );
}
