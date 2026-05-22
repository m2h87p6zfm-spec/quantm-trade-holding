import { useMemo, useRef, useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { computeZones, type Zone } from "@/lib/zones";
import { ema, sma, bollinger as bb, rsi as rsiCalc } from "@/lib/indicators";
import { formatNumber, formatPercent, axisDecimals } from "@/lib/format";

type CandlesIn = { c: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[]; t: number[] };

type Overlay = "ema20" | "ema50" | "sma200" | "bbands";
type Sub = "volume" | "rsi" | "macd";

export type ProChartProps = {
  data: CandlesIn;
  height?: number;
  overlays?: Overlay[];
  subcharts?: Sub[];
  showZones?: boolean;
  compact?: boolean;
};

type Cross = { x: number; idx: number } | null;

export function ProChart({
  data,
  height = 360,
  overlays = ["ema20", "ema50", "bbands"],
  subcharts = ["volume", "rsi", "macd"],
  showZones = true,
  compact = false,
}: ProChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [cross, setCross] = useState<Cross>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setW(Math.max(320, Math.floor(cr.width)));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const closes = data.c;
  const opens = data.o ?? closes;
  const highs = data.h ?? closes;
  const lows = data.l ?? closes;
  const vols = data.v ?? closes.map(() => 0);
  const N = closes.length;

  // Subchart-Höhen
  const subH = compact ? 60 : 80;
  const mainH = Math.max(160, height - subcharts.length * subH - 18);
  const totalH = mainH + subcharts.length * subH + 18;

  // X-Skala (Index → Pixel)
  const pad = { l: 8, r: 56, t: 6, b: 16 };
  const innerW = Math.max(20, w - pad.l - pad.r);
  const step = innerW / Math.max(1, N - 1);
  const xAt = (i: number) => pad.l + i * step;
  const candleW = Math.max(1, Math.min(10, step * 0.65));

  // Y-Skala (Hauptchart)
  const visMin = Math.min(...lows);
  const visMax = Math.max(...highs);
  const yPad = (visMax - visMin) * 0.06 || 1;
  const yMin = visMin - yPad;
  const yMax = visMax + yPad;
  const yAt = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (mainH - pad.t - pad.b);

  // Overlays
  const ind = useMemo(() => ({
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    sma200: sma(closes, 200),
    bb: closes.map((_, i) => i < 19 ? null : bb(closes.slice(0, i + 1), 20, 2)),
  }), [closes]);

  // Smart Zones
  const zones: Zone[] = useMemo(
    () => (showZones ? computeZones(highs, lows, closes) : []),
    [highs, lows, closes, showZones],
  );

  // Cross-Handling
  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < pad.l || x > w - pad.r) { setCross(null); return; }
    const idx = Math.max(0, Math.min(N - 1, Math.round((x - pad.l) / step)));
    setCross({ x: xAt(idx), idx });
  }
  function onLeave() { setCross(null); }

  const last = closes[N - 1];
  const lastChange = N > 1 ? ((closes[N - 1] - closes[N - 2]) / closes[N - 2]) * 100 : 0;

  // OHLC am Crosshair
  const ohlc = cross ? {
    o: opens[cross.idx], h: highs[cross.idx], l: lows[cross.idx], c: closes[cross.idx],
    t: data.t[cross.idx], v: vols[cross.idx],
  } : null;

  // Subchart Data Precompute
  const rsiArr = useMemo(() => {
    const r: number[] = [];
    for (let i = 0; i < N; i++) r.push(i < 14 ? NaN : rsiCalc(closes.slice(0, i + 1), 14));
    return r;
  }, [closes, N]);
  const macd = useMemo(() => {
    const e12 = ema(closes, 12); const e26 = ema(closes, 26);
    const line = closes.map((_, i) => e12[i] - e26[i]);
    const sig = ema(line, 9);
    const hist = line.map((v, i) => v - sig[i]);
    return { line, sig, hist };
  }, [closes]);
  const vMax = useMemo(() => Math.max(1, ...vols), [vols]);

  return (
    <div ref={wrapRef} className="w-full select-none">
      {/* Header (Last + ΔTag + Hover-OHLC) */}
      <div className="flex flex-wrap items-end justify-between gap-2 pb-2 text-xs">
        <div className="flex items-baseline gap-3">
          <div className="font-mono text-2xl font-bold tabular-nums">{formatNumber(last, axisDecimals(last))}</div>
          <div className={`font-mono tabular-nums ${lastChange >= 0 ? "text-bull" : "text-bear"}`}>
            {formatPercent(lastChange)}
          </div>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {ohlc ? (
            <>
              <span>O <b className="text-foreground">{formatNumber(ohlc.o, axisDecimals(ohlc.o))}</b></span>
              <span className="ml-2">H <b className="text-foreground">{formatNumber(ohlc.h, axisDecimals(ohlc.h))}</b></span>
              <span className="ml-2">L <b className="text-foreground">{formatNumber(ohlc.l, axisDecimals(ohlc.l))}</b></span>
              <span className="ml-2">C <b className="text-foreground">{formatNumber(ohlc.c, axisDecimals(ohlc.c))}</b></span>
              <span className="ml-3 opacity-60">{new Date(ohlc.t * 1000).toLocaleDateString("de-DE")}</span>
            </>
          ) : (
            <span className="opacity-60">Bewege den Cursor über den Chart für OHLC.</span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${w} ${totalH}`}
        width="100%"
        height={totalH}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="cursor-crosshair"
      >
        <defs>
          {/* Bull / Bear candle gradients — derived from theme tokens */}
          <linearGradient id="candleBull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--bull) 80%, white)" />
            <stop offset="60%" stopColor="var(--bull)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--bull) 75%, black)" />
          </linearGradient>
          <linearGradient id="candleBear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--bear) 80%, white)" />
            <stop offset="60%" stopColor="var(--bear)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--bear) 75%, black)" />
          </linearGradient>
          {/* Subtle glow for active candles */}
          <filter id="candleGlowBull" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="candleGlowBear" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="zoneSup" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--bull)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--bull)" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="zoneRes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--bear)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--bear)" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* === MAIN PANE === */}
        <g>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = pad.t + p * (mainH - pad.t - pad.b);
            const val = yMax - p * (yMax - yMin);
            return (
              <g key={i}>
                <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--chart-grid)" strokeDasharray="2 4" />
                <text x={w - pad.r + 4} y={y + 3} fontSize={10} fill="var(--chart-axis)" fontFamily="ui-monospace, monospace">
                  {formatNumber(val, axisDecimals(val))}
                </text>
              </g>
            );
          })}

          {/* Smart-Zones */}
          {zones.map((z, i) => {
            const y1 = yAt(z.high); const y2 = yAt(z.low);
            const fill = z.type === "support" ? "url(#zoneSup)" : "url(#zoneRes)";
            const stroke = z.type === "support" ? "var(--bull)" : "var(--bear)";
            return (
              <g key={i} opacity={0.55 + z.strength * 0.4}>
                <rect x={pad.l} y={Math.min(y1, y2)} width={innerW} height={Math.abs(y2 - y1) || 1} fill={fill} />
                <line x1={pad.l} x2={w - pad.r} y1={(y1 + y2) / 2} y2={(y1 + y2) / 2} stroke={stroke} strokeDasharray="3 3" strokeWidth={0.8} opacity={0.7} />
                <text x={w - pad.r - 4} y={(y1 + y2) / 2 - 2} fontSize={9} textAnchor="end" fill={stroke} fontFamily="ui-monospace, monospace">
                  {z.type === "support" ? "S" : "R"} · {z.touches}× · {formatNumber((z.low + z.high) / 2, axisDecimals(z.high))}
                </text>
              </g>
            );
          })}

          {/* Bollinger Band */}
          {overlays.includes("bbands") && (
            <path
              d={ind.bb.map((b, i) => b == null ? "" : `${i === 0 || !ind.bb[i - 1] ? "M" : "L"}${xAt(i)},${yAt(b.upper)}`).join(" ") +
                 ind.bb.slice().reverse().map((b, j) => {
                    const i = ind.bb.length - 1 - j;
                    return b == null ? "" : `L${xAt(i)},${yAt(b.lower)}`;
                 }).join(" ") + "Z"}
              fill="var(--chart-4)"
              opacity={0.07}
            />
          )}

          {/* Candles — Gradient bodies + token-driven wicks */}
          {closes.map((c, i) => {
            const o = opens[i]; const h = highs[i]; const l = lows[i];
            const up = c >= o;
            const bodyFill = up ? "url(#candleBull)" : "url(#candleBear)";
            const wickStroke = up ? "var(--bull)" : "var(--bear)";
            const xC = xAt(i);
            const yO = yAt(o); const yC = yAt(c);
            const bodyTop = Math.min(yO, yC);
            const bodyH = Math.max(1.5, Math.abs(yO - yC));
            const isRecent = i >= N - 3;
            const glow = isRecent ? (up ? "url(#candleGlowBull)" : "url(#candleGlowBear)") : undefined;
            return (
              <g key={i} filter={glow}>
                <line x1={xC} x2={xC} y1={yAt(h)} y2={yAt(l)} stroke={wickStroke} strokeWidth={2.5} opacity={0.16} strokeLinecap="round" />
                <line x1={xC} x2={xC} y1={yAt(h)} y2={yAt(l)} stroke={wickStroke} strokeWidth={1} strokeLinecap="round" />
                <rect
                  x={xC - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  rx={0.8}
                  fill={bodyFill}
                  stroke={wickStroke}
                  strokeWidth={0.6}
                  opacity={0.98}
                />
              </g>
            );
          })}

          {/* Overlays */}
          {overlays.includes("ema20") && <Linepath points={ind.ema20.map((v, i) => [xAt(i), yAt(v)])} stroke="var(--chart-1)" width={1.4} />}
          {overlays.includes("ema50") && <Linepath points={ind.ema50.map((v, i) => [xAt(i), yAt(v)])} stroke="var(--chart-2)" width={1.2} />}
          {overlays.includes("sma200") && <Linepath points={ind.sma200.map((v, i) => isNaN(v) ? null : [xAt(i), yAt(v)])} stroke="var(--chart-3)" width={1.2} dash="4 4" />}

          {/* Last-price marker */}
          <g>
            <line x1={pad.l} x2={w - pad.r} y1={yAt(last)} y2={yAt(last)} stroke={lastChange >= 0 ? "var(--bull)" : "var(--bear)"} strokeDasharray="2 3" opacity={0.6} />
            <rect x={w - pad.r} y={yAt(last) - 8} width={pad.r - 2} height={16} fill={lastChange >= 0 ? "var(--bull)" : "var(--bear)"} rx={3} />
            <text x={w - pad.r + 4} y={yAt(last) + 3} fontSize={10} fill="white" fontWeight={700} fontFamily="ui-monospace, monospace">{formatNumber(last, axisDecimals(last))}</text>
          </g>
        </g>

        {/* === SUBCHARTS === */}
        {subcharts.map((sub, si) => {
          const yOff = mainH + si * subH + 6;
          const innerH = subH - 12;
          return (
            <g key={sub} transform={`translate(0, ${yOff})`}>
              <line x1={pad.l} x2={w - pad.r} y1={0} y2={0} stroke="var(--chart-grid)" />
              <text x={pad.l + 4} y={11} fontSize={10} fill="var(--chart-axis)" fontWeight={600} className="uppercase tracking-wider">
                {sub === "volume" ? "Volume" : sub === "rsi" ? "RSI (14)" : "MACD (12/26/9)"}
              </text>
              {sub === "volume" && vols.map((v, i) => {
                const h = Math.max(0, (v / vMax) * (innerH - 4));
                const up = closes[i] >= opens[i];
                return (
                  <rect key={i} x={xAt(i) - candleW / 2} y={innerH - h + 2} width={candleW} height={h}
                        fill={up ? "var(--bull)" : "var(--bear)"} opacity={0.5} />
                );
              })}
              {sub === "rsi" && (() => {
                const ys = (val: number) => 2 + (1 - (val) / 100) * (innerH - 4);
                return (
                  <>
                    <line x1={pad.l} x2={w - pad.r} y1={ys(70)} y2={ys(70)} stroke="var(--bear)" strokeDasharray="3 3" opacity={0.45} />
                    <line x1={pad.l} x2={w - pad.r} y1={ys(30)} y2={ys(30)} stroke="var(--bull)" strokeDasharray="3 3" opacity={0.45} />
                    <line x1={pad.l} x2={w - pad.r} y1={ys(50)} y2={ys(50)} stroke="var(--chart-grid)" strokeDasharray="2 4" />
                    <Linepath points={rsiArr.map((v, i) => isNaN(v) ? null : [xAt(i), ys(v)])} stroke="var(--chart-1)" width={1.4} />
                    <text x={w - pad.r + 4} y={ys(70) + 3} fontSize={9} fill="var(--chart-axis)">70</text>
                    <text x={w - pad.r + 4} y={ys(30) + 3} fontSize={9} fill="var(--chart-axis)">30</text>
                  </>
                );
              })()}
              {sub === "macd" && (() => {
                const all = [...macd.line, ...macd.sig, ...macd.hist];
                const mn = Math.min(...all); const mx = Math.max(...all);
                const range = Math.max(1e-9, mx - mn);
                const yv = (v: number) => 2 + (1 - (v - mn) / range) * (innerH - 4);
                const zeroY = yv(0);
                return (
                  <>
                    <line x1={pad.l} x2={w - pad.r} y1={zeroY} y2={zeroY} stroke="var(--chart-grid)" />
                    {macd.hist.map((v, i) => {
                      const y = yv(v); const h = Math.abs(y - zeroY);
                      return (
                        <rect key={i} x={xAt(i) - candleW / 2} y={Math.min(y, zeroY)} width={candleW} height={Math.max(1, h)}
                              fill={v >= 0 ? "var(--bull)" : "var(--bear)"} opacity={0.65} />
                      );
                    })}
                    <Linepath points={macd.line.map((v, i) => [xAt(i), yv(v)])} stroke="var(--chart-1)" width={1.4} />
                    <Linepath points={macd.sig.map((v, i) => [xAt(i), yv(v)])} stroke="var(--chart-2)" width={1.2} />
                  </>
                );
              })()}
            </g>
          );
        })}

        {/* === GLOBAL CROSSHAIR === */}
        {cross && (
          <g pointerEvents="none">
            <line x1={cross.x} x2={cross.x} y1={0} y2={totalH - 4} stroke="var(--chart-axis)" strokeDasharray="2 3" opacity={0.75} />
            <line x1={pad.l} x2={w - pad.r} y1={yAt(closes[cross.idx])} y2={yAt(closes[cross.idx])} stroke="var(--chart-axis)" strokeDasharray="2 3" opacity={0.6} />
            <rect x={cross.x - 32} y={mainH - 14} width={64} height={14} fill="var(--chart-tooltip)" stroke="var(--border)" rx={2} />
            <text x={cross.x} y={mainH - 4} fontSize={10} textAnchor="middle" fill="var(--foreground)" fontFamily="ui-monospace, monospace">
              {new Date(data.t[cross.idx] * 1000).toLocaleDateString("de-DE", { month: "short", day: "2-digit" })}
            </text>
          </g>
        )}
      </svg>

      {/* Legende */}
      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        {overlays.includes("ema20") && (
          <Legend
            swatch="#38bdf8"
            label="EMA 20"
            info="Exponentieller gleitender Durchschnitt der letzten 20 Perioden. Reagiert schneller als die einfache SMA — gilt als kurzfristiger Trend-Indikator. Liegt der Kurs darüber, ist das kurzfristige Momentum bullish."
          />
        )}
        {overlays.includes("ema50") && (
          <Legend
            swatch="#fbbf24"
            label="EMA 50"
            info="Exponentieller 50-Tage-Durchschnitt — der klassische mittelfristige Trend-Filter. Viele Institutionelle nutzen ihn als dynamische Support-/Resistance-Linie. Kreuzungen mit EMA 20 markieren Trendwechsel."
          />
        )}
        {overlays.includes("sma200") && (
          <Legend
            swatch="#c084fc"
            label="SMA 200"
            info="Einfacher 200-Tage-Durchschnitt — der wichtigste Langfrist-Trendmarker. Kurs über SMA 200 = Bullenmarkt-Bias, darunter = Bärenmarkt-Bias. Der ‚Death Cross‘ (EMA 50 unter SMA 200) gilt als klassisches Verkaufssignal."
          />
        )}
        {overlays.includes("bbands") && (
          <Legend
            swatch="#38bdf8"
            label="Bollinger 20·2σ"
            info="Bänder rund um die 20-Tage-SMA, ±2 Standardabweichungen breit. Sie messen Volatilität: Enge Bänder = ruhiger Markt (oft vor Ausbruch), weite Bänder = hohe Volatilität. Berührt der Kurs das obere Band, gilt er als kurzfristig überkauft, unteres Band = überverkauft."
          />
        )}
        {showZones && zones.length > 0 && (
          <Legend
            swatch="#22c55e"
            label={`${zones.length} Smart-Zones`}
            info="Algorithmisch erkannte Support- und Resistance-Zonen, basierend auf gehäuften Kursreaktionen und Volumen-Clustern. Diese Bereiche sind oft Entscheidungspunkte für Kauf-/Verkaufsdruck."
          />
        )}
      </div>
    </div>
  );
}

function Legend({ swatch, label, info }: { swatch: string; label: string; info?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-[2px] w-3 rounded-sm" style={{ background: swatch }} />
      {label}
      {info && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Erklärung zu ${label}`}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Info className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-72 text-xs leading-relaxed">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-[3px] w-4 rounded-sm" style={{ background: swatch }} />
              <span className="font-semibold text-foreground">{label}</span>
            </div>
            <p className="text-muted-foreground">{info}</p>
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}

function Linepath({ points, stroke, width = 1, dash }: { points: Array<[number, number] | null>; stroke: string; width?: number; dash?: string }) {
  let d = "";
  let started = false;
  for (const p of points) {
    if (!p) { started = false; continue; }
    d += `${started ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)} `;
    started = true;
  }
  return <path d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash} />;
}
