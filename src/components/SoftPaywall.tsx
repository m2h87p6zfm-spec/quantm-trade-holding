import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, ArrowRight } from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";

type Props = {
  title?: string;
  description?: string;
  /** Optional: was die Nutzer hier sehen würden (Preview-Liste). */
  bulletPoints?: string[];
  /** Optional: was die Nutzer hier sehen würden (Demo-Komponente, wird hinter Blur gerendert). */
  previewSlot?: React.ReactNode;
};

/**
 * Soft-Paywall — zeigt einen einladenden Login-CTA statt einer harten
 * Redirect-Mauer. Wird genutzt, wenn nicht-eingeloggte Nutzer auf
 * persönliche Bereiche (Portfolio, Alerts, Analyse) zugreifen wollen.
 */
export function SoftPaywall({
  title = "Anmelden, um diesen Bereich zu nutzen",
  description = "Dieser Bereich ist persönlich — wir speichern hier deine Positionen, Watchlist und Alarme. Du kannst alle Empfehlungen, Track Record und Methodik aber komplett ohne Account einsehen.",
  bulletPoints,
  previewSlot,
}: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative mx-auto max-w-3xl px-4 py-12">
      {previewSlot ? (
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/40">
          <div className="pointer-events-none select-none blur-[6px] opacity-60">{previewSlot}</div>
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        </div>
      ) : null}

      <div className="rounded-3xl border border-border/60 bg-card/60 p-8 md:p-10 backdrop-blur text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </div>

        <ApexLogo className="sr-only" />
        <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {bulletPoints && bulletPoints.length > 0 ? (
          <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm text-foreground/85">
            {bulletPoints.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            search={{ redirect: pathname }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Kostenlos anmelden <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/picks"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background/40 px-5 text-sm font-medium text-foreground transition hover:border-primary/40"
          >
            Erst Empfehlungen ansehen
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          Keine Kreditkarte nötig · DSGVO-konform · Server in der EU
        </p>
      </div>
    </div>
  );
}
