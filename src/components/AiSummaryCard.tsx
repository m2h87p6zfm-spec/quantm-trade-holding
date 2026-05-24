import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";

/**
 * Versucht, aus dem KI-Text einen Gesamtscore (0–100) zu extrahieren.
 * Akzeptiert u. a.: "Gesamtscore: 74/100", "Score 74", "74 / 100".
 */
function extractScore(text: string): number | null {
  if (!text) return null;
  const patterns: RegExp[] = [
    /gesamt[\s-]?score[^\d]{0,8}(\d{1,3})\s*\/?\s*100/i,
    /\bscore\b[^\d]{0,8}(\d{1,3})\s*\/?\s*100/i,
    /(\d{1,3})\s*\/\s*100/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 0 && n <= 100) return n;
    }
  }
  return null;
}

/**
 * Entfernt ASCII-Fortschrittsbalken / Block-Kästchen ("▓▓▓░░░", "■■■□□□" usw.)
 * aus dem Markdown — der Donut visualisiert den Score viel sauberer.
 */
function stripAsciiBars(text: string): string {
  if (!text) return text;
  // Zeilen mit ≥3 aufeinanderfolgenden Blockzeichen -> Score-Block raus, ggf. /100-Wert behalten
  return text
    .split("\n")
    .filter((line) => {
      const blockRun = /[█▓▒░■□▪▫◼◻]{3,}/;
      return !blockRun.test(line);
    })
    .join("\n");
}

function scoreTone(score: number) {
  if (score >= 66) {
    return {
      ring: "var(--bull)",
      text: "text-bull",
      label: "Stark",
      desc: "Positives technisches Bild",
    };
  }
  if (score >= 41) {
    return {
      ring: "var(--gold)",
      text: "text-gold",
      label: "Mittel",
      desc: "Gemischte Signallage",
    };
  }
  return {
    ring: "var(--bear)",
    text: "text-bear",
    label: "Schwach",
    desc: "Überwiegend bärische Signale",
  };
}

function ScoreDonut({ score }: { score: number }) {
  const tone = scoreTone(score);
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="color-mix(in oklab, var(--muted) 60%, transparent)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone.ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transition: "stroke-dasharray 600ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-mono text-[2.25rem] font-bold leading-none ${tone.text}`}>
            {score}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            / 100
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className={`text-sm font-semibold ${tone.text}`}>Gesamtscore · {tone.label}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words">
          {tone.desc}. Berechnet aus Momentum, Trend, Volatilität und Risiko-Komponenten.
        </p>
      </div>
    </div>
  );
}

export function AiSummaryCard({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const score = useMemo(() => extractScore(text), [text]);
  const cleanText = useMemo(() => stripAsciiBars(text), [text]);

  return (
    <div className="box-border w-full max-w-full overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] via-card/40 to-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Quantm · KI-Einschätzung
          </span>
        </div>
        {streaming && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            live
          </span>
        )}
      </div>

      {/* Score-Karte */}
      {score != null && (
        <div className="border-b border-border/60 px-5 py-5">
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 sm:p-5">
            <ScoreDonut score={score} />
          </div>
        </div>
      )}

      {/* Markdown-Body */}
      <div className="px-5 py-5">
        <div
          className="
            prose prose-sm prose-invert max-w-none
            break-words [overflow-wrap:anywhere]
            prose-p:my-2 prose-p:leading-relaxed
            prose-headings:mt-4 prose-headings:mb-1.5 prose-headings:font-semibold
            prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
            prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.78rem]
            prose-hr:my-4 prose-hr:border-border/60
            prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:pl-3 prose-blockquote:text-muted-foreground
            [&_table]:my-2 [&_table]:w-full [&_table]:block [&_table]:overflow-x-auto
            [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1
            [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
            [&_pre]:overflow-x-auto [&_pre]:max-w-full
            [&_img]:max-w-full [&_img]:h-auto
          "
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {cleanText}
          </ReactMarkdown>
        </div>
        {streaming && (
          <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-primary align-middle" />
        )}
      </div>
    </div>
  );
}
