import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExplainAiButtonProps {
  topic: string;
  context?: string;
  label?: string;
  variant?: "icon" | "chip";
  className?: string;
}

export function ExplainAiButton({ topic, context, label = "Explain AI", variant = "chip", className = "" }: ExplainAiButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setContent("");
    try {
      const r = await fetch("/api/public/explain-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, context }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Fehler");
      setContent(j.content || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  function openDialog() {
    setOpen(true);
    if (!content && !loading) load();
  }

  const btn =
    variant === "icon" ? (
      <button
        onClick={openDialog}
        title={`${label}: ${topic}`}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary ${className}`}
        type="button"
      >
        <Sparkles className="h-3 w-3" />
      </button>
    ) : (
      <button
        onClick={openDialog}
        type="button"
        className={`inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary ${className}`}
      >
        <Sparkles className="h-3 w-3" /> {label}
      </button>
    );

  return (
    <>
      {btn}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm uppercase tracking-wider text-muted-foreground">Explain AI</span>
              <span className="text-base font-semibold text-foreground">· {topic}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {loading && (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> AI erklärt das Konzept…
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                <button onClick={load} className="ml-2 underline">erneut versuchen</button>
              </div>
            )}
            {!loading && !error && content && (
              <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {renderMarkdown(content)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Minimal markdown renderer for headings + paragraphs (no external dep)
function renderMarkdown(md: string) {
  const blocks = md.split(/\n{2,}/);
  return blocks.map((b, i) => {
    const h2 = b.match(/^##\s+(.*)/);
    if (h2) {
      return (
        <h3 key={i} className="mt-4 mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary first:mt-0">
          {h2[1]}
        </h3>
      );
    }
    const h1 = b.match(/^#\s+(.*)/);
    if (h1) {
      return <h2 key={i} className="mt-3 mb-1 text-base font-semibold text-foreground">{h1[1]}</h2>;
    }
    return <p key={i} className="mb-2 text-sm leading-relaxed text-foreground/85">{b}</p>;
  });
}
