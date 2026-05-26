import { useMemo } from "react";
import { Brain, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CockpitRow } from "@/lib/cockpit";
import { useLang } from "@/lib/i18n";

/**
 * Lightweight, deterministic AI-style market insight panel.
 * Reuses cockpit signal/indicator data — no extra backend calls.
 */
export function MarketAiInsight({ rows }: { rows: CockpitRow[] }) {
  const lang = useLang();
  const insight = useMemo(() => buildInsight(rows, lang), [rows, lang]);

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card to-violet-accent/[0.05] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <Brain className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            {lang === "en" ? "QUANT-X · Market Assessment" : "QUANT-X · Markt-Einschätzung"}
            <Sparkles className="h-3 w-3 text-gold" />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {lang === "en" ? "Aggregated from your watchlist · not investment advice" : "Aggregiert aus deiner Watchlist · keine Anlageempfehlung"}
          </div>
        </div>
        <RegimeChip regime={insight.regime} lang={lang} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-3">
        <Stat label="Bullish" value={insight.bullish} total={insight.total} tone="up" />
        <Stat label="Bearish" value={insight.bearish} total={insight.total} tone="down" />
        <Stat label="Neutral" value={insight.neutral} total={insight.total} />
      </div>

      <ul className="space-y-2">
        {insight.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
              b.tone === "good" ? "bg-emerald-400" : b.tone === "bad" ? "bg-rose-400" : "bg-primary"
            }`} />
            <span className="leading-snug text-foreground/85">{b.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, total, tone }: { label: string; value: number; total: number; tone?: "up" | "down" }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-foreground";
  const dot = tone === "up" ? "bg-emerald-400" : tone === "down" ? "bg-rose-400" : "bg-muted-foreground/60";
  const bar = tone === "up" ? "bg-emerald-400/70" : tone === "down" ? "bg-rose-400/70" : "bg-muted-foreground/40";
  return (
    <div className="rounded-md border border-border/60 bg-muted/15 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</span>
        </div>
        <div className="flex items-baseline gap-0.5 shrink-0">
          <span className={`text-lg font-bold leading-none tabular-nums ${color}`}>{value}</span>
          <span className="text-[10px] tabular-nums text-muted-foreground/70">/{total}</span>
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RegimeChip({ regime, lang }: { regime: "bullish" | "bearish" | "mixed" | "quiet"; lang: "de" | "en" }) {
  const cfg = {
    bullish: { icon: <TrendingUp className="h-3 w-3" />, label: "Risk-On", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    bearish: { icon: <TrendingDown className="h-3 w-3" />, label: "Risk-Off", style: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
    mixed: { icon: <Minus className="h-3 w-3" />, label: lang === "en" ? "Mixed" : "Gemischt", style: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    quiet: { icon: <Minus className="h-3 w-3" />, label: lang === "en" ? "Quiet" : "Ruhig", style: "bg-muted/40 text-muted-foreground border-border" },
  }[regime];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.style}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function buildInsight(rows: CockpitRow[], lang: "de" | "en") {
  const total = rows.length;
  const bullish = rows.filter((r) => r.sig.verdict === "LONG").length;
  const bearish = rows.filter((r) => r.sig.verdict === "SHORT").length;
  const neutral = rows.filter((r) => r.sig.verdict === "NEUTRAL").length;
  const avgChange = total > 0 ? rows.reduce((s, r) => s + r.change, 0) / total : 0;
  const advancers = rows.filter((r) => r.change > 0).length;
  const decliners = rows.filter((r) => r.change < 0).length;

  let regime: "bullish" | "bearish" | "mixed" | "quiet" = "quiet";
  if (total >= 3) {
    if (bullish > bearish * 1.5 && avgChange > 0.2) regime = "bullish";
    else if (bearish > bullish * 1.5 && avgChange < -0.2) regime = "bearish";
    else if (Math.abs(bullish - bearish) <= 1 && Math.abs(avgChange) < 0.5) regime = "quiet";
    else regime = "mixed";
  }

  const bullets: { tone: "good" | "bad" | "info"; text: string }[] = [];

  if (total === 0) {
    bullets.push({ tone: "info", text: lang === "en" ? "Add symbols to your watchlist so QUANT-X can calculate a real assessment." : "Füge Werte zur Watchlist hinzu, damit QUANT-X eine echte Einschätzung berechnen kann." });
    return { regime, total, bullish, bearish, neutral, bullets };
  }

  // Breadth
  if (advancers > decliners * 2) {
    bullets.push({ tone: "good", text: lang === "en" ? `Strong breadth: ${advancers}/${total} symbols up (avg ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%). Breadth supports the trend.` : `Starke Breite: ${advancers}/${total} Werte im Plus (Ø ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%). Marktbreite stützt den Trend.` });
  } else if (decliners > advancers * 2) {
    bullets.push({ tone: "bad", text: lang === "en" ? `Weak breadth: ${decliners}/${total} symbols down (avg ${avgChange.toFixed(2)}%). Defensive stance preferred.` : `Schwache Breite: ${decliners}/${total} Werte im Minus (Ø ${avgChange.toFixed(2)}%). Defensive Haltung bevorzugt.` });
  } else {
    bullets.push({ tone: "info", text: lang === "en" ? `Mixed picture: ${advancers}↑ / ${decliners}↓ (avg ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%). Selective approach recommended.` : `Gemischtes Bild: ${advancers}↑ / ${decliners}↓ (Ø ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%). Selektives Vorgehen ratsam.` });
  }

  // Signal density
  if (bullish > bearish && bullish >= total * 0.4) {
    bullets.push({ tone: "good", text: lang === "en" ? `${bullish} LONG signals dominate — review preferred setups instead of broad market exposure.` : `${bullish} LONG-Signale dominieren — bevorzugte Setups statt breitem Markt-Exposure prüfen.` });
  } else if (bearish > bullish && bearish >= total * 0.4) {
    bullets.push({ tone: "bad", text: lang === "en" ? `${bearish} SHORT signals active — raising hedge or cash allocation is statistically consistent.` : `${bearish} SHORT-Signale aktiv — Hedge oder Cash-Quote erhöhen ist statistisch konsistent.` });
  }

  // Top opportunity
  const top = [...rows].sort(
    (a, b) => Math.abs(b.sig.score) * b.sig.confidence - Math.abs(a.sig.score) * a.sig.confidence,
  )[0];
  if (top && top.sig.verdict !== "NEUTRAL") {
    bullets.push({
      tone: top.sig.verdict === "LONG" ? "good" : "bad",
      text: lang === "en" ? `Strongest setup: ${top.symbol} (${top.sig.verdict}, confidence ${(top.sig.confidence * 100).toFixed(0)}%) — open the detailed analysis in the Analysis Agent.` : `Stärkstes Setup: ${top.symbol} (${top.sig.verdict}, Confidence ${(top.sig.confidence * 100).toFixed(0)}%) — Detail-Analyse im Analyse-Agent öffnen.`,
    });
  }

  return { regime, total, bullish, bearish, neutral, bullets };
}
