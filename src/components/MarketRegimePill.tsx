import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchCandles } from "@/lib/finnhub";
import { Activity, ChevronDown, Flame, Snowflake, Shield, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";
import { ExplainAiButton } from "@/components/ExplainAiButton";

// Marktklima-Pill: VIX-Regime + Fear&Greed-Score aus VIX + SPY-Momentum + Sektor-Breite.
// Wird im Header gerendert; klick öffnet Popover mit Details.

const REGIME_SYMBOLS = ["^VIX", "SPY", "QQQ", "XLK", "XLF", "XLE", "XLV", "XLP", "XLU", "XLY", "XLI", "XLB", "XLC", "XLRE"];

function pctChange(c: number[], lb: number): number | null {
  if (!c || c.length < lb + 1) return null;
  const last = c[c.length - 1], prev = c[c.length - 1 - lb];
  return prev ? ((last - prev) / prev) * 100 : null;
}

type Regime = "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";

function scoreToRegime(score: number): Regime {
  if (score < 25) return "Extreme Fear";
  if (score < 45) return "Fear";
  if (score < 55) return "Neutral";
  if (score < 75) return "Greed";
  return "Extreme Greed";
}

function regimeColor(r: Regime): { text: string; bg: string; ring: string } {
  switch (r) {
    case "Extreme Fear": return { text: "text-bear", bg: "bg-bear/15", ring: "ring-bear/40" };
    case "Fear": return { text: "text-bear/90", bg: "bg-bear/10", ring: "ring-bear/30" };
    case "Neutral": return { text: "text-muted-foreground", bg: "bg-muted/30", ring: "ring-border" };
    case "Greed": return { text: "text-bull/90", bg: "bg-bull/10", ring: "ring-bull/30" };
    case "Extreme Greed": return { text: "text-bull", bg: "bg-bull/15", ring: "ring-bull/40" };
  }
}

export function MarketRegimePill() {
  const [open, setOpen] = useState(false);
  const queries = useQueries({
    queries: REGIME_SYMBOLS.map((s) => ({
      queryKey: ["regime", s],
      queryFn: () => fetchCandles(s, "D", 90),
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const data = useMemo(() => {
    const vix = queries[0]?.data?.c ?? [];
    const spy = queries[1]?.data?.c ?? [];
    const vixLast = vix[vix.length - 1] ?? null;
    const vixAvg20 = vix.length >= 20 ? vix.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;
    const spy1m = pctChange(spy, 21);
    const spy1w = pctChange(spy, 5);

    // Breite: wie viele Sektor-ETFs über 20T-MA?
    const sectorIdx = REGIME_SYMBOLS.slice(3); // XLK..XLRE
    let above = 0, total = 0;
    for (let i = 0; i < sectorIdx.length; i++) {
      const c = queries[3 + i]?.data?.c ?? [];
      if (c.length < 21) continue;
      const ma20 = c.slice(-20).reduce((a, b) => a + b, 0) / 20;
      total++;
      if (c[c.length - 1] > ma20) above++;
    }
    const breadth = total > 0 ? above / total : null;

    // Score 0..100 (höher = Greed)
    // VIX-Komponente: VIX 12=100, VIX 35=0
    const vixScore = vixLast != null ? Math.max(0, Math.min(100, 100 - ((vixLast - 12) / 23) * 100)) : 50;
    // SPY-Momentum: −5%=0, +5%=100
    const momScore = spy1m != null ? Math.max(0, Math.min(100, 50 + spy1m * 10)) : 50;
    // Breite: direkt
    const breadthScore = breadth != null ? breadth * 100 : 50;

    const score = Math.round(vixScore * 0.4 + momScore * 0.35 + breadthScore * 0.25);
    const regime = scoreToRegime(score);

    let vixRegime: "Calm" | "Normal" | "Elevated" | "Stress" = "Normal";
    if (vixLast != null) {
      if (vixLast < 14) vixRegime = "Calm";
      else if (vixLast < 20) vixRegime = "Normal";
      else if (vixLast < 28) vixRegime = "Elevated";
      else vixRegime = "Stress";
    }

    return { vixLast, vixAvg20, spy1m, spy1w, breadth, score, regime, vixRegime, vixScore, momScore, breadthScore };
  }, [queries]);

  const loading = queries.some((q) => q.isLoading);
  const c = regimeColor(data.regime);
  const Icon =
    data.regime === "Extreme Fear" ? Snowflake :
    data.regime === "Fear" ? Shield :
    data.regime === "Neutral" ? Activity :
    data.regime === "Greed" ? Zap : Flame;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`hidden md:inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-[11px] font-medium transition hover:brightness-110 ${c.bg} ${c.ring} ${c.text}`}
          title="Marktklima"
        >
          <Icon className="h-3 w-3" />
          {loading ? (
            <span className="text-muted-foreground">…</span>
          ) : (
            <>
              <span className="font-bold tabular-nums">{data.score}</span>
              <span className="opacity-80">·</span>
              <span className="hidden lg:inline">{data.regime}</span>
              {data.vixLast != null && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="font-mono tabular-nums">VIX {data.vixLast.toFixed(1)}</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 opacity-70" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Marktklima heute</div>
            <ExplainAiButton
              topic="Marktklima & Fear/Greed"
              context={`Aktueller Fear/Greed-Score: ${data.score}/100 (${data.regime}). VIX: ${data.vixLast?.toFixed(2)} (${data.vixRegime}). SPY 1M: ${data.spy1m?.toFixed(2)}%. Marktbreite: ${((data.breadth ?? 0) * 100).toFixed(0)}% der Sektor-ETFs über 20T-MA. Erkläre, was diese Werte bedeuten und wie professionelle Anleger darauf reagieren.`}
              variant="icon"
            />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${c.text}`}>{data.score}</span>
            <span className={`text-sm font-medium ${c.text}`}>{data.regime}</span>
          </div>
          {/* Score-Bar */}
          <div className="mt-3 relative h-2 rounded-full overflow-hidden bg-muted/30">
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${data.score}%`,
                background: "linear-gradient(90deg, var(--bear), color-mix(in oklab, var(--bear) 40%, var(--gold)), var(--gold), color-mix(in oklab, var(--gold) 40%, var(--bull)), var(--bull))",
              }}
            />
            <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${data.score}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
            <span>Extreme Fear</span>
            <span>Neutral</span>
            <span>Extreme Greed</span>
          </div>
        </div>

        <div className="p-4 space-y-2.5 text-xs">
          <Row
            label="VIX (Volatilitäts-Index)"
            value={data.vixLast != null ? data.vixLast.toFixed(2) : "—"}
            badge={data.vixRegime}
            tone={data.vixRegime === "Calm" ? "bull" : data.vixRegime === "Stress" ? "bear" : data.vixRegime === "Elevated" ? "gold" : "muted"}
            hint={
              data.vixRegime === "Stress" ? "Panik-Niveau · Profis kaufen Versicherung" :
              data.vixRegime === "Elevated" ? "Erhöhte Nervosität · Vorsicht bei Trades" :
              data.vixRegime === "Calm" ? "Selbstzufriedenheit · oft vor Korrekturen" :
              "Normalbereich"
            }
          />
          <Row
            label="SPY 1M / 1W"
            value={`${data.spy1m != null ? (data.spy1m >= 0 ? "+" : "") + data.spy1m.toFixed(2) + "%" : "—"} · ${data.spy1w != null ? (data.spy1w >= 0 ? "+" : "") + data.spy1w.toFixed(2) + "%" : "—"}`}
            tone={(data.spy1m ?? 0) >= 0 ? "bull" : "bear"}
            hint="Trend des Gesamtmarkts (S&P 500)"
          />
          <Row
            label="Marktbreite"
            value={data.breadth != null ? `${Math.round(data.breadth * 100)}%` : "—"}
            tone={(data.breadth ?? 0.5) > 0.6 ? "bull" : (data.breadth ?? 0.5) < 0.4 ? "bear" : "muted"}
            hint="Sektor-ETFs über 20T-Durchschnitt"
          />
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Link to="/sectors" onClick={() => setOpen(false)} className="flex-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium text-center transition">
            Sektoren ansehen
          </Link>
          <Link to="/heatmap" onClick={() => setOpen(false)} className="flex-1 rounded-md bg-muted/30 hover:bg-muted/50 px-3 py-1.5 text-xs font-medium text-center transition">
            Heatmap
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({ label, value, badge, tone, hint }: { label: string; value: string; badge?: string; tone: "bull" | "bear" | "gold" | "muted"; hint?: string }) {
  const toneCls = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "gold" ? "text-gold" : "text-muted-foreground";
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className={`font-mono font-bold tabular-nums ${toneCls}`}>{value}</span>
          {badge && <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${toneCls} bg-current/10`}>{badge}</span>}
        </span>
      </div>
      {hint && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{hint}</div>}
    </div>
  );
}
