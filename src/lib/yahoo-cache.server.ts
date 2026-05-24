// Server-side cache + request coalescing für Marktdaten.
// Powered by Twelve Data — gibt aber Yahoo-Chart-Shape zurück, damit alle
// Bestandsaufrufer (APEX, TrackRecord, Cron, Explain-Trade, Portfolio-Extract)
// ohne Anpassung funktionieren.

import { getCandlesCached, type TdCandles, type TdQuote } from "@/lib/twelvedata.server";

type Entry = { value: any; expires: number; staleUntil: number };

const STORE = new Map<string, Entry>();
const INFLIGHT = new Map<string, Promise<CachedChart>>();

export type CachedChart = { value: any | null; stale: boolean; lastUpdated: number };

// Synthesiert Yahoo-Chart-Shape aus TD-Daten — Aufrufer lesen
// chart.result[0].{timestamp, indicators.quote[0], meta} unverändert weiter.
function synthYahooChart(symbol: string, candles: TdCandles | null, quote: TdQuote | null): any | null {
  if (!candles || !candles.c.length) return null;
  const meta: Record<string, unknown> = {
    symbol,
    regularMarketPrice: quote?.c ?? candles.c.at(-1),
    chartPreviousClose: quote?.pc ?? candles.c.at(-2) ?? candles.c.at(-1),
    previousClose: quote?.pc ?? candles.c.at(-2) ?? candles.c.at(-1),
    regularMarketDayHigh: quote?.h,
    regularMarketDayLow: quote?.l,
    regularMarketVolume: quote?.v,
    fiftyTwoWeekHigh: quote?.h52,
    fiftyTwoWeekLow: quote?.l52,
    currency: quote?.currency,
    exchangeName: quote?.exchange,
    longName: quote?.name ?? symbol,
    shortName: quote?.name ?? symbol,
  };
  return {
    chart: {
      result: [{
        meta,
        timestamp: candles.t,
        indicators: {
          quote: [{
            open: candles.o,
            high: candles.h,
            low: candles.l,
            close: candles.c,
            volume: candles.v,
          }],
        },
      }],
      error: null,
    },
  };
}

async function doFetch(
  symbol: string, interval: string, range: string, ttlSec: number, prevCached: Entry | undefined
): Promise<CachedChart> {
  const now = Date.now();
  try {
    // Nur Candles holen — der separate /quote-Call ist für alle aktuellen
    // Aufrufer redundant (letzter Close ist in candles.c.at(-1) bereits enthalten).
    // Halbiert die Twelve-Data-Credits pro Scan.
    const candles = await getCandlesCached(symbol, interval, range, ttlSec);
    const synth = synthYahooChart(symbol, candles.value, null);
    if (synth) {
      STORE.set(`${symbol}|${interval}|${range}`, {
        value: synth,
        expires: now + ttlSec * 1000,
        staleUntil: now + Math.max(ttlSec * 168, 7 * 24 * 3600) * 1000,
      });
      return { value: synth, stale: false, lastUpdated: now };
    }
  } catch { /* fall through to stale */ }

  if (prevCached) {
    return { value: prevCached.value, stale: true, lastUpdated: prevCached.expires - ttlSec * 1000 };
  }
  return { value: null, stale: true, lastUpdated: 0 };
}

export async function fetchYahooChartCached(
  symbol: string,
  interval: string,
  range: string,
  ttlSec: number,
): Promise<CachedChart> {
  const key = `${symbol}|${interval}|${range}`;
  const now = Date.now();
  const cached = STORE.get(key);

  if (cached && cached.expires > now) {
    return { value: cached.value, stale: false, lastUpdated: cached.expires - ttlSec * 1000 };
  }

  // Stale-while-revalidate: alte Daten sofort liefern, im Hintergrund refreshen
  if (cached && cached.staleUntil > now && !INFLIGHT.has(key)) {
    const refresh = doFetch(symbol, interval, range, ttlSec, cached).finally(() => INFLIGHT.delete(key));
    INFLIGHT.set(key, refresh);
    return { value: cached.value, stale: true, lastUpdated: cached.expires - ttlSec * 1000 };
  }

  const inflight = INFLIGHT.get(key);
  if (inflight) return inflight;

  const p = doFetch(symbol, interval, range, ttlSec, cached).finally(() => INFLIGHT.delete(key));
  INFLIGHT.set(key, p);
  return p;
}
