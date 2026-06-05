import { Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Bell, UserCheck, Check, Shield, BarChart3, Sparkles } from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";

/**
 * Beginner-first landing page for unauthenticated visitors.
 * Goal: build trust in <10 seconds, hide all jargon, one clear CTA.
 */
export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Inter, Satoshi, ui-sans-serif, system-ui" }}>
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <ApexLogo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">Quantm Trade</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link to="/picks" className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Picks</Link>
            <Link to="/track-record" className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Track Record</Link>
            <Link to="/wie-es-funktioniert" className="hidden sm:inline-flex px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Wie es funktioniert</Link>
            <Link
              to="/login"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Anmelden
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Quantm Picks
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Die richtigen Aktien. Ohne den ganzen Aufwand.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base sm:text-lg leading-relaxed text-muted-foreground">
            Wir analysieren täglich tausende Aktien mit mathematischen Algorithmen und liefern Ihnen klare Kaufempfehlungen — damit Sie mehr Zeit für das Wichtige haben.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/picks"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.6)] transition hover:opacity-90"
            >
              Jetzt Empfehlungen sehen <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/wie-es-funktioniert"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card/40 px-5 text-sm font-medium text-foreground/90 backdrop-blur transition hover:border-primary/40"
            >
              Wie funktioniert das?
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Über 200 analysierte Aktien pro Woche · 7 Tage Elite gratis testen · Jederzeit kündbar
          </p>
        </div>
      </section>

      {/* How it works — 3 steps */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">So funktioniert's</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">In drei Schritten zur Empfehlung.</h2>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Brain,
                title: "Algorithmus analysiert",
                text: "Unsere KI durchsucht täglich den Markt nach den besten Chancen.",
              },
              {
                icon: Bell,
                title: "Sie erhalten eine Empfehlung",
                text: "Klare Kauf- oder Warteempfehlung, direkt in der App.",
              },
              {
                icon: UserCheck,
                title: "Sie entscheiden",
                text: "Sie behalten immer die Kontrolle über Ihr Portfolio.",
              },
            ].map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-border/60 bg-card/40 p-6">
                <div className="absolute -top-3 left-6 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust bar */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <ul className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {[
            { icon: BarChart3, label: "Basierend auf quantitativer Finanzanalyse" },
            { icon: Sparkles, label: "Monte-Carlo-Simulation" },
            { icon: Shield, label: "Transparent — wir zeigen auch unsere Verluste" },
          ].map((b) => (
            <li
              key={b.label}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-xs font-medium text-foreground/80"
            >
              <b.icon className="h-3.5 w-3.5 text-primary" />
              {b.label}
            </li>
          ))}
        </ul>
      </section>

      {/* Track record teaser — single big proof point */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-border/60 bg-card/40 p-8 md:p-12 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Track Record</div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Wir zeigen jede einzelne Empfehlung — gute wie schlechte.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Vertrauen baut sich über Zeit auf. Deshalb dokumentieren wir alle Empfehlungen öffentlich und prüfen nach 7, 30, 60 und 90 Tagen, ob wir richtig lagen.
          </p>
          <Link
            to="/track-record"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background/40 px-5 text-sm font-medium text-foreground transition hover:border-primary/40"
          >
            Vollständigen Track Record ansehen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Testen Sie Elite 7 Tage lang — komplett gratis.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-muted-foreground">
          Volle Picks, Algorithmus-Analysen und Push-Benachrichtigungen. Erst nach Ablauf der 7 Tage wird abgebucht — eine Kündigung ist jederzeit mit einem Klick möglich.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/preise"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            7 Tage Elite gratis starten <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card/40 px-5 text-sm font-medium text-foreground transition hover:border-primary/40"
          >
            Schon Account? Anmelden
          </Link>
        </div>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-bull" /> Keine Kreditkartenpflicht für Free</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-bull" /> DSGVO-konform · Server in der EU</span>
        </p>
      </section>

      <footer className="border-t border-border/40 py-6 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Quantm Trade — Keine Anlageberatung. Alle Inhalte dienen ausschließlich Informations- und Bildungszwecken.
      </footer>
    </div>
  );
}
