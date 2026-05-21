// Server-side in-memory cache + request coalescing für Yahoo-Finance-Proxy.
// Ziel: Rate-Limit (HTTP 429) vermeiden, indem identische Anfragen gebündelt
// und Antworten zwischengespeichert werden. Bei Yahoo-Fehler wird notfalls
// abgelaufener (stale) Cache zurückgegeben.

type Entry = { value: any; expires: number; staleUntil: number };

const STORE = new Map<string, Entry>();
const INFLIGHT = new Map<string, Promise<any>>();

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept": "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
} as const;

export async function fetchYahooChartCached(
  symbol: string,
  interval: string,
  range: string,
  ttlSec: number,
): Promise<any> {
  const key = `${symbol}|${interval}|${range}`;
  const now = Date.now();
  const cached = STORE.get(key);

  // Frische Daten? → zurück.
  if (cached && cached.expires > now) return cached.value;

  // Schon eine laufende Anfrage? → drauf warten (Coalescing).
  const inflight = INFLIGHT.get(key);
  if (inflight) return inflight;

  const p = (async () => {
    const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const hosts = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
    let lastErr = "";
    for (const host of hosts) {
      try {
        const res = await fetch(host + path, { headers: HEADERS });
        if (res.ok) {
          const j = await res.json();
          STORE.set(key, {
            value: j,
            expires: now + ttlSec * 1000,
            staleUntil: now + Math.max(ttlSec * 6, 3600) * 1000, // bis zu 6× TTL als Stale halten
          });
          return j;
        }
        lastErr = `${host.replace("https://", "")} → ${res.status}`;
      } catch (e: any) {
        lastErr = `${host}: ${e?.message || "fetch failed"}`;
      }
    }

    // Yahoo blockt → wenn wir noch (stale) Daten haben, gib die zurück.
    if (cached && cached.staleUntil > now) return cached.value;
    throw new Error(`Yahoo nicht erreichbar (${lastErr})`);
  })().finally(() => {
    INFLIGHT.delete(key);
  });

  INFLIGHT.set(key, p);
  return p;
}
