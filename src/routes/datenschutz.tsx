import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutz — Quantm Trade" },
      { name: "description", content: "Informationen zur Verarbeitung personenbezogener Daten bei Quantm Trade gemäß DSGVO." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: DatenschutzPage,
});

function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Zurück</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Datenschutzerklärung</h1>
      <p className="mt-2 text-sm text-muted-foreground">Information nach Art. 13, 14 DSGVO. Stand: Mai 2026.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="font-semibold text-foreground">1. Verantwortlicher</h2>
          <p className="mt-1">
            Verantwortlicher im Sinne der DSGVO ist:<br />
            Quantm Trade Holding, Maximilian Mustermann<br />
            Musterstraße 12, 10115 Berlin, Deutschland<br />
            E-Mail: support@quantmtrade.com
          </p>
          <p className="mt-2">
            Ein Datenschutzbeauftragter ist gesetzlich nicht erforderlich. Bei Fragen zum Datenschutz erreichst du
            uns jederzeit unter der oben genannten E-Mail-Adresse.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">2. Allgemeines zur Datenverarbeitung</h2>
          <p className="mt-1">
            Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung
            einer funktionsfähigen Plattform sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung
            erfolgt regelmäßig nur nach Einwilligung des Nutzers oder wenn eine gesetzliche Grundlage die
            Verarbeitung gestattet (z. B. Vertragserfüllung).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">3. Kategorien verarbeiteter Daten</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Kontodaten:</strong> E-Mail-Adresse, ggf. Vor- und Nachname sowie Profilbild (bei Anmeldung
              über Google), Passwort-Hash (verschlüsselt durch unseren Auth-Anbieter, niemals im Klartext).
            </li>
            <li>
              <strong>Nutzungsdaten:</strong> Watchlisten, gespeicherte Portfolio-Einträge, Einstellungen,
              Handelsprofil-Antworten, Sprach- und Anzeigeeinstellungen.
            </li>
            <li>
              <strong>Zahlungsdaten:</strong> Stripe Customer-ID, Abostatus, Rechnungsverlauf. Kartendaten werden
              ausschließlich von Stripe verarbeitet und niemals auf unseren Servern gespeichert.
            </li>
            <li>
              <strong>Server-Logs:</strong> IP-Adresse, User-Agent, Zeitstempel, aufgerufene Ressource, Status-Code.
              Aufbewahrungsdauer maximal 30 Tage zur Abwehr von Missbrauch und zur Fehleranalyse.
            </li>
            <li>
              <strong>KI-Anfragen:</strong> Indikator- und Marktdaten zu einem von dir gewählten Symbol werden zur
              Auswertung an Modelle über das Lovable AI Gateway übermittelt. Eine personenbezogene Zuordnung
              erfolgt dabei nicht.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">4. Zwecke und Rechtsgrundlagen</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Bereitstellung des Dienstes</strong> (Konto, Watchlist, Auswertungen, Abonnement) —
              Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </li>
            <li>
              <strong>Sicherheit und Stabilität</strong> (Log-Auswertung, Missbrauchsabwehr, Rate-Limiting) —
              Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem funktionierenden, sicheren Dienst).
            </li>
            <li>
              <strong>Zahlungsabwicklung und Rechnungsstellung</strong> — Art. 6 Abs. 1 lit. b DSGVO, ergänzt um
              gesetzliche Aufbewahrungspflichten nach Art. 6 Abs. 1 lit. c DSGVO (§ 147 AO, § 257 HGB).
            </li>
            <li>
              <strong>Optionale Funktionen</strong> (z. B. produktbezogene E-Mail-Benachrichtigungen) — Art. 6
              Abs. 1 lit. a DSGVO (Einwilligung, jederzeit widerruflich).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">5. Auftragsverarbeiter und Drittdienste</h2>
          <p className="mt-1">
            Zur Bereitstellung der Plattform setzen wir folgende sorgfältig ausgewählte Dienstleister ein. Mit
            allen Verarbeitern bestehen Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO; Übermittlungen in
            Drittländer sind durch Standardvertragsklauseln der EU-Kommission abgesichert.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Supabase Inc.</strong> (Hosting, Datenbank, Authentifizierung) — Server in der EU.</li>
            <li><strong>Cloudflare, Inc.</strong> (Edge-Hosting, CDN, DDoS-Schutz) — Standardvertragsklauseln.</li>
            <li><strong>Stripe Payments Europe, Ltd.</strong> (Zahlungsabwicklung) — Verarbeitung in EU/USA.</li>
            <li><strong>Twelve Data Inc.</strong> (Bezug von Marktdaten) — anonymer Abruf, kein Personenbezug.</li>
            <li>
              <strong>Lovable AI Gateway</strong> (Routing an OpenAI bzw. Google Gemini) — Übermittelt werden
              ausschließlich Markt-, Indikator- und Symboldaten; keine Kontodaten.
            </li>
            <li><strong>Resend / Supabase Mail</strong> (transaktionale E-Mails wie Verifikation, Passwort-Reset).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">6. Speicherdauer</h2>
          <p className="mt-1">
            Kontodaten werden so lange gespeichert, wie das Nutzerkonto besteht. Wird das Konto gelöscht (im Bereich
            „Konto → Konto löschen"), werden sämtliche zugehörigen personenbezogenen Daten innerhalb von 30 Tagen
            unwiderruflich entfernt. Gesetzliche Aufbewahrungsfristen (insbesondere für Rechnungen nach § 147 AO
            für 10 Jahre) bleiben hiervon unberührt; die entsprechenden Datensätze werden für die weitere
            Verarbeitung gesperrt.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">7. Betroffenenrechte</h2>
          <p className="mt-1">
            Dir stehen jederzeit folgende Rechte gegenüber dem Verantwortlichen zu:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Auskunft über deine bei uns gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung („Recht auf Vergessenwerden", Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit in einem strukturierten, gängigen Format (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen Verarbeitungen auf Basis berechtigter Interessen (Art. 21 DSGVO)</li>
            <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
            <li>
              Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO), insbesondere im Mitgliedstaat deines
              gewöhnlichen Aufenthalts. In Deutschland ist dies die Datenschutzbehörde des jeweiligen Bundeslandes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">8. Cookies und Local Storage</h2>
          <p className="mt-1">
            Wir setzen ausschließlich technisch notwendige Cookies bzw. Local-Storage-Einträge ein. Diese dienen
            dazu, deine Login-Session aufrechtzuerhalten, ausgewählte Sprache, Theme, Watchlist und persönliche
            Einstellungen zu speichern. Es werden <strong>keine Tracking-, Analyse- oder Werbe-Cookies</strong>
            eingesetzt; eine Profilbildung über mehrere Websites hinweg findet nicht statt. Eine
            Einwilligung über ein Cookie-Banner ist daher gemäß § 25 Abs. 2 TTDSG nicht erforderlich.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">9. Sicherheit</h2>
          <p className="mt-1">
            Wir setzen technische und organisatorische Maßnahmen (TOM) nach Art. 32 DSGVO ein, um deine Daten
            gegen Verlust, Manipulation und unberechtigten Zugriff zu schützen. Dazu zählen insbesondere
            TLS-Verschlüsselung der Datenübertragung, Hashing von Passwörtern, strenge Zugriffstrennung auf
            Datenbank-Ebene über Row-Level-Security sowie regelmäßige Sicherheitsupdates unserer Infrastruktur.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">10. Änderungen dieser Datenschutzerklärung</h2>
          <p className="mt-1">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen
            Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen. Für deinen erneuten Besuch
            gilt dann die neue Datenschutzerklärung; wesentliche Änderungen werden wir dir gesondert mitteilen.
          </p>
        </section>
      </div>
    </div>
  );
}
