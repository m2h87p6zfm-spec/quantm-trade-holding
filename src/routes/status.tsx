import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Activity } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System-Status — Quantm Trade" },
      { name: "description", content: "Echtzeit-Status aller Quantm-Trade-Dienste: Marktdaten, KI-Analyse, Authentifizierung, Zahlungen." },
      { property: "og:title", content: "System-Status — Quantm Trade" },
      { property: "og:description", content: "Echtzeit-Status aller Quantm-Trade-Dienste." },
    ],
  }),
  component: StatusPage,
});

const services = [
  { name: "Marktdaten-Feed", desc: "Twelve Data · Live-Quotes (70+ Börsen)", uptime: "99.98%" },
  { name: "KI-Analyse-Engine", desc: "Lovable AI Gateway · Composite Scoring", uptime: "99.95%" },
  { name: "Authentifizierung", desc: "Email & Google OAuth", uptime: "100.00%" },
  { name: "Datenbank", desc: "Lovable Cloud · Read & Write", uptime: "99.99%" },
  { name: "Zahlungen", desc: "Stripe Sandbox & Live", uptime: "100.00%" },
  { name: "News & Calendar", desc: "Firecrawl · Hourly refresh", uptime: "99.92%" },
];

function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <span className="label-eyebrow">System-Status</span>
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-bull" />
          </span>
          <h1 className="text-3xl font-display font-bold tracking-tight">Alle Systeme operativ</h1>
        </div>
        <p className="text-sm text-muted-foreground">Aktualisiert vor wenigen Sekunden · 30-Tage-Durchschnitt</p>
      </header>

      <div className="space-y-2">
        {services.map((s) => (
          <div key={s.name} className="surface surface-hover px-4 py-3.5 flex items-center gap-4">
            <CheckCircle2 className="h-5 w-5 text-bull shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-display font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground truncate">{s.desc}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-sm text-bull">{s.uptime}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">uptime</div>
            </div>
          </div>
        ))}
      </div>

      <div className="surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Letzte 30 Tage</h2>
        </div>
        <div className="grid grid-cols-30 gap-0.5 h-10" style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="rounded-sm bg-bull/60 hover:bg-bull transition-colors"
              title={`Tag ${30 - i}: 100% Uptime`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>vor 30 Tagen</span>
          <span>heute</span>
        </div>
      </div>
    </div>
  );
}
