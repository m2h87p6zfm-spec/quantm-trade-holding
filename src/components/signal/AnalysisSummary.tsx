import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { parseReport, isStructuredReport } from "./AnalysisReport";

function parseNum(s?: string): number | null {
  if (!s) return null;
  const m = s.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return isFinite(n) ? n : null;
}

function clusterStyle(cluster?: string) {
  const c = (cluster ?? "").toLowerCase();
  if (c.includes("bull")) return { text: "text-bull", dot: "bg-bull", ring: "ring-bull/40", bg: "bg-bull/10" };
  if (c.includes("bear")) return { text: "text-bear", dot: "bg-bear", ring: "ring-bear/40", bg: "bg-bear/10" };
  return { text: "text-muted-foreground", dot: "bg-muted-foreground/60", ring: "ring-border", bg: "bg-muted/30" };
}

export function AnalysisSummary({ messages }: { messages: { role: string; content: string }[] }) {
  const latest = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && isStructuredReport(m.content)) {
        return parseReport(m.content);
      }
    }
    return null;
  }, [messages]);

  if (!latest || !latest.verdict) return null;

  const cs = clusterStyle(latest.verdict.cluster);
  const conf = parseNum(latest.verdict.confidence);

  // Risk / Reward from Setup lines
  let rr: { entry?: number; stop?: number; target?: number; ratio?: number } | null = null;
  if (latest.setup) {
    const m: Record<string, number> = {};
    for (const line of latest.setup) {
      const [k, ...rest] = line.split(":");
      const v = parseNum(rest.join(":"));
      if (v !== null) m[k.trim().toLowerCase()] = v;
    }
    if (m.entry !== undefined && m.stop !== undefined && m.target !== undefined) {
      const risk = Math.abs(m.entry - m.stop);
      const reward = Math.abs(m.target - m.entry);
      rr = {
        entry: m.entry,
        stop: m.stop,
        target: m.target,
        ratio: risk > 0 ? reward / risk : undefined,
      };
    }
  }

  return (
    <div className={`border-b border-border ${cs.bg}`}>
      <div className="px-4 py-2.5 flex items-stretch gap-3">
        {/* Verdict */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full ${cs.dot} animate-pulse`} aria-hidden />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-display text-sm font-bold tracking-tight truncate">
                {latest.verdict.ticker ?? "—"}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${cs.text} truncate`}>
                {latest.verdict.cluster ?? "Neutral"}
              </span>
            </div>
            {latest.tldr[0] && (
              <div className="text-[11px] text-foreground/75 truncate" title={latest.tldr[0]}>
                {latest.tldr[0]}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Confidence + R/R */}
        <div className="flex items-center gap-3 shrink-0">
          {conf !== null && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Conf</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${cs.dot}`}
                    style={{ width: `${Math.min(100, Math.max(0, conf))}%` }}
                  />
                </div>
                <span className="num text-[11px] font-semibold tabular-nums">{conf.toFixed(0)}%</span>
              </div>
            </div>
          )}
          {rr?.ratio !== undefined && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">R / R</span>
              <span className="num text-[11px] font-semibold tabular-nums flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                1 : {rr.ratio.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
