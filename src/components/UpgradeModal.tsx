import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Sparkles, Check, X } from "lucide-react";
import type { UpgradePromptDetail } from "@/lib/portfolio-limits";
import { limitLabel, getPortfolioLimit } from "@/lib/portfolio-limits";

const REASON_COPY: Record<UpgradePromptDetail["reason"], { title: string; sub: string }> = {
  portfolio_limit: {
    title: "Erweitere dein Portfolio",
    sub: "Du hast das Limit deines aktuellen Plans erreicht. Upgrade, um weitere Werte zu verfolgen.",
  },
  news_sources: {
    title: "Schalte alle Premium-Quellen frei",
    sub: "Reuters, Bloomberg, FT und mehr — ungefiltert, in Echtzeit.",
  },
  ai_summaries: {
    title: "AI-Alpha-Summaries freischalten",
    sub: "Bekomme zu jeder Schlagzeile eine 1-Satz-Erklärung, was sie für deine Position bedeutet.",
  },
};

export function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<UpgradePromptDetail | null>(null);

  useEffect(() => {
    function onPrompt(e: Event) {
      const ev = e as CustomEvent<UpgradePromptDetail>;
      setDetail(ev.detail);
      setOpen(true);
    }
    window.addEventListener("apex:upgrade-prompt", onPrompt);
    return () => window.removeEventListener("apex:upgrade-prompt", onPrompt);
  }, []);

  if (!detail) return null;

  const copy = REASON_COPY[detail.reason];
  const currentLimit = detail.limit ?? getPortfolioLimit(detail.currentTier);
  const nextTier = detail.currentTier === "free" ? "Pro" : "Elite";
  const nextLimit = detail.currentTier === "free" ? 20 : Infinity;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md overflow-hidden border-primary/30 p-0">
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> Upgrade auf {nextTier}
          </div>
          <DialogHeader className="mt-4 text-left">
            <DialogTitle className="text-2xl">{copy.title}</DialogTitle>
            <DialogDescription className="text-sm">{copy.sub}</DialogDescription>
          </DialogHeader>

          {detail.reason === "portfolio_limit" && (
            <div className="mt-4 rounded-lg border border-border/60 bg-card/60 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dein Plan</span>
                <span className="font-mono font-semibold uppercase">{detail.currentTier}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Limit</span>
                <span className="font-mono">{detail.currentCount ?? 0} / {limitLabel(currentLimit)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-primary">
                <span>Nach Upgrade</span>
                <span className="font-mono font-semibold">bis zu {limitLabel(nextLimit)}</span>
              </div>
            </div>
          )}

          <ul className="mt-4 space-y-2 text-sm">
            {[
              detail.currentTier === "free" ? "Bis zu 20 Werte im Portfolio (Pro)" : "Unbegrenzt viele Werte (Elite)",
              "Alle Tier-1-Quellen: Reuters, Bloomberg, FT, CNBC, Yahoo",
              "AI-Alpha-Summary für jede portfolio-relevante Schlagzeile",
              "Breaking-News-Pushes für deine Holdings",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-bull" />
                <span className="text-foreground/90">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="border-t border-border bg-card/40 px-6 py-4">
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Später</Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary/80">
              <Link to="/preise" onClick={() => setOpen(false)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Pläne ansehen
              </Link>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
