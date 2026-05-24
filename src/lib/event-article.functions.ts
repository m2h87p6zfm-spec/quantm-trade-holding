import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns ONE best-fit article for a given event.
 * Priority:
 *   1. Article from one of the user's onboarding-selected news sources
 *   2. Fallback to any tier-1/2 financial source
 *
 * Used by the Global Intel EventPanel "Read full article" link.
 */

type SourceEntry = { label: string; domains: string[]; tier: 1 | 2 | 3 };

// Matches the user's NewsSource keys in src/lib/settings.ts → AGENCY_META labels.
const SOURCE_DOMAINS: Record<string, SourceEntry> = {
  reuters:         { label: "Reuters",             domains: ["reuters.com"], tier: 1 },
  bloomberg:       { label: "Bloomberg",           domains: ["bloomberg.com"], tier: 1 },
  wsj:             { label: "Wall Street Journal", domains: ["wsj.com"], tier: 2 },
  ft:              { label: "Financial Times",     domains: ["ft.com"], tier: 2 },
  economist:       { label: "The Economist",       domains: ["economist.com"], tier: 2 },
  nytimes:         { label: "New York Times",      domains: ["nytimes.com"], tier: 2 },
  washingtonpost:  { label: "Washington Post",     domains: ["washingtonpost.com"], tier: 2 },
  guardian:        { label: "The Guardian",        domains: ["theguardian.com"], tier: 2 },
  barrons:         { label: "Barron's",            domains: ["barrons.com"], tier: 2 },
  cnbc:            { label: "CNBC",                domains: ["cnbc.com"], tier: 2 },
  marketwatch:     { label: "MarketWatch",         domains: ["marketwatch.com"], tier: 2 },
  yahoo:           { label: "Yahoo Finance",       domains: ["finance.yahoo.com", "yahoo.com"], tier: 2 },
  investing:       { label: "Investing.com",      domains: ["investing.com"], tier: 2 },
  forbes:          { label: "Forbes",              domains: ["forbes.com"], tier: 2 },
  fortune:         { label: "Fortune",             domains: ["fortune.com"], tier: 2 },
  businessinsider: { label: "Business Insider",    domains: ["businessinsider.com"], tier: 2 },
  axios:           { label: "Axios",               domains: ["axios.com"], tier: 2 },
  seekingalpha:    { label: "Seeking Alpha",       domains: ["seekingalpha.com"], tier: 2 },
  benzinga:        { label: "Benzinga",            domains: ["benzinga.com"], tier: 3 },
  motleyfool:      { label: "Motley Fool",         domains: ["fool.com"], tier: 3 },
  thestreet:       { label: "TheStreet",           domains: ["thestreet.com"], tier: 3 },
  zerohedge:       { label: "ZeroHedge",           domains: ["zerohedge.com"], tier: 3 },
  theinformation:  { label: "The Information",     domains: ["theinformation.com"], tier: 2 },
  techcrunch:      { label: "TechCrunch",          domains: ["techcrunch.com"], tier: 3 },
  theverge:        { label: "The Verge",           domains: ["theverge.com"], tier: 3 },
  wired:           { label: "Wired",               domains: ["wired.com"], tier: 3 },
  coindesk:        { label: "CoinDesk",            domains: ["coindesk.com"], tier: 2 },
  cointelegraph:   { label: "Cointelegraph",       domains: ["cointelegraph.com"], tier: 3 },
  theblock:        { label: "The Block",           domains: ["theblock.co"], tier: 3 },
  decrypt:         { label: "Decrypt",             domains: ["decrypt.co"], tier: 3 },
  nikkei:          { label: "Nikkei",              domains: ["nikkei.com", "asia.nikkei.com"], tier: 2 },
  scmp:            { label: "South China MP",      domains: ["scmp.com"], tier: 3 },
  reutersasia:     { label: "Reuters",             domains: ["reuters.com"], tier: 1 },
  bloombergasia:   { label: "Bloomberg",           domains: ["bloomberg.com"], tier: 1 },
  handelsblatt:    { label: "Handelsblatt",        domains: ["handelsblatt.com"], tier: 2 },
  manager:         { label: "Manager Magazin",     domains: ["manager-magazin.de"], tier: 3 },
  faz:             { label: "F.A.Z.",              domains: ["faz.net"], tier: 2 },
  boerse:          { label: "Börse Online",        domains: ["boerse-online.de"], tier: 3 },
  lesechos:        { label: "Les Échos",           domains: ["lesechos.fr"], tier: 2 },
  politico:        { label: "Politico",            domains: ["politico.com", "politico.eu"], tier: 2 },
  semafor:         { label: "Semafor",             domains: ["semafor.com"], tier: 2 },
};

// Broad fallback set if the user has zero sources selected.
const FALLBACK_KEYS = ["reuters", "bloomberg", "ft", "wsj", "cnbc", "marketwatch", "economist", "barrons"];

export type EventArticle = {
  title: string;
  url: string;
  sourceKey: string;
  sourceLabel: string;
  publishedAt?: string;
  fromUserSource: boolean;
};

const Input = z.object({
  query: z.string().min(2).max(200),
  preferredSources: z.array(z.string().min(1).max(40)).max(80).optional(),
});

type FirecrawlSearchResponse = {
  data?:
    | {
        web?: Array<{ url?: string; title?: string; description?: string; publishedDate?: string }>;
        news?: Array<{ url?: string; title?: string; snippet?: string; date?: string }>;
      }
    | Array<{ url?: string; title?: string; description?: string; date?: string }>;
};

function matchSource(url: string, keys: string[]): { key: string; label: string; tier: 1 | 2 | 3 } | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    for (const key of keys) {
      const entry = SOURCE_DOMAINS[key];
      if (!entry) continue;
      if (entry.domains.some((d) => host === d || host.endsWith("." + d))) {
        return { key, label: entry.label, tier: entry.tier };
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function firecrawlSearch(apiKey: string, query: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, limit: 15, tbs: "qdr:w", sources: ["web", "news"] }),
  });
  if (!res.ok) return [] as Array<{ url?: string; title?: string; description?: string; date?: string }>;
  const json = (await res.json()) as FirecrawlSearchResponse;
  const out: Array<{ url?: string; title?: string; description?: string; date?: string }> = [];
  if (Array.isArray(json.data)) out.push(...json.data);
  else if (json.data && typeof json.data === "object") {
    if (Array.isArray(json.data.web))
      out.push(...json.data.web.map((r) => ({ url: r.url, title: r.title, description: r.description, date: r.publishedDate })));
    if (Array.isArray(json.data.news))
      out.push(...json.data.news.map((r) => ({ url: r.url, title: r.title, description: r.snippet, date: r.date })));
  }
  return out;
}

export const getEventArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }): Promise<{ article: EventArticle | null; error: string | null }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) return { article: null, error: "Live news is not connected." };

    const userKeys = (data.preferredSources ?? []).filter((k) => SOURCE_DOMAINS[k]);
    const fallbackKeys = FALLBACK_KEYS.filter((k) => SOURCE_DOMAINS[k]);

    try {
      const results = await firecrawlSearch(apiKey, data.query);
      if (results.length === 0) return { article: null, error: null };

      // Pass 1 — prefer the user's onboarding sources.
      if (userKeys.length > 0) {
        for (const r of results) {
          if (!r.url || !r.title) continue;
          const m = matchSource(r.url, userKeys);
          if (m) {
            return {
              article: {
                title: r.title.replace(/\s+/g, " ").trim().slice(0, 160),
                url: r.url,
                sourceKey: m.key,
                sourceLabel: m.label,
                publishedAt: r.date,
                fromUserSource: true,
              },
              error: null,
            };
          }
        }
      }

      // Pass 2 — fallback to any tier-1/2 wire.
      for (const r of results) {
        if (!r.url || !r.title) continue;
        const m = matchSource(r.url, fallbackKeys);
        if (m) {
          return {
            article: {
              title: r.title.replace(/\s+/g, " ").trim().slice(0, 160),
              url: r.url,
              sourceKey: m.key,
              sourceLabel: m.label,
              publishedAt: r.date,
              fromUserSource: false,
            },
            error: null,
          };
        }
      }

      return { article: null, error: null };
    } catch (err) {
      console.error("getEventArticle failed", err);
      return { article: null, error: "Live news service is currently unavailable." };
    }
  });
