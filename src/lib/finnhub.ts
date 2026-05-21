// Market Data Client — geht über serverseitigen Yahoo-Finance-Proxy (/api/public/*).
// Kein API-Key mehr nötig. Server cached die Antworten (HTTP Cache-Control + Edge).

export type Quote = {
  c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number;
  currency?: string; exchange?: string; name?: string;
};
export type Candles = { c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[]; s: string };

// Backwards-compat: einige Komponenten rufen noch getApiKey/setApiKey auf.
export function getApiKey(): string { return "yahoo"; }
export function setApiKey(_k: string) { /* no-op — kein Key mehr nötig */ }

class FinnhubError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const j: any = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new FinnhubError(`Datenfeed-Fehler: ${msg}`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  return getJson<Quote>(`/api/public/quote?symbol=${encodeURIComponent(symbol)}`);
}

export async function fetchCandles(symbol: string, resolution: "D" | "60" | "W" = "D", days = 365): Promise<Candles> {
  const interval = resolution === "D" ? "1d" : resolution === "W" ? "1wk" : "1h";
  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 200 ? "6mo" : days <= 400 ? "1y" : days <= 800 ? "2y" : "5y";
  const data = await getJson<Candles>(`/api/public/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`);
  if (!data.c?.length) throw new FinnhubError(`Keine Kerzendaten für ${symbol}.`, 404);
  return data;
}

export { FinnhubError };
