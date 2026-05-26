// Yahoo Finance Public-Chart-API als Fallback für Twelve Data.
// Twelve Data deckt auf dem aktuellen Plan nicht alle internationalen
// Symbole ab (z. B. NESN.SW, viele asiatische Ticker). Yahoo liefert dafür
// kostenlos OHLCV-Kerzen und Live-Quotes für praktisch jeden Yahoo-Ticker
// — wir nutzen es, sobald TD `null`/`error` zurückgibt, damit jede Aktie
// in der App eine Chart und einen Kurs hat.

import type { TdCandles, TdQuote } from "./twelvedata.server";

const YH = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA = "Mozilla/5.0 (compatible; QuantmBot/1.0)";

// Yahoo-Intervall + Range akzeptiert die App bereits in diesem Format.
export async function fetchYahooCandles(
  symbol: string,
  interval: string,
  range: string,
): Promise<TdCandles | null> {
  const url = `${YH}/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) return null;
    const j: any = await res.json();
    const r = j?.chart?.result?.[0];
    if (!r || !Array.isArray(r.timestamp)) return null;
    const q = r.indicators?.quote?.[0] ?? {};
    const ts: number[] = r.timestamp;
    const o: number[] = [];
    const h: number[] = [];
    const l: number[] = [];
    const c: number[] = [];
    const v: number[] = [];
    const t2: number[] = [];
    for (let i = 0; i < ts.length; i++) {
      const cc = Number(q.close?.[i]);
      if (!Number.isFinite(cc)) continue;
      c.push(cc);
      o.push(Number.isFinite(Number(q.open?.[i])) ? Number(q.open[i]) : cc);
      h.push(Number.isFinite(Number(q.high?.[i])) ? Number(q.high[i]) : cc);
      l.push(Number.isFinite(Number(q.low?.[i])) ? Number(q.low[i]) : cc);
      v.push(Number.isFinite(Number(q.volume?.[i])) ? Number(q.volume[i]) : 0);
      t2.push(Number(ts[i]) || 0);
    }
    if (!c.length) return null;
    return { c, h, l, o, v, t: t2, s: "ok" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchYahooQuote(symbol: string): Promise<TdQuote | null> {
  // Yahoo's Chart-Endpoint liefert die Meta-Quote günstig mit (1 Roundtrip,
  // kein separater /v7/quote, der oft Cookies/Crumb verlangt).
  const url = `${YH}/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) return null;
    const j: any = await res.json();
    const r = j?.chart?.result?.[0];
    const m = r?.meta;
    if (!m) return null;
    const c = Number(m.regularMarketPrice);
    if (!Number.isFinite(c)) return null;
    const pc = Number(m.chartPreviousClose ?? m.previousClose ?? c);
    return {
      c,
      pc,
      d: c - pc,
      dp: pc ? ((c - pc) / pc) * 100 : 0,
      h: Number.isFinite(Number(m.regularMarketDayHigh)) ? Number(m.regularMarketDayHigh) : c,
      l: Number.isFinite(Number(m.regularMarketDayLow)) ? Number(m.regularMarketDayLow) : c,
      o: Number.isFinite(Number(m.regularMarketOpen ?? m.chartPreviousClose)) ? Number(m.regularMarketOpen ?? m.chartPreviousClose) : c,
      t: Number(m.regularMarketTime) || Math.floor(Date.now() / 1000),
      v: Number.isFinite(Number(m.regularMarketVolume)) ? Number(m.regularMarketVolume) : undefined,
      h52: Number.isFinite(Number(m.fiftyTwoWeekHigh)) ? Number(m.fiftyTwoWeekHigh) : undefined,
      l52: Number.isFinite(Number(m.fiftyTwoWeekLow)) ? Number(m.fiftyTwoWeekLow) : undefined,
      currency: m.currency,
      exchange: m.fullExchangeName || m.exchangeName,
      name: m.shortName || m.longName || m.symbol,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
