// Apex Trades Logo — ein "A" aus drei Candlesticks, das zur Spitze (Apex) aufsteigt.
// Links: bärische Candle (kurz, rot) · Mitte: bullische Candle (lang, grün) bildet den
// Peak · Rechts: bullische Candle (mittel, gold). Die Querstrebe des "A" ist eine
// aufwärts-Trendlinie mit Pfeilspitze. Wicks oben/unten betonen Candle-Charakter.
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
        <linearGradient id="apex-bull" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.62 0.18 145)" />
          <stop offset="100%" stopColor="oklch(0.78 0.20 145)" />
        </linearGradient>
        <linearGradient id="apex-gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.70 0.14 80)" />
          <stop offset="100%" stopColor="oklch(0.86 0.16 90)" />
        </linearGradient>
        <linearGradient id="apex-bear" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.55 0.20 25)" />
          <stop offset="100%" stopColor="oklch(0.68 0.22 30)" />
        </linearGradient>
      </defs>

      {/* Linke Candle (bearish, kurz) — bildet linken Schenkel des A */}
      <line x1="6" y1="6" x2="6" y2="28" stroke="url(#apex-bear)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <rect x="4" y="14" width="4" height="12" rx="0.5" fill="url(#apex-bear)" />

      {/* Mittlere Candle (bullish, lang) — bildet den Peak / Spitze des A */}
      <line x1="16" y1="2" x2="16" y2="30" stroke="url(#apex-bull)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <rect x="14" y="5" width="4" height="21" rx="0.5" fill="url(#apex-bull)" />

      {/* Rechte Candle (bullish, mittel, gold) — rechter Schenkel des A */}
      <line x1="26" y1="4" x2="26" y2="28" stroke="url(#apex-gold)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <rect x="24" y="10" width="4" height="16" rx="0.5" fill="url(#apex-gold)" />

      {/* Querstrebe des A: Trendlinie mit Pfeil nach oben rechts */}
      <path
        d="M 5 22 L 27 12"
        stroke="oklch(0.85 0.15 85)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Pfeilspitze am oberen Ende der Trendlinie */}
      <path
        d="M 27 12 L 23.5 12.3 M 27 12 L 26.7 15.5"
        stroke="oklch(0.85 0.15 85)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Mini-Spark am Apex-Punkt: signalisiert "live" */}
      <circle cx="16" cy="4" r="1.3" fill="oklch(0.9 0.18 145)" />
      <circle cx="16" cy="4" r="2.6" fill="oklch(0.9 0.18 145)" opacity="0.25" />
    </svg>
  );
}
