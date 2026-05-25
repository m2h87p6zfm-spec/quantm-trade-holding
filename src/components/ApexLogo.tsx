type Props = {
  className?: string;
  /** Kept for API compatibility. */
  animate?: boolean;
};

/**
 * Quantm Trade wordmark — custom SVG lockup.
 * Bracket frame + bold geometric type = recognizable, sharp, theme-aware.
 * Uses currentColor so it inherits foreground; brand mint accent on the brackets.
 */
export function ApexLogo({ className = "h-5 w-auto" }: Props) {
  return (
    <svg
      viewBox="0 0 220 40"
      role="img"
      aria-label="Quantm Trade AI"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left bracket */}
      <path
        d="M10 6 H4 V34 H10"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="square"
        fill="none"
      />
      {/* Right bracket */}
      <path
        d="M210 6 H216 V34 H210"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="square"
        fill="none"
      />
      {/* Wordmark */}
      <text
        x="110"
        y="26"
        textAnchor="middle"
        fontFamily="var(--font-display), 'Space Grotesk', sans-serif"
        fontSize="18"
        fontWeight="700"
        letterSpacing="2"
        fill="currentColor"
      >
        QUANTM
        <tspan fill="var(--primary)" dx="6">TRADE</tspan>
      </text>
      {/* AI tag */}
      <text
        x="110"
        y="37"
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize="6"
        fontWeight="600"
        letterSpacing="4"
        fill="var(--muted-foreground)"
      >
        · AI ·
      </text>
    </svg>
  );
}
