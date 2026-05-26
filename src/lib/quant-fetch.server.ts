// Helpers to pull candles for the APEX engine via the existing Yahoo cache.
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";
import { apexAnalyze, type Candle, type ApexReport } from "@/lib/quant.server";
import { sharedGet, sharedSet } from "@/lib/shared-cache.server";
import { adaptiveCandleTtl } from "@/lib/twelvedata.server";

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
    // Daily-Candles: adaptive TTL (1h offen / 12h zu). Intraday-Aufrufer
    // setzen den Range entsprechend; hier wird der Default-Case (1y/1d) optimiert.
    const ttl = adaptiveCandleTtl(60 * 60);
    const cached = await fetchYahooChartCached(symbol.toUpperCase(), interval, range, ttl);
    return cached.value ? toCandles(cached.value) : [];
  } catch {
    return [];
  }
}

// Benchmarks (SPY/QQQ/IWM/DIA) sind sehr cache-freundlich — sie werden bei
// jedem analyzeTicker mitgeladen und ändern sich für die Korrelations-/
// Beta-Berechnung kaum. 12 h TTL über den ganzen Tag spart ~12× Credits.
async function fetchBenchmark(symbol: string): Promise<Candle[]> {
  try {
    const cached = await fetchYahooChartCached(symbol.toUpperCase(), "1d", "1y", 12 * 3600);
    return cached.value ? toCandles(cached.value) : [];
  } catch {
    return [];
  }
}

// One-shot: ticker → full APEX report (with SPY as benchmark).
// Cache-Key inkludiert das Datum der letzten Tageskerze: Solange keine neue
// Kerze geschrieben wurde, ist der Report identisch — also 6 h Cache-Hit
// statt jedesmal Indikatoren neu rechnen + Benchmark fetchen.
export async function analyzeTicker(symbol: string): Promise<ApexReport | null> {
  const sym = symbol.toUpperCase();

  // Erst Asset-Candles holen — sie definieren den Cache-Key via letzte Bar.
  const asset = await fetchCandles(sym, "1y", "1d");
  if (asset.length < 30) return null;

  const lastBarTs = asset[asset.length - 1]?.t ?? 0;
  const lastBarDay = new Date(lastBarTs * 1000).toISOString().slice(0, 10);
  const cacheKey = `apex:${sym}:${lastBarDay}`;

  // Cache-Hit: identische Bar → identischer Report.
  const hit = await sharedGet<ApexReport>(cacheKey);
  if (hit && !hit.stale && hit.value) return hit.value;

  // Benchmark separat (eigener langer TTL, eigener Cache-Key).
  const bench = await fetchBenchmark("SPY");
  const report = apexAnalyze(sym, asset, bench.map((c) => c.c));

  // 6 h TTL — danach ist eh meist eine neue Bar da und cacheKey wechselt.
  void sharedSet(cacheKey, report, 6 * 3600);
  return report;
}

// Robuste Ticker-Erkennung: nutzt denselben mehrstufigen Resolver wie das
// Frontend (Aliase → Firmenname → direktes Symbol → Generic-Fallback).
// Verhindert z. B. dass "Analysiere Rheinmetall" zu META wird.
import { resolveTicker } from "@/lib/ticker-resolver";

export function detectTicker(text: string): string | null {
  return resolveTicker(text);
}
