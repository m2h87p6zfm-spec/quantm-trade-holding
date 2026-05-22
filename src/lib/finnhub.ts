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

export async function fetchCandles(symbol: string, resolution: "D" | "60" | "W" = "D", days = 365): Promise<Candles> {
  const interval = resolution === "D" ? "1d" : resolution === "W" ? "1wk" : "1h";
  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 200 ? "6mo" : days <= 400 ? "1y" : days <= 800 ? "2y" : "5y";
  const data = await getJson<Candles>(`/api/public/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`);
  if (!data.c?.length) throw new MarketDataReconnectingError();
  return data;
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
