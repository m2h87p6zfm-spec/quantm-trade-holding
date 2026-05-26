import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum — Quantm Trade" },
      { name: "description", content: "Anbieterkennzeichnung von Quantm Trade gemäß § 5 TMG." },
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
      <p className="mt-2 text-sm text-muted-foreground">Angaben gemäß § 5 TMG und § 18 Abs. 2 MStV.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="font-semibold text-foreground">Anbieter</h2>
          <p className="mt-1">
            Quantm Trade Holding<br />
            Inhaber: Yannick Sutter<br />
            Pistoriusstraße 7<br />
            13086 Berlin<br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Kontakt</h2>
          <p className="mt-1">
            E-Mail: support@quantmtrade.com<br />
            Web: https://quantmtrade.com
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Vertretungsberechtigt</h2>
          <p className="mt-1">Maximilian Mustermann (Inhaber)</p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Umsatzsteuer</h2>
          <p className="mt-1">
            Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen.
            Eine Umsatzsteuer-Identifikationsnummer wird nach Überschreitung der Umsatzgrenzen ergänzt.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p className="mt-1">Maximilian Mustermann, Anschrift wie oben.</p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Haftung für Inhalte</h2>
          <p className="mt-1">
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
            allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
            zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder
            Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
            Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
            Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese
            Inhalte umgehend entfernen.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Haftung für Links</h2>
          <p className="mt-1">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die
            verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
            Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Urheberrecht</h2>
          <p className="mt-1">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb
            der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw.
            Erstellers.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Streitschlichtung</h2>
          <p className="mt-1">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr" className="text-primary underline" target="_blank" rel="noreferrer">
              https://ec.europa.eu/consumers/odr
            </a>
            . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Aufsichtsbehörde</h2>
          <p className="mt-1">
            Quantm Trade erbringt keine erlaubnispflichtigen Finanzdienstleistungen im Sinne des KWG oder WpIG.
            Die Plattform stellt ausschließlich informations- und bildungsbezogene Inhalte, statistische Auswertungen
            und Marktdaten bereit. Eine Aufsicht durch die BaFin findet daher nicht statt.
          </p>
        </section>
      </div>
    </div>
  );
}
