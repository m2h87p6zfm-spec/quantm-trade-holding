import { useMemo, useRef, useState, useEffect } from "react";
import { computeZones, type Zone } from "@/lib/zones";
import { ema, sma, bollinger as bb, rsi as rsiCalc } from "@/lib/indicators";

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
          <div className="font-mono text-2xl font-bold tabular-nums">{last.toFixed(2)}</div>
          <div className={`font-mono ${lastChange >= 0 ? "text-bull" : "text-bear"}`}>
            {lastChange >= 0 ? "+" : ""}{lastChange.toFixed(2)} %
          </div>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {ohlc ? (
            <>
              <span>O <b className="text-foreground">{ohlc.o.toFixed(2)}</b></span>
              <span className="ml-2">H <b className="text-foreground">{ohlc.h.toFixed(2)}</b></span>
              <span className="ml-2">L <b className="text-foreground">{ohlc.l.toFixed(2)}</b></span>
              <span className="ml-2">C <b className="text-foreground">{ohlc.c.toFixed(2)}</b></span>
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
          {/* Bull candle: lime → emerald gradient */}
          <linearGradient id="candleBull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="55%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          {/* Bear candle: rose → crimson gradient */}
          <linearGradient id="candleBear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="55%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          {/* Soft glow for active candles */}
          <filter id="candleGlowBull" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="candleGlowBear" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="zoneSup" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="zoneRes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.20" />
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
                <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4" opacity={0.5} />
                <text x={w - pad.r + 4} y={y + 3} fontSize={10} fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace">
                  {val.toFixed(2)}
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
                  {z.type === "support" ? "S" : "R"} · {z.touches}× · {(((z.low + z.high) / 2)).toFixed(2)}
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
              fill="var(--primary)"
              opacity={0.05}
            />
          )}

          {/* Candles — Gradient-Bodies + Glow-Wicks, letzte 3 mit Glow */}
          {closes.map((c, i) => {
            const o = opens[i]; const h = highs[i]; const l = lows[i];
            const up = c >= o;
            const bodyFill = up ? "url(#candleBull)" : "url(#candleBear)";
            const wickStroke = up ? "#4ade80" : "#f87171";
            const xC = xAt(i);
            const yO = yAt(o); const yC = yAt(c);
            const bodyTop = Math.min(yO, yC);
            const bodyH = Math.max(1.5, Math.abs(yO - yC));
            const isRecent = i >= N - 3;
            const glow = isRecent ? (up ? "url(#candleGlowBull)" : "url(#candleGlowBear)") : undefined;
            return (
              <g key={i} filter={glow}>
                {/* Wick with subtle outer halo */}
                <line x1={xC} x2={xC} y1={yAt(h)} y2={yAt(l)} stroke={wickStroke} strokeWidth={2.5} opacity={0.18} strokeLinecap="round" />
                <line x1={xC} x2={xC} y1={yAt(h)} y2={yAt(l)} stroke={wickStroke} strokeWidth={1} strokeLinecap="round" />
                {/* Body with gradient + crisp stroke */}
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
          {overlays.includes("ema20") && <Linepath points={ind.ema20.map((v, i) => [xAt(i), yAt(v)])} stroke="#38bdf8" width={1.4} />}
          {overlays.includes("ema50") && <Linepath points={ind.ema50.map((v, i) => [xAt(i), yAt(v)])} stroke="#fbbf24" width={1.2} />}
          {overlays.includes("sma200") && <Linepath points={ind.sma200.map((v, i) => isNaN(v) ? null : [xAt(i), yAt(v)])} stroke="#c084fc" width={1.2} dash="4 4" />}

          {/* Last-Marker */}
          <g>
            <line x1={pad.l} x2={w - pad.r} y1={yAt(last)} y2={yAt(last)} stroke={lastChange >= 0 ? "#22c55e" : "#ef4444"} strokeDasharray="2 3" opacity={0.6} />
            <rect x={w - pad.r} y={yAt(last) - 8} width={pad.r - 2} height={16} fill={lastChange >= 0 ? "#22c55e" : "#ef4444"} rx={2} />
            <text x={w - pad.r + 4} y={yAt(last) + 3} fontSize={10} fill="#ffffff" fontWeight={700} fontFamily="ui-monospace, monospace">{last.toFixed(2)}</text>
          </g>
        </g>

        {/* === SUBCHARTS === */}
        {subcharts.map((sub, si) => {
          const yOff = mainH + si * subH + 6;
          const innerH = subH - 12;
          return (
            <g key={sub} transform={`translate(0, ${yOff})`}>
              <line x1={pad.l} x2={w - pad.r} y1={0} y2={0} stroke="var(--border)" />
              <text x={pad.l + 4} y={11} fontSize={10} fill="var(--muted-foreground)" fontWeight={600} className="uppercase">
                {sub === "volume" ? "Volume" : sub === "rsi" ? "RSI (14)" : "MACD (12/26/9)"}
              </text>
              {sub === "volume" && vols.map((v, i) => {
                const h = Math.max(0, (v / vMax) * (innerH - 4));
                const up = closes[i] >= opens[i];
                return (
                  <rect key={i} x={xAt(i) - candleW / 2} y={innerH - h + 2} width={candleW} height={h}
                        fill={up ? "#22c55e" : "#ef4444"} opacity={0.55} />
                );
              })}
              {sub === "rsi" && (() => {
                const ys = (val: number) => 2 + (1 - (val) / 100) * (innerH - 4);
                return (
                  <>
                    <line x1={pad.l} x2={w - pad.r} y1={ys(70)} y2={ys(70)} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                    <line x1={pad.l} x2={w - pad.r} y1={ys(30)} y2={ys(30)} stroke="#22c55e" strokeDasharray="3 3" opacity={0.5} />
                    <line x1={pad.l} x2={w - pad.r} y1={ys(50)} y2={ys(50)} stroke="var(--border)" strokeDasharray="2 4" opacity={0.5} />
                    <Linepath points={rsiArr.map((v, i) => isNaN(v) ? null : [xAt(i), ys(v)])} stroke="#38bdf8" width={1.4} />
                    <text x={w - pad.r + 4} y={ys(70) + 3} fontSize={9} fill="var(--muted-foreground)">70</text>
                    <text x={w - pad.r + 4} y={ys(30) + 3} fontSize={9} fill="var(--muted-foreground)">30</text>
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
                    <line x1={pad.l} x2={w - pad.r} y1={zeroY} y2={zeroY} stroke="var(--border)" />
                    {macd.hist.map((v, i) => {
                      const y = yv(v); const h = Math.abs(y - zeroY);
                      return (
                        <rect key={i} x={xAt(i) - candleW / 2} y={Math.min(y, zeroY)} width={candleW} height={Math.max(1, h)}
                              fill={v >= 0 ? "#22c55e" : "#ef4444"} opacity={0.7} />
                      );
                    })}
                    <Linepath points={macd.line.map((v, i) => [xAt(i), yv(v)])} stroke="#38bdf8" width={1.4} />
                    <Linepath points={macd.sig.map((v, i) => [xAt(i), yv(v)])} stroke="#fbbf24" width={1.2} />
                  </>
                );
              })()}
            </g>
          );
        })}

        {/* === GLOBAL CROSSHAIR === */}
        {cross && (
          <g pointerEvents="none">
            <line x1={cross.x} x2={cross.x} y1={0} y2={totalH - 4} stroke="var(--muted-foreground)" strokeDasharray="2 3" opacity={0.7} />
            <line x1={pad.l} x2={w - pad.r} y1={yAt(closes[cross.idx])} y2={yAt(closes[cross.idx])} stroke="var(--muted-foreground)" strokeDasharray="2 3" opacity={0.6} />
            <rect x={cross.x - 30} y={mainH - 14} width={60} height={14} fill="var(--popover)" stroke="var(--border)" />
            <text x={cross.x} y={mainH - 4} fontSize={10} textAnchor="middle" fill="var(--foreground)" fontFamily="ui-monospace, monospace">
              {new Date(data.t[cross.idx] * 1000).toLocaleDateString("de-DE", { month: "short", day: "2-digit" })}
            </text>
          </g>
        )}
      </svg>

      {/* Legende */}
      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        {overlays.includes("ema20") && <Legend swatch="#38bdf8" label="EMA 20" />}
        {overlays.includes("ema50") && <Legend swatch="#fbbf24" label="EMA 50" />}
        {overlays.includes("sma200") && <Legend swatch="#c084fc" label="SMA 200" />}
        {overlays.includes("bbands") && <Legend swatch="#38bdf8" label="Bollinger 20·2σ" />}
        {showZones && zones.length > 0 && (
          <Legend swatch="#22c55e" label={`${zones.length} Smart-Zones`} />
        )}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-[2px] w-3 rounded-sm" style={{ background: swatch }} />
      {label}
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
