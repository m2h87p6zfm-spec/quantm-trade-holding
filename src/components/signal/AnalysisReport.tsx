import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown } from "lucide-react";
import { IndicatorCard } from "./IndicatorCard";

const SECTION_ALIASES: Record<string, string> = {
  // canonical → canonical
  verdict: "verdict",
  "tl;dr": "tldr",
  tldr: "tldr",
  indikatoren: "indikatoren",
  indicators: "indikatoren",
  // tolerated alternates the model sometimes invents
  kennwerte: "indikatoren",
  kennzahlen: "indikatoren",
  setup: "setup",
  risiken: "risiken",
  risks: "risiken",
  contra: "risiken",
  cons: "risiken",
  pro: "pro",
  pros: "pro",
  details: "details",
  fazit: "details",
  zusammenfassung: "details",
  begründung: "details",
  begruendung: "details",
};


type Tag = "bull" | "bear" | "neutral";
type Indicator = { name: string; value: string; interpretation: string; tag: Tag };

export type ParsedReport = {
  verdict: { ticker?: string; name?: string; price?: string; change?: string; cluster?: string; confidence?: string } | null;
  tldr: string[];
  pros: string[];
  indicators: Indicator[];
  setup: string[] | null;
  risks: string[];
  details: string;
  trailing: string; // anything that streams in before sections start
};

function splitSections(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /^##\s+([A-Za-zÄÖÜäöüß/.()&\s]+?)\s*$/gm;
  const matches = [...md.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : md.length;
    const raw = m[1].trim().toLowerCase();
    const key = SECTION_ALIASES[raw] ?? raw;
    const body = md.slice(start, end).trim();
    // Append if duplicate (e.g. multiple "Risks"/"Contra" blocks).
    out[key] = out[key] ? `${out[key]}\n${body}` : body;
  }
  return out;
}

function parseVerdict(line: string): ParsedReport["verdict"] {
  if (!line) return null;
  // TICKER · NAME | €PREIS | ▲ +X.XX% | Cluster | Confidence XX%
  const parts = line.split("|").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const head = parts[0];
  const [ticker, ...rest] = head.split(/[·•]/).map((s) => s.trim());
  const name = rest.join(" · ") || undefined;
  const conf = parts.find((p) => /confidence/i.test(p));
  return {
    ticker: ticker || undefined,
    name,
    price: parts[1],
    change: parts[2],
    cluster: parts[3],
    confidence: conf?.replace(/confidence/i, "").trim(),
  };
}

function parseBullets(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("*"))
    .map((l) => l.replace(/^[-*]\s*/, ""));
}

function parseIndicators(block: string): Indicator[] {
  return parseBullets(block)
    .map((line): Indicator | null => {
      const [head, interp, tagRaw] = line.split("|").map((s) => s.trim());
      if (!head || !interp) return null;
      const colonIdx = head.indexOf(":");
      if (colonIdx === -1) return null;
      const name = head.slice(0, colonIdx).trim();
      const value = head.slice(colonIdx + 1).trim();
      const t = (tagRaw ?? "neutral").toLowerCase();
      const tag: Tag = t === "bull" ? "bull" : t === "bear" ? "bear" : "neutral";
      return { name, value, interpretation: interp, tag };
    })
    .filter((x): x is Indicator => x !== null);
}

function parseSetup(block: string): string[] | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return lines;
}

export function parseReport(md: string): ParsedReport {
  const firstHead = md.indexOf("## ");
  const trailing = firstHead === -1 ? md : md.slice(0, firstHead).trim();
  if (firstHead === -1) {
    return { verdict: null, tldr: [], pros: [], indicators: [], setup: null, risks: [], details: "", trailing };
  }
  const sections = splitSections(md);
  const verdictLine = (sections["verdict"] ?? "").split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
  return {
    verdict: parseVerdict(verdictLine),
    tldr: parseBullets(sections["tldr"] ?? ""),
    pros: parseBullets(sections["pro"] ?? ""),
    indicators: parseIndicators(sections["indikatoren"] ?? ""),
    setup: parseSetup(sections["setup"] ?? ""),
    risks: parseBullets(sections["risiken"] ?? ""),
    details: sections["details"] ?? "",
    trailing,
  };
}

export function isStructuredReport(md: string): boolean {
  // Accept the canonical "Verdict" header OR any of the tolerated alternates
  // (Kennwerte/Pro/Contra/Fazit) — if the model deviates, we still render
  // the structured layout instead of falling back to a flat markdown wall.
  return /^##\s+(Verdict|Kennwerte|Kennzahlen|Pro|Contra|Fazit|TL;DR)\s*$/im.test(md);
}

function clusterStyle(cluster?: string): { text: string; bg: string; ring: string } {
  const c = (cluster ?? "").toLowerCase();
  if (c.includes("stark bull") || (c.includes("bull") && c.includes("cluster"))) {
    return { text: "text-bull", bg: "bg-bull/15", ring: "ring-bull/40" };
  }
  if (c.includes("bull")) return { text: "text-bull", bg: "bg-bull/10", ring: "ring-bull/30" };
  if (c.includes("stark bear")) return { text: "text-bear", bg: "bg-bear/15", ring: "ring-bear/40" };
  if (c.includes("bear")) return { text: "text-bear", bg: "bg-bear/10", ring: "ring-bear/30" };
  return { text: "text-muted-foreground", bg: "bg-muted/40", ring: "ring-border" };
}

export function AnalysisReport({ markdown }: { markdown: string }) {
  const r = parseReport(markdown);
  const [showDetails, setShowDetails] = useState(false);
  const cs = clusterStyle(r.verdict?.cluster);

  const changeUp = (r.verdict?.change ?? "").includes("▲") || (r.verdict?.change ?? "").includes("+");
  const changeColor = (r.verdict?.change ?? "").includes("▼") || (r.verdict?.change ?? "").includes("-")
    ? "text-bear"
    : changeUp
    ? "text-bull"
    : "text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* Verdict header */}
      {r.verdict && (
        <div className={`rounded-lg ${cs.bg} ring-1 ${cs.ring} px-3 py-3`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-display text-base font-bold tracking-tight truncate">
                  {r.verdict.ticker ?? "—"}
                </span>
                {r.verdict.name && (
                  <span className="text-xs text-muted-foreground truncate">{r.verdict.name}</span>
                )}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2 text-sm">
                <span className="num font-semibold tabular-nums">{r.verdict.price ?? "—"}</span>
                {r.verdict.change && (
                  <span className={`num text-xs tabular-nums ${changeColor}`}>{r.verdict.change}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-bold uppercase tracking-wider ${cs.text}`}>
                {r.verdict.cluster ?? "Neutral"}
              </div>
              {r.verdict.confidence && (
                <div className="num text-[10px] text-muted-foreground tabular-nums mt-0.5">
                  Confidence {r.verdict.confidence}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TL;DR */}
      {r.tldr.length > 0 && (
        <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            TL;DR
          </div>
          <ul className="space-y-1 text-sm">
            {r.tldr.map((b, i) => (
              <li key={i} className="flex gap-2 text-foreground/90">
                <span className="text-primary mt-1 shrink-0">•</span>
                <span className="min-w-0">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Indicators grid */}
      {r.indicators.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
            Indikatoren
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {r.indicators.map((ind) => (
              <IndicatorCard key={ind.name} {...ind} />
            ))}
          </div>
        </div>
      )}

      {/* Setup */}
      {r.setup && r.setup.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
            Setup
          </div>
          {r.setup.length === 1 && !r.setup[0].toLowerCase().startsWith("entry") ? (
            <div className="text-sm text-foreground/80">{r.setup[0]}</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-sm">
              {r.setup.map((line, i) => {
                const [k, ...rest] = line.split(":");
                const v = rest.join(":").trim();
                return (
                  <div key={i} className="rounded-md bg-background/50 px-2 py-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.trim()}</div>
                    <div className="num text-sm font-semibold tabular-nums">{v}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Risks */}
      {r.risks.length > 0 && (
        <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Risiken
          </div>
          <ul className="space-y-1 text-sm">
            {r.risks.map((b, i) => (
              <li key={i} className="flex gap-2 text-foreground/80">
                <span className="text-bear/70 mt-1 shrink-0">▴</span>
                <span className="min-w-0">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Details collapsible */}
      {r.details && (
        <div className="rounded-lg border border-border bg-background/30">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Volle Begründung</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails && (
            <div className="px-3 pb-3 prose prose-sm dark:prose-invert max-w-none text-foreground/85 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown>{r.details}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Trailing / streaming-in text before sections appear */}
      {r.trailing && r.indicators.length === 0 && (
        <div className="text-xs text-muted-foreground italic">{r.trailing}</div>
      )}
    </div>
  );
}
