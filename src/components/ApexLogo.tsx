import logoUrl from "@/assets/quantm-trade-logo.png";

type Props = {
  className?: string;
  animate?: boolean;
};

/** Silver Q monogram — transparent background, looks correct on any theme. */
export function ApexLogo({ className = "h-7 w-7" }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Quantm Trade"
      className={`${className} select-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]`}
      draggable={false}
    />
  );
}

/** Silver brushed-metal wordmark "QUANTM TRADE". */
export function ApexWordmark({ className = "h-5 w-auto" }: Props) {
  return (
    <span
      className={`${className} inline-flex items-center font-semibold tracking-[0.2em] uppercase text-foreground/90 select-none`}
      style={{ fontSize: "inherit" }}
    >
      Quantm Trade
    </span>
  );
}
