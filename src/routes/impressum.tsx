import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum — Quantm Trade" },
      { name: "description", content: "Anbieterkennzeichnung gemäß § 5 TMG." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Zurück</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Impressum</h1>
      <p className="mt-2 text-sm text-muted-foreground">Angaben gemäß § 5 TMG</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="font-semibold text-foreground">Anbieter</h2>
          <p className="mt-1">
            [Vollständiger Name / Firmenname]<br />
            [Straße + Hausnummer]<br />
            [PLZ Ort]<br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Kontakt</h2>
          <p className="mt-1">
            E-Mail: [kontakt@deine-domain.de]<br />
            Telefon: [+49 …]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Vertretungsberechtigt</h2>
          <p className="mt-1">[Name der vertretungsberechtigten Person]</p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Umsatzsteuer-ID</h2>
          <p className="mt-1">USt-IdNr. gemäß § 27 a UStG: [DE…]</p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Verantwortlich i.S.d. § 18 Abs. 2 MStV</h2>
          <p className="mt-1">[Name, Anschrift wie oben]</p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Streitschlichtung</h2>
          <p className="mt-1">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr" className="text-primary underline" target="_blank" rel="noreferrer">
              https://ec.europa.eu/consumers/odr
            </a>
            . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <p className="pt-4 text-xs italic text-muted-foreground">
          Hinweis: Diese Angaben sind Platzhalter. Bitte vor Veröffentlichung durch die tatsächlichen Anbieterdaten ersetzen.
        </p>
      </div>
    </div>
  );
}
