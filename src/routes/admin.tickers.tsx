import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MERGE_STATS, PRODUCTS } from "@/lib/products";
import { PRODUCTS_EXTRA2 } from "@/lib/products-extra2";
import { Card } from "@/components/ui/card";
import { authedFetch } from "@/lib/authed-fetch";

export const Route = createFileRoute("/admin/tickers")({
  component: AdminTickersDebug,
  head: () => ({ meta: [{ title: "Admin · Ticker-Merge Debug" }] }),
});

type LiveStatus = "available" | "unavailable" | "error";
type LiveEntry = { status: LiveStatus; price?: number; checkedAt: number };
type LiveMap = Record<string, LiveEntry>;

const LS_KEY = "admin_ticker_live_status_v1";
const BATCH_SIZE = 50;

function fmtTime(ts: number) {
  return new Date(ts).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "medium" });
}

function loadLive(): LiveMap {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as LiveMap; } catch { return {}; }
}
function saveLive(map: LiveMap) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch { /* quota */ }
}

function AdminTickersDebug() {
  const s = MERGE_STATS;

  const regionBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of PRODUCTS) map.set(p.region, (map.get(p.region) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const sectorBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of PRODUCTS) map.set(p.sector, (map.get(p.sector) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Ticker-Merge · Debug-Panel</h1>
        <p className="text-sm text-muted-foreground">
          Zeigt, wann und wie <code className="font-mono">products-extra2</code> in die
          Gesamtliste gemerged wurde — und ob die Datenfeed-API jedes neue Symbol
          tatsächlich live liefert.
        </p>
      </header>

      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Gemerged am" value={fmtTime(s.mergedAt)} mono={false} />
        <Stat label="Build-ISO" value={s.buildTime} />
        <Stat label="PRODUCTS gesamt" value={s.counts.total.toLocaleString("de-DE")} />
        <Stat label="Duplikate verworfen" value={String(s.counts.duplicates)} />
      </Card>

      <LiveCheckCard />

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Quellen-Beiträge</h2>
        <div className="space-y-2 text-sm">
          <SourceRow label="products.ts · BASE" raw={s.counts.base} effective={s.perSource.base} />
          <SourceRow label="products-extra.ts" raw={s.counts.extra} effective={s.perSource.extra} />
          <SourceRow label="products-extra2.ts (neu, +2000)" raw={s.counts.extra2} effective={s.perSource.extra2} highlight />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Merge-Reihenfolge: <code>BASE → EXTRA → EXTRA2</code>. Duplikate werden nach
          Upper-Case-Symbol bei der späteren Quelle verworfen — frühere Einträge gewinnen.
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Region-Verteilung</h2>
          <ul className="text-sm space-y-1">
            {regionBreakdown.map(([r, n]) => (
              <li key={r} className="flex justify-between"><span className="font-mono">{r}</span><span className="text-muted-foreground">{n}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Sektor-Verteilung</h2>
          <ul className="text-sm space-y-1">
            {sectorBreakdown.map(([sec, n]) => (
              <li key={sec} className="flex justify-between"><span>{sec}</span><span className="text-muted-foreground">{n}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function LiveCheckCard() {
  // Eindeutige extra2-Symbole, die tatsächlich auch im finalen Katalog landen.
  const extra2Symbols = useMemo(() => {
    const finalSet = new Set(PRODUCTS.map((p) => p.symbol.toUpperCase()));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of PRODUCTS_EXTRA2) {
      const sym = p.symbol.toUpperCase();
      if (seen.has(sym) || !finalSet.has(sym)) continue;
      seen.add(sym);
      out.push(sym);
    }
    return out;
  }, []);

  const [live, setLive] = useState<LiveMap>(() => loadLive());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<"all" | LiveStatus>("all");

  useEffect(() => { saveLive(live); }, [live]);

  const summary = useMemo(() => {
    let available = 0, unavailable = 0, error = 0, unchecked = 0;
    for (const sym of extra2Symbols) {
      const e = live[sym];
      if (!e) unchecked++;
      else if (e.status === "available") available++;
      else if (e.status === "unavailable") unavailable++;
      else error++;
    }
    return { available, unavailable, error, unchecked, total: extra2Symbols.length };
  }, [live, extra2Symbols]);

  async function runCheck(onlyMissing: boolean) {
    const targets = onlyMissing ? extra2Symbols.filter((s) => !live[s]) : extra2Symbols;
    if (targets.length === 0) return;
    setRunning(true);
    setProgress({ done: 0, total: targets.length });
    const next: LiveMap = { ...live };
    const now = Date.now();

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      try {
        const res = await authedFetch(`/api/public/quotes-batch?symbols=${encodeURIComponent(batch.join(","))}`);
        if (!res.ok) {
          for (const sym of batch) next[sym] = { status: "error", checkedAt: now };
        } else {
          const j = await res.json() as { quotes?: Record<string, { c?: number }> };
          const quotes = j.quotes ?? {};
          for (const sym of batch) {
            const q = quotes[sym];
            const price = typeof q?.c === "number" && Number.isFinite(q.c) ? q.c : undefined;
            next[sym] = price != null && price > 0
              ? { status: "available", price, checkedAt: now }
              : { status: "unavailable", checkedAt: now };
          }
        }
      } catch {
        for (const sym of batch) next[sym] = { status: "error", checkedAt: now };
      }
      setLive({ ...next });
      setProgress({ done: Math.min(i + BATCH_SIZE, targets.length), total: targets.length });
      // kleine Pause, damit der Edge-Cache nicht überrannt wird
      await new Promise((r) => setTimeout(r, 150));
    }
    setRunning(false);
  }

  function resetCheck() { setLive({}); saveLive({}); }

  const filtered = useMemo(() => {
    return extra2Symbols.filter((sym) => {
      const e = live[sym];
      if (filter === "all") return true;
      if (!e) return false;
      return e.status === filter;
    });
  }, [extra2Symbols, live, filter]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Live-Verfügbarkeit der neuen Ticker</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Prüft via <code className="font-mono">/api/public/quotes-batch</code>, ob der
            Datenfeed pro extra2-Symbol einen aktuellen Kurs liefert. Ergebnisse werden
            lokal gecached.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runCheck(true)}
            disabled={running || summary.unchecked === 0}
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Nur fehlende prüfen ({summary.unchecked})
          </button>
          <button
            onClick={() => runCheck(false)}
            disabled={running}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
          >
            Alle neu prüfen
          </button>
          <button
            onClick={resetCheck}
            disabled={running}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
          >
            Cache leeren
          </button>
        </div>
      </div>

      {running && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Prüfe {progress.done.toLocaleString("de-DE")} / {progress.total.toLocaleString("de-DE")} …
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <SummaryPill label="Gesamt" value={summary.total} onClick={() => setFilter("all")} active={filter === "all"} />
        <SummaryPill label="✓ Verfügbar" value={summary.available} tone="bull" onClick={() => setFilter("available")} active={filter === "available"} />
        <SummaryPill label="✗ Nicht verfügbar" value={summary.unavailable} tone="bear" onClick={() => setFilter("unavailable")} active={filter === "unavailable"} />
        <SummaryPill label="⚠ Fehler" value={summary.error} tone="warn" onClick={() => setFilter("error")} active={filter === "error"} />
        <SummaryPill label="? Ungeprüft" value={summary.unchecked} tone="muted" />
      </div>

      <div className="rounded-md border border-border bg-muted/20 max-h-72 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Keine Einträge in dieser Ansicht.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.slice(0, 500).map((sym) => {
              const e = live[sym];
              return (
                <li key={sym} className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className="font-mono">{sym}</span>
                  <StatusBadge entry={e} />
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length > 500 && (
          <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/60">
            … {(filtered.length - 500).toLocaleString("de-DE")} weitere ausgeblendet.
          </div>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ entry }: { entry?: LiveEntry }) {
  if (!entry) return <span className="text-muted-foreground">ungeprüft</span>;
  if (entry.status === "available") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded bg-bull/15 text-bull px-1.5 py-0.5 font-semibold">✓ live</span>
        {entry.price != null && <span className="font-mono text-muted-foreground">{entry.price.toFixed(2)}</span>}
      </span>
    );
  }
  if (entry.status === "unavailable") {
    return <span className="rounded bg-bear/15 text-bear px-1.5 py-0.5 font-semibold">✗ keine Daten</span>;
  }
  return <span className="rounded bg-gold/15 text-gold px-1.5 py-0.5 font-semibold">⚠ Fehler</span>;
}

function SummaryPill({
  label, value, tone = "default", onClick, active,
}: { label: string; value: number; tone?: "default" | "bull" | "bear" | "warn" | "muted"; onClick?: () => void; active?: boolean }) {
  const toneCls =
    tone === "bull" ? "text-bull" :
    tone === "bear" ? "text-bear" :
    tone === "warn" ? "text-gold" :
    tone === "muted" ? "text-muted-foreground" :
    "text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-md border px-3 py-2 text-left transition ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/40"} disabled:cursor-default disabled:hover:bg-card`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${toneCls}`}>{value.toLocaleString("de-DE")}</div>
    </button>
  );
}

function Stat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function SourceRow({ label, raw, effective, highlight }: { label: string; raw: number; effective: number; highlight?: boolean }) {
  const dropped = raw - effective;
  return (
    <div className={`flex items-center justify-between rounded-md px-3 py-2 ${highlight ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/40"}`}>
      <span className="text-sm">{label}</span>
      <span className="text-xs text-muted-foreground">
        <span className="font-mono">{raw.toLocaleString("de-DE")}</span> roh →{" "}
        <span className="font-mono font-semibold text-foreground">{effective.toLocaleString("de-DE")}</span> übernommen
        {dropped > 0 && <> · {dropped} dup</>}
      </span>
    </div>
  );
}
