// Apex Trades Logo — Konzept "Trained Peak":
// Abstrakter Gipfel aus zwei aufsteigenden Trainings-Stufen, durchzogen von einer
// Trade-Linie, die den Apex trifft. Hochkontrast-Version: feste Outlines via
// currentColor + Akzent-Linie, damit das Symbol auch in kleinen Headern
// (≤16px) sofort lesbar bleibt. Strokes sind non-scaling, behalten ihre
// Pixel-Breite unabhängig von der gerenderten Größe.
export function ApexLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Apex Trades"
    >
      {/* Äußerer Gipfel — gefüllt mit currentColor (niedrige Opazität),
          Outline kräftig für klare Silhouette */}
      <path
        d="M 3 27 L 16 6 L 29 27 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Innere Trainings-Stufe — markiert das Plateau zur Spitze */}
      <path
        d="M 9 23 L 16 12 L 23 23"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.55"
        vectorEffect="non-scaling-stroke"
      />

      {/* Trade-Trajektorie — Akzentfarbe, kräftige Linie, trifft den Apex */}
      <path
        d="M 4 25 L 10 22 L 14 23 L 16 6"
        stroke="hsl(var(--primary, 210 100% 60%))"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />

      {/* Apex-Spark — solider Punkt am Gipfel für sofortige Lesbarkeit */}
      <circle cx="16" cy="6" r="2.4" fill="hsl(var(--primary, 210 100% 60%))" />
      <circle cx="16" cy="6" r="1" fill="oklch(0.99 0 0)" />
    </svg>
  );
}
