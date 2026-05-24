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

// Robuste Ticker-Erkennung: nutzt denselben mehrstufigen Resolver wie das
// Frontend (Aliase → Firmenname → direktes Symbol → Generic-Fallback).
// Verhindert z. B. dass "Analysiere Rheinmetall" zu META wird.
import { resolveTicker } from "@/lib/ticker-resolver";

export function detectTicker(text: string): string | null {
  return resolveTicker(text);
}

