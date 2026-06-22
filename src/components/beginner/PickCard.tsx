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
