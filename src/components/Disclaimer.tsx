export function DisclaimerBanner() {
  return (
    <div className="border-t border-border bg-card/60 backdrop-blur px-4 py-2 text-[11px] leading-snug text-muted-foreground">
      <strong className="text-foreground/80">⚠️ Hinweis:</strong> Alle Analysen und Bewertungen dieser App dienen ausschließlich zu Informations- und Bildungszwecken und stellen keine Anlageberatung oder Anlageempfehlung im Sinne des Wertpapierhandelsgesetzes (WpHG) dar. Investitionen in Wertpapiere, Optionen und Zertifikate sind mit erheblichen Risiken verbunden. Der Nutzer handelt stets auf eigene Verantwortung.
    </div>
  );
}

export function DisclaimerInline() {
  return (
    <p className="mt-2 text-[10px] italic text-muted-foreground">
      Keine Anlageberatung. Nur Informations- und Bildungszweck (§ WpHG). Handel auf eigenes Risiko.
    </p>
  );
}
