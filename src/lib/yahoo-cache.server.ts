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

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${new URL(url).host} → ${res.status}`);
  return res.json();
}

function sparkToChart(j: any) {
  const response = j?.spark?.result?.[0]?.response?.[0];
  if (!response) throw new Error("Spark ohne Ergebnis");
  return { chart: { result: [response], error: null } };
}

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
    const sparkPath = `/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`;
    const hosts = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
    let lastErr = "";
    for (const host of hosts) {
      try {
        const j = await fetchJson(host + path);
        STORE.set(key, {
          value: j,
          expires: now + ttlSec * 1000,
          staleUntil: now + Math.max(ttlSec * 6, 3600) * 1000, // bis zu 6× TTL als Stale halten
        });
        return j;
      } catch (e: any) {
        lastErr = e?.message || `${host}: fetch failed`;
      }
    }

    // Fallback: Yahoo Spark liefert denselben Timestamp/Close-Feed über einen
    // anderen Endpoint und ist oft noch verfügbar, wenn Chart mit 429 limitiert.
    for (const host of hosts) {
      try {
        const j = sparkToChart(await fetchJson(host + sparkPath));
        STORE.set(key, {
          value: j,
          expires: now + ttlSec * 1000,
          staleUntil: now + Math.max(ttlSec * 12, 7200) * 1000,
        });
        return j;
      } catch (e: any) {
        lastErr = e?.message || `${host}: spark failed`;
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
