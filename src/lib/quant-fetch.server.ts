// Helpers to pull candles for the APEX engine. For the large Quantum Picks
// scan we try Yahoo's public chart feed first, then fall back to the existing
// Twelve Data adapter. This avoids treating provider quota misses as stock
// analysis failures.
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";
import { fetchYahooCandles } from "@/lib/yahoo-fallback.server";
import { getCandlesCached, adaptiveCandleTtl, type TdCandles } from "@/lib/twelvedata.server";
import { apexAnalyze, type Candle, type ApexReport } from "@/lib/quant.server";
import { sharedGet, sharedSet } from "@/lib/shared-cache.server";

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

function tdToCandles(raw: TdCandles | null): Candle[] {
  if (!raw?.c?.length) return [];
  return raw.c.map((c, i) => ({
    t: Number(raw.t?.[i] ?? 0),
    o: Number(raw.o?.[i] ?? c),
    h: Number(raw.h?.[i] ?? c),
    l: Number(raw.l?.[i] ?? c),
    c: Number(c),
    v: Number(raw.v?.[i] ?? 0),
  })).filter((k) => Number.isFinite(k.c));
}

export async function fetchCandles(symbol: string, range = "1y", interval = "1d"): Promise<Candle[]> {
  const sym = symbol.toUpperCase();
  const ttl = adaptiveCandleTtl(60 * 60);
  const key = `candles:${sym}:${interval}:${range}`;
  try {
    const hit = await sharedGet<Candle[]>(key);
    if (hit && !hit.stale && hit.value?.length) return hit.value;

    let candles = tdToCandles(await fetchYahooCandles(sym, interval, range));
    if (candles.length < 60) {
      const td = await getCandlesCached(sym, interval, range, ttl);
      candles = tdToCandles(td.value);
    }
    if (candles.length < 60) {
      const cached = await fetchYahooChartCached(sym, interval, range, ttl);
      candles = cached.value ? toCandles(cached.value) : [];
    }
    if (candles.length) void sharedSet(key, candles, ttl);
    return candles;
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
