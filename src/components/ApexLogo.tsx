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

/** Silver brushed-metal wordmark "QUANTM TRADE" with accent on "Trade". */
export function ApexWordmark({ className = "h-5 w-auto" }: Props) {
  return (
    <span
      className={`${className} inline-flex items-center gap-1.5 font-semibold tracking-[0.2em] uppercase select-none`}
      style={{ fontSize: "inherit" }}
    >
      <span className="text-foreground/90">Quantm</span>
      <span className="relative inline-flex items-center rounded-md bg-gradient-to-r from-primary/20 to-primary/5 px-1.5 py-0.5 text-primary ring-1 ring-primary/40 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]">
        Trade
      </span>
    </span>
  );
}
