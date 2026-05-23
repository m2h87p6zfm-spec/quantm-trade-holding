import { createFileRoute } from "@tanstack/react-router";

import type { NewsSource } from "@/lib/settings";

type NewsItem = {
  uuid: string;
  title: string;
  publisher: string;
  source: NewsSource | "other";
  link: string;
  publishedAt: number;
  symbol: string;
  tickers: string[];
  sentiment?: "bullish" | "bearish" | "neutral";
  score?: number;
  breaking?: boolean;
  aiSummary?: string;
};

const PUBLISHER_MAP: Array<{ test: RegExp; key: NewsItem["source"] }> = [
  // Tier-1 wires
  { test: /reuters/i, key: "reuters" },
  { test: /bloomberg/i, key: "bloomberg" },
  { test: /wall street journal|wsj\.com|^wsj\b/i, key: "wsj" },
  { test: /financial times|^ft\b|ft\.com/i, key: "ft" },
  { test: /the economist|economist\.com/i, key: "economist" },
  { test: /new york times|nytimes|nyt\b/i, key: "nytimes" },
  { test: /washington post|washingtonpost/i, key: "washingtonpost" },
  { test: /the guardian|guardian\.com|theguardian/i, key: "guardian" },
  { test: /barron'?s|barrons/i, key: "barrons" },
  // US business
  { test: /cnbc/i, key: "cnbc" },
  { test: /marketwatch/i, key: "marketwatch" },
  { test: /yahoo/i, key: "yahoo" },
  { test: /investing\.com/i, key: "investing" },
  { test: /forbes/i, key: "forbes" },
  { test: /fortune/i, key: "fortune" },
  { test: /business insider|insider\.com|businessinsider/i, key: "businessinsider" },
  { test: /axios/i, key: "axios" },
  { test: /seeking alpha|seekingalpha/i, key: "seekingalpha" },
  { test: /benzinga/i, key: "benzinga" },
  { test: /motley fool|fool\.com/i, key: "motleyfool" },
  { test: /thestreet|the street/i, key: "thestreet" },
  { test: /zerohedge|zero hedge/i, key: "zerohedge" },
  // Tech
  { test: /the information|theinformation/i, key: "theinformation" },
  { test: /techcrunch/i, key: "techcrunch" },
  { test: /the verge|theverge/i, key: "theverge" },
  { test: /\bwired\b/i, key: "wired" },
  // Crypto
  { test: /coindesk/i, key: "coindesk" },
  { test: /cointelegraph/i, key: "cointelegraph" },
  { test: /the block|theblock/i, key: "theblock" },
  { test: /decrypt/i, key: "decrypt" },
  // Asia
  { test: /nikkei/i, key: "nikkei" },
  { test: /south china morning post|scmp/i, key: "scmp" },
  // Europe / DACH / FR
  { test: /handelsblatt/i, key: "handelsblatt" },
  { test: /manager.?magazin/i, key: "manager" },
  { test: /faz\.net|frankfurter allgemeine/i, key: "faz" },
  { test: /börse online|boerse.online/i, key: "boerse" },
  { test: /les ?échos|lesechos/i, key: "lesechos" },
  // Macro
  { test: /politico/i, key: "politico" },
  { test: /semafor/i, key: "semafor" },
];

function classifyPublisher(p: string): NewsItem["source"] {
  for (const m of PUBLISHER_MAP) if (m.test.test(p || "")) return m.key;
  return "other";
}

const BREAKING_RX = /\b(breaking|halts?|halted|surges?|plunges?|crashes?|soars?|tumbles?|beat[s]? estimates|misses estimates|downgrades?|upgrades?|guidance cut|profit warning|recall|lawsuit|merger|acquires?|acquisition|bankruptcy|files for|sec probe)\b/i;

async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=10&quotesCount=0`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ApexMarkets" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { news?: Array<{ uuid: string; title: string; publisher: string; link: string; providerPublishTime: number; relatedTickers?: string[] }> };
    return (json.news ?? []).slice(0, 10).map((n) => {
      const source = classifyPublisher(n.publisher);
      const tickers = Array.from(new Set([symbol, ...(n.relatedTickers ?? []).map((t) => t.toUpperCase())]));
      return {
        uuid: n.uuid,
        title: n.title,
        publisher: n.publisher,
        source,
        link: n.link,
        publishedAt: (n.providerPublishTime ?? 0) * 1000,
        symbol,
        tickers,
        breaking: BREAKING_RX.test(n.title),
      } satisfies NewsItem;
    });
  } catch {
    return [];
  }
}

async function classifySentiments(items: NewsItem[]): Promise<NewsItem[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || items.length === 0) return items;
  const numbered = items.map((it, i) => `${i + 1}. [${it.symbol}] ${it.title}`).join("\n");
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: 'You classify finance headlines. Return ONLY JSON array like [{"i":1,"s":"bullish","c":0.8}, ...]. s ∈ bullish|bearish|neutral, c=confidence 0..1.' },
          { role: "user", content: `Classify each headline's market sentiment for its ticker:\n${numbered}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return items;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);
    const arr: Array<{ i: number; s: string; c: number }> = Array.isArray(parsed) ? parsed : (parsed.items ?? parsed.results ?? []);
    return items.map((it, idx) => {
      const m = arr.find((x) => x.i === idx + 1);
      if (!m) return it;
      const s = m.s === "bullish" || m.s === "bearish" ? m.s : "neutral";
      return { ...it, sentiment: s, score: m.c };
    });
  } catch {
    return items;
  }
}


async function generateSummariesAll(items: NewsItem[]): Promise<NewsItem[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || items.length === 0) return items;
  const target = items.slice(0, 30);
  const numbered = target.map((it, i) => `${i + 1}. [${it.symbol}] (${it.publisher}) ${it.title}`).join("\n");
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              'Du fasst Finanz-Schlagzeilen in 3–4 prägnanten deutschen Sätzen zusammen (max. 90 Wörter), so dass der Leser den Inhalt VOLLSTÄNDIG erfasst — ohne den Originalartikel öffnen zu müssen. Erkläre: Was ist passiert? Warum ist es relevant für das Ticker-Symbol? Welche Marktwirkung ist plausibel? Keine Floskeln, keine Disclaimer, kein Markdown. Antwort STRIKT als JSON: {"items":[{"i":1,"s":"…"}, …]}.',
          },
          { role: "user", content: `Fasse jede Schlagzeile zusammen:\n${numbered}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return items;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { items?: Array<{ i: number; s: string }> };
    const arr = parsed.items ?? [];
    const map = new Map<string, string>();
    target.forEach((it, idx) => {
      const m = arr.find((x) => x.i === idx + 1);
      if (m?.s) map.set(it.uuid, m.s);
    });
    return items.map((it) => (map.has(it.uuid) ? { ...it, aiSummary: map.get(it.uuid) } : it));
  } catch {
    return items;
  }
}

export const Route = createFileRoute("/api/public/news-sentiment")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { symbols?: string[]; tier1Only?: boolean; sources?: string[]; withSummary?: boolean; portfolio?: string[] };
          const symbols = (body.symbols ?? []).filter((s) => typeof s === "string" && /^[A-Z0-9.\-^]{1,12}$/.test(s)).slice(0, 12);
          if (symbols.length === 0) {
            return new Response(JSON.stringify({ items: [] }), { headers: { "Content-Type": "application/json" } });
          }
          const batches = await Promise.all(symbols.map(fetchYahooNews));
          let flat = batches.flat();

          // tier1Only standardmäßig AUS — wir akzeptieren alle bekannten Publisher
          // aus dem erweiterten NEWS_SOURCES-Set. Whitelist über "sources" möglich.
          if (body.tier1Only === true) flat = flat.filter((i) => i.source !== "other");

          if (Array.isArray(body.sources) && body.sources.length > 0) {
            const allow = new Set(body.sources);
            flat = flat.filter((i) => allow.has(i.source));
          }

          const seen = new Set<string>();
          flat = flat.filter((i) => (seen.has(i.uuid) ? false : (seen.add(i.uuid), true)));
          flat.sort((a, b) => b.publishedAt - a.publishedAt);
          flat = flat.slice(0, 40);

          let enriched = await classifySentiments(flat);
          // Volltext-Zusammenfassungen für alle Items, damit die Karten im UI
          // den Inhalt direkt anzeigen können (kein Klick auf Originalquelle nötig).
          if (body.withSummary !== false) {
            enriched = await generateSummariesAll(enriched);
          }

          return new Response(JSON.stringify({ items: enriched }), {
            headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120", "Access-Control-Allow-Origin": "*" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
