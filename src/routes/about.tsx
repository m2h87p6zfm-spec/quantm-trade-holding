import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Users, Mail, Github, Lock, Globe, Cpu } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Über uns — Quantm Trade" },
      { name: "description", content: "Quantm Trade ist eine datengetriebene Trading-Plattform mit institutioneller Quantitativ-Analyse für private Anleger. Team, Mission und Werte." },
      { property: "og:title", content: "Über uns — Quantm Trade" },
      { property: "og:description", content: "Quantitativ-Analyse für private Trader — transparent, datengetrieben, ohne Hype." },
      { name: "twitter:title", content: "Über uns — Quantm Trade" },
      { name: "twitter:description", content: "Quantitativ-Analyse für private Trader — transparent, datengetrieben, ohne Hype." },
      { rel: "canonical", href: "/about" } as never,
    ],
  }),
  component: AboutPage,
});

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="surface p-5">
      <div className="kpi-label">{k}</div>
      <div className="kpi-value text-gradient-primary">{v}</div>
    </div>
  );
}

function Value({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <div className="surface p-5 surface-hover">
      <Icon className="h-5 w-5 text-primary mb-3" />
      <h3 className="font-display font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-12">
      <header className="space-y-4">
        <span className="label-eyebrow">Über Quantm Trade</span>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
          Quantitative Analyse, <span className="text-gradient-primary">demokratisiert</span>.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Wir bauen die Tools, die institutionelle Trader täglich nutzen — multi-Faktor-Scoring,
          Backtests, Broker-Konsens — und machen sie für jeden Privatanleger zugänglich.
          Ohne Lärm, ohne Hype, nur Daten.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat k="Assets gescannt" v="500+" />
        <Stat k="Indikatoren" v="14" />
        <Stat k="Datenquellen" v="6" />
        <Stat k="Update-Frequenz" v="60s" />
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-semibold">Unsere Mission</h2>
        <div className="surface p-6 leading-relaxed text-muted-foreground space-y-3">
          <p>
            Bloomberg Terminal kostet 24.000&nbsp;USD pro Jahr. TradingView Premium-Daten
            sind hinter Paywalls versteckt. Klassische Broker-Apps zeigen nur Preise.
          </p>
          <p className="text-foreground">
            Quantm Trade kombiniert <span className="text-primary">technische Indikatoren</span>,{" "}
            <span className="text-primary">Wall-Street-Broker-Einschätzungen</span> und{" "}
            <span className="text-primary">KI-Erklärungen</span> in einem einzigen Workspace —
            zu einem Preis, den jeder zahlen kann.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-semibold">Werte</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Value icon={ShieldCheck} title="Transparenz zuerst" body="Jede Zahl ist nachvollziehbar. Methodik ist offen dokumentiert — siehe unsere Methodology-Seite." />
          <Value icon={Lock} title="Daten gehören dir" body="Keine Werbung, kein Verkauf von Nutzerdaten. End-to-End verschlüsselt, DSGVO-konform." />
          <Value icon={Cpu} title="Daten vor Meinung" body="Wir publizieren keine Kursziele oder 'heiße Tipps'. Nur statistische Signale." />
          <Value icon={Users} title="Privatanleger zuerst" body="Gebaut für Trader, die ihre Entscheidungen verstehen wollen — nicht für Robo-Advisor-Kunden." />
          <Value icon={Globe} title="Multi-Market" body="US, EU, DE, UK, JP — Aktien, Indizes, Rohstoffe, Krypto. Ein Account, alle Märkte." />
          <Value icon={Sparkles} title="KI als Co-Pilot" body="KI erklärt, was die Daten zeigen — sie ersetzt nicht dein Urteil. Du triffst die Entscheidung." />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-semibold">Kontakt</h2>
        <div className="surface p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Fragen, Feedback oder Presse?</div>
            <a href="mailto:QuantmTradeInbox@proton.me" className="text-lg font-display font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
              <Mail className="h-4 w-4" /> QuantmTradeInbox@proton.me
            </a>
          </div>
          <div className="flex gap-3">
            <Link to="/methodology" className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary/40 transition-colors">Methodik</Link>
            <Link to="/status" className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary/40 transition-colors inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-bull animate-pulse" /> Status
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
