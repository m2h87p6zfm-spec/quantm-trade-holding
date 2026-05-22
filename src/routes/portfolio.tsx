import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { usePortfolio, pnl, type Position } from "@/lib/portfolio";
import { useQuote } from "@/lib/useMarketData";
import { PRODUCTS, findProduct } from "@/lib/products";
import { useCockpitData, type CockpitRow } from "@/lib/cockpit";
import { whyNow } from "@/lib/analysis";
import { DisclaimerInline } from "@/components/Disclaimer";

import { usePortfolioLimit } from "@/lib/featureGate";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "Portfolio Tracker — Apex Trades" },
      { name: "description", content: "Live-P&L, Allokation, Risiko und Quant-Signal-Konflikte deiner Positionen." },
    ],
  }),
});


type SignalState = {
  kind: "aligned" | "conflict" | "neutral" | "loading";
  label: string;
  detail: string;
};

function deriveSignalState(pos: Position, row?: CockpitRow): SignalState {
  if (!row) return { kind: "loading", label: "lädt…", detail: "" };
  const v = row.sig.verdict;
  const trigger = whyNow(row.ind, row.sig);
  if (v === "NEUTRAL") return { kind: "neutral", label: "Neutral", detail: trigger };
  const aligned = (pos.side === "LONG" && v === "LONG") || (pos.side === "SHORT" && v === "SHORT");
  if (aligned) return { kind: "aligned", label: v === "LONG" ? "BUY · aligned" : "SELL · aligned", detail: trigger };
  return {
    kind: "conflict",
    label: v === "SHORT" ? "Signal: SELL" : "Signal: BUY",
    detail: trigger,
  };
}

function PositionRow({ pos, row, onRemove }: { pos: Position; row?: CockpitRow; onRemove: (id: string) => void }) {
  const q = useQuote(pos.symbol, 30_000);
  const price = q.data?.c ?? row?.last;
  const prod = findProduct(pos.symbol);
  const p = price ? pnl(pos, price) : null;
  const up = (p?.abs ?? 0) >= 0;
  const sig = deriveSignalState(pos, row);

  const sigStyles =
    sig.kind === "conflict"
      ? "bg-bear/15 text-bear border-bear/40"
      : sig.kind === "aligned"
      ? "bg-bull/15 text-bull border-bull/40"
      : sig.kind === "neutral"
      ? "bg-muted text-muted-foreground border-border"
      : "bg-muted/40 text-muted-foreground border-border animate-pulse";

  return (
    <tr className={`border-b border-border/50 hover:bg-muted/30 ${sig.kind === "conflict" ? "bg-bear/[0.04]" : ""}`}>
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
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-0.5">
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${sigStyles}`}>
            {sig.kind === "conflict" && <AlertTriangle className="h-3 w-3" />}
            {sig.kind === "aligned" && <Check className="h-3 w-3" />}
            {sig.label}
          </span>
          {sig.detail && (
            <span className="text-[10px] text-muted-foreground leading-snug max-w-[220px] truncate" title={sig.detail}>
              {sig.detail}
            </span>
          )}
        </div>
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
  const { max, atLimit, guard, tier } = usePortfolioLimit(positions.length);
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState(10);
  const [entry, setEntry] = useState(0);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");

  const allSymbols = useMemo(() => Array.from(new Set(positions.map((p) => p.symbol))), [positions]);
  const rows = useCockpitData(allSymbols);
  const rowMap = useMemo(() => new Map(rows.map((r) => [r.symbol, r])), [rows]);

  // Konfliktzähler für Header-Banner
  const conflicts = useMemo(() => {
    return positions.filter((p) => {
      const r = rowMap.get(p.symbol);
      if (!r) return false;
      const v = r.sig.verdict;
      if (v === "NEUTRAL") return false;
      return (p.side === "LONG" && v === "SHORT") || (p.side === "SHORT" && v === "LONG");
    });
  }, [positions, rowMap]);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol || qty <= 0 || entry <= 0) {
      toast.error("Bitte Symbol, Menge und Einstandskurs angeben.");
      return;
    }
    if (!guard()) return;
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
          <p className="text-sm text-muted-foreground">Live-P&L gegen Echtzeit-Kurse — jede Position abgeglichen mit dem aktuellen Quant-Signal.</p>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-bear/40 bg-bear/[0.06] p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-bear shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-bear text-sm">
              {conflicts.length} {conflicts.length === 1 ? "Position widerspricht" : "Positionen widersprechen"} dem aktuellen Signal
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {conflicts.map((c) => c.symbol).join(", ")} — die Quant-Engine sieht hier die Gegenrichtung. Überprüfe Stop-Loss und Positionsgröße.
            </div>
          </div>
        </div>
      )}

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

      <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Asset</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Menge</th>
              <th className="px-3 py-2 text-right">Einstand</th>
              <th className="px-3 py-2 text-right">Aktuell</th>
              <th className="px-3 py-2 text-right">Wert</th>
              <th className="px-3 py-2 text-right">P&L</th>
              <th className="px-3 py-2 text-left">Quant-Signal</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">Noch keine Positionen. Lege oben deine erste Position an.</td></tr>
            ) : positions.map((p) => <PositionRow key={p.id} pos={p} row={rowMap.get(p.symbol)} onRemove={remove} />)}
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
