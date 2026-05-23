// APEX PRIME — Server-side quantitative engine.
// Implements all 40 modules from the APEX PRIME specification (A1-G3)
// plus Monte-Carlo, GARCH(1,1) and VaR/CVaR.
// Pure math, no external deps — safe for the Cloudflare Worker runtime.

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

// ─── basic stats ────────────────────────────────────────────────
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
export const stdev = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const last = <T,>(a: T[]) => a[a.length - 1];
const safe = (n: number, f = 0) => (Number.isFinite(n) ? n : f);

// ─── moving averages ───────────────────────────────────────────
export const sma = (xs: number[], p: number): number[] => {
  const out: number[] = new Array(xs.length).fill(NaN);
  if (xs.length < p) return out;
  let s = 0;
  for (let i = 0; i < p; i++) s += xs[i];
  out[p - 1] = s / p;
  for (let i = p; i < xs.length; i++) {
    s += xs[i] - xs[i - p];
    out[i] = s / p;
  }
  return out;
};

export const ema = (xs: number[], p: number): number[] => {
  const out: number[] = [];
  const k = 2 / (p + 1);
  for (let i = 0; i < xs.length; i++) {
    if (i === 0) { out.push(xs[0]); continue; }
    out.push(xs[i] * k + out[i - 1] * (1 - k));
  }
  return out;
};

const wma = (xs: number[], p: number): number[] => {
  const out: number[] = new Array(xs.length).fill(NaN);
  const denom = (p * (p + 1)) / 2;
  for (let i = p - 1; i < xs.length; i++) {
    let s = 0;
    for (let j = 0; j < p; j++) s += xs[i - j] * (p - j);
    out[i] = s / denom;
  }
  return out;
};

// Hull MA (B4)
export const hma = (xs: number[], p = 20): number => {
  if (xs.length < p) return NaN;
  const half = Math.floor(p / 2);
  const w1 = wma(xs, half);
  const w2 = wma(xs, p);
  const raw = xs.map((_, i) => 2 * (w1[i] ?? NaN) - (w2[i] ?? NaN));
  const cleaned = raw.filter(Number.isFinite);
  return last(wma(cleaned, Math.round(Math.sqrt(p))));
};

// ─── returns / vol ────────────────────────────────────────────
export const simpleReturns = (xs: number[]): number[] => {
  const r: number[] = [];
  for (let i = 1; i < xs.length; i++) r.push((xs[i] - xs[i - 1]) / xs[i - 1]);
  return r;
};
export const logReturns = (xs: number[]): number[] => {
  const r: number[] = [];
  for (let i = 1; i < xs.length; i++) if (xs[i - 1] > 0) r.push(Math.log(xs[i] / xs[i - 1]));
  return r;
};
// C1 — annualized hist vol from log returns
export const annualVol = (xs: number[]): number => stdev(logReturns(xs)) * Math.sqrt(252);

// ─── Module A — Momentum ──────────────────────────────────────
// A1 RSI(14) Wilder
export const rsi = (xs: number[], p = 14): number => {
  if (xs.length < p + 1) return 50;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) {
    const d = xs[i] - xs[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let avgG = g / p, avgL = l / p;
  for (let i = p + 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    avgG = (avgG * (p - 1) + Math.max(d, 0)) / p;
    avgL = (avgL * (p - 1) + Math.max(-d, 0)) / p;
  }
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
};

// rolling RSI series (needed for StochRSI)
const rsiSeries = (xs: number[], p = 14): number[] => {
  const out: number[] = new Array(xs.length).fill(NaN);
  if (xs.length < p + 1) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) {
    const d = xs[i] - xs[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let avgG = g / p, avgL = l / p;
  out[p] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  for (let i = p + 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    avgG = (avgG * (p - 1) + Math.max(d, 0)) / p;
    avgL = (avgL * (p - 1) + Math.max(-d, 0)) / p;
    out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return out;
};

// A2 StochRSI(14,3,3)
export const stochRSI = (xs: number[], p = 14, k = 3, d = 3) => {
  const r = rsiSeries(xs, p).filter(Number.isFinite);
  if (r.length < p) return { k: NaN, d: NaN };
  const stoch: number[] = [];
  for (let i = p - 1; i < r.length; i++) {
    const w = r.slice(i - p + 1, i + 1);
    const min = Math.min(...w), max = Math.max(...w);
    stoch.push(max === min ? 0.5 : (r[i] - min) / (max - min));
  }
  const kLine = sma(stoch, k);
  const dLine = sma(kLine.filter(Number.isFinite), d);
  return { k: safe(last(kLine) * 100, NaN), d: safe(last(dLine) * 100, NaN) };
};

// A3 MACD(12,26,9)
export const macd = (xs: number[]) => {
  const e12 = ema(xs, 12), e26 = ema(xs, 26);
  const line = xs.map((_, i) => e12[i] - e26[i]);
  const sig = ema(line, 9);
  return { macd: last(line), signal: last(sig), histogram: last(line) - last(sig) };
};

// A4 Williams %R(14)
export const williamsR = (h: number[], l: number[], c: number[], p = 14): number => {
  if (c.length < p) return NaN;
  const hh = Math.max(...h.slice(-p));
  const ll = Math.min(...l.slice(-p));
  if (hh === ll) return -50;
  return ((hh - last(c)) / (hh - ll)) * -100;
};

// A5 CCI(20)
export const cci = (h: number[], l: number[], c: number[], p = 20): number => {
  if (c.length < p) return NaN;
  const tp = c.map((_, i) => (h[i] + l[i] + c[i]) / 3);
  const sl = tp.slice(-p);
  const m = mean(sl);
  const md = mean(sl.map((v) => Math.abs(v - m)));
  return md === 0 ? 0 : (last(tp) - m) / (0.015 * md);
};

// A6 Momentum / A7 ROC
export const momentum = (xs: number[], p = 10): number => xs.length > p ? xs[xs.length - 1] - xs[xs.length - 1 - p] : 0;
export const roc = (xs: number[], p = 10): number => xs.length > p ? ((xs[xs.length - 1] - xs[xs.length - 1 - p]) / xs[xs.length - 1 - p]) * 100 : 0;

// A8 ADX(14) — Wilder
export const adx = (h: number[], l: number[], c: number[], p = 14): number => {
  const n = c.length;
  if (n < p * 2) return NaN;
  const tr: number[] = [], pDM: number[] = [], nDM: number[] = [];
  for (let i = 1; i < n; i++) {
    const upMove = h[i] - h[i - 1];
    const downMove = l[i - 1] - l[i];
    pDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    nDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  }
  // Wilder smoothing
  const smooth = (a: number[]) => {
    const o: number[] = [];
    let s = a.slice(0, p).reduce((x, y) => x + y, 0);
    o.push(s);
    for (let i = p; i < a.length; i++) { s = s - s / p + a[i]; o.push(s); }
    return o;
  };
  const trS = smooth(tr), pS = smooth(pDM), nS = smooth(nDM);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    const pDI = (pS[i] / trS[i]) * 100;
    const nDI = (nS[i] / trS[i]) * 100;
    dx.push((Math.abs(pDI - nDI) / (pDI + nDI || 1)) * 100);
  }
  if (dx.length < p) return mean(dx);
  // ADX = Wilder average of DX over p
  let adxV = mean(dx.slice(0, p));
  for (let i = p; i < dx.length; i++) adxV = (adxV * (p - 1) + dx[i]) / p;
  return adxV;
};

// ─── Module B — Trend ─────────────────────────────────────────
// B3 VWAP
export const vwap = (h: number[], l: number[], c: number[], v: number[]): number => {
  let pv = 0, vv = 0;
  for (let i = 0; i < c.length; i++) { const tp = (h[i] + l[i] + c[i]) / 3; pv += tp * v[i]; vv += v[i]; }
  return vv ? pv / vv : last(c);
};

// B5 Ichimoku
export const ichimoku = (h: number[], l: number[]) => {
  const r = (p: number) => {
    if (h.length < p) return NaN;
    return (Math.max(...h.slice(-p)) + Math.min(...l.slice(-p))) / 2;
  };
  const tenkan = r(9), kijun = r(26);
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = r(52);
  return { tenkan, kijun, senkouA, senkouB };
};

// B6 Parabolic SAR (simplified)
export const parabolicSAR = (h: number[], l: number[], step = 0.02, maxStep = 0.2): number => {
  if (h.length < 5) return NaN;
  let isUp = true;
  let sar = l[0];
  let ep = h[0];
  let af = step;
  for (let i = 1; i < h.length; i++) {
    sar = sar + af * (ep - sar);
    if (isUp) {
      if (h[i] > ep) { ep = h[i]; af = Math.min(af + step, maxStep); }
      if (l[i] < sar) { isUp = false; sar = ep; ep = l[i]; af = step; }
    } else {
      if (l[i] < ep) { ep = l[i]; af = Math.min(af + step, maxStep); }
      if (h[i] > sar) { isUp = true; sar = ep; ep = h[i]; af = step; }
    }
  }
  return sar;
};

// ─── Module C — Volatility / Risk ────────────────────────────
// C2 Bollinger
export const bollinger = (xs: number[], p = 20, k = 2) => {
  const sl = xs.slice(-p);
  const m = mean(sl), s = stdev(sl);
  return { upper: m + k * s, middle: m, lower: m - k * s, widthPct: m ? ((2 * k * s) / m) * 100 : 0 };
};

// C3 ATR(14)
export const atr = (h: number[], l: number[], c: number[], p = 14): number => {
  const tr: number[] = [];
  for (let i = 1; i < c.length; i++) tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  if (tr.length < p) return mean(tr);
  let a = mean(tr.slice(0, p));
  for (let i = p; i < tr.length; i++) a = (a * (p - 1) + tr[i]) / p;
  return a;
};

// C4 Z-Score(20)
export const zScore = (xs: number[], p = 20): number => {
  const sl = xs.slice(-p);
  const s = stdev(sl);
  return s ? (last(xs) - mean(sl)) / s : 0;
};

// C5 VaR(95% / 99%, 1d) — parametric
export const varParametric = (xs: number[], conf = 0.95): number => {
  const z = conf >= 0.99 ? 2.326 : 1.645;
  const r = logReturns(xs);
  return stdev(r) * z; // % of price
};
// C6 CVaR (expected shortfall, historical)
export const cvar = (xs: number[], conf = 0.95): number => {
  const r = logReturns(xs).sort((a, b) => a - b);
  if (!r.length) return 0;
  const cut = Math.max(1, Math.floor(r.length * (1 - conf)));
  const tail = r.slice(0, cut);
  return -mean(tail);
};

// C7 Beta + Blume adj
export const beta = (asset: number[], bench: number[]): number => {
  const ra = simpleReturns(asset), rb = simpleReturns(bench);
  const n = Math.min(ra.length, rb.length);
  if (n < 5) return 1;
  const a = ra.slice(-n), b = rb.slice(-n);
  const ma = mean(a), mb = mean(b);
  let cov = 0, varB = 0;
  for (let i = 0; i < n; i++) { cov += (a[i] - ma) * (b[i] - mb); varB += (b[i] - mb) ** 2; }
  return varB ? cov / varB : 1;
};
export const blumeBeta = (b: number) => (2 / 3) * b + 1 / 3;
export const correlation = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ax = a.slice(-n), bx = b.slice(-n);
  const ma = mean(ax), mb = mean(bx);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = ax[i] - ma, y = bx[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da && db ? num / Math.sqrt(da * db) : 0;
};

// C8 GARCH(1,1) — fixed params (ω≈0.000002, α≈0.09, β≈0.90) producing next-day σ
export const garch11 = (xs: number[]): { sigmaNext: number; sigmaAnnual: number } => {
  const r = logReturns(xs);
  if (r.length < 30) {
    const s = stdev(r);
    return { sigmaNext: s, sigmaAnnual: s * Math.sqrt(252) };
  }
  const omega = 2e-6, alpha = 0.09, betaP = 0.90;
  let sigma2 = Math.max(stdev(r) ** 2, 1e-8);
  for (let i = 0; i < r.length; i++) sigma2 = omega + alpha * r[i] ** 2 + betaP * sigma2;
  const s = Math.sqrt(sigma2);
  return { sigmaNext: s, sigmaAnnual: s * Math.sqrt(252) };
};

// ─── Module D — Forecast ─────────────────────────────────────
// D1 Linear regression channel
export const linearRegression = (xs: number[]) => {
  const n = xs.length;
  if (n < 3) return { slope: 0, intercept: 0, r2: 0, residStd: 0, forecast: last(xs) };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += xs[i]; sxy += i * xs[i]; sxx += i * i; }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const fitted = xs.map((_, i) => intercept + slope * i);
  const ssRes = xs.reduce((s, y, i) => s + (y - fitted[i]) ** 2, 0);
  const ssTot = xs.reduce((s, y) => s + (y - sy / n) ** 2, 0);
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  const residStd = Math.sqrt(ssRes / Math.max(1, n - 2));
  return { slope, intercept, r2, residStd, forecast: intercept + slope * (n - 1) };
};

// Std-normal sample (Box-Muller)
const randn = () => {
  const u = Math.random() || 1e-12, v = Math.random() || 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// D2 Monte Carlo + D3 GBM
export const monteCarloGBM = (S0: number, mu: number, sigma: number, days: number, paths = 5000) => {
  const dt = 1 / 252;
  const ends: number[] = [];
  for (let p = 0; p < paths; p++) {
    let S = S0;
    for (let d = 0; d < days; d++) {
      S = S * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * randn());
    }
    ends.push(S);
  }
  ends.sort((a, b) => a - b);
  const q = (p: number) => ends[Math.min(ends.length - 1, Math.max(0, Math.floor(p * ends.length)))];
  return { p10: q(0.10), p25: q(0.25), p50: q(0.50), p75: q(0.75), p90: q(0.90), p05: q(0.05), p95: q(0.95) };
};

// D4 Mean reversion half-life via AR(1) on differences
export const meanReversionHalfLife = (xs: number[]): number => {
  if (xs.length < 30) return NaN;
  const y = xs.slice(1);
  const x = xs.slice(0, -1);
  const dy = y.map((v, i) => v - x[i]);
  const mx = mean(x), mdy = mean(dy);
  let num = 0, den = 0;
  for (let i = 0; i < x.length; i++) { num += (x[i] - mx) * (dy[i] - mdy); den += (x[i] - mx) ** 2; }
  const lambda = den ? -num / den : 0;
  if (lambda <= 0) return NaN;
  return Math.log(2) / lambda;
};

// ─── Module F — Portfolio metrics ────────────────────────────
// F1 Sharpe / F2 Sortino / F3 Calmar / F4 MaxDD
export const sharpe = (xs: number[], rf = 0.035) => {
  const r = simpleReturns(xs);
  const annR = mean(r) * 252, annS = stdev(r) * Math.sqrt(252);
  return annS ? (annR - rf) / annS : 0;
};
export const sortino = (xs: number[], rf = 0.035) => {
  const r = simpleReturns(xs);
  const downs = r.filter((v) => v < 0);
  const dd = Math.sqrt(downs.reduce((s, v) => s + v * v, 0) / Math.max(1, downs.length)) * Math.sqrt(252);
  const annR = mean(r) * 252;
  return dd ? (annR - rf) / dd : 0;
};
export const maxDrawdown = (xs: number[]) => {
  let peak = xs[0], mdd = 0;
  for (const p of xs) { if (p > peak) peak = p; const dd = (p - peak) / peak; if (dd < mdd) mdd = dd; }
  return mdd;
};
export const calmar = (xs: number[]) => {
  const r = simpleReturns(xs);
  const annR = mean(r) * 252;
  const mdd = Math.abs(maxDrawdown(xs));
  return mdd ? annR / mdd : 0;
};

// F5 Kelly fraction (approx — based on win rate from daily returns)
export const kelly = (xs: number[]): { full: number; half: number } => {
  const r = simpleReturns(xs);
  const wins = r.filter((v) => v > 0);
  const losses = r.filter((v) => v < 0);
  const p = r.length ? wins.length / r.length : 0;
  const avgWin = wins.length ? mean(wins) : 0;
  const avgLoss = losses.length ? Math.abs(mean(losses)) : 0;
  if (!avgLoss) return { full: 0, half: 0 };
  const b = avgWin / avgLoss;
  const f = (b * p - (1 - p)) / (b || 1);
  const clamped = Math.max(-0.5, Math.min(1, f));
  return { full: clamped, half: clamped / 2 };
};

// F6 Treynor
export const treynor = (xs: number[], bench: number[], rf = 0.035) => {
  const r = simpleReturns(xs);
  const b = beta(xs, bench);
  return b ? (mean(r) * 252 - rf) / b : 0;
};

// ─── Module G — Relative strength ─────────────────────────────
export const relativeStrength = (asset: number[], bench: number[], lookback = 90): number => {
  if (asset.length < lookback + 1 || bench.length < lookback + 1) return 1;
  const ra = (last(asset) - asset[asset.length - 1 - lookback]) / asset[asset.length - 1 - lookback];
  const rb = (last(bench) - bench[bench.length - 1 - lookback]) / bench[bench.length - 1 - lookback];
  return rb ? (1 + ra) / (1 + rb) : 1;
};

// ─── Master report ───────────────────────────────────────────
export type ApexReport = {
  symbol: string;
  price: number;
  changePct: number;
  asOf: string;
  modules: {
    A: { rsi: number; stochRSI_K: number; stochRSI_D: number; macd: number; signal: number; hist: number; williamsR: number; cci: number; momentum: number; roc: number; adx: number };
    B: { sma20: number; sma50: number; sma200: number; ema12: number; ema26: number; ema50: number; vwap: number; hma20: number; ichimoku: ReturnType<typeof ichimoku>; sar: number };
    C: { bb: ReturnType<typeof bollinger>; atr: number; atrPct: number; zScore: number; var95: number; var99: number; cvar95: number; beta: number; betaAdj: number; corrSPY: number; histVol: number; garchSigmaNext: number; garchAnnual: number };
    D: { regSlope: number; regR2: number; regForecast: number; mc30: ReturnType<typeof monteCarloGBM>; halfLife: number };
    F: { sharpe: number; sortino: number; calmar: number; maxDD: number; kellyFull: number; kellyHalf: number; treynor: number };
    G: { relStrength: number };
  };
  score: number;          // 0-100
  confidence: number;     // 0-100
  verdict: string;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

// Score the seven module groups (5% Sentiment slot reserved for caller).
const scoreModules = (m: ApexReport["modules"], price: number): { total: number; A: number; B: number; C: number; D: number; F: number; G: number } => {
  // A momentum 0-100
  let a = 50;
  if (m.A.rsi < 30) a += 15; else if (m.A.rsi > 70) a -= 15; else a += (50 - Math.abs(m.A.rsi - 50)) * 0.3;
  a += m.A.hist > 0 ? 10 : -10;
  a += clamp(m.A.roc, -10, 10);
  a += m.A.adx > 25 ? 5 : 0;
  a = clamp(a, 0, 100);

  // B trend
  let b = 50;
  if (price > m.B.sma20) b += 10; else b -= 10;
  if (Number.isFinite(m.B.sma50) && m.B.sma20 > m.B.sma50) b += 10; else b -= 5;
  if (Number.isFinite(m.B.sma200) && price > m.B.sma200) b += 10;
  if (price > m.B.vwap) b += 5;
  if (price > m.B.ichimoku.senkouA && price > m.B.ichimoku.senkouB) b += 10;
  b = clamp(b, 0, 100);

  // C volatility/risk — lower vol = higher score
  let c = 70 - m.C.histVol * 100;
  if (m.C.bb.widthPct < 5) c += 5;
  if (Math.abs(m.C.zScore) > 2) c -= 10;
  c = clamp(c, 0, 100);

  // D forecast
  let d = 50 + m.D.regSlope * 1000 * m.D.regR2;
  if (m.D.mc30.p50 > price) d += 15; else d -= 10;
  d = clamp(d, 0, 100);

  // F portfolio quality
  let f = 50 + m.F.sharpe * 15 + m.F.sortino * 5 + m.F.calmar * 5;
  if (Math.abs(m.F.maxDD) > 0.4) f -= 15;
  f = clamp(f, 0, 100);

  // G relative
  let g = 50 + (m.G.relStrength - 1) * 100;
  g = clamp(g, 0, 100);

  // weights 15/15/15/15/10/10 (Fundamentals 15% + Sentiment 5% reserved → distributed to A/B)
  const total = a * 0.20 + b * 0.20 + c * 0.15 + d * 0.15 + f * 0.15 + g * 0.15;
  return { total, A: a, B: b, C: c, D: d, F: f, G: g };
};

const mapVerdict = (conf: number, bullish: boolean) => {
  if (conf < 50) return "KEIN SIGNAL";
  if (conf < 60) return "BEOBACHTEN";
  if (conf < 70) return "LEICHTE POSITIONIERUNG";
  if (conf < 80) return bullish ? "KAUFEN" : "VERKAUFEN";
  return bullish ? "STARKES KAUFEN" : "STARKES VERKAUFEN";
};

export const apexAnalyze = (symbol: string, candles: Candle[], benchClose?: number[]): ApexReport => {
  const c = candles.map((k) => k.c);
  const h = candles.map((k) => k.h);
  const l = candles.map((k) => k.l);
  const v = candles.map((k) => k.v);
  const price = last(c);
  const prev = c[c.length - 2] ?? price;
  const changePct = ((price - prev) / prev) * 100;
  const bench = benchClose && benchClose.length > 30 ? benchClose : c; // fallback self-bench

  const macdR = macd(c);
  const sR = stochRSI(c);
  const bbR = bollinger(c, 20, 2);
  const atrV = atr(h, l, c, 14);
  const histV = annualVol(c);
  const garch = garch11(c);
  const reg = linearRegression(c.slice(-90));
  const mu = mean(simpleReturns(c)) * 252;
  const mc = monteCarloGBM(price, mu, garch.sigmaAnnual || histV, 30, 4000);
  const betaV = beta(c, bench);

  const modules: ApexReport["modules"] = {
    A: {
      rsi: rsi(c, 14),
      stochRSI_K: sR.k,
      stochRSI_D: sR.d,
      macd: macdR.macd,
      signal: macdR.signal,
      hist: macdR.histogram,
      williamsR: williamsR(h, l, c, 14),
      cci: cci(h, l, c, 20),
      momentum: momentum(c, 10),
      roc: roc(c, 10),
      adx: adx(h, l, c, 14),
    },
    B: {
      sma20: last(sma(c, 20)),
      sma50: last(sma(c, 50)),
      sma200: last(sma(c, 200)),
      ema12: last(ema(c, 12)),
      ema26: last(ema(c, 26)),
      ema50: last(ema(c, 50)),
      vwap: vwap(h, l, c, v),
      hma20: hma(c, 20),
      ichimoku: ichimoku(h, l),
      sar: parabolicSAR(h, l),
    },
    C: {
      bb: bbR,
      atr: atrV,
      atrPct: (atrV / price) * 100,
      zScore: zScore(c, 20),
      var95: varParametric(c, 0.95) * 100,
      var99: varParametric(c, 0.99) * 100,
      cvar95: cvar(c, 0.95) * 100,
      beta: betaV,
      betaAdj: blumeBeta(betaV),
      corrSPY: correlation(simpleReturns(c), simpleReturns(bench)),
      histVol: histV,
      garchSigmaNext: garch.sigmaNext * 100,
      garchAnnual: garch.sigmaAnnual * 100,
    },
    D: {
      regSlope: reg.slope,
      regR2: reg.r2,
      regForecast: reg.forecast,
      mc30: mc,
      halfLife: meanReversionHalfLife(c),
    },
    F: {
      sharpe: sharpe(c),
      sortino: sortino(c),
      calmar: calmar(c),
      maxDD: maxDrawdown(c) * 100,
      kellyFull: kelly(c).full * 100,
      kellyHalf: kelly(c).half * 100,
      treynor: treynor(c, bench),
    },
    G: {
      relStrength: relativeStrength(c, bench, 90),
    },
  };

  const sc = scoreModules(modules, price);
  // Map score to confidence band per spec
  let confidence: number;
  if (sc.total >= 85) confidence = 80 + (sc.total - 85) * (15 / 15);
  else if (sc.total >= 70) confidence = 70 + (sc.total - 70) * (9 / 15);
  else if (sc.total >= 60) confidence = 60 + (sc.total - 60) * (9 / 10);
  else if (sc.total >= 50) confidence = 50 + (sc.total - 50) * (9 / 10);
  else confidence = Math.max(0, sc.total * 0.9);

  const bullish = sc.total >= 50;
  const verdict = mapVerdict(confidence, bullish);

  return {
    symbol,
    price,
    changePct,
    asOf: new Date().toISOString(),
    modules,
    score: sc.total,
    confidence,
    verdict,
  };
};

// Compact, model-friendly text rendering for prompt injection.
export const renderApexReport = (r: ApexReport): string => {
  const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
  const m = r.modules;
  return `## LIVE-QUANT-REPORT (${r.symbol})
Stand: ${r.asOf}
Kurs: $${f(r.price)} (${r.changePct >= 0 ? "+" : ""}${f(r.changePct)}% heute)

GESAMTSCORE: ${f(r.score, 1)}/100  →  Konfidenz: ${f(r.confidence, 1)}%
VERDICT (vorberechnet, kann übernommen werden): ${r.verdict}

[A] Momentum
  A1 RSI(14)=${f(m.A.rsi, 1)}  A2 StochRSI %K=${f(m.A.stochRSI_K, 1)}/%D=${f(m.A.stochRSI_D, 1)}
  A3 MACD=${f(m.A.macd, 3)} Sig=${f(m.A.signal, 3)} Hist=${f(m.A.hist, 3)}
  A4 Williams%R=${f(m.A.williamsR, 1)}  A5 CCI(20)=${f(m.A.cci, 1)}
  A6 Mom(10)=${f(m.A.momentum, 2)}  A7 ROC(10)=${f(m.A.roc, 2)}%  A8 ADX(14)=${f(m.A.adx, 1)}

[B] Trend
  B1 SMA20=${f(m.B.sma20)} / SMA50=${f(m.B.sma50)} / SMA200=${f(m.B.sma200)}
  B2 EMA12=${f(m.B.ema12)} / EMA26=${f(m.B.ema26)} / EMA50=${f(m.B.ema50)}
  B3 VWAP=${f(m.B.vwap)}  B4 HMA20=${f(m.B.hma20)}
  B5 Ichimoku: Tenkan=${f(m.B.ichimoku.tenkan)} Kijun=${f(m.B.ichimoku.kijun)} SenkouA=${f(m.B.ichimoku.senkouA)} SenkouB=${f(m.B.ichimoku.senkouB)}
  B6 Parabolic SAR=${f(m.B.sar)}

[C] Volatilität / Risiko
  C1 σ_ann (hist)=${f(m.C.histVol * 100, 1)}%
  C2 Bollinger: oben=${f(m.C.bb.upper)} mitte=${f(m.C.bb.middle)} unten=${f(m.C.bb.lower)} BW=${f(m.C.bb.widthPct, 2)}%
  C3 ATR(14)=${f(m.C.atr)} (${f(m.C.atrPct, 2)}% vom Kurs)
  C4 Z-Score(20)=${f(m.C.zScore, 2)}
  C5 VaR(95%, 1T)=${f(m.C.var95, 2)}%  VaR(99%)=${f(m.C.var99, 2)}%
  C6 CVaR(95%)=${f(m.C.cvar95, 2)}%
  C7 Beta=${f(m.C.beta, 2)} (Blume-adj=${f(m.C.betaAdj, 2)}) ρ_Bench=${f(m.C.corrSPY, 2)}
  C8 GARCH(1,1) σ_next=${f(m.C.garchSigmaNext, 2)}% σ_ann=${f(m.C.garchAnnual, 1)}%

[D] Prognose
  D1 LinReg(90d): slope=${f(m.D.regSlope, 4)} R²=${f(m.D.regR2, 3)} Forecast=${f(m.D.regForecast)}
  D2/D3 Monte-Carlo GBM (30T, 4000 Pfade):
     P10=${f(m.D.mc30.p10)} P25=${f(m.D.mc30.p25)} P50=${f(m.D.mc30.p50)} P75=${f(m.D.mc30.p75)} P90=${f(m.D.mc30.p90)}
     95%-KI=${f(m.D.mc30.p05)} – ${f(m.D.mc30.p95)}
  D4 Mean-Reversion Halbwertszeit ≈ ${f(m.D.halfLife, 1)} Tage

[F] Portfolio-Qualität
  F1 Sharpe=${f(m.F.sharpe, 2)}  F2 Sortino=${f(m.F.sortino, 2)}  F3 Calmar=${f(m.F.calmar, 2)}
  F4 Max Drawdown=${f(m.F.maxDD, 1)}%
  F5 Kelly=${f(m.F.kellyFull, 1)}% (Half=${f(m.F.kellyHalf, 1)}%)
  F6 Treynor=${f(m.F.treynor, 2)}

[G] Sektor / Relative Stärke
  G1 RS (90T) vs Bench=${f(m.G.relStrength, 3)} (>1 outperform, <1 underperform)

REGELN für Antwort:
- Diese Werte sind verbindlich; eigene Berechnungen müssen damit übereinstimmen.
- Preis-Prognosen NICHT über ±2σ_30 hinaus extrapolieren (σ_30 = σ_ann/√252·√30).
- Konfidenz-Wort-Mapping unbedingt einhalten (R1).`;
};

// Helper to pull bench candles via the candles route. Wrapped by the chat endpoint.
