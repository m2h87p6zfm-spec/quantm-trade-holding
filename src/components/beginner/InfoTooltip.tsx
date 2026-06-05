import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  text: string;
  className?: string;
  iconClassName?: string;
};

/**
 * Kleines ℹ-Icon mit Tooltip in einfacher Sprache.
 * Wird neben jedem Fachbegriff platziert, den ein Anfänger
 * nicht sofort verstehen würde.
 */
export function InfoTooltip({ text, className = "", iconClassName = "h-3.5 w-3.5" }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Erklärung anzeigen"
            className={`inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground transition ${className}`}
          >
            <Info className={iconClassName} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
