// Twelve Data adapter — globaler Marktdaten-Provider (70+ Börsen, FX, Crypto).
// Wird von /api/public/quote, /api/public/candles und /api/public/search genutzt.
// Hält dieselbe Response-Shape wie der frühere Yahoo-Proxy, damit das Frontend
// (src/lib/finnhub.ts, useMarketData, TickerBand) ohne Änderung weiterläuft.
//
// Cache-Schichten:
//   1. In-Memory pro Isolate (< 1 ms, kurze TTL)
//   2. Supabase market_cache (geteilt zwischen ALLEN Isolates, ~50 ms)
//   3. Twelve Data API (kostet Credits)
// Erst wenn beide Cache-Schichten miss sind, geht ein Request raus.

import { sharedGet, sharedSet } from "@/lib/shared-cache.server";

const BASE = "https://api.twelvedata.com";

function getKey(): string {
  const k = process.env.TWELVEDATA_API_KEY;
  if (!k) throw new Error("TWELVEDATA_API_KEY missing");
  return k;
}

// ---- In-Memory Cache (pro Worker-Instanz) ----
type Entry<T> = { value: T; expires: number; lastUpdated: number };
const CACHE = new Map<string, Entry<any>>();

// In-Flight-Dedup: gleichzeitige Requests auf denselben Key teilen sich
// EINE Twelve-Data-Anfrage. Spart Credits bei Burst-Traffic (z. B. SSE-Tick
// trifft mit Polling zusammen, mehrere User mit derselben Watchlist).
const INFLIGHT = new Map<string, Promise<any>>();

function cacheGet<T>(key: string): Entry<T> | null {
  const e = CACHE.get(key) as Entry<T> | undefined;
  if (!e) return null;
  return e;
}
function cacheSet<T>(key: string, value: T, ttlSec: number) {
  CACHE.set(key, { value, expires: Date.now() + ttlSec * 1000, lastUpdated: Date.now() });
}

// Markt-aware TTL: bei geschlossenem US-Markt bewegen sich Kurse kaum →
// längere TTLs sind unmerklich für User, sparen aber dramatisch Credits.
function isUsMarketOpenUtc(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  // Weite Fenster-Definition (12:30–21:00 UTC) deckt EST und EDT ab.
  return m >= 12 * 60 + 30 && m <= 21 * 60;
}
export function adaptiveQuoteTtl(baseSec: number): number {
  return isUsMarketOpenUtc() ? baseSec : Math.max(baseSec, 300);
}

async function tdFetch(path: string, params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({ ...params, apikey: getKey() });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${BASE}${path}?${q.toString()}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`TD ${res.status}`);
    const j: any = await res.json();
    // TD wraps errors as {status:"error", code, message}
    if (j?.status === "error") throw new Error(j.message || `TD error ${j.code ?? ""}`);
    return j;
  } finally { clearTimeout(t); }
}

// ===================== QUOTE =====================
export type TdQuote = {
  c: number; pc: number; d: number; dp: number;
  h: number; l: number; o: number; t: number;
  v?: number; h52?: number; l52?: number; marketCap?: number;
  currency?: string; exchange?: string; name?: string;
};

function parseQuote(j: any): TdQuote | null {
  if (!j || j.status === "error") return null;
  const c = Number(j.close);
  if (!Number.isFinite(c)) return null;
  const pc = Number(j.previous_close ?? c);
  const num = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : undefined);
  return {
    c,
    pc,
    d: Number(j.change ?? c - pc),
    dp: Number(j.percent_change ?? (pc ? ((c - pc) / pc) * 100 : 0)),
    h: Number.isFinite(Number(j.high)) ? Number(j.high) : c,
    l: Number.isFinite(Number(j.low)) ? Number(j.low) : c,
    o: Number.isFinite(Number(j.open)) ? Number(j.open) : c,
    t: j.timestamp ? Number(j.timestamp) : Math.floor(Date.now() / 1000),
    v: num(j.volume),
    h52: num(j.fifty_two_week?.high),
    l52: num(j.fifty_two_week?.low),
    currency: j.currency,
    exchange: j.exchange,
    name: j.name || j.symbol,
  };
}

export async function getQuoteCached(symbol: string, ttlSec = 60): Promise<{
  value: TdQuote | null; stale: boolean; lastUpdated: number;
}> {
  const key = `q:${symbol}`;
  const ttl = adaptiveQuoteTtl(ttlSec);
  const hit = cacheGet<TdQuote | null>(key);
  if (hit && hit.expires > Date.now()) {
    return { value: hit.value, stale: false, lastUpdated: hit.lastUpdated };
  }
  // Schicht 2: geteilter Supabase-Cache
  const shared = await sharedGet<TdQuote | null>(key);
  if (shared && !shared.stale) {
    cacheSet(key, shared.value, ttl);
    return { value: shared.value, stale: false, lastUpdated: shared.lastUpdated };
  }
  // In-Flight-Dedup: parallele Aufrufer warten auf denselben Fetch
  const inflightKey = `fetch:${key}`;
  const existing = INFLIGHT.get(inflightKey);
  if (existing) {
    try {
      const v = (await existing) as TdQuote | null;
      return { value: v, stale: false, lastUpdated: Date.now() };
    } catch { /* fall through */ }
  }
  const p = (async () => {
    try {
      const j = await tdFetch("/quote", { symbol });
      const v = parseQuote(j);
      cacheSet(key, v, ttl);
      void sharedSet(key, v, ttl);
      return v;
    } finally {
      INFLIGHT.delete(inflightKey);
    }
  })();
  INFLIGHT.set(inflightKey, p);
  try {
    const v = await p;
    return { value: v, stale: false, lastUpdated: Date.now() };
  } catch {
    if (hit) return { value: hit.value, stale: true, lastUpdated: hit.lastUpdated };
    if (shared) return { value: shared.value, stale: true, lastUpdated: shared.lastUpdated };
    return { value: null, stale: true, lastUpdated: 0 };
  }
}

// Batch quotes — eine TD-Anfrage liefert bis zu 120 Symbole auf einmal.
// Schont das Rate-Limit dramatisch bei Watchlists / Tickerband.
// Nutzt den geteilten Cache pro Symbol, damit zwei User mit überlappenden
// Watchlists nicht doppelt zahlen. TTL ist markt-aware (5 min wenn Markt zu).
export async function getQuotesBatch(symbols: string[]): Promise<Record<string, TdQuote>> {
  const list = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))).slice(0, 120);
  if (!list.length) return {};
  const out: Record<string, TdQuote> = {};
  const missing: string[] = [];
  const QUOTE_TTL = adaptiveQuoteTtl(30);

  // Erst geteilten + lokalen Cache pro Symbol abfragen
  await Promise.all(list.map(async (sym) => {
    const k = `q:${sym}`;
    const hit = cacheGet<TdQuote | null>(k);
    if (hit && hit.expires > Date.now() && hit.value) { out[sym] = hit.value; return; }
    const shared = await sharedGet<TdQuote | null>(k);
    if (shared && !shared.stale && shared.value) {
      out[sym] = shared.value;
      cacheSet(k, shared.value, QUOTE_TTL);
      return;
    }
    missing.push(sym);
  }));

  if (!missing.length) return out;

  // In-Flight-Dedup pro Batch-Kombination: wenn dieselben "missing" Symbole
  // parallel angefragt werden, läuft nur eine TD-Anfrage.
  const inflightKey = `batch:${missing.join(",")}`;
  const existing = INFLIGHT.get(inflightKey);
  if (existing) {
    try {
      const shared = (await existing) as Record<string, TdQuote>;
      for (const sym of missing) if (shared[sym]) out[sym] = shared[sym];
      return out;
    } catch { return out; }
  }

  const p = (async () => {
    const filled: Record<string, TdQuote> = {};
    try {
      const j = await tdFetch("/quote", { symbol: missing.join(",") });
      if (missing.length === 1) {
        const v = parseQuote(j);
        if (v) {
          filled[missing[0]] = v;
          cacheSet(`q:${missing[0]}`, v, QUOTE_TTL);
          void sharedSet(`q:${missing[0]}`, v, QUOTE_TTL);
        }
      } else {
        for (const sym of missing) {
          const v = parseQuote(j?.[sym]);
          if (v) {
            filled[sym] = v;
            cacheSet(`q:${sym}`, v, QUOTE_TTL);
            void sharedSet(`q:${sym}`, v, QUOTE_TTL);
          }
        }
      }
    } finally {
      INFLIGHT.delete(inflightKey);
    }
    return filled;
  })();
  INFLIGHT.set(inflightKey, p);

  try {
    const filled = await p;
    for (const sym of missing) if (filled[sym]) out[sym] = filled[sym];
    return out;
  } catch {
    return out;
  }
}

// ===================== TIME SERIES (CANDLES) =====================
export type TdCandles = { c: number[]; h: number[]; l: number[]; o: number[]; v: number[]; t: number[]; s: "ok" };

// Yahoo-style interval/range → Twelve Data interval + outputsize
export function mapInterval(yi: string): string {
  switch (yi) {
    case "1m": return "1min";
    case "2m": case "5m": return "5min";
    case "15m": return "15min";
    case "30m": return "30min";
    case "60m": case "90m": case "1h": return "1h";
    case "1d": case "5d": return "1day";
    case "1wk": return "1week";
    case "1mo": case "3mo": return "1month";
    default: return "1day";
  }
}

export function mapOutputsize(range: string, interval: string): number {
  // Tageskerzen
  const isDaily = interval === "1day";
  const isWeekly = interval === "1week";
  if (isDaily) {
    switch (range) {
      case "1mo": return 22;
      case "3mo": return 66;
      case "6mo": return 130;
      case "ytd": return 260;
      case "1y": return 260;
      case "2y": return 520;
      case "5y": return 1300;
      case "10y": return 2600;
      case "max": return 5000;
      default: return 260;
    }
  }
  if (isWeekly) return 260;
  if (interval === "1month") return 120;
  // Intraday
  switch (range) {
    case "1d": return 100;
    case "5d": return 400;
    default: return 500;
  }
}

function parseTimeSeries(j: any): TdCandles | null {
  const vals: any[] = j?.values || [];
  if (!vals.length) return null;
  // TD liefert neueste zuerst → in chronologische Reihenfolge bringen
  const sorted = [...vals].reverse();
  const c: number[] = [], h: number[] = [], l: number[] = [], o: number[] = [], v: number[] = [], t: number[] = [];
  for (const row of sorted) {
    const close = Number(row.close);
    if (!Number.isFinite(close)) continue;
    c.push(close);
    h.push(Number(row.high ?? close));
    l.push(Number(row.low ?? close));
    o.push(Number(row.open ?? close));
    v.push(Number(row.volume ?? 0));
    const dt = row.datetime ? Math.floor(new Date(row.datetime).getTime() / 1000) : 0;
    t.push(dt);
  }
  if (!c.length) return null;
  return { c, h, l, o, v, t, s: "ok" };
}

export async function getCandlesCached(
  symbol: string, interval: string, range: string, ttlSec: number
): Promise<{ value: TdCandles | null; stale: boolean; lastUpdated: number }> {
  const tdInterval = mapInterval(interval);
  const outputsize = mapOutputsize(range, tdInterval);
  const key = `c:${symbol}:${tdInterval}:${outputsize}`;
  const hit = cacheGet<TdCandles | null>(key);
  if (hit && hit.expires > Date.now()) {
    return { value: hit.value, stale: false, lastUpdated: hit.lastUpdated };
  }
  // Schicht 2: geteilter Supabase-Cache — der größte Hebel für Picks-Scans.
  // 2 User mit demselben Universum bezahlen nur 1× pro TTL-Fenster.
  const shared = await sharedGet<TdCandles | null>(key);
  if (shared && !shared.stale) {
    cacheSet(key, shared.value, ttlSec);
    return { value: shared.value, stale: false, lastUpdated: shared.lastUpdated };
  }
  // In-Flight-Dedup: gleichzeitige Anfragen auf denselben Candle-Key
  // teilen sich eine TD-Anfrage (z. B. Picks-Scan über mehrere User).
  const inflightKey = `fetch:${key}`;
  const existing = INFLIGHT.get(inflightKey);
  if (existing) {
    try {
      const v = (await existing) as TdCandles | null;
      return { value: v, stale: false, lastUpdated: Date.now() };
    } catch { /* fall through */ }
  }
  const p = (async () => {
    try {
      const j = await tdFetch("/time_series", {
        symbol,
        interval: tdInterval,
        outputsize: String(outputsize),
        order: "DESC",
      });
      const v = parseTimeSeries(j);
      cacheSet(key, v, ttlSec);
      void sharedSet(key, v, ttlSec);
      return v;
    } finally {
      INFLIGHT.delete(inflightKey);
    }
  })();
  INFLIGHT.set(inflightKey, p);
  try {
    const v = await p;
    return { value: v, stale: false, lastUpdated: Date.now() };
  } catch {
    if (hit) return { value: hit.value, stale: true, lastUpdated: hit.lastUpdated };
    if (shared) return { value: shared.value, stale: true, lastUpdated: shared.lastUpdated };
    return { value: null, stale: true, lastUpdated: 0 };
  }
}

// ===================== SYMBOL SEARCH =====================
export type SearchHit = { symbol: string; name: string; exchange?: string; type?: string };

export async function searchSymbolsTd(q: string): Promise<SearchHit[]> {
  const key = `s:${q.toLowerCase()}`;
  const hit = cacheGet<SearchHit[]>(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const j = await tdFetch("/symbol_search", { symbol: q, outputsize: "15" });
    const data: any[] = j?.data || [];
    const out: SearchHit[] = data.slice(0, 15).map((r) => ({
      symbol: String(r.symbol),
      name: String(r.instrument_name || r.symbol),
      exchange: r.exchange,
      type: r.instrument_type,
    }));
    cacheSet(key, out, 300);
    return out;
  } catch {
    return hit?.value ?? [];
  }
}
