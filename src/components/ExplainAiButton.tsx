import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang, useT } from "@/lib/i18n";
import { getCurrentAccessToken } from "@/lib/auth-token";

interface ExplainAiButtonProps {
  topic: string;
  context?: string;
  label?: string;
  variant?: "icon" | "chip";
  className?: string;
}

export function ExplainAiButton({ topic, context, label, variant = "chip", className = "" }: ExplainAiButtonProps) {
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const uiLabel = label ?? t("explain.label");

  async function load() {
    setLoading(true);
    setError(null);
    setContent("");
    try {
      const token = await getCurrentAccessToken();
      const r = await fetch("/api/public/explain-concept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ topic, context, lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) throw new Error(t("explain.signInRequired"));
        if (r.status === 429) throw new Error(t("explain.rateLimited"));
        if (r.status === 402) throw new Error(t("explain.creditsOut"));
        throw new Error((j as any)?.error || t("common.error"));
      }
      setContent((j as any).content || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
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
        title={`${uiLabel}: ${topic}`}
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
        <Sparkles className="h-3 w-3" /> {uiLabel}
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
              <span className="text-sm uppercase tracking-wider text-muted-foreground">{uiLabel}</span>
              <span className="text-base font-semibold text-foreground">· {topic}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {loading && (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("explain.loading")}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                <button onClick={load} className="ml-2 underline">{t("common.retry")}</button>
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

// Minimal markdown renderer for headings, paragraphs, bullets + inline bold
function renderInline(text: string, keyBase: string) {
  // Split on **bold** while keeping markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={`${keyBase}-b-${i}`} className="font-semibold text-foreground">{m[1]}</strong>;
    return <span key={`${keyBase}-t-${i}`}>{p}</span>;
  });
}

function renderMarkdown(md: string) {
  const blocks = md.split(/\n{2,}/);
  const out: React.ReactNode[] = [];

  blocks.forEach((b, i) => {
    const lines = b.split("\n");
    const first = lines[0];
    const rest = lines.slice(1);

    const h2 = first.match(/^##\s+(.*)/);
    const h1 = !h2 && first.match(/^#\s+(.*)/);

    if (h2) {
      out.push(
        <h3 key={`h2-${i}`} className="mt-4 mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary first:mt-0">
          {h2[1]}
        </h3>
      );
    } else if (h1) {
      out.push(
        <h2 key={`h1-${i}`} className="mt-3 mb-1 text-base font-semibold text-foreground">{h1[1]}</h2>
      );
    }

    const bodyLines = h2 || h1 ? rest : lines;
    if (bodyLines.length === 0) return;

    // Group bullet lines vs paragraph lines
    const bulletRx = /^\s*[*\-•]\s+(.*)/;
    let para: string[] = [];
    let bullets: string[] = [];

    const flushPara = (key: string) => {
      if (para.length === 0) return;
      const txt = para.join(" ").trim();
      if (txt) out.push(<p key={key} className="mb-2 text-sm leading-relaxed text-foreground/85">{renderInline(txt, key)}</p>);
      para = [];
    };
    const flushBullets = (key: string) => {
      if (bullets.length === 0) return;
      out.push(
        <ul key={key} className="mb-2 ml-4 list-disc space-y-1 text-sm leading-relaxed text-foreground/85 marker:text-primary/70">
          {bullets.map((bl, j) => <li key={`${key}-${j}`}>{renderInline(bl, `${key}-${j}`)}</li>)}
        </ul>
      );
      bullets = [];
    };

    bodyLines.forEach((ln, j) => {
      const m = ln.match(bulletRx);
      if (m) {
        flushPara(`p-${i}-${j}`);
        bullets.push(m[1]);
      } else if (ln.trim() === "") {
        flushBullets(`u-${i}-${j}`);
        flushPara(`p-${i}-${j}`);
      } else {
        flushBullets(`u-${i}-${j}`);
        para.push(ln);
      }
    });
    flushBullets(`u-${i}-end`);
    flushPara(`p-${i}-end`);
  });

  return out;
}
