import { createFileRoute } from "@tanstack/react-router";

type NewsItem = {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  symbol: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  score?: number;
};

async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=6&quotesCount=0`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ApexMarkets" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { news?: Array<{ uuid: string; title: string; publisher: string; link: string; providerPublishTime: number }> };
    return (json.news ?? []).slice(0, 6).map((n) => ({
      uuid: n.uuid,
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      publishedAt: (n.providerPublishTime ?? 0) * 1000,
      symbol,
    }));
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

export const Route = createFileRoute("/api/public/news-sentiment")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { symbols?: string[] };
          const symbols = (body.symbols ?? []).filter((s) => typeof s === "string" && /^[A-Z0-9.\-^]{1,12}$/.test(s)).slice(0, 8);
          if (symbols.length === 0) {
            return new Response(JSON.stringify({ items: [] }), { headers: { "Content-Type": "application/json" } });
          }
          const batches = await Promise.all(symbols.map(fetchYahooNews));
          const flat = batches.flat().sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 24);
          const enriched = await classifySentiments(flat);
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
