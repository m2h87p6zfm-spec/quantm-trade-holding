// Reine statistische Berechnungen — keine Marktdaten-Annahmen
export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const stddev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
};

export const sma = (xs: number[], p: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (i + 1 < p) { out.push(NaN); continue; }
    out.push(mean(xs.slice(i + 1 - p, i + 1)));
  }
  return out;
};

export const ema = (xs: number[], p: number): number[] => {
  const out: number[] = [];
  const k = 2 / (p + 1);
  let prev = xs[0];
  for (let i = 0; i < xs.length; i++) {
    if (i === 0) { out.push(xs[0]); prev = xs[0]; continue; }
    const v = xs[i] * k + prev * (1 - k);
    out.push(v); prev = v;
  }
  return out;
};

export const zScore = (xs: number[], p = 20): number => {
  const slice = xs.slice(-p);
  const s = stddev(slice);
  if (!s) return 0;
  return (xs[xs.length - 1] - mean(slice)) / s;
};

export const rsi = (xs: number[], p = 14): number => {
  if (xs.length < p + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = xs.length - p; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = (gains / p) / (losses / p);
  return 100 - 100 / (1 + rs);
};

export const bollinger = (xs: number[], p = 20, mult = 2) => {
  const slice = xs.slice(-p);
  const m = mean(slice);
  const s = stddev(slice);
  return { upper: m + mult * s, middle: m, lower: m - mult * s, width: (mult * 2 * s) / m };
};

export const macd = (xs: number[]) => {
  const e12 = ema(xs, 12);
  const e26 = ema(xs, 26);
  const macdLine = xs.map((_, i) => e12[i] - e26[i]);
  const signal = ema(macdLine.filter((v) => !isNaN(v)), 9);
  const macdNow = macdLine[macdLine.length - 1];
  const sigNow = signal[signal.length - 1];
  return { macd: macdNow, signal: sigNow, histogram: macdNow - sigNow };
};

export const returns = (xs: number[]): number[] => {
  const r: number[] = [];
  for (let i = 1; i < xs.length; i++) r.push((xs[i] - xs[i - 1]) / xs[i - 1]);
  return r;
};

export const volatilityAnnualized = (xs: number[]): number => {
  const r = returns(xs.slice(-60));
  return stddev(r) * Math.sqrt(252);
};

export const momentum = (xs: number[], p = 10): number => {
  if (xs.length < p + 1) return 0;
  return (xs[xs.length - 1] - xs[xs.length - 1 - p]) / xs[xs.length - 1 - p];
};

export const sharpeRatio = (xs: number[], rf = 0.035): number => {
  const r = returns(xs);
  if (!r.length) return 0;
  const annRet = mean(r) * 252;
  const annVol = stddev(r) * Math.sqrt(252);
  if (!annVol) return 0;
  return (annRet - rf) / annVol;
};

export const beta = (asset: number[], bench: number[]): number => {
  const ra = returns(asset);
  const rb = returns(bench);
  const n = Math.min(ra.length, rb.length);
  if (n < 5) return 1;
  const a = ra.slice(-n), b = rb.slice(-n);
  const ma = mean(a), mb = mean(b);
  let cov = 0, varB = 0;
  for (let i = 0; i < n; i++) { cov += (a[i] - ma) * (b[i] - mb); varB += (b[i] - mb) ** 2; }
  return varB ? cov / varB : 1;
};

export type IndicatorSet = {
  price: number;
  zScore: number;
  rsi: number;
  bollinger: ReturnType<typeof bollinger>;
  macd: ReturnType<typeof macd>;
  volatility: number;
  momentum: number;
  sharpe: number;
  beta: number;
  sma20: number;
  sma50: number;
  sma200: number;
};

export const computeAll = (closes: number[], bench?: number[]): IndicatorSet => {
  const last = closes[closes.length - 1];
  return {
    price: last,
    zScore: zScore(closes, 20),
    rsi: rsi(closes, 14),
    bollinger: bollinger(closes, 20, 2),
    macd: macd(closes),
    volatility: volatilityAnnualized(closes),
    momentum: momentum(closes, 10),
    sharpe: sharpeRatio(closes),
    beta: bench ? beta(closes, bench) : 1,
    sma20: mean(closes.slice(-20)),
    sma50: closes.length >= 50 ? mean(closes.slice(-50)) : NaN,
    sma200: closes.length >= 200 ? mean(closes.slice(-200)) : NaN,
  };
};
