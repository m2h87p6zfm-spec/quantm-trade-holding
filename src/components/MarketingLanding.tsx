import { Link } from "@tanstack/react-router";
import { ArrowRight, Brain, LineChart, ShieldCheck, Sparkles, Target, Zap, Check } from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";

export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Inter, Satoshi, ui-sans-serif, system-ui" }}>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-violet-accent/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
          <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <ApexLogo className="h-7 w-7" />
            <span>Quantm Trade</span>
          </div>

          <div className="mt-16 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              AI-Trading-Intelligenz
            </div>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Bessere Trading-Entscheidungen.{" "}
              <span className="text-gradient-primary">Datenbasiert. Transparent. In Sekunden.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              Quantm Trade kombiniert quantitative Modelle, AI-Analysen und Live-Marktdaten — und liefert dir klare KAUF-, HALTEN- oder VERKAUFEN-Signale mit nachvollziehbarer Begründung. Keine Blackbox. Kein Hype.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/preise"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.6)] transition hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" /> 7 Tage Elite gratis testen
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/70 bg-card/40 px-6 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40"
              >
                Anmelden
              </Link>
              <Link
                to="/track-record"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/40 px-4 text-sm text-muted-foreground transition hover:text-foreground"
              >
                Track Record ansehen
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-bull" /> Keine Kreditkartenpflicht für Free</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-bull" /> Jederzeit kündbar</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-bull" /> DSGVO-konform · Server in der EU</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why us — 3 reasons */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Warum Quantm Trade</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Drei Gründe, warum Trader uns wählen.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Brain,
              title: "Quant + AI in einem System",
              desc: "Wir verbinden technische Indikatoren, Marktregime-Erkennung und LLM-Analysen zu einem klaren Verdict — nicht zu einem weiteren Chart, das du selbst deuten musst.",
            },
            {
              icon: Target,
              title: "Erfolg, der überprüfbar ist",
              desc: "Jede Analyse wird automatisch nach 7, 30, 60 und 90 Tagen ausgewertet. Unser öffentlicher Track Record zeigt, welche Verdicts wirklich aufgegangen sind.",
            },
            {
              icon: ShieldCheck,
              title: "Klar, ehrlich, ohne Hype",
              desc: "Keine Telegram-Pumps, keine Affiliate-Picks. Du bekommst nachvollziehbare Signale mit Konfidenz-Score und kannst jede Entscheidung selbst prüfen.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur transition hover:border-primary/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Was du bekommst</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Eine Plattform statt zehn Tools.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Watchlist, Quant-Signale, AI-Chat, Markt-Radar, Portfolio-Analytics, Backtests und Push-Alerts — alles unter einem Dach, in einer einzigen Ansicht.
              </p>
              <Link
                to="/preise"
                className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Pläne ansehen <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Zap, label: "AI-Analyse-Agent" },
                { icon: LineChart, label: "Live-Signale & Verdicts" },
                { icon: Target, label: "Picks & Screener" },
                { icon: Brain, label: "Portfolio-Chat" },
                { icon: ShieldCheck, label: "Risk-Assessment" },
                { icon: Sparkles, label: "Markt-Radar & News-AI" },
              ].map((b) => (
                <li key={b.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <b.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{b.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Teste Elite 7 Tage lang — komplett gratis.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Volle Quant-Suite, AI-Agent, Picks & Alerts. Du wirst erst nach Ablauf der 7 Tage abgebucht. Kündigung jederzeit mit einem Klick.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/preise"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.6)] transition hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> 7 Tage Elite gratis starten <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/70 bg-card/40 px-6 text-sm font-medium text-foreground transition hover:border-primary/40"
          >
            Schon Account? Anmelden
          </Link>
        </div>
        <p className="mt-6 text-[11px] text-muted-foreground">
          Quantm Trade ist keine Anlageberatung. Alle Inhalte dienen ausschließlich Informations- und Bildungszwecken.
        </p>
      </section>
    </div>
  );
}
