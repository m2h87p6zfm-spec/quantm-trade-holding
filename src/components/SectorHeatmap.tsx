import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { findProduct } from "@/lib/products";

type Cell = { symbol: string; change: number; price: number };

// Sektor-Heatmap im Finviz-Style — Farbe = Tagesveränderung,
// Größe leicht skaliert nach |Δ|. Reine Echtdaten.
function colorFor(change: number) {
  const v = Math.max(-5, Math.min(5, change));
  if (v >= 0) {
    const a = Math.min(0.85, 0.18 + (v / 5) * 0.7);
    return `color-mix(in oklab, var(--bull) ${a * 100}%, var(--card))`;
  } else {
    const a = Math.min(0.85, 0.18 + (Math.abs(v) / 5) * 0.7);
    return `color-mix(in oklab, var(--bear) ${a * 100}%, var(--card))`;
  }
}

export function SectorHeatmap({ cells }: { cells: Cell[] }) {
  // Gruppiere nach Sektor für klassisches Heatmap-Grid
  const groups = new Map<string, Cell[]>();
  for (const c of cells) {
    const p = findProduct(c.symbol);
    const sec = p?.sector ?? "Sonstige";
    if (!groups.has(sec)) groups.set(sec, []);
    groups.get(sec)!.push(c);
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="card-glow rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-gold" />
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sektor-Heatmap
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Tagesveränderung deiner Watchlist · grün = Käufer dominieren · rot = Verkaufsdruck
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded font-mono" style={{ background: colorFor(-3), color: "var(--bear-foreground, white)" }}>−3%</span>
          <span className="px-2 py-0.5 rounded font-mono bg-muted text-muted-foreground">0%</span>
          <span className="px-2 py-0.5 rounded font-mono" style={{ background: colorFor(3), color: "white" }}>+3%</span>
        </div>
      </div>
      {cells.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Heatmap füllt sich, sobald Werte auf der Watchlist liegen.
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(([sector, items]) => (
            <div key={sector}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                {sector} <span className="text-muted-foreground/60">· {items.length}</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                {items.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).map((c) => (
                  <Link
                    key={c.symbol}
                    to="/produkte/$symbol"
                    params={{ symbol: c.symbol }}
                    className="heat-cell rounded-md aspect-[5/4] flex flex-col items-center justify-center p-1.5 border border-border/40"
                    style={{ background: colorFor(c.change) }}
                  >
                    <div className="text-[11px] font-bold leading-tight truncate w-full text-center text-white drop-shadow">
                      {c.symbol.replace(/\.[A-Z]+$/, "")}
                    </div>
                    <div className="text-[10px] font-mono tabular-nums font-semibold text-white/95 drop-shadow">
                      {c.change >= 0 ? "+" : ""}{c.change.toFixed(2)}%
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
