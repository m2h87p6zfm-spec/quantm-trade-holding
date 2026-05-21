// Backtest-Engine — Score-basiert auf historischen Closes
import { computeAll } from "./indicators";
import { scoreIndicators, type RiskProfile } from "./analysis";

export type Trade = {
  entryIdx: number;
  exitIdx: number;
  side: "LONG" | "SHORT";
  entry: number;
  exit: number;
  pnlPct: number;
};

export type BacktestResult = {
  equity: number[]; // Equity-Curve, normiert auf 1.0
  trades: Trade[];
  totalReturn: number;
  winRate: number;
  maxDD: number;
  sharpe: number;
};

// Walk-forward: ab Index 210 (genug für SMA200) — täglicher Score, Position bei |score|>=threshold
export function runBacktest(
  closes: number[],
  opts: { profile?: RiskProfile; threshold?: number } = {},
): BacktestResult {
  const profile = opts.profile ?? "ausgewogen";
  const minIdx = 210;
  if (closes.length <= minIdx + 5) {
    return { equity: [1], trades: [], totalReturn: 0, winRate: 0, maxDD: 0, sharpe: 0 };
  }
  const threshold = opts.threshold ?? (profile === "konservativ" ? 25 : profile === "spekulativ" ? 12 : 18);
  let equity = 1;
  const eq: number[] = [];
  for (let i = 0; i < minIdx; i++) eq.push(1);
  const trades: Trade[] = [];
  let pos: { side: "LONG" | "SHORT"; entry: number; entryIdx: number } | null = null;

  for (let i = minIdx; i < closes.length; i++) {
    const window = closes.slice(0, i + 1);
    const ind = computeAll(window);
    const sig = scoreIndicators(ind, profile);
    const price = closes[i];

    if (pos) {
      const dailyRet = pos.side === "LONG" ? (price - closes[i - 1]) / closes[i - 1] : (closes[i - 1] - price) / closes[i - 1];
      equity *= 1 + dailyRet;
      const flipped = (pos.side === "LONG" && sig.score <= -threshold) || (pos.side === "SHORT" && sig.score >= threshold);
      const neutral = Math.abs(sig.score) < threshold * 0.6;
      if (flipped || neutral) {
        const pnlPct = pos.side === "LONG" ? (price - pos.entry) / pos.entry : (pos.entry - price) / pos.entry;
        trades.push({ entryIdx: pos.entryIdx, exitIdx: i, side: pos.side, entry: pos.entry, exit: price, pnlPct });
        pos = null;
      }
    }
    if (!pos) {
      if (sig.score >= threshold) pos = { side: "LONG", entry: price, entryIdx: i };
      else if (sig.score <= -threshold) pos = { side: "SHORT", entry: price, entryIdx: i };
    }
    eq.push(equity);
  }
  if (pos) {
    const price = closes[closes.length - 1];
    const pnlPct = pos.side === "LONG" ? (price - pos.entry) / pos.entry : (pos.entry - price) / pos.entry;
    trades.push({ entryIdx: pos.entryIdx, exitIdx: closes.length - 1, side: pos.side, entry: pos.entry, exit: price, pnlPct });
  }

  // Stats
  let peak = 1, maxDD = 0;
  for (const v of eq) { if (v > peak) peak = v; const dd = (peak - v) / peak; if (dd > maxDD) maxDD = dd; }
  const rets: number[] = [];
  for (let i = 1; i < eq.length; i++) rets.push((eq[i] - eq[i - 1]) / eq[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const std = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length || 1));
  const sharpe = std ? (mean / std) * Math.sqrt(252) : 0;
  const wins = trades.filter((t) => t.pnlPct > 0).length;
  const winRate = trades.length ? wins / trades.length : 0;
  const totalReturn = eq[eq.length - 1] - 1;
  return { equity: eq, trades, totalReturn, winRate, maxDD, sharpe };
}
