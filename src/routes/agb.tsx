import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/agb")({
  head: () => ({
    meta: [
      { title: "AGB — Quantum Trade" },
      { name: "description", content: "Allgemeine Geschäftsbedingungen für die Nutzung von Quantum Trade." },
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
      <p className="mt-2 text-sm text-muted-foreground">Stand: Mai 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="font-semibold text-foreground">§ 1 Geltungsbereich und Vertragspartner</h2>
          <p className="mt-1">
            Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") regeln das Vertragsverhältnis zwischen
            Yannick Sutter, Quantum Trade (Einzelunternehmen), Pistoriusstraße 7, 13086 Berlin (nachfolgend „Anbieter"
            oder „wir") und dem Nutzer der unter quantmtrade.com sowie zugehörigen Subdomains erreichbaren
            Plattform „Quantum Trade" (nachfolgend „Plattform" oder „Dienst"). Mit der Registrierung eines
            Kontos akzeptiert der Nutzer diese AGB in der jeweils zum Zeitpunkt der Registrierung gültigen Fassung.
            Abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer
            Geltung ausdrücklich schriftlich zu.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 2 Leistungsbeschreibung</h2>
          <p className="mt-1">
            Quantum Trade ist ein rein <strong>informations-, analyse- und bildungsbasiertes</strong> Werkzeug.
            Wir stellen aggregierte Marktdaten, statistische Indikatoren (z. B. Z-Score, RSI, MACD, Bollinger-Bänder),
            algorithmische Auswertungen sowie KI-generierte Zusammenfassungen bereit. Diese Inhalte dienen
            ausschließlich der Information und Weiterbildung.
          </p>
          <p className="mt-2">
            Die Plattform stellt <strong>keine Anlageberatung</strong>, keine individuelle Empfehlung im Sinne des
            § 2 Abs. 8 Nr. 10 WpHG, keine Vermögensverwaltung, keine Finanzanalyse i. S. d. § 85 WpHG und keine
            sonstige erlaubnispflichtige Finanzdienstleistung dar. Alle dargestellten Signale, Wahrscheinlichkeiten
            und Empfehlungen sind generisch und beruhen auf öffentlich verfügbaren Marktdaten. Sie ersetzen
            keinesfalls die eigenständige Prüfung durch den Nutzer oder eine professionelle Beratung durch einen
            zugelassenen Anlageberater.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 3 Registrierung und Nutzerkonto</h2>
          <p className="mt-1">
            Die Nutzung der Plattform setzt die Anlage eines persönlichen Kontos voraus. Der Nutzer ist verpflichtet,
            bei der Registrierung wahrheitsgemäße Angaben zu machen und sein Passwort vertraulich zu behandeln. Die
            Weitergabe von Zugangsdaten an Dritte ist untersagt. Der Nutzer haftet für sämtliche Aktivitäten, die
            unter seinem Konto vorgenommen werden, sofern er deren Veranlassung zu vertreten hat. Der Anbieter ist
            berechtigt, Konten bei begründetem Verdacht auf Missbrauch, mehrfacher Registrierung oder Verstoß gegen
            diese AGB ohne Vorankündigung vorübergehend zu sperren oder zu löschen.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 4 Abonnements, Preise und Zahlung</h2>
          <p className="mt-1">
            Die Plattform bietet eine kostenlose Grundversion sowie kostenpflichtige Abonnement-Stufen
            („Quantum Pro" und „Quantum Elite"). Die jeweils aktuellen Preise, Funktionsumfänge und Abrechnungszeiträume
            sind auf der Preisseite einsehbar und werden zum Zeitpunkt des Vertragsabschlusses verbindlich. Abonnements
            verlängern sich automatisch um den jeweils gewählten Zeitraum, sofern sie nicht spätestens am Tag vor
            Ablauf der laufenden Periode gekündigt werden.
          </p>
          <p className="mt-2">
            Die Zahlungsabwicklung erfolgt ausschließlich über unseren Zahlungsdienstleister Stripe Payments Europe, Ltd.
            Es gelten ergänzend deren Allgemeine Geschäftsbedingungen. Der Anbieter speichert keine Zahlungsdaten;
            es wird lediglich eine Stripe-Kundenkennung sowie der jeweilige Abostatus verarbeitet.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 5 Widerrufsrecht für Verbraucher</h2>
          <p className="mt-1">
            Verbrauchern steht bei kostenpflichtigen Abonnements ein gesetzliches Widerrufsrecht von 14 Tagen ab
            Vertragsschluss zu. Der Widerruf ist formfrei möglich, beispielsweise per E-Mail an
            QuantmTradeInbox@proton.me unter eindeutiger Bezeichnung des Vertrags.
          </p>
          <p className="mt-2">
            <strong>Erlöschen des Widerrufsrechts:</strong> Das Widerrufsrecht erlischt bei einem Vertrag über die
            Lieferung von nicht auf einem körperlichen Datenträger befindlichen digitalen Inhalten gemäß § 356
            Abs. 5 BGB vorzeitig, wenn der Anbieter mit der Vertragsausführung begonnen hat, nachdem der Nutzer
            ausdrücklich zugestimmt hat, dass mit der Ausführung vor Ablauf der Widerrufsfrist begonnen wird, und
            seine Kenntnis davon bestätigt hat, dass durch seine Zustimmung mit Beginn der Ausführung des Vertrags
            sein Widerrufsrecht erlischt. Diese Zustimmung wird im Bestellprozess ausdrücklich abgefragt.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 6 Risikohinweis und Haftungsausschluss</h2>
          <p className="mt-1">
            Der Handel mit Wertpapieren, Derivaten, Kryptowährungen und sonstigen Finanzinstrumenten ist mit
            erheblichen Verlustrisiken verbunden. Es besteht das Risiko des <strong>vollständigen Kapitalverlusts</strong>.
            Historische Kursverläufe sowie vergangene Signalqualität sind kein verlässlicher Indikator für künftige
            Entwicklungen. Sämtliche Anlageentscheidungen trifft der Nutzer eigenverantwortlich.
          </p>
          <p className="mt-2">
            Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der
            Gesundheit sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen. Für leicht fahrlässig
            verursachte Schäden haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht
            (Kardinalpflicht), und in diesem Fall der Höhe nach begrenzt auf den vertragstypisch vorhersehbaren
            Schaden. Eine darüber hinausgehende Haftung, insbesondere für Anlageverluste, entgangenen Gewinn oder
            mittelbare Schäden, ist ausgeschlossen. Marktdaten werden von Drittanbietern bezogen und können
            verzögert, lückenhaft oder fehlerhaft sein; der Anbieter übernimmt keine Gewähr für deren Richtigkeit,
            Vollständigkeit oder Aktualität.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 7 Nutzungsrechte und Inhalte</h2>
          <p className="mt-1">
            Der Nutzer erhält für die Dauer des Vertrages ein einfaches, nicht übertragbares und nicht
            unterlizenzierbares Recht zur bestimmungsgemäßen Nutzung der Plattform. Inhalte (insbesondere
            Auswertungen, Signale, Texte, Grafiken) dürfen ohne vorherige schriftliche Zustimmung des Anbieters
            nicht systematisch ausgelesen, automatisiert abgerufen (Scraping), öffentlich wiedergegeben oder zu
            kommerziellen Zwecken Dritten zur Verfügung gestellt werden. Reverse Engineering, Umgehung technischer
            Schutzmaßnahmen sowie das Erstellen abgeleiteter Werke ohne Zustimmung sind untersagt.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 8 Verfügbarkeit</h2>
          <p className="mt-1">
            Der Anbieter ist bemüht, die Plattform mit einer Verfügbarkeit von 99 % im Jahresmittel bereitzustellen,
            schuldet diese jedoch nicht. Ausgenommen sind Zeiten, in denen die Plattform aufgrund von Wartung,
            Aktualisierungen, Störungen von Drittanbietern (z. B. Marktdaten-Provider) oder höherer Gewalt nicht
            erreichbar ist. Geplante Wartungsfenster werden, soweit möglich, vorab angekündigt.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 9 Kündigung</h2>
          <p className="mt-1">
            Abonnements können jederzeit zum Ende der laufenden Abrechnungsperiode ordentlich gekündigt werden. Die
            Kündigung erfolgt durch den Nutzer selbständig im Bereich „Konto → Abo verwalten" oder per E-Mail an
            QuantmTradeInbox@proton.me. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt für beide
            Parteien unberührt. Bei Kündigung durch den Anbieter aus wichtigem Grund wird eine bereits gezahlte
            Vergütung anteilig erstattet, soweit die Plattform aufgrund der Kündigung nicht weiter genutzt werden kann.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 10 Änderungen der AGB</h2>
          <p className="mt-1">
            Der Anbieter ist berechtigt, diese AGB mit Wirkung für die Zukunft anzupassen, soweit dies aus sachlichen
            Gründen (z. B. Rechtsänderungen, neue Funktionen, technische Anpassungen) erforderlich ist und den
            Nutzer nicht unangemessen benachteiligt. Änderungen werden dem Nutzer mindestens sechs Wochen vor
            Inkrafttreten in Textform mitgeteilt. Widerspricht der Nutzer den Änderungen nicht innerhalb von sechs
            Wochen nach Zugang der Mitteilung, gelten die geänderten Bedingungen als angenommen. Auf dieses
            Zustimmungsfiktion-Verfahren wird in der Änderungsmitteilung gesondert hingewiesen.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">§ 11 Schlussbestimmungen</h2>
          <p className="mt-1">
            Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
            Zwingende verbraucherschützende Vorschriften des Staates, in dem der Verbraucher seinen gewöhnlichen
            Aufenthalt hat, bleiben unberührt. Ausschließlicher Gerichtsstand für sämtliche Streitigkeiten aus oder
            im Zusammenhang mit diesem Vertrag ist, soweit gesetzlich zulässig, der Sitz des Anbieters. Sollten
            einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen
            Bestimmungen unberührt.
          </p>
        </section>
      </div>
    </div>
  );
}
