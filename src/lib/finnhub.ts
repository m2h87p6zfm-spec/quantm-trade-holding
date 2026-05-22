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
  const res = await fetch(path);
  if (!res.ok) throw new FinnhubError(`Datenfeed-Fehler: ${res.status}`, res.status);
  const j: any = await res.json();
  if (j?.status === "reconnecting") throw new MarketDataReconnectingError(j.message);
  if (j?.status === "invalid") throw new FinnhubError(j.message || "Ungültige Anfrage", 400);
  return j as T;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  return getJson<Quote>(`/api/public/quote?symbol=${encodeURIComponent(symbol)}`);
}

// ---- Concurrency-Limiter + Retry für Massen-Scans (z. B. Apex Picks mit 600+ Symbols) ----
// Ohne Limit feuert useQueries hunderte Requests parallel an den Yahoo-Proxy ab,
// der dann reihenweise mit "reconnecting" antwortet (Rate-Limit/Throttle).
// Symptom: "75 von 769 erfolgreich". Mit Limit + Backoff laufen die Requests
// in geordneten Wellen durch und nahezu jedes Symbol liefert verwertbare Kerzen.
const MAX_PARALLEL = 6;
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

export async function fetchCandles(symbol: string, resolution: "D" | "60" | "W" = "D", days = 365): Promise<Candles> {
  const interval = resolution === "D" ? "1d" : resolution === "W" ? "1wk" : "1h";
  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 200 ? "6mo" : days <= 400 ? "1y" : days <= 800 ? "2y" : "5y";
  const url = `/api/public/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`;

  await _acquire();
  try {
    let lastErr: unknown = null;
    // 3 Versuche mit exponentiellem Backoff bei "reconnecting" / 429 / 5xx
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await getJson<Candles>(url);
        if (!data.c?.length) throw new MarketDataReconnectingError();
        return data;
      } catch (e) {
        lastErr = e;
        const retryable =
          e instanceof MarketDataReconnectingError ||
          (e instanceof FinnhubError && (e.status === 429 || e.status >= 500));
        if (!retryable || attempt === 2) throw e;
        await sleep(400 * Math.pow(2, attempt) + Math.random() * 200);
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
  try {
    const res = await fetch(`/api/public/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j?.results) ? j.results : [];
  } catch { return []; }
}

export { FinnhubError };
