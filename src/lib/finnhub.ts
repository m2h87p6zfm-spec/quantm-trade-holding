// Market Data Client — geht über serverseitigen Yahoo-Finance-Proxy (/api/public/*).
export type Quote = {
  c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number;
  v?: number; h52?: number; l52?: number; marketCap?: number;
  currency?: string; exchange?: string; name?: string;
  stale?: boolean; lastUpdated?: number;
};
export type Candles = {
  c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[]; s: string;
  stale?: boolean; lastUpdated?: number;
};

export function getApiKey(): string { return "yahoo"; }
export function setApiKey(_k: string) {}

export class MarketDataReconnectingError extends Error {
  readonly reconnecting = true as const;
  constructor(msg = "Live-Daten werden aktualisiert…") { super(msg); }
}

class FinnhubError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}

async function getJson<T>(path: string): Promise<T> {
  const { authedFetch } = await import("@/lib/authed-fetch");
  const res = await authedFetch(path);
  if (!res.ok) throw new FinnhubError(`Datenfeed-Fehler: ${res.status}`, res.status);
  const j: any = await res.json();
  if (j?.status === "reconnecting") throw new MarketDataReconnectingError(j.message);
  if (j?.status === "invalid") throw new FinnhubError(j.message || "Ungültige Anfrage", 400);
  return j as T;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  return getJson<Quote>(`/api/public/quote?symbol=${encodeURIComponent(symbol)}`);
}

// ---- Concurrency-Limiter + Retry + Persistenter LocalStorage-Cache für Massen-Scans ----
// Tageskerzen sind über Stunden stabil — wir cachen sie clientseitig 12 h,
// damit ein erneuter Scan praktisch instant ist und den Yahoo-Proxy nicht
// erneut belastet. So bleibt die Analyse-Qualität gleich, der Scan wird
// aber dramatisch schneller (cold: ~6 parallele Wellen, warm: instant).
const MAX_PARALLEL = 10;
let _active = 0;
const _queue: Array<() => void> = [];
function _acquire(): Promise<void> {
  if (_active < MAX_PARALLEL) { _active++; return Promise.resolve(); }
  return new Promise((res) => _queue.push(() => { _active++; res(); }));
}
function _release() {
  _active--;
  const next = _queue.shift();
  if (next) next();
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LS_PREFIX = "yh_candles:";
const LS_TTL_MS = 12 * 60 * 60 * 1000; // 12 h für Tageskerzen
const LS_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function lsGet(key: string): Candles | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const j = JSON.parse(raw) as { t: number; d: Candles };
    if (!j?.t || Date.now() - j.t > LS_TTL_MS) return null;
    return j.d;
  } catch { return null; }
}
function lsGetStale(key: string): Candles | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const j = JSON.parse(raw) as { t: number; d: Candles };
    if (!j?.t || Date.now() - j.t > LS_STALE_TTL_MS || !j.d?.c?.length) return null;
    return { ...j.d, stale: true };
  } catch { return null; }
}
function lsSet(key: string, d: Candles) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify({ t: Date.now(), d })); } catch { /* quota */ }
}

export async function fetchCandles(symbol: string, resolution: "D" | "60" | "W" = "D", days = 365): Promise<Candles> {
  const interval = resolution === "D" ? "1d" : resolution === "W" ? "1wk" : "1h";
  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 200 ? "6mo" : days <= 400 ? "1y" : days <= 800 ? "2y" : "5y";
  const cacheKey = `${symbol}|${interval}|${range}`;

  // Persistent Client-Cache (nur Tagesauflösung — Intraday muss frisch sein)
  if (resolution === "D") {
    const hit = lsGet(cacheKey);
    if (hit && hit.c?.length) return hit;
  }

  const url = `/api/public/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`;

  await _acquire();
  try {
    let lastErr: unknown = null;
    // 2 Versuche reichen — der Server retry'd intern bereits über mehrere Wellen.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await getJson<Candles>(url);
        if (!data.c?.length) throw new MarketDataReconnectingError();
        if (resolution === "D") lsSet(cacheKey, data);
        return data;
      } catch (e) {
        lastErr = e;
        const stale = resolution === "D" ? lsGetStale(cacheKey) : null;
        if (stale) return stale;
        const retryable =
          e instanceof MarketDataReconnectingError ||
          (e instanceof FinnhubError && (e.status === 429 || e.status >= 500));
        if (!retryable || attempt === 1) throw e;
        await sleep(350 + Math.random() * 250);
      }
    }
    throw lastErr ?? new MarketDataReconnectingError();
  } finally {
    _release();
  }
}

export type SymbolSearchHit = { symbol: string; name: string; exchange?: string; type?: string };

export async function searchSymbols(q: string): Promise<SymbolSearchHit[]> {
  const query = q.trim();
  if (!query) return [];

  // 1) Lokaler Katalog (instant) — deckt alle 3.300+ Symbole inkl. der
  //    neu hinzugefügten 2000 Ticker zuverlässig ab, auch ohne API-Call.
  const local = await searchLocalCatalog(query);

  // 2) Parallel die globale Twelve-Data-Suche — liefert Symbole,
  //    die (noch) nicht im lokalen Katalog stehen.
  let remote: SymbolSearchHit[] = [];
  try {
    const { authedFetch } = await import("@/lib/authed-fetch");
    const res = await authedFetch(`/api/public/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const j = await res.json();
      if (Array.isArray(j?.results)) remote = j.results;
    }
  } catch { /* offline / rate-limit → nur lokale Treffer */ }

  const seen = new Set<string>();
  const merged: SymbolSearchHit[] = [];
  for (const h of [...local, ...remote]) {
    const key = h.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(h);
  }
  return merged.slice(0, 50);
}

async function searchLocalCatalog(query: string): Promise<SymbolSearchHit[]> {
  const { PRODUCTS } = await import("@/lib/products");
  const q = query.toLowerCase();
  const qUpper = query.toUpperCase();
  const out: Array<{ hit: SymbolSearchHit; score: number }> = [];
  for (const p of PRODUCTS) {
    const sym = p.symbol.toUpperCase();
    const name = p.name.toLowerCase();
    let score = 0;
    if (sym === qUpper) score = 1000;
    else if (sym.startsWith(qUpper)) score = 800;
    else if (sym.includes(qUpper)) score = 500;
    else if (name.startsWith(q)) score = 400;
    else if (name.includes(q)) score = 200;
    if (score > 0) {
      out.push({
        score,
        hit: { symbol: p.symbol, name: p.name, exchange: p.region, type: "Stock" },
      });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 30).map((s) => s.hit);
}

export { FinnhubError };
