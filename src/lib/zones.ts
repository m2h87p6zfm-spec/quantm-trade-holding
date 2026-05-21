// Smart-Zones: Support/Resistance via Pivot-Clustering
// Idee: lokale Hochs/Tiefs sammeln, dann nach Nähe gruppieren (ATR-skaliert),
// Cluster mit ≥2 Touches = relevante Zone.

export type Zone = {
  type: "support" | "resistance";
  low: number;
  high: number;
  touches: number;
  lastIdx: number;
  strength: number; // 0..1
};

function trueRange(highs: number[], lows: number[], closes: number[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { tr.push(highs[i] - lows[i]); continue; }
    const a = highs[i] - lows[i];
    const b = Math.abs(highs[i] - closes[i - 1]);
    const c = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(a, b, c));
  }
  return tr;
}

function atr(highs: number[], lows: number[], closes: number[], p = 14): number {
  const tr = trueRange(highs, lows, closes);
  const slice = tr.slice(-p);
  return slice.reduce((s, v) => s + v, 0) / Math.max(slice.length, 1);
}

export function computeZones(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback = 3,
): Zone[] {
  if (closes.length < 30) return [];
  const lastPrice = closes[closes.length - 1];
  const a = atr(highs, lows, closes, 14) || (lastPrice * 0.01);
  const tol = a * 0.6; // Cluster-Radius

  type Pivot = { idx: number; price: number; type: "high" | "low" };
  const pivots: Pivot[] = [];
  for (let i = lookback; i < closes.length - lookback; i++) {
    let isHigh = true, isLow = true;
    for (let k = 1; k <= lookback; k++) {
      if (highs[i] <= highs[i - k] || highs[i] <= highs[i + k]) isHigh = false;
      if (lows[i] >= lows[i - k] || lows[i] >= lows[i + k]) isLow = false;
    }
    if (isHigh) pivots.push({ idx: i, price: highs[i], type: "high" });
    if (isLow) pivots.push({ idx: i, price: lows[i], type: "low" });
  }
  if (pivots.length === 0) return [];

  // Cluster nach Preis-Nähe
  const sorted = [...pivots].sort((x, y) => x.price - y.price);
  type Cluster = { prices: number[]; idxs: number[]; type: "high" | "low" };
  const clusters: Cluster[] = [];
  for (const p of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(p.price - last.prices[last.prices.length - 1]) <= tol) {
      last.prices.push(p.price);
      last.idxs.push(p.idx);
    } else {
      clusters.push({ prices: [p.price], idxs: [p.idx], type: p.type });
    }
  }

  const maxAge = closes.length;
  const zones: Zone[] = clusters
    .filter((c) => c.prices.length >= 2)
    .map((c) => {
      const low = Math.min(...c.prices);
      const high = Math.max(...c.prices);
      const center = (low + high) / 2;
      const lastIdx = Math.max(...c.idxs);
      const ageScore = 1 - (closes.length - 1 - lastIdx) / maxAge;
      const touchScore = Math.min(1, c.prices.length / 5);
      return {
        type: center < lastPrice ? "support" : "resistance",
        low: low - tol * 0.15,
        high: high + tol * 0.15,
        touches: c.prices.length,
        lastIdx,
        strength: Math.min(1, ageScore * 0.45 + touchScore * 0.55),
      } as Zone;
    })
    // nur die markantesten 6 Zonen
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6);

  return zones;
}
