// Helpers to pull candles for the APEX engine via the existing Yahoo cache.
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";
import { apexAnalyze, type Candle, type ApexReport } from "@/lib/quant.server";

function toCandles(raw: any): Candle[] {
  const r = raw?.chart?.result?.[0];
  if (!r) return [];
  const ts: number[] = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = Number(q.close?.[i]);
    if (!Number.isFinite(c)) continue;
    out.push({
      t: Number(ts[i]),
      o: Number(q.open?.[i] ?? c),
      h: Number(q.high?.[i] ?? c),
      l: Number(q.low?.[i] ?? c),
      c,
      v: Number(q.volume?.[i] ?? 0),
    });
  }
  return out;
}

export async function fetchCandles(symbol: string, range = "1y", interval = "1d"): Promise<Candle[]> {
  try {
    const cached = await fetchYahooChartCached(symbol.toUpperCase(), interval, range, 3600);
    return cached.value ? toCandles(cached.value) : [];
  } catch {
    return [];
  }
}

// One-shot: ticker → full APEX report (with SPY as benchmark).
export async function analyzeTicker(symbol: string): Promise<ApexReport | null> {
  const [asset, bench] = await Promise.all([
    fetchCandles(symbol, "1y", "1d"),
    fetchCandles("SPY", "1y", "1d"),
  ]);
  if (asset.length < 30) return null;
  return apexAnalyze(symbol.toUpperCase(), asset, bench.map((c) => c.c));
}

// Detect 1-5 letter uppercase tickers in a free-text message.
// Filters obvious German stop-words so "ANALYSIERE NVDA" picks NVDA, not "ANALYSIERE".
const STOP = new Set([
  "DASHBOARD", "SIGNAL", "SIGNALE", "SCAN", "SCANNE", "ANALYSIERE", "ANALYSE",
  "BITTE", "DANKE", "OK", "JA", "NEIN", "UND", "ODER", "DER", "DIE", "DAS",
  "EIN", "EINE", "DEN", "DEM", "MIT", "VON", "FÜR", "FUR", "ÜBER", "UEBER",
  "AKTIE", "ETF", "BUY", "SELL", "HOLD", "STOCK", "USD", "EUR", "USA",
  "APEX", "PRIME", "TOP", "RSI", "MACD", "SMA", "EMA", "BB", "ATR", "VAR",
]);

export function detectTicker(text: string): string | null {
  const tokens = text.toUpperCase().match(/\b[A-Z]{1,5}\b/g) ?? [];
  for (const t of tokens) {
    if (STOP.has(t)) continue;
    if (t.length === 1) continue;
    return t;
  }
  return null;
}
