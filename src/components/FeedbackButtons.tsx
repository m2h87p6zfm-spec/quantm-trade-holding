import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  sessionId: string;
  userPrompt: string;
  assistantMessage: string;
};

const REASONS_NEG = [
  "Zu unklar",
  "Falsche Annahme",
  "Zu wenig Tiefe",
  "Schlechte Struktur",
  "Zu lang",
  "Zu generisch",
  "Nicht relevant",
];

export function FeedbackButtons({ sessionId, userPrompt, assistantMessage }: Props) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [submittedReason, setSubmittedReason] = useState<string | null>(null);

  async function submit(value: 1 | -1, reason?: string) {
    setRating(value);
    if (value === -1 && !reason) {
      setShowReasons(true);
    } else {
      setShowReasons(false);
      if (reason) setSubmittedReason(reason);
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      await fetch("/api/public/agent-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          rating: value,
          user_prompt: userPrompt,
          assistant_message: assistantMessage,
          reason,
        }),
      });
    } catch {
      // silent — non-critical
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <button
        aria-label="Hilfreich"
        onClick={() => rating === null && submit(1)}
        disabled={rating !== null}
        className={`group inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all duration-200 ${
          rating === 1
            ? "border-bull/60 bg-bull/15 text-bull shadow-[0_0_12px_-2px_hsl(var(--bull)/0.4)]"
            : "border-border/60 text-muted-foreground hover:border-bull/40 hover:bg-bull/10 hover:text-bull hover:shadow-[0_0_10px_-2px_hsl(var(--bull)/0.35)]"
        } disabled:cursor-default`}
      >
        {rating === 1 ? <Check className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />}
      </button>
      <button
        aria-label="Nicht hilfreich"
        onClick={() => rating === null && submit(-1)}
        disabled={rating !== null}
        className={`group inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all duration-200 ${
          rating === -1
            ? "border-bear/60 bg-bear/15 text-bear shadow-[0_0_12px_-2px_hsl(var(--bear)/0.4)]"
            : "border-border/60 text-muted-foreground hover:border-bear/40 hover:bg-bear/10 hover:text-bear hover:shadow-[0_0_10px_-2px_hsl(var(--bear)/0.35)]"
        } disabled:cursor-default`}
      >
        {rating === -1 ? <Check className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />}
      </button>

      {showReasons && !submittedReason && (
        <div className="ml-1 flex flex-wrap items-center gap-1 animate-fade-in">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Grund:</span>
          {REASONS_NEG.map((r) => (
            <button
              key={r}
              onClick={() => submit(-1, r)}
              className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-bear/50 hover:text-bear"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {submittedReason && (
        <span className="ml-1 text-[10px] text-muted-foreground animate-fade-in">
          Danke — Modell adaptiert. ({submittedReason})
        </span>
      )}
      {rating === 1 && (
        <span className="ml-1 text-[10px] text-muted-foreground animate-fade-in">
          Muster verstärkt.
        </span>
      )}
    </div>
  );
}
