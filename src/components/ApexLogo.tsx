import logoUrl from "@/assets/quantm-trade-logo.png";

type Props = {
  className?: string;
  /** Kept for API compatibility. */
  animate?: boolean;
};

/**
 * Quantm Trade brand mark — silver/metallic Q with upward arrow.
 * The asset is silver on a transparent/dark background and renders
 * legibly on both light and dark themes without inversion.
 */
export function ApexLogo({ className = "h-6 w-auto" }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Quantm Trade"
      className={`${className} select-none object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]`}
      draggable={false}
    />
  );
}
