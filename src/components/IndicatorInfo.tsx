import { useState } from "react";
import { Info, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { getIndicatorInfo, type InfoSignal } from "@/lib/indicator-info";

function SignalLamp({ s }: { s: InfoSignal }) {
  const cfg =
    s === "pos"
      ? { dot: "bg-emerald-500", text: "text-emerald-400", label: "Positives Signal" }
      : s === "neg"
      ? { dot: "bg-rose-500", text: "text-rose-400", label: "Negatives Signal" }
      : { dot: "bg-amber-400", text: "text-amber-300", label: "Neutrales Signal" };
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dot} shadow-sm`} />
      <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

function InfoBody({
  info,
  onClose,
  mobile,
}: {
  info: ReturnType<typeof getIndicatorInfo>;
  onClose: () => void;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "flex flex-col gap-4 p-1" : "flex flex-col gap-3"}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-tight">{info.name}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Was ist das?</div>
        <p className="mt-1 text-sm leading-snug text-foreground/90">{info.what}</p>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Was bedeutet der aktuelle Wert?</div>
        <p className="mt-1 text-sm leading-snug text-foreground/90">{info.currentText}</p>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Was kann man daraus ableiten?</div>
        <p className="mt-1 text-sm leading-snug text-foreground/90">{info.derivation}</p>
      </div>
      <div>
        <SignalLamp s={info.signal} />
      </div>
    </div>
  );
}

export function IndicatorInfoButton({
  infoKey,
  rawValue,
  className = "",
  ariaLabel,
}: {
  infoKey: string;
  rawValue?: any;
  className?: string;
  ariaLabel?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const info = getIndicatorInfo(infoKey, rawValue);

  const trigger = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setOpen((v) => !v);
      }}
      aria-label={ariaLabel ?? `Info zu ${info.name}`}
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/60 transition hover:border-foreground/60 hover:bg-muted/40 hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${className}`}
    >
      <Info className="h-2.5 w-2.5" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-2xl">
            <InfoBody info={info} onClose={() => setOpen(false)} mobile />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-80 max-w-[92vw] p-4">
        <InfoBody info={info} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export function IndicatorLabel({
  infoKey,
  rawValue,
  children,
  className = "",
}: {
  infoKey: string;
  rawValue?: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{children}</span>
      <IndicatorInfoButton infoKey={infoKey} rawValue={rawValue} />
    </span>
  );
}
