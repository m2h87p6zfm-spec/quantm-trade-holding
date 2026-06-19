import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, Eye, Calendar, ArrowRight, HelpCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InfoTooltip } from "./InfoTooltip";
import { AdvancedCollapsible } from "./AdvancedCollapsible";

export type BeginnerPick = {
  symbol: string;
  name: string;
  sector?: string | null;
  /** Plain-language reason, e.g. "Starkes Momentum, technisch überverkauft." */
  reason: string;
  /** 0–100 */
  confidence: number;
  /** Optional Kursziel in der gleichen Währung wie Last-Price. */
  targetPrice?: number | null;
  lastPrice?: number | null;
  date: string;
  action: "KAUFEN" | "BEOBACHTEN";
  /** Roh-Indikatoren für die Advanced-Sektion. */
  advanced?: Array<{ label: string; value: string; tooltip?: string }>;
  /** Multi-timeframe confirmation (from ApexReport.modules.H). */
  mtfConfirmation?: "confirmed" | "diverging" | "neutral";
  /** Tage bis zum nächsten Earnings-Termin. */
  earningsInDays?: number;
  /** OBV-Score [-1..+1] für die Volumen-Bestätigung. */
  obvScore?: number;
  /** CMF-Score [-1..+1] für die Volumen-Bestätigung. */
  cmfScore?: number;
};

function strengthBucket(c: number): { label: string; pct: number; color: string } {
  if (c >= 75) return { label: "Stark", pct: c, color: "bg-bull" };
  if (c >= 55) return { label: "Mittel", pct: c, color: "bg-primary" };
  return { label: "Schwach", pct: c, color: "bg-muted-foreground" };
}

function ageInDays(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

const signalAgeClass = (days: number) => days < 2 ? "text-bull" : days < 7 ? "text-amber-400" : "text-bear";
const signalAgeDot = (days: number) => days < 2 ? "bg-bull" : days < 7 ? "bg-amber-400" : "bg-bear";

function volDotClass(v: number | undefined): string {
  if (v == null) return "bg-muted-foreground/40";
  if (v > 0.1) return "bg-bull";
  if (v < -0.1) return "bg-bear";
  return "bg-muted-foreground/60";
}

/**
 * Derive a transparent 3-way probability distribution (Bull / Neutral / Bear)
 * from the algorithm's confidence + corroborating volume signals.
 * Calibrated so neutral always remains visible — investors should see uncertainty.
 */
function probabilityDistribution(
  confidence: number,
  obv?: number,
  cmf?: number,
): { bull: number; neutral: number; bear: number } {
  const c = Math.max(0, Math.min(100, confidence)) / 100; // 0..1
  // Volume confirmation shifts mass between neutral and tails.
  const volBias = (((obv ?? 0) + (cmf ?? 0)) / 2); // -1..+1
  const baseBull = c * 0.85 + Math.max(0, volBias) * 0.1;
  const baseBear = (1 - c) * 0.35 + Math.max(0, -volBias) * 0.1;
  const baseNeutral = Math.max(0.05, 1 - baseBull - baseBear);
  const sum = baseBull + baseNeutral + baseBear || 1;
  return {
    bull: Math.round((baseBull / sum) * 100),
    neutral: Math.round((baseNeutral / sum) * 100),
    bear: Math.round((baseBear / sum) * 100),
  };
}

/**
 * Parse a numeric factor value (e.g. "1.24", "-0.8", "65", "12 %") into a signed
 * contribution score in [-1, +1], with feature-specific scaling.
 */
function parseFactorContribution(label: string, raw: string): number | null {
  const num = parseFloat(raw.replace(/[%\s]/g, "").replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const L = label.toLowerCase();
  if (L.includes("rsi")) {
    // RSI 50 = neutral, 30/70 = strong signals
    return Math.max(-1, Math.min(1, (num - 50) / 30));
  }
  if (L.includes("z-faktor") || L.includes("z-score")) {
    return Math.max(-1, Math.min(1, num / 2));
  }
  if (L.includes("macd")) {
    return Math.max(-1, Math.min(1, num / 1.5));
  }
  if (L.includes("volatilität")) {
    // High vol = risk = negative contribution
    return Math.max(-1, Math.min(1, -(num - 25) / 40));
  }
  return null;
}

export function PickCard({ pick }: { pick: BeginnerPick }) {
  const [explainOpen, setExplainOpen] = useState(false);
  const strength = strengthBucket(pick.confidence);
  const isBuy = pick.action === "KAUFEN";

  return (
    <article className="flex flex-col rounded-2xl border border-border/60 bg-card/60 p-5 transition hover:border-border">
      {/* Header: name + ticker + action badge */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight">{pick.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{pick.symbol}</span>
            {pick.sector && <> · {pick.sector}</>}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            isBuy
              ? "bg-bull/15 text-bull border border-bull/30"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          }`}
        >
          {isBuy ? <TrendingUp className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {pick.action}
        </span>
      </header>

      {/* Plain-language reason */}
      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{pick.reason}</p>

      {/* Signalstärke */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground/80">Signalstärke</span>
            <InfoTooltip text="Zeigt, wie sicher unser Algorithmus bei dieser Empfehlung ist. Mehr Balken = mehr Übereinstimmung verschiedener Analyse-Modelle." />
          </div>
          <span className="text-xs font-semibold text-foreground/80">{strength.label}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${strength.color} transition-all`} style={{ width: `${strength.pct}%` }} />
        </div>
      </div>

      {/* Probability Distribution — institutional 3-way model output */}
      {(() => {
        const p = probabilityDistribution(pick.confidence, pick.obvScore, pick.cmfScore);
        return (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/80">Wahrscheinlichkeits-Verteilung</span>
                <InfoTooltip text="Modell-Schätzung der nächsten 30 Tage. Aufwärts = höhere Wahrscheinlichkeit für steigende Kurse, Seitwärts = unklare Richtung, Abwärts = Risiko für fallende Kurse." />
              </div>
              <span className="font-mono tabular-nums text-foreground/70">
                <span className="text-bull">{p.bull}%</span> · <span className="text-muted-foreground">{p.neutral}%</span> · <span className="text-bear">{p.bear}%</span>
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-bull transition-all" style={{ width: `${p.bull}%` }} />
              <div className="h-full bg-muted-foreground/50 transition-all" style={{ width: `${p.neutral}%` }} />
              <div className="h-full bg-bear transition-all" style={{ width: `${p.bear}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Aufwärts</span><span>Seitwärts</span><span>Abwärts</span>
            </div>
          </div>
        );
      })()}

      {/* Volume Confirmation Mini-Bar */}
      {(pick.obvScore != null || pick.cmfScore != null) && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-border/40 bg-background/30 px-2.5 py-1.5 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            Volumen-Bestätigung
            <InfoTooltip text="Zeigt, ob das Handelsvolumen die Kursbewegung bestätigt. Grün = Käufer dominant, Rot = Verkäufer dominant." iconClassName="h-3 w-3" />
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${volDotClass(pick.obvScore)}`} /><span className="text-foreground/70">OBV</span></div>
            <div className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${volDotClass(pick.cmfScore)}`} /><span className="text-foreground/70">CMF</span></div>
          </div>
        </div>
      )}

      {/* Multi-Timeframe Confirmation */}
      {pick.mtfConfirmation === "confirmed" && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-bull/30 bg-bull/10 px-2.5 py-1 text-[11px] font-medium text-bull self-start">
          <CheckCircle2 className="h-3 w-3" /> Wöchentlicher Trend bestätigt
        </div>
      )}
      {pick.mtfConfirmation === "diverging" && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400 self-start">
          <AlertTriangle className="h-3 w-3" /> Wöchentlicher Trend divergiert
        </div>
      )}

      {/* Earnings Warning */}
      {typeof pick.earningsInDays === "number" && pick.earningsInDays <= 14 && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Earnings in {pick.earningsInDays} {pick.earningsInDays === 1 ? "Tag" : "Tagen"} — erhöhtes Kursrisiko. Positionsgröße reduzieren.</span>
        </div>
      )}


      {/* Kursziel + Datum */}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            Kursziel
            <InfoTooltip text="Kurs, den wir auf Basis der Analyse für realistisch halten. Keine Garantie — nur eine Orientierung." />
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            {pick.targetPrice != null ? `${pick.targetPrice.toFixed(2)} $` : "—"}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" /> Empfohlen am
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            {new Date(pick.date).toLocaleDateString("de-DE")}
          </dd>
          {(() => {
            const days = ageInDays(pick.date);
            const label = days < 2 ? "Frisches Signal" : days < 7 ? `Signal ${days} Tage alt` : `Signal ${days} Tage alt — Aktualität prüfen`;
            return (
              <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-medium ${signalAgeClass(days)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${signalAgeDot(days)}`} />
                <span>{label}</span>
              </div>
            );
          })()}
        </div>
      </dl>

      {/* "Was bedeutet das?" link */}
      <button
        type="button"
        onClick={() => setExplainOpen(true)}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline self-start"
      >
        <HelpCircle className="h-3.5 w-3.5" /> Was bedeutet das?
      </button>

      {/* Faktor-Beiträge — transparent feature contribution breakdown */}
      {pick.advanced && pick.advanced.length > 0 && (() => {
        const contribs = pick.advanced
          .map((a) => ({ label: a.label, tooltip: a.tooltip, score: parseFactorContribution(a.label, a.value), value: a.value }))
          .filter((c): c is { label: string; tooltip?: string; score: number; value: string } => c.score !== null);
        if (contribs.length === 0) return null;
        return (
          <div className="mt-4 rounded-lg border border-border/50 bg-background/40 p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/80">Faktor-Beiträge</span>
                <InfoTooltip text="Wie stark jeder einzelne Indikator zur Empfehlung beiträgt. Rechts = bullisch, links = bärisch. Volle Transparenz, keine Black-Box." iconClassName="h-3 w-3" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Beitrag</span>
            </div>
            <div className="space-y-1.5">
              {contribs.map((c) => {
                const pct = Math.abs(c.score) * 50; // half of bar = 50%
                const positive = c.score >= 0;
                return (
                  <div key={c.label} className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]">
                    <div className="flex items-center gap-1 text-foreground/80 truncate">
                      <span className="truncate">{c.label}</span>
                      {c.tooltip && <InfoTooltip text={c.tooltip} iconClassName="h-3 w-3" />}
                    </div>
                    <span className="font-mono tabular-nums text-foreground/70 text-right w-12">{c.value}</span>
                    <div className="col-span-2 relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border/80" />
                      <div
                        className={`absolute top-0 h-full ${positive ? "bg-bull" : "bg-bear"}`}
                        style={positive ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Advanced section */}
      {pick.advanced && pick.advanced.length > 0 && (
        <div className="mt-4">
          <AdvancedCollapsible>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-background/40 p-3 text-xs">
              {pick.advanced.map((a) => (
                <div key={a.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {a.label}
                    {a.tooltip && <InfoTooltip text={a.tooltip} iconClassName="h-3 w-3" />}
                  </span>
                  <span className="font-mono tabular-nums text-foreground">{a.value}</span>
                </div>
              ))}
            </div>
          </AdvancedCollapsible>
        </div>
      )}

      {/* CTA */}
      <div className="mt-5 pt-4 border-t border-border/40">
        <Link
          to="/produkte/$symbol"
          params={{ symbol: pick.symbol }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Details ansehen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Explanation modal */}
      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Was bedeutet diese Empfehlung?</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed text-foreground/80">
              <strong>{pick.action === "KAUFEN" ? "Kaufen" : "Beobachten"}:</strong>{" "}
              {pick.action === "KAUFEN"
                ? "Unser Algorithmus sieht aktuell überdurchschnittliche Chancen, dass der Kurs in den nächsten Wochen steigt. Das ist keine Garantie — aber die Wahrscheinlichkeit ist hoch genug, dass wir die Aktie auf unsere Liste setzen."
                : "Aktuell sehen wir Signale, aber noch keine klare Richtung. Die Aktie ist es wert, im Auge zu behalten — wir warten auf eine deutlichere Bestätigung, bevor wir zum Kauf raten."}
              <br /><br />
              Sie entscheiden immer selbst, ob und wann Sie handeln. Quantm Trade ist keine Anlageberatung.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </article>
  );
}
