import { useState } from "react";
import { ShieldAlert, X } from "lucide-react";

export function DisclaimerBanner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="border-t border-border bg-card/60 backdrop-blur px-4 py-2 text-[11px] leading-snug text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1">
          <ShieldAlert className="h-3.5 w-3.5 text-gold/80 shrink-0" />
          <strong className="text-foreground/80">Keine Anlageberatung.</strong>
          <span>
            Alle Inhalte, Analysen, Signale, KI-Ausgaben und Bewertungen sind <em>ausschließlich</em> allgemeine
            Information und Bildung — keine Finanz-, Steuer- oder Rechtsberatung und keine Empfehlung zum Kauf,
            Halten oder Verkauf von Wertpapieren i.S.d. WpHG / MiFID II.
          </span>
          <button
            onClick={() => setOpen(true)}
            className="ml-auto text-primary hover:underline underline-offset-2 font-medium"
          >
            Vollständiger rechtlicher Hinweis →
          </button>
        </div>
      </div>
      {open && <LegalModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function DisclaimerInline() {
  return (
    <div className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
      <strong className="text-foreground/80">⚠️ Keine Anlageberatung.</strong>{" "}
      Diese Auswertung dient ausschließlich Informations- und Bildungszwecken. Sie stellt keine Anlage-, Steuer- oder
      Rechtsberatung dar und ist keine Empfehlung i.S.d. § 85 WpHG / Art. 20 Marktmissbrauchsverordnung (MAR).
      Vergangene Wertentwicklungen sind kein Indikator für zukünftige Ergebnisse. Der Handel mit Wertpapieren,
      Derivaten und Kryptowerten ist mit dem <strong>Risiko des Totalverlusts</strong> verbunden. Du handelst
      eigenverantwortlich.
    </div>
  );
}

function LegalModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-5 w-5 text-gold" />
          <h2 className="text-lg font-bold">Rechtlicher Hinweis · Risikohinweis · Haftungsausschluss</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-foreground/85">
          <section>
            <h3 className="font-semibold text-foreground mb-1">1. Keine Anlageberatung, keine Empfehlung</h3>
            <p>
              Apex Trades (nachfolgend „die Plattform") ist ein rein <strong>informations- und bildungsbasiertes</strong> Werkzeug.
              Sämtliche dargestellten Inhalte — einschließlich Kursanalysen, statistischer Signale, Quant-Scores, KI-Ausgaben,
              Broker-Konsens-Anzeigen, „BUY / SELL / HOLD"-Verdikte, Watchlists, Heatmaps, Trade-Setups und Portfolio-Bewertungen —
              stellen <strong>keine Anlageberatung, Vermögensverwaltung, Finanzanalyse i.S.d. § 85 WpHG, Steuerberatung oder
              Rechtsberatung</strong> dar. Sie sind keine individuelle Empfehlung im Sinne der Marktmissbrauchsverordnung (EU)
              Nr. 596/2014 (MAR) und keine Aufforderung zum Kauf, Halten oder Verkauf von Finanzinstrumenten.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">2. Risikohinweis</h3>
            <p>
              Der Handel mit Wertpapieren, ETFs, Derivaten, Hebelprodukten, Optionen, Futures, Devisen und Kryptowerten ist mit
              <strong> erheblichen Risiken</strong> verbunden und kann zum <strong>vollständigen Verlust des eingesetzten Kapitals</strong>
              führen. Bei gehebelten Produkten besteht zusätzlich das Risiko, über den Einsatz hinaus nachschusspflichtig zu werden.
              Wertentwicklungen der Vergangenheit sind <strong>kein verlässlicher Indikator</strong> für zukünftige Ergebnisse.
              Marktdaten können verzögert, fehlerhaft oder unvollständig sein.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">3. KI-generierte Inhalte</h3>
            <p>
              Die Plattform nutzt automatisierte Verfahren, statistische Modelle und Large-Language-Models. Diese können
              <strong> fehlerhafte, unvollständige oder halluzinierte</strong> Aussagen produzieren. KI-Ausgaben werden ohne Gewähr
              bereitgestellt und ersetzen keinesfalls die eigene Recherche, die eigene Prüfung der Datenquellen oder die
              Beratung durch eine zugelassene Person (z.B. nach § 32 KWG, Anlagevermittler/-berater, Steuerberater, Rechtsanwalt).
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">4. Haftungsausschluss</h3>
            <p>
              Apex Trades, deren Betreiber, Entwickler, verbundene Unternehmen, Lizenzgeber und Datenanbieter übernehmen
              <strong> keinerlei Haftung</strong> für direkte, indirekte, mittelbare oder Folgeschäden — insbesondere für
              Vermögensschäden, entgangenen Gewinn, Daten- oder Reputationsverluste —, die aus der Nutzung, dem Vertrauen auf
              dargestellte Informationen oder der Unmöglichkeit der Nutzung entstehen. Dies gilt im weitesten gesetzlich
              zulässigen Umfang. Eine Haftung für Vorsatz und grobe Fahrlässigkeit bleibt unberührt.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">5. Keine Garantie für Verfügbarkeit oder Datenqualität</h3>
            <p>
              Kurs- und Fundamentaldaten werden von Drittanbietern (z.B. Yahoo Finance, Finnhub) bezogen und können verzögert,
              fehlerhaft oder zeitweise nicht verfügbar sein. Es besteht <strong>kein Anspruch</strong> auf ununterbrochene
              Verfügbarkeit, Vollständigkeit oder Aktualität der Plattform.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">6. Eigenverantwortung</h3>
            <p>
              Der Nutzer trifft alle Anlageentscheidungen <strong>ausschließlich auf eigene Verantwortung und auf eigenes
              Risiko</strong>. Vor einer Anlageentscheidung sollten die eigene Risikotragfähigkeit, die persönliche und
              steuerliche Situation sowie sämtliche produktbezogenen Unterlagen (z.B. KID/PRIIP, Prospekt, Jahresbericht)
              geprüft und im Zweifel eine zugelassene unabhängige Beratung in Anspruch genommen werden.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">7. Geltungsbereich / salvatorische Klausel</h3>
            <p>
              Sollten einzelne Bestimmungen dieses Hinweises unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen
              Bestimmungen unberührt. Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
            </p>
          </section>

          <p className="pt-2 text-[10px] italic text-muted-foreground">
            Stand: laufend. Mit der Nutzung der Plattform bestätigst du, diesen Hinweis gelesen und akzeptiert zu haben.
          </p>
        </div>
      </div>
    </div>
  );
}
