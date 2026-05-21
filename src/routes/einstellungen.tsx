import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { getApiKey, setApiKey } from "@/lib/finnhub";

export const Route = createFileRoute("/einstellungen")({ component: SettingsPage });

function SettingsPage() {
  const { settings, update } = useSettings();
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setKey(getApiKey()); }, []);

  const save = () => {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">Konfiguration des Trading-Agents und Datenfeeds.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Finnhub API-Key</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Kostenlosen Key auf <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" className="text-cyan-accent inline-flex items-center gap-0.5 hover:underline">finnhub.io/register <ExternalLink className="h-3 w-3" /></a> registrieren. Wird ausschließlich lokal im Browser gespeichert.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input value={key} onChange={(e) => setKey(e.target.value)} type={show ? "text" : "password"} placeholder="z. B. ctv8…" className="w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => setShow(!show)} className="absolute right-2 top-2.5 text-muted-foreground" aria-label="Anzeigen">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={save} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {saved ? <><Check className="h-4 w-4" /> Gespeichert</> : "Speichern"}
          </button>
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
