import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/agb")({
  head: () => ({
    meta: [
      { title: "AGB — Quantm Trade" },
      { name: "description", content: "Allgemeine Geschäftsbedingungen für die Nutzung von Quantm Trade." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: AGBPage,
});

function AGBPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Zurück</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Allgemeine Geschäftsbedingungen</h1>
      <p className="mt-2 text-sm text-muted-foreground">Stand: laufend.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="font-semibold text-foreground">§ 1 Geltungsbereich</h2>
          <p className="mt-1">
            Diese AGB regeln das Vertragsverhältnis zwischen [Anbieter] und Nutzern der Plattform „Quantm Trade".
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 2 Leistungsbeschreibung</h2>
          <p className="mt-1">
            Quantm Trade ist ein <strong>informations- und bildungsbasiertes</strong> Werkzeug zur Darstellung von Marktdaten,
            statistischen Signalen und KI-gestützten Auswertungen. Es handelt sich <strong>nicht</strong> um Anlageberatung,
            Vermögensverwaltung oder Finanzanalyse i.S.d. § 85 WpHG.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 3 Registrierung & Abos</h2>
          <p className="mt-1">
            Die Nutzung kostenpflichtiger Funktionen setzt ein gültiges Abonnement voraus. Abrechnung und Verwaltung erfolgen über
            unseren Zahlungsdienstleister Stripe. Es gilt das jeweils zum Zeitpunkt des Abschlusses gültige Preisverzeichnis.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 4 Widerrufsrecht für Verbraucher</h2>
          <p className="mt-1">
            Verbraucher haben ein 14-tägiges Widerrufsrecht. Mit Beginn der Vertragsausführung (sofortiger Zugang zu digitalen Inhalten)
            erlischt das Widerrufsrecht gemäß § 356 Abs. 5 BGB nach ausdrücklicher Zustimmung.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 5 Haftung</h2>
          <p className="mt-1">
            Für Schäden aus der Nutzung der Plattform haftet der Anbieter nur bei Vorsatz und grober Fahrlässigkeit. Eine Haftung für
            Anlageentscheidungen des Nutzers ist ausgeschlossen. Marktdaten können verzögert oder fehlerhaft sein.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 6 Kündigung</h2>
          <p className="mt-1">
            Abonnements können jederzeit zum Ende der laufenden Abrechnungsperiode gekündigt werden. Die Kündigung erfolgt im
            Kundenkonto unter „Abo verwalten".
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 7 Schlussbestimmungen</h2>
          <p className="mt-1">
            Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz
            des Anbieters.
          </p>
        </section>

        <p className="pt-4 text-xs italic text-muted-foreground">
          Hinweis: Dieser Text ist eine Platzhalter-Vorlage und ersetzt keine anwaltliche Prüfung.
        </p>
      </div>
    </div>
  );
}
