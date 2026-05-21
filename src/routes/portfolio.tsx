import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { usePortfolio, pnl, type Position } from "@/lib/portfolio";
import { useQuote } from "@/lib/useMarketData";
import { PRODUCTS, findProduct } from "@/lib/products";
import { DisclaimerInline } from "@/components/Disclaimer";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "Portfolio Tracker — Apex Trades" },
      { name: "description", content: "Live-P&L, Allokation und Risiko-Übersicht deiner Positionen." },
    ],
  }),
});

function PositionRow({ pos, onRemove }: { pos: Position; onRemove: (id: string) => void }) {
  const q = useQuote(pos.symbol, 30_000);
  const price = q.data?.c;
  const prod = findProduct(pos.symbol);
  const p = price ? pnl(pos, price) : null;
  const up = (p?.abs ?? 0) >= 0;
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="px-3 py-3">
        <div className="font-medium">{pos.symbol}</div>
        <div className="text-xs text-muted-foreground">{prod?.name ?? "—"}</div>
      </td>
      <td className="px-3 py-3">
        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${pos.side === "LONG" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{pos.side}</span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{pos.qty}</td>
      <td className="px-3 py-3 text-right tabular-nums">{pos.entry.toFixed(2)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{price ? price.toFixed(2) : "…"}</td>
      <td className="px-3 py-3 text-right tabular-nums">{p ? p.value.toFixed(2) : "—"}</td>
      <td className={`px-3 py-3 text-right tabular-nums font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
        {p ? `${up ? "+" : ""}${p.abs.toFixed(2)} (${up ? "+" : ""}${p.pct.toFixed(2)}%)` : "—"}
      </td>
      <td className="px-3 py-3 text-right">
        <button onClick={() => onRemove(pos.id)} className="text-muted-foreground hover:text-rose-400" aria-label="Löschen">
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function PortfolioPage() {
  const { positions, add, remove } = usePortfolio();
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState(10);
  const [entry, setEntry] = useState(0);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");

  const allSymbols = useMemo(() => Array.from(new Set(positions.map((p) => p.symbol))), [positions]);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol || qty <= 0 || entry <= 0) {
      toast.error("Bitte Symbol, Menge und Einstandskurs angeben.");
      return;
    }
    add({ symbol: symbol.toUpperCase(), qty, entry, side });
    toast.success(`${side} ${qty} × ${symbol.toUpperCase()} @ ${entry.toFixed(2)} hinzugefügt`);
    setEntry(0);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Portfolio Tracker</h1>
          <p className="text-sm text-muted-foreground">Live-P&L gegen Echtzeit-Kurse. Daten bleiben lokal im Browser.</p>
        </div>
      </div>

      <form onSubmit={onAdd} className="rounded-lg border border-border bg-card p-4 grid gap-3 md:grid-cols-[1fr,100px,140px,140px,auto]">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Symbol</label>
          <input list="apex-symbols" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <datalist id="apex-symbols">{PRODUCTS.map((p) => <option key={p.symbol} value={p.symbol}>{p.name}</option>)}</datalist>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Menge</label>
          <input type="number" min={0} step="any" value={qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Einstand</label>
          <input type="number" min={0} step="any" value={entry} onChange={(e) => setEntry(parseFloat(e.target.value) || 0)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Richtung</label>
          <select value={side} onChange={(e) => setSide(e.target.value as "LONG" | "SHORT")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>
        <button type="submit" className="self-end inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Hinzufügen
        </button>
      </form>

      <Summary positions={positions} />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Asset</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Menge</th>
              <th className="px-3 py-2 text-right">Einstand</th>
              <th className="px-3 py-2 text-right">Aktuell</th>
              <th className="px-3 py-2 text-right">Wert</th>
              <th className="px-3 py-2 text-right">P&L</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Noch keine Positionen. Lege oben deine erste Position an.</td></tr>
            ) : positions.map((p) => <PositionRow key={p.id} pos={p} onRemove={remove} />)}
          </tbody>
        </table>
      </div>

      {allSymbols.length > 0 && <DisclaimerInline />}
    </div>
  );
}

function Summary({ positions }: { positions: Position[] }) {
  // Live-Summary über Quotes aller Symbole
  const symbols = useMemo(() => Array.from(new Set(positions.map((p) => p.symbol))), [positions]);
  const quotes = symbols.map((s) => ({ s, q: useQuote(s, 30_000) }));
  const priceMap = new Map<string, number>();
  for (const { s, q } of quotes) if (q.data?.c) priceMap.set(s, q.data.c);

  let total = 0, pl = 0, basis = 0;
  for (const pos of positions) {
    const px = priceMap.get(pos.symbol);
    if (px == null) continue;
    const { abs, value } = pnl(pos, px);
    total += value; pl += abs; basis += pos.entry * pos.qty;
  }
  const plPct = basis ? (pl / basis) * 100 : 0;
  const up = pl >= 0;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Stat label="Portfolio-Wert" value={total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
      <Stat label="Unrealisierter P&L" value={`${up ? "+" : ""}${pl.toFixed(2)}`} tone={up ? "up" : "down"} icon={up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} />
      <Stat label="Performance" value={`${up ? "+" : ""}${plPct.toFixed(2)} %`} tone={up ? "up" : "down"} />
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone?: "up" | "down"; icon?: React.ReactNode }) {
  const c = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums ${c}`}>{icon}{value}</div>
    </div>
  );
}
