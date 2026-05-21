// Finnhub Client — alle Anfragen client-side mit User-API-Key
const BASE = "https://finnhub.io/api/v1";

export type Quote = { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number };
export type Candles = { c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[]; s: string };

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("finnhub_api_key") || "";
}

export function setApiKey(k: string) {
  localStorage.setItem("finnhub_api_key", k);
}

class FinnhubError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}

async function call<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const key = getApiKey();
  if (!key) throw new FinnhubError("Kein API-Key konfiguriert. Bitte in Einstellungen hinterlegen.", 401);
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set("token", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new FinnhubError(`Finnhub ${res.status}: ${txt || res.statusText}`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  return call<Quote>("/quote", { symbol });
}

export async function fetchCandles(symbol: string, resolution: "D" | "60" | "W" = "D", days = 365): Promise<Candles> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const data = await call<Candles>("/stock/candle", { symbol, resolution, from, to });
  if (data.s !== "ok") throw new FinnhubError(`Keine Kerzendaten verfügbar für ${symbol} (Status: ${data.s}). Möglicherweise Premium-Plan erforderlich.`, 403);
  return data;
}

export { FinnhubError };
