import { useState } from "react";
import { BookOpen, ChevronDown, Lightbulb } from "lucide-react";

type Point = { q: string; a: string };

/**
 * Plain-language "What is this page?" card.
 * Collapsible — power users skip it, beginners get full context.
 * Used at the top of complex analytical pages (Sectors, Global Macro, ...).
 */
export function PageExplainer({
  title,
  intro,
  points,
  cta,
  defaultOpen = false,
}: {
  title: string;
  intro: string;
  points: Point[];
  cta?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-violet-accent/[0.04] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-primary/[0.04]"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Neu hier? Kurze Erklärung
          </div>
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-primary/10 px-5 py-4">
          <p className="text-sm leading-relaxed text-foreground/85">{intro}</p>

          <div className="grid gap-2.5 md:grid-cols-2">
            {points.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-background/40 p-3"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/90">
                  {p.q}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {p.a}
                </div>
              </div>
            ))}
          </div>

          {cta && (
            <div className="flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2.5 text-xs text-foreground/85">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <span>{cta}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
