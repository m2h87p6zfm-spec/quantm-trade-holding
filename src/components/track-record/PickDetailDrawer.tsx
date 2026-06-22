import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ComposedChart,
  Line,
  ReferenceDot,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrackRecordPayload } from "@/lib/trackrecord.functions";
import { currencyForTicker, formatPrice } from "@/lib/instrument-currency";
import { priceLevelsFor } from "@/lib/price-levels";

type Analysis = TrackRecordPayload["analyses"][number];

export type DerivedPosition = {
  analysis: Analysis;
  status: "open" | "closed";
  entryAt: string;
  entryPrice: number;
  exitAt: string | null;
  exitPrice: number | null;
  exitReason: string | null;
  currentPrice: number;
  returnPct: number;
  returnAbs: number;
  holdingDays: number;
  /** True if we have at least one measured outcome price (or an exit) — used
   *  to exclude "no-data" picks from win/loss & best/worst statistics. */
  hasMeasurement: boolean;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(v: number) {
  return v.toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function PickDetailDrawer({
  position,
  open,
  onOpenChange,
}: {
  position: DerivedPosition | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!position) return null;
  const a = position.analysis;
  const o = a.outcome;

  // Series: entry + every measured outcome price
  type Pt = { day: number; date: string; price: number; marker?: "buy" | "sell" };
  const series: Pt[] = [
    {
      day: 0,
      date: fmtDate(position.entryAt),
      price: position.entryPrice,
      marker: "buy",
    },
  ];
  const points: Array<[number, number | null | undefined]> = [
    [7, o?.price_after_7d],
    [30, o?.price_after_30d],
    [60, o?.price_after_60d],
    [90, o?.price_after_90d],
  ];
  for (const [d, p] of points) {
    if (p == null) continue;
    series.push({
      day: d,
      date: fmtDate(new Date(new Date(position.entryAt).getTime() + d * 86_400_000).toISOString()),
      price: Number(p),
    });
  }
  if (position.status === "closed" && position.exitPrice != null) {
    series.push({
      day: position.holdingDays,
      date: position.exitAt ? fmtDate(position.exitAt) : "",
      price: position.exitPrice,
      marker: "sell",
    });
  }
  series.sort((a, b) => a.day - b.day);

  const ind = (a.indicators ?? {}) as Record<string, unknown>;
  const target = typeof ind.target === "number" ? (ind.target as number) : null;
  const stop = typeof ind.stop === "number" ? (ind.stop as number) : null;
  const regime = typeof ind.regime === "string" ? (ind.regime as string) : null;
  const rsi = typeof ind.rsi === "number" ? (ind.rsi as number) : null;
  const macdHist = typeof ind.macdHist === "number" ? (ind.macdHist as number) : null;

  const bullish: string[] = [];
  const bearish: string[] = [];
  if (rsi != null) {
    if (rsi < 35) bullish.push(`RSI ${rsi.toFixed(0)} — überverkauft (Reversal-Setup)`);
    else if (rsi > 70) bearish.push(`RSI ${rsi.toFixed(0)} — überkauft`);
  }
  if (macdHist != null) {
    if (macdHist > 0) bullish.push("MACD-Histogramm positiv — Momentum nach oben");
    else bearish.push("MACD-Histogramm negativ — Momentum schwach");
  }
  if (regime === "bull") bullish.push("Markt-Regime: Bullenphase");
  if (regime === "bear") bearish.push("Markt-Regime: Bärenphase");
  if (regime === "low_vol") bullish.push("Markt-Regime: niedrige Volatilität — stabiles Umfeld");
  if (a.confidence_score >= 70) bullish.push(`Konfidenz ${a.confidence_score.toFixed(0)}/100 — hohes Vertrauen`);
  if (a.confidence_score < 55) bearish.push(`Konfidenz nur ${a.confidence_score.toFixed(0)}/100 — niedrige Überzeugung`);

  const ret = position.returnPct;
  const retColor = ret >= 0 ? "text-bull" : "text-bear";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{a.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{a.ticker}</span>
          </SheetTitle>
          <SheetDescription>
            {position.status === "open" ? "Offene Position" : "Geschlossene Position"} ·{" "}
            {position.holdingDays} Tage gehalten
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Performance summary */}
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Einstieg" value={fmtMoney(position.entryPrice)} sub={fmtDate(position.entryAt)} />
            <Metric
              label={position.status === "closed" ? "Ausstieg" : "Aktueller Kurs"}
              value={fmtMoney(position.exitPrice ?? position.currentPrice)}
              sub={position.status === "closed" && position.exitAt ? fmtDate(position.exitAt) : "—"}
            />
            <Metric
              label="Rendite"
              value={`${ret >= 0 ? "+" : ""}${ret.toFixed(2)} %`}
              sub={`${position.returnAbs >= 0 ? "+" : ""}${fmtMoney(position.returnAbs)} €`}
              valueClass={retColor}
            />
          </div>

          {/* Chart */}
          <section className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Kursverlauf
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(v: number) => (v === 0 ? "Buy" : `+${v}d`)}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v: number) => v.toFixed(0)}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmtMoney(value), "Kurs"]}
                    labelFormatter={(d: number) =>
                      d === 0 ? "Buy-Signal" : `Tag +${d}`
                    }
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <ReferenceDot
                    x={0}
                    y={position.entryPrice}
                    r={6}
                    fill="var(--bull)"
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                  {position.status === "closed" && position.exitPrice != null && (
                    <ReferenceDot
                      x={position.holdingDays}
                      y={position.exitPrice}
                      r={6}
                      fill="var(--bear)"
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-bull" /> Buy-Signal
              </span>
              {position.status === "closed" && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-bear" /> Sell-Signal
                </span>
              )}
            </div>
          </section>

          {/* Reason for Buy / Sell */}
          <section className="space-y-3">
            <div className="rounded-xl border border-bull/30 bg-bull/5 p-4">
              <div className="text-xs font-semibold text-bull uppercase tracking-wider">
                Warum gekauft
              </div>
              <p className="mt-1 text-sm text-foreground/90">
                Composite-Engine Verdict <span className="font-semibold">KAUF</span> mit Konfidenz{" "}
                {a.confidence_score.toFixed(0)}/100.
                {target && stop ? (
                  <>
                    {" "}Kursziel <span className="font-mono">{fmtMoney(target)}</span>, Stop-Loss{" "}
                    <span className="font-mono">{fmtMoney(stop)}</span>.
                  </>
                ) : null}
              </p>
            </div>
            {position.status === "closed" && position.exitReason && (
              <div className="rounded-xl border border-bear/30 bg-bear/5 p-4">
                <div className="text-xs font-semibold text-bear uppercase tracking-wider">
                  Warum verkauft
                </div>
                <p className="mt-1 text-sm text-foreground/90">{position.exitReason}</p>
              </div>
            )}
          </section>

          {/* Bullish / Bearish factors */}
          {(bullish.length > 0 || bearish.length > 0) && (
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="text-xs font-semibold text-bull uppercase tracking-wider">
                  Bullische Faktoren
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {bullish.length === 0 && <li className="text-muted-foreground text-xs">Keine relevanten.</li>}
                  {bullish.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-bull">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="text-xs font-semibold text-bear uppercase tracking-wider">
                  Bärische Faktoren
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {bearish.length === 0 && <li className="text-muted-foreground text-xs">Keine relevanten.</li>}
                  {bearish.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-bear">⚠</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Audit footer */}
          <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-3">
            Diese Empfehlung wurde am {new Date(position.entryAt).toLocaleString("de-DE")} öffentlich
            in unserer Datenbank dokumentiert. Datensatz schreibgeschützt — kein nachträgliches
            Editieren möglich.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${valueClass ?? ""}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
