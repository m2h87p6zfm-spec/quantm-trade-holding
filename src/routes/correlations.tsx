import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchCandles } from "@/lib/finnhub";
import { useSettings } from "@/lib/settings";
import { Network, AlertTriangle, Shuffle } from "lucide-react";
import { ExplainAiButton } from "@/components/ExplainAiButton";

export const Route = createFileRoute("/correlations")({ component: CorrelationsPage });

type Window = 30 | 60 | 90;

function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (a > 0 && b > 0) r.push(Math.log(b / a));
  }
  return r;
}

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 5) return null;
  const x = a.slice(-n);
  const y = b.slice(-n);
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const ex = x[i] - mx, ey = y[i] - my;
    num += ex * ey; dx += ex * ex; dy += ey * ey;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : null;
}

function corrColor(c: number | null): string {
  if (c == null) return "color-mix(in oklab, var(--muted) 30%, transparent)";
  const a = Math.min(0.85, 0.15 + Math.abs(c) * 0.7);
  if (c >= 0) return `color-mix(in oklab, var(--bull) ${Math.round(a * 100)}%, transparent)`;
  return `color-mix(in oklab, var(--bear) ${Math.round(a * 100)}%, transparent)`;
}

export function CorrelationsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { settings } = useSettings();
  const [window, setWindow] = useState<Window>(60);
  const symbols = useMemo(() => {
    const list = settings?.watchlists?.find((w) => w.id === settings.activeWatchlistId)?.symbols ?? [];
    return list.slice(0, 18); // Performance-Limit
  }, [settings]);

  const queries = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["corr-candles", s],
      queryFn: () => fetchCandles(s, "D", 200),
      staleTime: 60 * 60 * 1000,
      gcTime: 2 * 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const matrix = useMemo(() => {
    const returns: Record<string, number[]> = {};
    for (let i = 0; i < symbols.length; i++) {
      const c = queries[i]?.data?.c ?? [];
      const r = logReturns(c).slice(-window);
      returns[symbols[i]] = r;
    }
    const m: (number | null)[][] = symbols.map((a) =>
      symbols.map((b) => (a === b ? 1 : pearson(returns[a] ?? [], returns[b] ?? [])))
    );
    return m;
  }, [queries, symbols, window]);

  // Klumpenrisiko: Paare mit |corr| > 0.8 (außer Diagonale)
  const clusters = useMemo(() => {
    const pairs: { a: string; b: string; corr: number }[] = [];
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const c = matrix[i]?.[j];
        if (c != null && Math.abs(c) > 0.8) pairs.push({ a: symbols[i], b: symbols[j], corr: c });
      }
    }
    return pairs.sort((x, y) => Math.abs(y.corr) - Math.abs(x.corr)).slice(0, 8);
  }, [matrix, symbols]);

  const avgCorr = useMemo(() => {
    let sum = 0, n = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const c = matrix[i]?.[j];
        if (c != null) { sum += c; n++; }
      }
    }
    return n ? sum / n : null;
  }, [matrix, symbols]);

  const loading = queries.some((q) => q.isLoading);

  if (symbols.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-12 text-center">
        <Network className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">Korrelations-Matrix</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Füge zuerst Symbole zu deiner Watchlist hinzu, um Korrelationen zu sehen.
        </p>
        <Link to="/" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Zur Watchlist</Link>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-7xl space-y-8 p-6"}>
      <div className="animate-fade-up">
        {!embedded && (
          <>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Network className="h-3 w-3 text-primary" /> Korrelations-Matrix
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Wie ähnlich bewegen sich deine Werte?</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Pearson-Korrelation der täglichen Log-Returns. Werte nahe <span className="text-bull">+1</span> bewegen sich parallel,
              nahe <span className="text-bear">−1</span> gegenläufig. Hohe Korrelationen = versteckte Klumpenrisiken im Portfolio.
            </p>
          </>
        )}

        <div className={`${embedded ? "" : "mt-4"} inline-flex rounded-lg border border-border bg-card p-1`}>
          {([30, 60, 90] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                window === w ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w} Tage
            </button>
          ))}
        </div>
      </div>


      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ø Korrelation</div>
          <div className={`mt-2 font-mono text-2xl font-bold ${(avgCorr ?? 0) > 0.6 ? "text-bear" : (avgCorr ?? 0) > 0.3 ? "text-gold" : "text-bull"}`}>
            {avgCorr != null ? avgCorr.toFixed(2) : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {avgCorr != null && avgCorr > 0.6 ? "Sehr hoch — wenig Diversifikation" : avgCorr != null && avgCorr > 0.3 ? "Moderat" : "Gut diversifiziert"}
          </div>
        </div>
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-gold" /> Klumpen ({"|ρ|"} {">"} 0.8)
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-gold">{clusters.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Paare mit nahezu identischer Bewegung
          </div>
        </div>
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Shuffle className="h-3 w-3 text-primary" /> Werte
          </div>
          <div className="mt-2 font-mono text-2xl font-bold">{symbols.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            aus aktiver Watchlist
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="card-glow rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Matrix</h2>
          <ExplainAiButton
            topic="Korrelations-Matrix"
            context={`Watchlist mit ${symbols.length} Werten. Ø Korrelation: ${avgCorr?.toFixed(2) ?? "—"}. ${clusters.length} Klumpen-Paare (|ρ| > 0.8). Top Cluster: ${clusters.slice(0, 3).map(c => `${c.a}/${c.b}=${c.corr.toFixed(2)}`).join(", ")}. Erkläre, was diese Werte für das Diversifikationsrisiko des Users bedeuten und welche Konsequenzen sich daraus ergeben.`}
            variant="icon"
          />
        </div>
        {loading && <div className="mb-3 text-xs text-muted-foreground">Lade Kursdaten…</div>}
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5">
            <thead>
              <tr>
                <th></th>
                {symbols.map((s) => (
                  <th key={s} className="px-1.5 py-1 text-[10px] font-mono font-bold text-muted-foreground text-center">
                    {s.replace(/\.[A-Z]+$/, "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map((rowSym, i) => (
                <tr key={rowSym}>
                  <td className="pr-2 text-right text-[10px] font-mono font-bold text-muted-foreground">
                    {rowSym.replace(/\.[A-Z]+$/, "")}
                  </td>
                  {symbols.map((_, j) => {
                    const c = matrix[i]?.[j];
                    const isDiag = i === j;
                    return (
                      <td
                        key={j}
                        className="rounded text-center text-[10px] font-mono tabular-nums w-10 h-10 transition-transform hover:scale-110"
                        style={{
                          background: isDiag ? "color-mix(in oklab, var(--primary) 30%, transparent)" : corrColor(c),
                          color: isDiag || (c != null && Math.abs(c) > 0.45) ? "white" : "var(--foreground)",
                        }}
                        title={`${symbols[i]} ↔ ${symbols[j]}: ${c != null ? c.toFixed(2) : "—"}`}
                      >
                        {c != null ? c.toFixed(2) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>−1 gegenläufig</span>
          <div className="flex h-3 w-40 rounded-full overflow-hidden ring-1 ring-border">
            <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bear) 80%, transparent)" }} />
            <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bear) 35%, transparent)" }} />
            <div className="flex-1" style={{ background: "color-mix(in oklab, var(--muted) 40%, transparent)" }} />
            <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bull) 35%, transparent)" }} />
            <div className="flex-1" style={{ background: "color-mix(in oklab, var(--bull) 80%, transparent)" }} />
          </div>
          <span>+1 parallel</span>
        </div>
      </div>

      {/* Klumpen-Liste */}
      {clusters.length > 0 && (
        <div className="card-glow rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Diversifikations-Warnungen</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {clusters.map((c) => (
              <div key={`${c.a}-${c.b}`} className="flex items-center justify-between rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Link to="/produkte/$symbol" params={{ symbol: c.a }} className="hover:text-primary">{c.a}</Link>
                  <span className="text-muted-foreground">↔</span>
                  <Link to="/produkte/$symbol" params={{ symbol: c.b }} className="hover:text-primary">{c.b}</Link>
                </div>
                <span className={`font-mono text-sm font-bold ${c.corr >= 0 ? "text-bull" : "text-bear"}`}>
                  ρ = {c.corr >= 0 ? "+" : ""}{c.corr.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Werte mit |ρ| {">"} 0.8 reagieren praktisch identisch auf Marktbewegungen. Sie senken Diversifikation
            und verstärken Verluste in Stress-Phasen.
          </p>
        </div>
      )}
    </div>
  );
}
