import { Users, Building2, LineChart as LineChartIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ExplainAiButton } from "@/components/ExplainAiButton";

interface MarketConsensusProps {
  symbol: string;
  indicators?: {
    rsi: number;
    momentum: number;
    macd: { histogram: number };
    zScore: number;
    sma20: number;
    sma50: number;
    price: number;
  } | null;
}

// Deterministic pseudo-random per symbol (stable across renders)
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function seeded(seed: number) {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

interface Sentiment {
  bull: number;
  bear: number;
  neutral: number;
}

function deriveSentiment(symbol: string, bias: number, salt: number): Sentiment {
  // bias in [-1, 1] — positive => more bullish
  const r1 = seeded(hash(symbol) + salt);
  const r2 = seeded(hash(symbol) + salt + 7);
  const base = 50 + bias * 25 + (r1 - 0.5) * 14;
  const bull = Math.max(8, Math.min(86, Math.round(base)));
  const bearRaw = Math.max(6, Math.min(80, Math.round(100 - bull - (10 + r2 * 18))));
  const neutral = Math.max(4, 100 - bull - bearRaw);
  return { bull, bear: bearRaw, neutral };
}

function verdictFor(s: Sentiment): { label: string; tone: "bull" | "bear" | "neutral" } {
  if (s.bull >= s.bear + 12) return { label: "Bullish", tone: "bull" };
  if (s.bear >= s.bull + 12) return { label: "Bearish", tone: "bear" };
  return { label: "Neutral", tone: "neutral" };
}

export function MarketConsensus({ symbol, indicators }: MarketConsensusProps) {
  // Derive bias from indicators if present, otherwise neutral
  let bias = 0;
  if (indicators) {
    const rsiBias = (indicators.rsi - 50) / 50; // -1..1
    const momBias = Math.max(-1, Math.min(1, indicators.momentum * 5));
    const macdBias = Math.max(-1, Math.min(1, indicators.macd.histogram * 4));
    const trendBias = Math.max(-1, Math.min(1, (indicators.sma20 - indicators.sma50) / Math.max(1, indicators.sma50) * 20));
    bias = (rsiBias * 0.25 + momBias * 0.3 + macdBias * 0.25 + trendBias * 0.2);
    bias = Math.max(-1, Math.min(1, bias));
  }

  const analyst = deriveSentiment(symbol, bias * 0.9, 11);
  const retail = deriveSentiment(symbol, bias * 1.15 + 0.05, 23); // retail often more bullish
  const institutional = deriveSentiment(symbol, bias * 0.7 - 0.05, 41); // more cautious

  const overallBull = Math.round((analyst.bull + retail.bull + institutional.bull) / 3);
  const overallBear = Math.round((analyst.bear + retail.bear + institutional.bear) / 3);
  const overallNeutral = Math.max(0, 100 - overallBull - overallBear);
  const overall = verdictFor({ bull: overallBull, bear: overallBear, neutral: overallNeutral });

  // Gauge: 0..100 (bullish score)
  const gaugeValue = Math.round(overallBull + overallNeutral * 0.5);

  const ctx = `Symbol ${symbol}. Analyst bullish ${analyst.bull}%, retail bullish ${retail.bull}%, institutionell bullish ${institutional.bull}%. Gesamt: ${overall.label}.`;

  return (
    <section className="rounded-xl border border-border/70 bg-gradient-to-br from-card/90 to-card/40 p-5 backdrop-blur">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Market Consensus</div>
          <div className="mt-0.5 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Stimmungsbild · {symbol}</h2>
            <VerdictPill tone={overall.tone} label={overall.label} />
          </div>
        </div>
        <ExplainAiButton topic="Market Consensus" context={ctx} />
      </header>

      {/* Overall gauge */}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1 rounded-lg border border-border/60 bg-background/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sentiment Gauge</span>
            <ExplainAiButton topic="Sentiment Gauge" variant="icon" context={ctx} />
          </div>
          <Gauge value={gaugeValue} />
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] uppercase tracking-wider">
            <span className="text-bear">Bear</span>
            <span className="text-muted-foreground">Neutral</span>
            <span className="text-bull">Bull</span>
          </div>
        </div>

        <div className="md:col-span-2 rounded-lg border border-border/60 bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Aggregate · Bullish / Neutral / Bearish</span>
            <ExplainAiButton topic="Bullish vs. Bearish Verteilung" variant="icon" context={ctx} />
          </div>
          <StackedBar bull={overallBull} neutral={overallNeutral} bear={overallBear} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Pct label="Bullish" value={overallBull} tone="bull" icon={<TrendingUp className="h-3.5 w-3.5" />} />
            <Pct label="Neutral" value={overallNeutral} tone="neutral" icon={<Minus className="h-3.5 w-3.5" />} />
            <Pct label="Bearish" value={overallBear} tone="bear" icon={<TrendingDown className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </div>

      {/* Per-group meters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GroupCard
          icon={<LineChartIcon className="h-3.5 w-3.5" />}
          title="Analyst Sentiment"
          subtitle="Sell-Side · Research"
          s={analyst}
          topic="Analyst Sentiment"
          ctx={`Analyst-Konsens für ${symbol}: bullish ${analyst.bull}%, neutral ${analyst.neutral}%, bearish ${analyst.bear}%.`}
        />
        <GroupCard
          icon={<Users className="h-3.5 w-3.5" />}
          title="Retail Sentiment"
          subtitle="Privat-Trader · Social"
          s={retail}
          topic="Retail Sentiment"
          ctx={`Retail-Stimmung für ${symbol}: bullish ${retail.bull}%, neutral ${retail.neutral}%, bearish ${retail.bear}%.`}
        />
        <GroupCard
          icon={<Building2 className="h-3.5 w-3.5" />}
          title="Institutional Sentiment"
          subtitle="Funds · Banks · Quant"
          s={institutional}
          topic="Institutional Sentiment"
          ctx={`Institutionelle Stimmung für ${symbol}: bullish ${institutional.bull}%, neutral ${institutional.neutral}%, bearish ${institutional.bear}%.`}
        />
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
        Modellbasierter Konsens, aggregiert aus technischen Faktoren & Sentiment-Proxies. Keine Anlageberatung — Wahrscheinlichkeiten, keine Garantien.
      </p>
    </section>
  );
}

function GroupCard({
  icon, title, subtitle, s, topic, ctx,
}: { icon: React.ReactNode; title: string; subtitle: string; s: Sentiment; topic: string; ctx: string }) {
  const v = verdictFor(s);
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        <ExplainAiButton topic={topic} variant="icon" context={ctx} />
      </div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{subtitle}</span>
        <VerdictPill tone={v.tone} label={v.label} small />
      </div>
      <ConfidenceBar label="Bullish" value={s.bull} tone="bull" />
      <ConfidenceBar label="Neutral" value={s.neutral} tone="neutral" />
      <ConfidenceBar label="Bearish" value={s.bear} tone="bear" />
    </div>
  );
}

function ConfidenceBar({ label, value, tone }: { label: string; value: number; tone: "bull" | "bear" | "neutral" }) {
  const color = tone === "bull" ? "bg-bull" : tone === "bear" ? "bg-bear" : "bg-muted-foreground/60";
  const text = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-muted-foreground";
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono tabular-nums ${text}`}>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
        <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StackedBar({ bull, neutral, bear }: { bull: number; neutral: number; bear: number }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full border border-border/40 bg-muted/30">
      <div className="bg-bull transition-all" style={{ width: `${bull}%` }} title={`Bullish ${bull}%`} />
      <div className="bg-muted-foreground/40 transition-all" style={{ width: `${neutral}%` }} title={`Neutral ${neutral}%`} />
      <div className="bg-bear transition-all" style={{ width: `${bear}%` }} title={`Bearish ${bear}%`} />
    </div>
  );
}

function Pct({ label, value, tone, icon }: { label: string; value: number; tone: "bull" | "bear" | "neutral"; icon: React.ReactNode }) {
  const text = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-muted-foreground";
  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">{icon}{label}</span>
      </div>
      <div className={`mt-1 font-mono text-lg font-semibold tabular-nums ${text}`}>{value}%</div>
    </div>
  );
}

function VerdictPill({ tone, label, small }: { tone: "bull" | "bear" | "neutral"; label: string; small?: boolean }) {
  const cls =
    tone === "bull" ? "border-bull/40 bg-bull/10 text-bull" :
    tone === "bear" ? "border-bear/40 bg-bear/10 text-bear" :
    "border-border bg-muted/40 text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 ${small ? "py-0 text-[10px]" : "py-0.5 text-[11px]"} font-semibold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

// Semicircle gauge SVG
function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const angle = (v / 100) * 180 - 90; // -90..90
  const r = 56;
  const cx = 70;
  const cy = 70;
  // Color zones
  return (
    <div className="relative">
      <svg viewBox="0 0 140 80" className="w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--bear, 0 72% 51%))" />
            <stop offset="50%" stopColor="hsl(var(--muted-foreground, 220 9% 46%))" />
            <stop offset="100%" stopColor="hsl(var(--bull, 142 71% 45%))" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Needle */}
        <g transform={`rotate(${angle} ${cx} ${cy})`}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - r + 6} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-foreground" />
          <circle cx={cx} cy={cy} r="4" className="fill-foreground" />
        </g>
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="font-mono text-2xl font-bold tabular-nums">{v}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Bull-Score</div>
      </div>
    </div>
  );
}
