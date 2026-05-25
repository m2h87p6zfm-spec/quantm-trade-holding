import logoUrl from "@/assets/quantm-trade-logo.png";

type Props = {
  className?: string;
  /** Kept for API compatibility — not used by the raster logo. */
  animate?: boolean;
};

/**
 * Quantm Trade brand lockup.
 * - Mint "Q" monogram tile gives an instantly recognizable mark, even at small sizes
 *   or when used as a favicon-style avatar.
 * - Wordmark sits next to it with a soft glow + brightness lift so the teal raster
 *   stays legible on the dark UI.
 */
export function ApexLogo({ className = "h-4 w-auto" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="relative inline-flex h-full aspect-square items-center justify-center rounded-md
                   bg-gradient-to-br from-primary to-cyan-accent
                   text-primary-foreground font-display font-bold
                   shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]
                   ring-1 ring-primary/40"
        style={{ fontSize: "0.72em", lineHeight: 1 }}
      >
        Q
      </span>
      <img
        src={logoUrl}
        alt="Quantm Trade AI"
        className="h-full w-auto brightness-125 contrast-110
                   drop-shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
        draggable={false}
      />
    </span>
  );
}
