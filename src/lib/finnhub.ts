// Market Data Client — Twelve Data (kostenloser Tier liefert Kerzen + Quote)
// Datei-Name bleibt aus Kompatibilitätsgründen finnhub.ts.
const BASE = "https://api.twelvedata.com";

export type Quote = { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number };
export type Candles = { c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[]; s: string };

const KEY_STORAGE = "market_api_key";
const LEGACY_KEY = "finnhub_api_key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_STORAGE) || localStorage.getItem(LEGACY_KEY) || "";
}

export function setApiKey(k: string) {
  localStorage.setItem(KEY_STORAGE, k.trim());
  localStorage.removeItem(LEGACY_KEY);
}

class FinnhubError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}

async function call<T = any>(path: string, params: Record<string, string | number>): Promise<T> {
  const key = getApiKey();
  if (!key) throw new FinnhubError("Kein API-Key konfiguriert. Bitte in Einstellungen hinterlegen (Twelve Data).", 401);
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set("apikey", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new FinnhubError(`Datenfeed ${res.status}: ${txt || res.statusText}`, res.status);
  }
  const json: any = await res.json();
  if (json && (json.status === "error" || json.code >= 400)) {
    throw new FinnhubError(`Datenfeed: ${json.message || "Unbekannter Fehler"}`, json.code || 400);
  }
  return json as T;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const r: any = await call("/quote", { symbol });
  const c = Number(r.close);
  const pc = Number(r.previous_close);
  return {
    c,
    pc,
    d: Number(r.change ?? c - pc),
    dp: Number(r.percent_change ?? (pc ? ((c - pc) / pc) * 100 : 0)),
    h: Number(r.high),
    l: Number(r.low),
    o: Number(r.open),
    t: Math.floor(Date.now() / 1000),
  };
}

export async function fetchCandles(symbol: string, resolution: "D" | "60" | "W" = "D", days = 365): Promise<Candles> {
  const interval = resolution === "D" ? "1day" : resolution === "W" ? "1week" : "1h";
  const outputsize = Math.min(days + 5, 5000);
  const r: any = await call("/time_series", { symbol, interval, outputsize });
  if (!r.values || !Array.isArray(r.values)) {
    throw new FinnhubError(`Keine Kerzendaten für ${symbol}.`, 404);
  }
  // Twelve Data liefert neueste zuerst — umdrehen
  const values = [...r.values].reverse();
  const c: number[] = []; const h: number[] = []; const l: number[] = []; const o: number[] = []; const t: number[] = []; const v: number[] = [];
  for (const row of values) {
    c.push(Number(row.close));
    h.push(Number(row.high));
    l.push(Number(row.low));
    o.push(Number(row.open));
    v.push(Number(row.volume ?? 0));
    t.push(Math.floor(new Date(row.datetime).getTime() / 1000));
  }
  return { c, h, l, o, t, v, s: "ok" };
}

export { FinnhubError };
