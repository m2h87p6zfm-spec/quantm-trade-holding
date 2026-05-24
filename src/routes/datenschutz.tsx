import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutz — Quantm Trade" },
      { name: "description", content: "Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO." },
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
      <p className="mt-2 text-sm text-muted-foreground">Information nach Art. 13 DSGVO.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="font-semibold text-foreground">1. Verantwortlicher</h2>
          <p className="mt-1">[Anbieter wie im Impressum]</p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">2. Verarbeitete Daten</h2>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li><strong>Konto:</strong> E-Mail, Name, Passwort-Hash (Auth-Provider: Supabase).</li>
            <li><strong>Zahlung:</strong> Stripe Customer-ID, Abo-Status. Keine Speicherung von Kartendaten.</li>
            <li><strong>Nutzungsdaten:</strong> Watchlist, Einstellungen, Portfolio-Eingaben — gespeichert in unserer Datenbank.</li>
            <li><strong>Logs:</strong> IP, User-Agent, Zeitstempel zur Abwehr von Missbrauch (Aufbewahrung max. 30 Tage).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">3. Rechtsgrundlagen</h2>
          <p className="mt-1">
            Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), lit. f (berechtigtes Interesse an Sicherheit & Funktion),
            lit. a (Einwilligung, soweit gesondert eingeholt).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">4. Auftragsverarbeiter / Drittdienste</h2>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> (Hosting, Auth, DB) — Standardvertragsklauseln.</li>
            <li><strong>Stripe</strong> (Zahlungsabwicklung).</li>
            <li><strong>Yahoo Finance / Finnhub</strong> — anonyme Abruf von Marktdaten.</li>
            <li><strong>OpenAI / Google (Lovable AI Gateway)</strong> — KI-Auswertungen; übermittelt werden ausschließlich anonymisierte Markt- und Indikatordaten.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">5. Speicherdauer</h2>
          <p className="mt-1">
            Kontodaten werden gelöscht, sobald das Konto gelöscht wird (Konto → „Konto löschen"). Gesetzliche Aufbewahrungsfristen
            (z.B. Rechnungen, 10 Jahre nach § 147 AO) bleiben unberührt.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">6. Deine Rechte</h2>
          <p className="mt-1">
            Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20),
            Widerspruch (Art. 21) sowie Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">7. Cookies / Local Storage</h2>
          <p className="mt-1">
            Wir verwenden technisch notwendigen Local Storage zur Speicherung von Login-Session, Einstellungen und Watchlist.
            Es werden keine Tracking- oder Werbe-Cookies eingesetzt.
          </p>
        </section>

        <p className="pt-4 text-xs italic text-muted-foreground">
          Hinweis: Diese Erklärung ist eine Vorlage. Vor Veröffentlichung individuell prüfen und anpassen lassen.
        </p>
      </div>
    </div>
  );
}
