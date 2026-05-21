import { ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, Minus, Brain, Building2, Telescope, AlertTriangle } from "lucide-react";
import type { DecisionReport } from "@/lib/analysis";

/**
 * Institutionelle Decision-Card im Stil eines Hedge-Fund-Research-Memos.
 * Zeigt strukturierte BUY/SELL/HOLD-Entscheidung mit allen Pflichtfeldern aus
 * der Spec: Confidence, Reasoning, Supporting Factors, Smart Money View,
 * Counter-Argument, Risk Level, Invalidation Condition.
 */
export function DecisionCard({ report, symbol }: { report: DecisionReport; symbol: string }) {
  const d = report.decision;
  const tone =
    d === "BUY"
      ? { ring: "ring-bull/40", chip: "bg-bull/15 text-bull border-bull/30", icon: TrendingUp, label: "BUY" }
      : d === "SELL"
      ? { ring: "ring-bear/40", chip: "bg-bear/15 text-bear border-bear/30", icon: TrendingDown, label: "SELL" }
      : { ring: "ring-muted-foreground/30", chip: "bg-muted text-muted-foreground border-border", icon: Minus, label: "HOLD" };
  const Icon = tone.icon;

  const riskColor =
    report.riskLevel === "Hoch"
      ? "text-bear"
      : report.riskLevel === "Niedrig"
      ? "text-bull"
      : "text-gold";

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/60 p-4 shadow-sm ring-1 ${tone.ring}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${tone.chip}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Institutional Decision · {symbol}
            </div>
            <div className="text-xl font-bold tracking-tight">
              <span className={d === "BUY" ? "text-bull" : d === "SELL" ? "text-bear" : "text-foreground"}>{tone.label}</span>
              <span className="ml-2 font-mono text-sm font-medium text-muted-foreground">
                {report.confidence}% Konfidenz
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-md border border-border bg-background/60 px-2 py-1 font-mono">
            Regime: <b className="text-foreground">{regimeShort(report.regime)}</b>
          </span>
          <span className={`rounded-md border border-border bg-background/60 px-2 py-1 font-mono ${riskColor}`}>
            Risk: <b>{report.riskLevel}</b>
          </span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${d === "BUY" ? "bg-bull" : d === "SELL" ? "bg-bear" : "bg-muted-foreground/50"}`}
            style={{ width: `${report.confidence}%` }}
          />
        </div>
        {report.adjustments.length > 0 && (
          <details className="mt-1.5 text-[10px] text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              {report.adjustments.length} Smart-Money-/Regime-Anpassung{report.adjustments.length === 1 ? "" : "en"} · roh {report.rawConfidence}% → {report.confidence}%
            </summary>
            <ul className="mt-1 space-y-0.5 pl-3">
              {report.adjustments.map((a, i) => (
                <li key={i} className="list-disc">{a}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Reasoning */}
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Key Reasoning · </span>
        {report.reasoning}
      </p>

      {/* Supporting Factors Grid */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Factor icon={Telescope} label="Macro" text={report.supporting.macro} />
        <Factor icon={Brain} label="Sentiment" text={report.supporting.sentiment} />
        <Factor icon={Building2} label="Institutional Flow" text={report.supporting.institutional} />
        <Factor icon={ShieldCheck} label="Technical" text={report.supporting.technical} />
      </div>

      {/* Smart Money + Counter */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Block
          tone="primary"
          icon={Building2}
          label="Smart Money View"
          text={report.smartMoney}
        />
        <Block
          tone="warn"
          icon={AlertTriangle}
          label="Counter-Argument"
          text={report.counterArgument}
        />
      </div>

      {/* Invalidation */}
      <div className="mt-3 rounded-md border border-bear/30 bg-bear/[0.04] p-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-bear">
          <ShieldAlert className="h-3 w-3" /> Invalidation Condition
        </div>
        <p className="mt-1 text-xs leading-snug text-foreground/80">{report.invalidation}</p>
      </div>
    </div>
  );
}

function Factor({ icon: Icon, label, text }: { icon: typeof Brain; label: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 text-xs leading-snug text-foreground/85">{text}</p>
    </div>
  );
}

function Block({
  tone,
  icon: Icon,
  label,
  text,
}: {
  tone: "primary" | "warn";
  icon: typeof Brain;
  label: string;
  text: string;
}) {
  const cls =
    tone === "primary"
      ? "border-primary/30 bg-primary/[0.04] text-primary"
      : "border-gold/30 bg-gold/[0.04] text-gold";
  return (
    <div className={`rounded-md border p-2.5 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 text-xs leading-snug text-foreground/85">{text}</p>
    </div>
  );
}

function regimeShort(r: string): string {
  switch (r) {
    case "bull": return "Bull";
    case "bear": return "Bear";
    case "chop": return "Chop";
    case "high_vol": return "High-Vol";
    case "low_vol": return "Low-Vol";
    default: return r;
  }
}
