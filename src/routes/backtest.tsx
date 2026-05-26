import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FlaskConical, Play, TrendingUp, TrendingDown } from "lucide-react";
import { useCandles } from "@/lib/useMarketData";
import { runBacktest } from "@/lib/backtest";
import { ProductsDatalist } from "@/components/ProductsDatalist";
import type { RiskProfile } from "@/lib/analysis";

export const Route = createFileRoute("/backtest")({
  component: BacktestPage,
  head: () => ({
    meta: [
      { title: "Backtest Lab — Quantm Trade" },
      { name: "description", content: "Score-basierte Strategien historisch testen mit Equity-Curve, Sharpe und Drawdown." },
    ],
  }),
});

function BacktestPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [profile, setProfile] = useState<RiskProfile>("ausgewogen");
  const [ran, setRan] = useState(false);
  const candles = useCandles(symbol);
  const closes = candles.data?.c ?? [];

  const result = useMemo(() => {
    if (!ran || closes.length < 220) return null;
    return runBacktest(closes, { profile });
  }, [ran, closes, profile]);

  // Benchmark = Buy & Hold
  const buyHold = useMemo(() => {
    if (!closes.length) return null;
    const first = closes[0]; const last = closes[closes.length - 1];
    return { ret: (last - first) / first };
  }, [closes]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Backtest Lab</h1>
          <p className="text-sm text-muted-foreground">Teste die Setup-Score-Strategie auf realer Historie (~260 Handelstage).</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 grid gap-3 md:grid-cols-[1fr,200px,auto]">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Symbol</label>
          <input list="apex-symbols-bt" value={symbol} onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setRan(false); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <ProductsDatalist id="apex-symbols-bt" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Risikoprofil</label>
          <select value={profile} onChange={(e) => { setProfile(e.target.value as RiskProfile); setRan(false); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="konservativ">Konservativ (Threshold 25)</option>
            <option value="ausgewogen">Ausgewogen (18)</option>
            <option value="spekulativ">Spekulativ (12)</option>
          </select>
        </div>
        <button onClick={() => setRan(true)} disabled={candles.isLoading || closes.length < 220} className="self-end inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Play className="h-4 w-4" /> Backtest starten
        </button>
      </div>

      {candles.isLoading && <p className="text-sm text-muted-foreground">Historische Kerzen werden geladen…</p>}
      {!candles.isLoading && closes.length < 220 && <p className="text-sm text-amber-400">Nicht genug Historie ({closes.length} Tage) — mindestens 220 nötig.</p>}

      {result && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Strategie-Return" value={`${(result.totalReturn * 100).toFixed(2)} %`} tone={result.totalReturn >= 0 ? "up" : "down"} />
            <Stat label="Buy & Hold" value={buyHold ? `${(buyHold.ret * 100).toFixed(2)} %` : "—"} tone={(buyHold?.ret ?? 0) >= 0 ? "up" : "down"} />
            <Stat label="Sharpe (annualisiert)" value={result.sharpe.toFixed(2)} />
            <Stat label="Max Drawdown" value={`-${(result.maxDD * 100).toFixed(2)} %`} tone="down" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Trades" value={String(result.trades.length)} />
            <Stat label="Trefferquote" value={`${(result.winRate * 100).toFixed(1)} %`} />
            <Stat label="Edge vs B&H" value={`${((result.totalReturn - (buyHold?.ret ?? 0)) * 100).toFixed(2)} %`} tone={(result.totalReturn - (buyHold?.ret ?? 0)) >= 0 ? "up" : "down"} />
          </div>

          <EquityCurve equity={result.equity} closes={closes} />

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-semibold">Trade-Liste</div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Side</th>
                    <th className="px-3 py-2 text-right">Entry</th>
                    <th className="px-3 py-2 text-right">Exit</th>
                    <th className="px-3 py-2 text-right">Bars</th>
                    <th className="px-3 py-2 text-right">P&L %</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${t.side === "LONG" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{t.side}</span></td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.entry.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.exit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.exitIdx - t.entryIdx}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${t.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{(t.pnlPct * 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const c = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-foreground";
  const icon = tone === "up" ? <TrendingUp className="h-4 w-4" /> : tone === "down" ? <TrendingDown className="h-4 w-4" /> : null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums ${c}`}>{icon}{value}</div>
    </div>
  );
}

function EquityCurve({ equity, closes }: { equity: number[]; closes: number[] }) {
  const W = 800, H = 260, P = 24;
  const eq = equity.length ? equity : [1];
  const first = closes[0] || 1;
  const bh = closes.map((c) => c / first);
  const all = [...eq, ...bh];
  const min = Math.min(...all), max = Math.max(...all);
  const range = Math.max(max - min, 1e-6);
  const x = (i: number, len: number) => P + (i / Math.max(len - 1, 1)) * (W - P * 2);
  const y = (v: number) => P + (1 - (v - min) / range) * (H - P * 2);
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i, arr.length).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Equity-Curve</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-primary inline-block" /> Strategie</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-muted-foreground inline-block" /> Buy & Hold</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} x2={W - P} y1={y(1)} y2={y(1)} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <path d={path(bh)} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="none" opacity={0.7} />
        <path d={path(eq)} stroke="hsl(var(--primary))" strokeWidth={2} fill="none" />
      </svg>
    </div>
  );
}
