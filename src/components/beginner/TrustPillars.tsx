import { ShieldCheck, Clock, Eye } from "lucide-react";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Echte Daten, keine Backtests",
    text: "Alle gezeigten Ergebnisse stammen aus echten, live gegebenen Empfehlungen. Keine nachträglich optimierten Modelle.",
  },
  {
    icon: Clock,
    title: "Jede Empfehlung ist dokumentiert",
    text: "Datum und Uhrzeit jeder Empfehlung werden unveränderlich gespeichert. Sie sehen den exakten Zeitpunkt, bevor sich der Kurs bewegt hat.",
  },
  {
    icon: Eye,
    title: "Wir zeigen auch unsere Verluste",
    text: "Transparenz bedeutet für uns: alle Trades, nicht nur die guten. Nur so können Sie uns wirklich einschätzen.",
  },
];

export function TrustPillars() {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold tracking-tight">Warum können Sie uns vertrauen?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Wir bauen Quantm Trade als Werkzeug für Menschen mit wenig Zeit — Vertrauen ist die wichtigste Funktion.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-xl border border-border/50 bg-background/40 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <p.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold tracking-tight">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
