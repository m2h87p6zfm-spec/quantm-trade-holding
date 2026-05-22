// Apex Trades Logo — Konzept "Trained Peak":
// Ein abstrakter Gipfel (Apex) entsteht aus drei aufsteigenden Trainings-Stufen
// (wie XP-/Level-Bars), die nach oben schmaler und intensiver werden — Sinnbild
// für progressives Training. Eine durchgehende Chart-Linie schneidet als
// Trade-Trajektorie quer durch die Stufen und endet in einem Spark am Gipfel:
// das trainierte Setup, das den Peak trifft. Monogramm-Form bildet zugleich
// ein stilisiertes "A" für Apex.
export function ApexLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Apex Trades"
    >
      <defs>
        <linearGradient id="apex-peak" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.55 0.01 250)" />
          <stop offset="100%" stopColor="oklch(0.95 0.01 250)" />
        </linearGradient>
        <linearGradient id="apex-trail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.75 0.01 250)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.98 0 0)" />
        </linearGradient>
        <radialGradient id="apex-spark" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="oklch(0.98 0 0)" />
          <stop offset="60%" stopColor="oklch(0.85 0.01 250)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.85 0.01 250)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Trainings-Stufen: drei aufsteigende Level-Bars formen den Gipfel (A) */}
      {/* Basis-Level (breit, gedämpft) */}
      <path
        d="M 3 27 L 16 7 L 29 27 Z"
        fill="url(#apex-peak)"
        opacity="0.15"
      />

      {/* Mittleres Level */}
      <path
        d="M 7.5 24 L 16 11 L 24.5 24 Z"
        fill="url(#apex-peak)"
        opacity="0.45"
      />
      {/* Top-Level (intensiv) — finaler Gipfel */}
      <path
        d="M 12 20 L 16 14 L 20 20 Z"
        fill="url(#apex-peak)"
      />

      {/* Stufen-Kanten als Training-Marker links und rechts */}
      <path d="M 3 27 L 7.5 24" stroke="url(#apex-peak)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M 7.5 24 L 12 20" stroke="url(#apex-peak)" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M 29 27 L 24.5 24" stroke="url(#apex-peak)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M 24.5 24 L 20 20" stroke="url(#apex-peak)" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />

      {/* Trade-Trajektorie: Chart-Linie steigt aus links unten quer durch die
          Stufen, durchbricht den Top-Level und trifft den Gipfel */}
      <path
        d="M 2 26 L 9 22 L 13 23 L 16 14"
        stroke="url(#apex-trail)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Spark am Apex — der getroffene Punkt */}
      <circle cx="16" cy="14" r="4" fill="url(#apex-spark)" />
      <circle cx="16" cy="14" r="1.6" fill="oklch(0.98 0.14 95)" />
    </svg>
  );
}
