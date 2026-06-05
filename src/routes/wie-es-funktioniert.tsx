import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Database, Bell, ShieldCheck, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/wie-es-funktioniert")({
  head: () => ({
    meta: [
      { title: "Wie es funktioniert — Quantm Trade einfach erklärt" },
      {
        name: "description",
        content:
          "In einfachen Worten: So findet unser Algorithmus die richtigen Aktien. Keine Formeln, keine Fachsprache — nur klare Erklärungen für Einsteiger.",
      },
      { property: "og:title", content: "Wie Quantm Trade funktioniert" },
      { property: "og:description", content: "Aktienanalyse einfach erklärt — in fünf Schritten." },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    icon: Database,
    title: "Wir sammeln Marktdaten",
    text: "Jede Nacht ziehen wir Kursdaten, Bilanzen und Nachrichten zu über 1.000 Aktien — automatisch und ohne Pause.",
  },
  {
    icon: Brain,
    title: "Der Algorithmus rechnet",
    text: "Wie ein erfahrener Analyst, der nie schläft, prüft unser System jede Aktie anhand von 15 statistischen Faktoren — von Trends bis zu Risiko.",
  },
  {
    icon: Sparkles,
    title: "Nur die besten Kandidaten bleiben übrig",
    text: "Erreicht eine Aktie eine ausreichend hohe Wahrscheinlichkeit, schlagen wir sie als Empfehlung vor. Alle anderen filtern wir aus.",
  },
  {
    icon: Bell,
    title: "Sie bekommen eine klare Empfehlung",
    text: "In einfacher Sprache: Kaufen oder beobachten. Mit einer kurzen Begründung — kein Fachjargon.",
  },
  {
    icon: ShieldCheck,
    title: "Wir prüfen uns selbst",
    text: "Nach 7, 30, 60 und 90 Tagen werten wir jede Empfehlung aus. Treffer und Fehlschüsse landen öffentlich im Track Record.",
  },
];

const FAQ = [
  {
    q: "Bekomme ich konkrete Kaufempfehlungen?",
    a: "Ja. Unser Algorithmus schlägt regelmäßig einzelne Aktien vor — mit Kursziel und klarer Begründung. Sie entscheiden, ob und wann Sie handeln.",
  },
  {
    q: "Ist das eine Anlageberatung?",
    a: "Nein. Quantm Trade liefert datenbasierte Hinweise und Analysen. Die Entscheidung — und das Risiko — liegen immer bei Ihnen.",
  },
  {
    q: "Wie viel Vorwissen brauche ich?",
    a: "Keins. Wir haben die Plattform so gebaut, dass auch komplette Einsteiger sofort verstehen, was zu tun ist. Fachbegriffe sind versteckt — wer mehr wissen will, klappt sie auf.",
  },
  {
    q: "Was kostet das?",
    a: "Sie können Elite 7 Tage gratis testen. Danach wird das Abo automatisch fortgesetzt — Kündigung jederzeit mit einem Klick.",
  },
  {
    q: "Warum sollte ein Algorithmus besser sein als ich?",
    a: "Er ist nicht zwingend besser — aber schneller und emotionsfrei. Er prüft tausende Aktien gleichzeitig nach denselben Kriterien. Das schafft kein Mensch.",
  },
  {
    q: "Sehe ich auch Ihre Verluste?",
    a: "Ja, sogar bewusst. Im Track Record stehen alle Empfehlungen — Gewinne wie Verluste. Nur so können Sie uns ehrlich einschätzen.",
  },
];

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Wie es funktioniert</div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">
            Aktienanalyse — einfach erklärt.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Keine Formeln, keine Fachsprache. Fünf Schritte, die zeigen, wie unser Algorithmus Ihnen Zeit spart und gute Empfehlungen liefert.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16 space-y-4">
        {STEPS.map((s, i) => (
          <section key={s.title} className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Schritt {i + 1}
                </div>
                <h2 className="mt-1 text-xl font-bold tracking-tight">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </div>
          </section>
        ))}
      </main>

      {/* FAQ */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">Häufige Fragen</h2>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Was Einsteiger uns am häufigsten fragen.
          </p>
          <Accordion type="single" collapsible className="mt-8 space-y-2">
            {FAQ.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`faq-${i}`}
                className="rounded-xl border border-border/60 bg-card/40 px-4"
              >
                <AccordionTrigger className="text-left text-base font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 pb-20 text-center">
        <div className="rounded-3xl border border-border/60 bg-card/40 p-8 md:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Bereit, die nächste Empfehlung zu sehen?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Schauen Sie sich aktuelle Picks an oder testen Sie Elite 7 Tage lang gratis.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/picks"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Aktuelle Picks ansehen <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/preise"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-background/40 px-5 text-sm font-medium text-foreground transition hover:border-primary/40"
            >
              7 Tage Elite gratis starten
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
