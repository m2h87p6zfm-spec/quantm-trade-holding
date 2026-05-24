import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Sparkles,
  Gauge,
  Zap,
  CheckCircle2,
  XCircle,
  Target,
  AlertTriangle,
  Flag,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

/* ---------- Score & Verdict parsing ---------- */

function extractScore(text: string): number | null {
  if (!text) return null;
  const patterns: RegExp[] = [
    /score[^\d]{0,8}(\d{1,3})\s*\/?\s*100/i,
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

type Verdict = "BUY" | "HOLD" | "SELL" | null;

function extractVerdict(text: string): { verdict: Verdict; confidence: string | null } {
  if (!text) return { verdict: null, confidence: null };
  const upper = text.toUpperCase();
  let verdict: Verdict = null;
  if (/\bSTRONG\s*BUY\b|\bKAUF\b/.test(upper)) verdict = "BUY";
  else if (/\bSTRONG\s*SELL\b|\bVERKAUF/.test(upper)) verdict = "SELL";
  else if (/\bHOLD\b|\bHALTEN\b/.test(upper)) verdict = "HOLD";
  const conf = text.match(/confidence\s*[:\-—]?\s*(niedrig|mittel|hoch|low|medium|high)/i);
  return { verdict, confidence: conf ? conf[1] : null };
}

function verdictTone(v: Verdict) {
  if (v === "BUY")
    return {
      label: "KAUF",
      icon: TrendingUp,
      bg: "bg-bull/15",
      border: "border-bull/40",
      text: "text-bull",
      ring: "var(--bull)",
    };
  if (v === "SELL")
    return {
      label: "VERKAUFEN",
      icon: TrendingDown,
      bg: "bg-bear/15",
      border: "border-bear/40",
      text: "text-bear",
      ring: "var(--bear)",
    };
  return {
    label: "HALTEN",
    icon: Minus,
    bg: "bg-gold/15",
    border: "border-gold/40",
    text: "text-gold",
    ring: "var(--gold)",
  };
}

function scoreTone(score: number) {
  if (score >= 66) return { ring: "var(--bull)", text: "text-bull", label: "Stark" };
  if (score >= 41) return { ring: "var(--gold)", text: "text-gold", label: "Mittel" };
  return { ring: "var(--bear)", text: "text-bear", label: "Schwach" };
}

/* ---------- Section parsing ---------- */

type Section = { key: string; title: string; body: string };

function parseSections(md: string): Section[] {
  if (!md) return [];
  // Normalize: remove ASCII bars and stray code fences
  const cleaned = md
    .split("\n")
    .filter((l) => !/[█▓▒░■□▪▫◼◻]{3,}/.test(l))
    .join("\n");

  const re = /^##\s+(.+?)\s*$/gm;
  const matches: Array<{ title: string; idx: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    matches.push({ title: m[1].trim(), idx: m.index, end: re.lastIndex });
  }
  if (matches.length === 0) return [{ key: "body", title: "", body: cleaned.trim() }];

  const out: Section[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].end;
    const stop = i + 1 < matches.length ? matches[i + 1].idx : cleaned.length;
    const body = cleaned.slice(start, stop).trim();
    out.push({ key: matches[i].title.toLowerCase(), title: matches[i].title, body });
  }
  return out;
}

function findSection(secs: Section[], ...keys: string[]): Section | undefined {
  for (const k of keys) {
    const hit = secs.find((s) => s.key.includes(k));
    if (hit) return hit;
  }
  return undefined;
}

/* ---------- Atomic UI bits ---------- */

function ScoreDonut({ score }: { score: number }) {
  const tone = scoreTone(score);
  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
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
        <div className={`font-mono text-2xl font-bold leading-none ${tone.text}`}>{score}</div>
        <div className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

const MD = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{
      p: ({ children }) => <p className="text-sm leading-relaxed text-foreground/90">{children}</p>,
      ul: ({ children }) => <ul className="space-y-1.5 text-sm text-foreground/90">{children}</ul>,
      ol: ({ children }) => <ol className="space-y-1.5 text-sm text-foreground/90 list-decimal pl-5">{children}</ol>,
      li: ({ children }) => (
        <li className="leading-relaxed [&>p]:m-0 [&>p]:inline">{children}</li>
      ),
      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
      code: ({ children }) => (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.78rem]">{children}</code>
      ),
    }}
  >
    {children}
  </ReactMarkdown>
);

function SectionCard({
  icon: Icon,
  title,
  accent = "default",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent?: "default" | "bull" | "bear" | "primary" | "gold";
  children: ReactNode;
}) {
  const accentMap = {
    default: { border: "border-border/60", iconBg: "bg-muted", iconText: "text-muted-foreground" },
    bull: { border: "border-bull/30", iconBg: "bg-bull/15", iconText: "text-bull" },
    bear: { border: "border-bear/30", iconBg: "bg-bear/15", iconText: "text-bear" },
    primary: { border: "border-primary/30", iconBg: "bg-primary/15", iconText: "text-primary" },
    gold: { border: "border-gold/30", iconBg: "bg-gold/15", iconText: "text-gold" },
  }[accent];
  return (
    <div className={`rounded-lg border ${accentMap.border} bg-card/40 p-4`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${accentMap.iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${accentMap.iconText}`} />
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">{title}</h3>
      </div>
      <div className="prose-tight">{children}</div>
    </div>
  );
}

/* ---------- Main card ---------- */

export function AiSummaryCard({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const score = useMemo(() => extractScore(text), [text]);
  const sections = useMemo(() => parseSections(text), [text]);

  const verdictSec = findSection(sections, "verdict");
  const quick = findSection(sections, "quick", "take");
  const metrics = findSection(sections, "key metrics", "metrics", "kennzahl");
  const pro = findSection(sections, "pro");
  const contra = findSection(sections, "contra", "con", "kontra");
  const setup = findSection(sections, "setup", "trade");
  const risks = findSection(sections, "risik", "risk");
  const fazit = findSection(sections, "fazit", "summary");

  const { verdict, confidence } = useMemo(
    () => extractVerdict(verdictSec?.body ?? text),
    [verdictSec, text],
  );

  // Streaming fallback: if not enough structure yet, render plain markdown
  const hasStructure = !!(verdictSec || quick || metrics || pro || contra);

  const vTone = verdictTone(verdict);
  const VIcon = vTone.icon;

  return (
    <div className="box-border w-full max-w-full overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-background shadow-sm">
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

      {/* HERO: Verdict + Score */}
      {(verdict || score != null) && (
        <div className="border-b border-border/60 px-5 py-5">
          <div className={`flex flex-col gap-4 rounded-xl border ${vTone.border} ${vTone.bg} p-4 sm:flex-row sm:items-center sm:gap-5`}>
            {score != null && <ScoreDonut score={score} />}
            <div className="min-w-0 flex-1">
              {verdict && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border ${vTone.border} bg-background/40 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${vTone.text}`}>
                    <VIcon className="h-3.5 w-3.5" />
                    {vTone.label}
                  </span>
                  {confidence && (
                    <span className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Confidence: {confidence}
                    </span>
                  )}
                </div>
              )}
              {quick?.body && (
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{quick.body}</p>
              )}
              {!quick?.body && score != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Gesamtscore aus Momentum, Trend, Volatilität und Risiko-Komponenten.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="space-y-4 px-5 py-5">
        {hasStructure ? (
          <>
            {metrics && (
              <SectionCard icon={Gauge} title="Kennzahlen" accent="primary">
                <MD>{metrics.body}</MD>
              </SectionCard>
            )}

            {(pro || contra) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {pro && (
                  <SectionCard icon={CheckCircle2} title="Pro" accent="bull">
                    <MD>{pro.body}</MD>
                  </SectionCard>
                )}
                {contra && (
                  <SectionCard icon={XCircle} title="Contra" accent="bear">
                    <MD>{contra.body}</MD>
                  </SectionCard>
                )}
              </div>
            )}

            {setup && (
              <SectionCard icon={Target} title="Setup" accent="primary">
                <MD>{setup.body}</MD>
              </SectionCard>
            )}

            {risks && (
              <SectionCard icon={AlertTriangle} title="Risiken" accent="gold">
                <MD>{risks.body}</MD>
              </SectionCard>
            )}

            {fazit && (
              <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Fazit
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{fazit.body}</p>
              </div>
            )}
          </>
        ) : (
          // Fallback während Streaming (vor erster Sektion) oder unstrukturierte Antwort
          <div className="prose prose-sm prose-invert max-w-none break-words [overflow-wrap:anywhere] prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1.5 prose-strong:text-foreground">
            <MD>{text}</MD>
          </div>
        )}

        {streaming && (
          <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
            <Zap className="h-3 w-3 animate-pulse text-primary" />
            schreibt …
          </div>
        )}
      </div>
    </div>
  );
}
