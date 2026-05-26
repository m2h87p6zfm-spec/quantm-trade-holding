import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { MERGE_STATS, PRODUCTS } from "@/lib/products";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/tickers")({
  component: AdminTickersDebug,
  head: () => ({ meta: [{ title: "Admin · Ticker-Merge Debug" }] }),
});

function fmtTime(ts: number) {
  return new Date(ts).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "medium" });
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
          Gesamtliste gemerged wurde.
        </p>
      </header>

      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Gemerged am" value={fmtTime(s.mergedAt)} mono={false} />
        <Stat label="Build-ISO" value={s.buildTime} />
        <Stat label="PRODUCTS gesamt" value={s.counts.total.toLocaleString("de-DE")} />
        <Stat label="Duplikate verworfen" value={String(s.counts.duplicates)} />
      </Card>

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
          <h2 className="text-sm font-semibold mb-3">Duplikate aus extra2 ({s.duplicatesBySource.extra2.length})</h2>
          <div className="max-h-60 overflow-auto font-mono text-xs text-muted-foreground space-y-0.5">
            {s.duplicatesBySource.extra2.length === 0 ? (
              <div>Keine.</div>
            ) : s.duplicatesBySource.extra2.map((sym) => <div key={sym}>{sym}</div>)}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Duplikate aus extra ({s.duplicatesBySource.extra.length})</h2>
          <div className="max-h-60 overflow-auto font-mono text-xs text-muted-foreground space-y-0.5">
            {s.duplicatesBySource.extra.length === 0 ? (
              <div>Keine.</div>
            ) : s.duplicatesBySource.extra.map((sym) => <div key={sym}>{sym}</div>)}
          </div>
        </Card>
      </div>

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

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Sample aus extra2 (erste 20 neue Symbole)</h2>
        <div className="flex flex-wrap gap-1.5">
          {s.sampleExtra2.map((sym) => (
            <span key={sym} className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{sym}</span>
          ))}
        </div>
      </Card>
    </div>
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
