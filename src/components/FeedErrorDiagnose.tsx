import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { diagnoseFeedError } from "@/lib/diagnose.functions";
import { Sparkles, Loader2 } from "lucide-react";

type Props = {
  symbol: string;
  errorMessage: string;
  context?: string;
};

/**
 * Kleines AI-Diagnose-Widget. Erscheint neben Feed-Fehlermeldungen.
 * Der KI ist per System-Prompt verboten, Kurse oder Zahlen zu erfinden —
 * sie liefert nur Ursachen-Hypothesen und Handlungsvorschläge.
 */
export function FeedErrorDiagnose({ symbol, errorMessage, context }: Props) {
  const diagnose = useServerFn(diagnoseFeedError);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "result"; text: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function run() {
    setState({ kind: "loading" });
    try {
      const r = await diagnose({ data: { symbol, errorMessage, context } });
      if (r.ok) setState({ kind: "result", text: r.text });
      else setState({ kind: "error", message: r.error });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message || "Unbekannter Fehler" });
    }
  }

  return (
    <div className="mt-3 rounded-md border border-border/60 bg-card/40 p-3 backdrop-blur">
      {state.kind === "idle" && (
        <button
          onClick={run}
          className="inline-flex items-center gap-1.5 rounded-md border border-cyan-accent/40 bg-cyan-accent/10 px-2.5 py-1 text-xs font-medium text-cyan-accent transition hover:bg-cyan-accent/20"
        >
          <Sparkles className="h-3.5 w-3.5" /> AI-Diagnose starten
        </button>
      )}

      {state.kind === "loading" && (
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> KI analysiert den Datenfeed-Fehler …
        </div>
      )}

      {state.kind === "result" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-accent">
            <Sparkles className="h-3 w-3" /> AI-Diagnose
          </div>
          <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
            {state.text}
          </div>
          <button
            onClick={run}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Erneut analysieren
          </button>
        </div>
      )}

      {state.kind === "error" && (
        <div className="space-y-2">
          <div className="text-xs text-bear">AI-Diagnose fehlgeschlagen: {state.message}</div>
          <button
            onClick={run}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Erneut versuchen
          </button>
        </div>
      )}
    </div>
  );
}
