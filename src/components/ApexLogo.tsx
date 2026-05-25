import logoUrl from "@/assets/quantm-trade-logo.png";

type Props = {
  className?: string;
  /** Kept for API compatibility — not used by the raster logo. */
  animate?: boolean;
};

export function ApexLogo({ className = "h-4 w-auto" }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Quantm Trade AI"
      className={className}
      draggable={false}
    />
  );
}
