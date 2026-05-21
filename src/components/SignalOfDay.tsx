import { Link } from "@tanstack/react-router";
import { Flame, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import type { IndicatorSet } from "@/lib/indicators";
import type { Signal } from "@/lib/analysis";
import { findProduct } from "@/lib/products";

type Props = {
  symbol: string;
  ind: IndicatorSet;
  sig: Signal;
  closes: number[];
};

export function SignalOfDay({ symbol, ind, sig, closes }: Props) {
  const product = findProduct(symbol);
  const verdictTone =
    sig.verdict === "LONG" ? "text-bull" : sig.verdict === "SHORT" ? "text-bear" : "text-muted-foreground";
  const VerdictIcon = sig.verdict === "LONG" ? TrendingUp : sig.verdict === "SHORT" ? TrendingDown : Minus;
  const verdictBg =
    sig.verdict === "LONG" ? "from-bull/20 to-cyan-accent/5"
      : sig.verdict === "SHORT" ? "from-bear/20 to-violet-accent/5"
      : "from-muted/30 to-transparent";

  return (
    <div className={`card-glow rounded-xl p-6 bg-gradient-to-br ${verdictBg} h-full flex flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold">
            <Flame className="h-3 w-3" />
            Signal des Tages
          </div>
        </div>
        <Link
          to="/produkte/$symbol"
          params={{ symbol }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Vollanalyse <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-bold tracking-tight">{symbol}</div>
          <div className="text-xs text-muted-foreground">{product?.name ?? "Freier Ticker"}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl tabular-nums">{ind.price.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kurs</div>
        </div>
      </div>

      {/* Verdict + Konfidenz-Balken */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 font-bold ${verdictTone}`}>
            <VerdictIcon className="h-4 w-4" />
            <span className="text-sm">{sig.verdict}</span>
          </div>
          <div className="font-mono text-sm tabular-nums font-semibold">{sig.confidence.toFixed(0)}%</div>
        </div>
        <div className="mt-1.5 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              sig.verdict === "LONG" ? "bg-gradient-to-r from-bull to-cyan-accent"
                : sig.verdict === "SHORT" ? "bg-gradient-to-r from-bear to-violet-accent"
                : "bg-muted-foreground/60"
            }`}
            style={{ width: `${sig.confidence}%` }}
          />
        </div>
      </div>

      {/* Sparkline (echte 30 Tage) */}
      <div className="mt-4 h-16">
        <Sparkline data={closes.slice(-60)} up={sig.verdict !== "SHORT"} />
      </div>

      {/* Top-3 Indikatoren */}
      <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-border/40">
        <Stat label="RSI" value={ind.rsi.toFixed(0)} tone={ind.rsi > 70 ? "bear" : ind.rsi < 30 ? "bull" : "default"} />
        <Stat label="Z-Score" value={ind.zScore.toFixed(2)} tone={ind.zScore > 1.5 ? "bear" : ind.zScore < -1.5 ? "bull" : "default"} />
        <Stat label="MACD-Hist" value={ind.macd.histogram.toFixed(2)} tone={ind.macd.histogram > 0 ? "bull" : "bear"} />
      </div>

      {/* Trade-Plan kompakt */}
      {sig.verdict !== "NEUTRAL" && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Level label="Entry" value={sig.entry.toFixed(2)} tone="default" />
          <Level label="Stop" value={sig.stop.toFixed(2)} tone="bear" />
          <Level label="Target" value={sig.target.toFixed(2)} tone="bull" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "bull" | "bear" | "default" }) {
  const cls = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm tabular-nums font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function Level({ label, value, tone }: { label: string; value: string; tone: "bull" | "bear" | "default" }) {
  const cls = tone === "bull" ? "border-bull/40 text-bull" : tone === "bear" ? "border-bear/40 text-bear" : "border-border text-foreground";
  return (
    <div className={`rounded-md border bg-card/40 px-2 py-1.5 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-mono tabular-nums font-semibold">{value}</div>
    </div>
  );
}
