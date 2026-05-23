import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Map of supported news source keys (matching settings.NEWS_SOURCES)
 * to one or more domain suffixes used for filtering Firecrawl results.
 */
const SOURCE_DOMAINS: Record<string, { label: string; domains: string[] }> = {
  reuters: { label: "Reuters", domains: ["reuters.com"] },
  bloomberg: { label: "Bloomberg", domains: ["bloomberg.com"] },
  ft: { label: "Financial Times", domains: ["ft.com"] },
  cnbc: { label: "CNBC", domains: ["cnbc.com"] },
  yahoo: { label: "Yahoo Finance", domains: ["finance.yahoo.com", "yahoo.com"] },
  marketwatch: { label: "MarketWatch", domains: ["marketwatch.com"] },
  wsj: { label: "WSJ", domains: ["wsj.com"] },
  economist: { label: "The Economist", domains: ["economist.com"] },
  barrons: { label: "Barron's", domains: ["barrons.com"] },
  nytimes: { label: "New York Times", domains: ["nytimes.com"] },
  guardian: { label: "Guardian", domains: ["theguardian.com"] },
  axios: { label: "Axios", domains: ["axios.com"] },
  semafor: { label: "Semafor", domains: ["semafor.com"] },
  politico: { label: "Politico", domains: ["politico.com"] },
  nikkei: { label: "Nikkei", domains: ["nikkei.com", "asia.nikkei.com"] },
  scmp: { label: "SCMP", domains: ["scmp.com"] },
  handelsblatt: { label: "Handelsblatt", domains: ["handelsblatt.com"] },
  faz: { label: "FAZ", domains: ["faz.net"] },
  lesechos: { label: "Les Echos", domains: ["lesechos.fr"] },
};

const Input = z.object({
  country: z.string().min(1).max(80),
  sources: z.array(z.string().min(1).max(40)).max(40).optional(),
  limit: z.number().int().min(1).max(3).optional(),
});

export type CountryNewsItem = {
  id: string;
  title: string;
  url: string;
  source: string; // key
  sourceLabel: string;
  snippet: string;
  publishedAt?: string;
};

type FirecrawlSearchResponse = {
  success?: boolean;
  data?: {
    web?: Array<{ url?: string; title?: string; description?: string; markdown?: string; publishedDate?: string }>;
    news?: Array<{ url?: string; title?: string; snippet?: string; date?: string }>;
  } | Array<{ url?: string; title?: string; description?: string }>;
};

function pickSourceForUrl(url: string, allowed: string[]): { key: string; label: string } | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    for (const key of allowed) {
      const entry = SOURCE_DOMAINS[key];
      if (!entry) continue;
      if (entry.domains.some((d) => host === d || host.endsWith("." + d) || host.endsWith(d))) {
        return { key, label: entry.label };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function shorten(text: string, max = 180): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/[,.;:\s]+\S*$/, "") + "…";
}

export const getCountryNews = createServerFn({ method: "POST" })
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }): Promise<{ items: CountryNewsItem[]; error: string | null }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { items: [], error: "Firecrawl is not connected. Connect it in Connectors to enable live news." };
    }

    const requested = (data.sources && data.sources.length > 0
      ? data.sources
      : ["reuters", "bloomberg", "ft", "cnbc", "yahoo", "marketwatch"]
    ).filter((k) => SOURCE_DOMAINS[k]);

    if (requested.length === 0) {
      return { items: [], error: "No supported news sources are enabled." };
    }

    const limit = data.limit ?? 3;
    const query = `${data.country} markets economy central bank policy`;

    try {
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit: 15,
          tbs: "qdr:w", // last week
          sources: ["web", "news"],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("Firecrawl search failed", res.status, body.slice(0, 200));
        return { items: [], error: `News provider error (${res.status}).` };
      }

      const json = (await res.json()) as FirecrawlSearchResponse;

      // Normalize results: combine web + news arrays
      const raw: Array<{ url?: string; title?: string; description?: string; date?: string }> = [];
      if (Array.isArray(json.data)) {
        raw.push(...json.data);
      } else if (json.data && typeof json.data === "object") {
        if (Array.isArray(json.data.web)) {
          raw.push(...json.data.web.map((r) => ({ url: r.url, title: r.title, description: r.description ?? r.markdown, date: r.publishedDate })));
        }
        if (Array.isArray(json.data.news)) {
          raw.push(...json.data.news.map((r) => ({ url: r.url, title: r.title, description: r.snippet, date: r.date })));
        }
      }

      const seen = new Set<string>();
      const items: CountryNewsItem[] = [];
      for (const r of raw) {
        if (!r.url || !r.title) continue;
        const match = pickSourceForUrl(r.url, requested);
        if (!match) continue;
        if (seen.has(match.key)) continue; // diversify sources
        seen.add(match.key);
        items.push({
          id: `${match.key}-${items.length}`,
          title: shorten(r.title, 140),
          url: r.url,
          source: match.key,
          sourceLabel: match.label,
          snippet: shorten(r.description ?? "", 200),
          publishedAt: r.date,
        });
        if (items.length >= limit) break;
      }

      return { items, error: null };
    } catch (err) {
      console.error("getCountryNews failed", err);
      return { items: [], error: "Live news service is currently unavailable." };
    }
  });
