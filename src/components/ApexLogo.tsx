import logoUrl from "@/assets/quantm-trade-logo.png";

type Props = {
  className?: string;
  /** Kept for API compatibility. */
  animate?: boolean;
};

/**
 * Quantm Trade brand lockup — Q-orbit monogram + wordmark.
 * Logo asset is white on transparent; in light mode it's inverted to dark
 * via a CSS filter so it stays legible on both themes.
 */
export function ApexLogo({ className = "h-6 w-auto" }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Quantm Trade"
      className={`${className} select-none [.light_&]:invert`}
      draggable={false}
    />
  );
}
