// Universal Yahoo Finance symbol search proxy.
// Returns up to 15 matches by ticker or company name. Cached in memory.
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept": "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
} as const;

type Hit = { symbol: string; name: string; exchange?: string; type?: string };
type Entry = { value: Hit[]; expires: number };
const CACHE = new Map<string, Entry>();
const TTL_MS = 5 * 60_000;

async function fetchJson(url: string, timeoutMs = 3500): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } finally { clearTimeout(t); }
}

async function readerFallback(url: string): Promise<any> {
  const target = new URL(url);
  const readerUrl = `https://r.jina.ai/http://${target.host}${target.pathname}${target.search}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(readerUrl, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    const text = await res.text();
    const start = text.search(/[\[{]/);
    if (start < 0) throw new Error("no json");
    return JSON.parse(text.slice(start).trim());
  } finally { clearTimeout(t); }
}

function normalize(j: any): Hit[] {
  const quotes: any[] = j?.quotes ?? [];
  return quotes
    .filter((q) => q?.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "INDEX" || q.quoteType === "CURRENCY" || q.quoteType === "CRYPTOCURRENCY"))
    .slice(0, 15)
    .map((q) => ({
      symbol: String(q.symbol),
      name: String(q.longname || q.shortname || q.symbol),
      exchange: q.exchDisp || q.exchange,
      type: q.quoteType,
    }));
}

export const Route = createFileRoute("/api/public/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const q = (url.searchParams.get("q") || "").trim();
          if (q.length < 1 || q.length > 64) {
            return new Response(JSON.stringify({ results: [] }), {
              status: 200, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const key = q.toLowerCase();
          const now = Date.now();
          const cached = CACHE.get(key);
          if (cached && cached.expires > now) {
            return new Response(JSON.stringify({ results: cached.value, cached: true }), {
              status: 200,
              headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...CORS },
            });
          }
          const path = `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0&listsCount=0`;
          const hosts = ["https://query2.finance.yahoo.com", "https://query1.finance.yahoo.com"];
          let json: any = null;
          for (const h of hosts) {
            try { json = await fetchJson(h + path); break; } catch { /* next */ }
          }
          if (!json) {
            try { json = await readerFallback(hosts[0] + path); } catch { /* swallow */ }
          }
          const results = json ? normalize(json) : [];
          if (results.length) CACHE.set(key, { value: results, expires: now + TTL_MS });
          return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120", ...CORS },
          });
        } catch {
          return new Response(JSON.stringify({ results: [] }), {
            status: 200, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
