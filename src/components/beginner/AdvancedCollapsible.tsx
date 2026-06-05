import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Props = {
  title?: string;
  children: React.ReactNode;
};

/**
 * Wrapper für alles, was nur Fortgeschrittene interessiert
 * (Sharpe Ratio, Max Drawdown, Greeks, Monte-Carlo-Details …).
 * Standard: zugeklappt.
 */
export function AdvancedCollapsible({ title = "Technische Details (für Fortgeschrittene)", children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-card/30 px-4 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground hover:border-border">
        <span>{title}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
