import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Trash2, TrendingUp, TrendingDown, Wallet, AlertTriangle, Check } from "lucide-react";
import { usePortfolio, pnl, costBasis, type Position } from "@/lib/portfolio";
import { useQuote } from "@/lib/useMarketData";
import { findProduct } from "@/lib/products";
import { useCockpitData, type CockpitRow } from "@/lib/cockpit";
import { whyNow } from "@/lib/analysis";
import { DisclaimerInline } from "@/components/Disclaimer";
import { PortfolioAnalytics } from "@/components/PortfolioAnalytics";
import { PortfolioCommandCenter } from "@/components/PortfolioCommandCenter";
import { usePortfolioLimit } from "@/lib/featureGate";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "Portfolio Tracker — Apex Trades" },
      {
        name: "description",
        content:
          "Live-P&L, Risk Score, Sektor-Allokation und KI-gestützte Portfolio-Insights für deine Positionen.",
      },
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
  if (aligned)
    return {
      kind: "aligned",
      label: v === "LONG" ? "BUY · aligned" : "SELL · aligned",
      detail: trigger,
    };
  return {
    kind: "conflict",
    label: v === "SHORT" ? "Signal: SELL" : "Signal: BUY",
    detail: trigger,
  };
}

function PositionRow({
  pos,
  row,
  onRemove,
}: {
  pos: Position;
  row?: CockpitRow;
  onRemove: (id: string) => void;
}) {
  const q = useQuote(pos.symbol, 30_000);
  const price = pos.brokerCurrentPrice ?? q.data?.c ?? row?.last;
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
    <tr
      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${sig.kind === "conflict" ? "bg-bear/[0.04]" : ""}`}
    >
      <td className="px-3 py-3">
        <div className="font-medium">{pos.symbol}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
          {prod?.name ?? "—"}
        </div>
      </td>
      <td className="px-3 py-3">
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${pos.side === "LONG" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}
        >
          {pos.side}
        </span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{pos.qty}</td>
      <td className="px-3 py-3 text-right tabular-nums">{pos.entry.toFixed(2)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{price ? price.toFixed(2) : "…"}</td>
      <td className="px-3 py-3 text-right tabular-nums">{p ? p.value.toFixed(2) : "—"}</td>
      <td
        className={`px-3 py-3 text-right tabular-nums font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}
      >
        {p ? `${up ? "+" : ""}${p.abs.toFixed(2)} (${up ? "+" : ""}${p.pct.toFixed(2)}%)` : "—"}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-0.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${sigStyles}`}
          >
            {sig.kind === "conflict" && <AlertTriangle className="h-3 w-3" />}
            {sig.kind === "aligned" && <Check className="h-3 w-3" />}
            {sig.label}
          </span>
          {sig.detail && (
            <span
              className="text-[10px] text-muted-foreground leading-snug max-w-[220px] truncate"
              title={sig.detail}
            >
              {sig.detail}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <button
          onClick={() => onRemove(pos.id)}
          className="text-muted-foreground hover:text-rose-400 transition-colors"
          aria-label="Löschen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function PortfolioPage() {
  const t = useT();
  const { positions, remove } = usePortfolio();
  const { max, tier } = usePortfolioLimit(positions.length);

  const allSymbols = useMemo(
    () => Array.from(new Set(positions.map((p) => p.symbol))),
    [positions],
  );
  const rows = useCockpitData(allSymbols);
  const rowMap = useMemo(() => new Map(rows.map((r) => [r.symbol, r])), [rows]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Live-P&L · Risk Score · Sektor-Allokation · KI-gestützte Insights
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {positions.length} / {max === Infinity ? "∞" : max} Positionen
          {tier === "free" && " · Free"}
        </div>
      </div>

      {/* Unified Command Center: manual add + AI assistant */}
      <PortfolioCommandCenter />

      {/* Summary Stats */}
      <Summary positions={positions} rowMap={rowMap} />

      {/* Analytics: Risk Score, Sectors, Risk, AI Insight */}
      <PortfolioAnalytics positions={positions} rowMap={rowMap} />

      {/* Holdings Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Holdings</div>
          <div className="text-[11px] text-muted-foreground">
            {positions.length} {positions.length === 1 ? "Position" : "Positionen"}
          </div>
        </div>
        <div className="overflow-x-auto">
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
                <tr>
                  <td colSpan={9} className="px-3 py-16 text-center text-muted-foreground">
                    <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <div className="text-sm">Noch keine Positionen.</div>
                    <div className="text-xs mt-1">
                      Suche oben nach einer Aktie und füge sie hinzu — alle Analytics werden
                      automatisch berechnet.
                    </div>
                  </td>
                </tr>
              ) : (
                positions.map((p) => (
                  <PositionRow key={p.id} pos={p} row={rowMap.get(p.symbol)} onRemove={remove} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DisclaimerInline />
    </div>
  );
}

function Summary({
  positions,
  rowMap,
}: {
  positions: Position[];
  rowMap: Map<string, CockpitRow>;
}) {
  // IMPORTANT: do NOT call useQuote() in a loop — hook count must be stable.
  // Use the cockpit rowMap (already fetched by the parent) for live prices.
  let total = 0,
    pl = 0,
    basis = 0;
  for (const pos of positions) {
    const px = rowMap.get(pos.symbol)?.last ?? pos.entry;
    const { abs, value } = pnl(pos, px);
    total += value;
    pl += abs;
    basis += costBasis(pos);
  }
  const plPct = basis ? (pl / basis) * 100 : 0;
  const up = pl >= 0;
  const fmt = (n: number) =>
    n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Stat
        label="Portfolio-Wert"
        value={`€ ${fmt(total)}`}
        accent="primary"
        icon={<Wallet className="h-4 w-4" />}
      />
      <Stat label="Einstand" value={`€ ${fmt(basis)}`} sub="Eingesetztes Kapital" />
      <Stat
        label="Unrealisierter P&L"
        value={`${up ? "+" : "−"}€ ${fmt(Math.abs(pl))}`}
        tone={up ? "up" : "down"}
        icon={up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      />
      <Stat
        label="Performance"
        value={`${up ? "+" : ""}${plPct.toFixed(2)} %`}
        tone={up ? "up" : "down"}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  sub,
  accent,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  icon?: React.ReactNode;
  sub?: string;
  accent?: "primary";
}) {
  const valueColor =
    tone === "up"
      ? "text-emerald-400"
      : tone === "down"
        ? "text-rose-400"
        : accent === "primary"
          ? "text-primary"
          : "text-foreground";
  const grad =
    tone === "up"
      ? "from-emerald-500/[0.10] ring-emerald-500/20"
      : tone === "down"
        ? "from-rose-500/[0.10] ring-rose-500/20"
        : accent === "primary"
          ? "from-primary/[0.10] ring-primary/25"
          : "from-muted/30 ring-border";
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${grad} via-card to-card p-4 ring-1`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums ${valueColor}`}>
        {icon}
        <span className="truncate">{value}</span>
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
