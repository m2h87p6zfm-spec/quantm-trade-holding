// Server-side in-memory cache + request coalescing für Yahoo-Finance-Proxy.
// Ziel: Rate-Limit (HTTP 429) vermeiden, indem identische Anfragen gebündelt
// und Antworten zwischengespeichert werden. Bei Yahoo-Fehler wird notfalls
// abgelaufener (stale) Cache zurückgegeben — Endpunkte werfen niemals.

type Entry = { value: any; expires: number; staleUntil: number };

const STORE = new Map<string, Entry>();
const INFLIGHT = new Map<string, Promise<CachedChart>>();

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept": "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
} as const;

function parseJsonFromText(text: string): any {
  const marker = "Markdown Content:";
  const marked = text.includes(marker) ? text.slice(text.indexOf(marker) + marker.length) : text;
  const start = marked.search(/[\[{]/);
  if (start < 0) throw new Error("Antwort enthält kein JSON");
  return JSON.parse(marked.slice(start).trim());
}

async function fetchJson(url: string, timeoutMs = 3800): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${new URL(url).host} → ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return res.json();
    return parseJsonFromText(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

// Resolve mit erstem erfolgreichen Ergebnis, sonst reject nachdem alle scheitern.
async function firstSuccess<T>(tasks: Array<() => Promise<T>>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let pending = tasks.length;
    let lastErr: unknown;
    if (pending === 0) return reject(new Error("no tasks"));
    tasks.forEach((run) => {
      run().then(resolve).catch((e) => {
        lastErr = e;
        if (--pending === 0) reject(lastErr);
      });
    });
  });
}

async function fetchJsonViaReader(url: string): Promise<any> {
  const target = new URL(url);
  const readerUrl = `https://r.jina.ai/http://${target.host}${target.pathname}${target.search}`;
  return fetchJson(readerUrl);
}

function sparkToChart(j: any) {
  const response = j?.spark?.result?.[0]?.response?.[0];
  if (!response) throw new Error("Spark ohne Ergebnis");
  return { chart: { result: [response], error: null } };
}

function requireChartResult(j: any) {
  if (!j?.chart?.result?.[0]) throw new Error("Chart ohne Ergebnis");
  return j;
}

export type CachedChart = { value: any | null; stale: boolean; lastUpdated: number };

async function doFetch(symbol: string, interval: string, range: string, ttlSec: number, prevCached: Entry | undefined): Promise<CachedChart> {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const sparkPath = `/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`;
  const hosts = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

  const waves: Array<Array<() => Promise<any>>> = [
    hosts.map((h) => () => fetchJson(h + path).then(requireChartResult)),
    hosts.map((h) => () => fetchJson(h + sparkPath).then(sparkToChart).then(requireChartResult)),
    [() => fetchJsonViaReader(hosts[0] + sparkPath).then(sparkToChart).then(requireChartResult)],
  ];

  const now = Date.now();
  for (const wave of waves) {
    try {
      const j = await firstSuccess(wave);
      STORE.set(`${symbol}|${interval}|${range}`, {
        value: j,
        expires: now + ttlSec * 1000,
        staleUntil: now + Math.max(ttlSec * 168, 7 * 24 * 3600) * 1000,
      });
      return { value: j, stale: false, lastUpdated: now };
    } catch { /* nächste Welle */ }
  }

  if (prevCached) {
    return { value: prevCached.value, stale: true, lastUpdated: prevCached.expires - ttlSec * 1000 };
  }
  return { value: null, stale: true, lastUpdated: 0 };
}

export async function fetchYahooChartCached(
  symbol: string,
  interval: string,
  range: string,
  ttlSec: number,
): Promise<CachedChart> {
  const key = `${symbol}|${interval}|${range}`;
  const now = Date.now();
  const cached = STORE.get(key);

  if (cached && cached.expires > now) {
    return { value: cached.value, stale: false, lastUpdated: cached.expires - ttlSec * 1000 };
  }

  // Stale-while-revalidate: noch verwertbare (aber abgelaufene) Daten sofort
  // ausliefern und im Hintergrund refreshen — Bulk-Scans bleiben schnell.
  if (cached && cached.staleUntil > now && !INFLIGHT.has(key)) {
    const refresh = doFetch(symbol, interval, range, ttlSec, cached).finally(() => INFLIGHT.delete(key));
    INFLIGHT.set(key, refresh);
    return { value: cached.value, stale: true, lastUpdated: cached.expires - ttlSec * 1000 };
  }

  const inflight = INFLIGHT.get(key);
  if (inflight) return inflight;

  const p = doFetch(symbol, interval, range, ttlSec, cached).finally(() => INFLIGHT.delete(key));
  INFLIGHT.set(key, p);
  return p;
}

