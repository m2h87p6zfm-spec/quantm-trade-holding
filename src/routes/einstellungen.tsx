import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Lock } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useWatchlistLimit } from "@/lib/featureGate";

export const Route = createFileRoute("/einstellungen")({ component: SettingsPage });

function SettingsPage() {
  const { settings, update } = useSettings();
  const { guardedAdd, tier, max, count, atLimit } = useWatchlistLimit();
  const [watchSymbol, setWatchSymbol] = useState("");

  const addWatch = () => {
    const symbol = watchSymbol.trim().toUpperCase().replace(/\s+/g, "");
    if (!symbol || settings.watchlist.includes(symbol)) return;
    if (guardedAdd(symbol)) setWatchSymbol("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">Konfiguration des Trading-Agents und Datenfeeds.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Datenfeed</h2>
        <p className="text-xs text-muted-foreground">
          Kursdaten werden serverseitig über Yahoo Finance bezogen und gecached (Tageskerzen 1 h, Quotes 1 min).
          <strong className="text-foreground"> Kein API-Key nötig</strong> — Daten sind ca. 15 Min. verzögert.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Watchlist & API-Verbrauch</h2>
          <p className="mt-1 text-xs text-muted-foreground">Jeder neue Analysewert verbraucht ungefähr 1 Kerzen-Call. Automatische Massenscans wurden abgeschaltet; „Trends & Signale“ scannt nur diese Watchlist.</p>
        </div>
        <div className="flex gap-2">
          <input value={watchSymbol} onChange={(e) => setWatchSymbol(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addWatch(); }} placeholder="Ticker hinzufügen, z. B. AMD, SAP.DE, VTI" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={addWatch} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Hinzufügen
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.watchlist.map((symbol) => (
            <button key={symbol} onClick={() => update({ watchlist: settings.watchlist.filter((s) => s !== symbol) })} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono hover:bg-accent">
              {symbol} <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Risikoprofil</h2>
        <p className="text-xs text-muted-foreground">Beeinflusst die Schwelle für LONG/SHORT-Empfehlungen.</p>
        <div className="grid grid-cols-3 gap-2">
          {(["konservativ", "ausgewogen", "spekulativ"] as const).map((r) => (
            <button key={r} onClick={() => update({ risk: r })} className={`rounded-md border p-3 text-sm capitalize ${settings.risk === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
              {r}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Darstellung</h2>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button key={t} onClick={() => update({ theme: t })} className={`rounded-md border px-4 py-2 text-sm capitalize ${settings.theme === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
              {t === "dark" ? "Dark Mode" : "Light Mode"}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Benachrichtigungsschwelle</h2>
        <p className="text-xs text-muted-foreground">Signale unterhalb dieser Konfidenz werden in „Trends & Signale" ausgeblendet.</p>
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={95} step={5} value={settings.minConfidence} onChange={(e) => update({ minConfidence: Number(e.target.value) })} className="flex-1 accent-primary" />
          <span className="font-mono text-lg w-12 text-right">{settings.minConfidence}%</span>
        </div>
      </section>
    </div>
  );
}
