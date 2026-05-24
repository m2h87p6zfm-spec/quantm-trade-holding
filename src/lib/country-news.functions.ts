import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * World-Monitor-class source registry for Global Macro intel.
 * Each source has a tier (1 = global wire/central bank, 2 = top financial press,
 * 3 = regional reference outlet). The page surfaces tier so users can trust
 * what they read.
 */
type Tier = 1 | 2 | 3;
const SOURCE_DOMAINS: Record<string, { label: string; domains: string[]; tier: Tier }> = {
  // ── Tier 1: official institutions & global wires ──────────────────
  reuters:      { label: "Reuters",          domains: ["reuters.com"],                                tier: 1 },
  bloomberg:    { label: "Bloomberg",        domains: ["bloomberg.com"],                              tier: 1 },
  ap:           { label: "AP",               domains: ["apnews.com"],                                 tier: 1 },
  afp:          { label: "AFP",              domains: ["afp.com"],                                    tier: 1 },
  imf:          { label: "IMF",              domains: ["imf.org"],                                    tier: 1 },
  worldbank:    { label: "World Bank",       domains: ["worldbank.org"],                              tier: 1 },
  oecd:         { label: "OECD",             domains: ["oecd.org"],                                   tier: 1 },
  bis:          { label: "BIS",              domains: ["bis.org"],                                    tier: 1 },
  fed:          { label: "Federal Reserve",  domains: ["federalreserve.gov"],                         tier: 1 },
  ecb:          { label: "ECB",              domains: ["ecb.europa.eu"],                              tier: 1 },
  boe:          { label: "Bank of England",  domains: ["bankofengland.co.uk"],                        tier: 1 },
  boj:          { label: "Bank of Japan",    domains: ["boj.or.jp"],                                  tier: 1 },
  snb:          { label: "SNB",              domains: ["snb.ch"],                                     tier: 1 },
  bundesbank:   { label: "Bundesbank",       domains: ["bundesbank.de"],                              tier: 1 },
  pboc:         { label: "PBoC",             domains: ["pbc.gov.cn"],                                 tier: 1 },
  treasury:     { label: "US Treasury",      domains: ["treasury.gov", "home.treasury.gov"],          tier: 1 },
  eurostat:     { label: "Eurostat",         domains: ["ec.europa.eu"],                               tier: 1 },
  un:           { label: "United Nations",   domains: ["news.un.org", "un.org"],                      tier: 1 },

  // ── Tier 2: top financial press ───────────────────────────────────
  ft:           { label: "Financial Times",  domains: ["ft.com"],                                     tier: 2 },
  wsj:          { label: "WSJ",              domains: ["wsj.com"],                                    tier: 2 },
  economist:    { label: "The Economist",    domains: ["economist.com"],                              tier: 2 },
  barrons:      { label: "Barron's",         domains: ["barrons.com"],                                tier: 2 },
  cnbc:         { label: "CNBC",             domains: ["cnbc.com"],                                   tier: 2 },
  marketwatch:  { label: "MarketWatch",      domains: ["marketwatch.com"],                            tier: 2 },
  yahoo:        { label: "Yahoo Finance",    domains: ["finance.yahoo.com", "yahoo.com"],             tier: 2 },
  investing:    { label: "Investing.com",    domains: ["investing.com"],                              tier: 2 },
  nytimes:      { label: "New York Times",   domains: ["nytimes.com"],                                tier: 2 },
  washingtonpost: { label: "Washington Post", domains: ["washingtonpost.com"],                        tier: 2 },
  guardian:     { label: "Guardian",         domains: ["theguardian.com"],                            tier: 2 },
  axios:        { label: "Axios",            domains: ["axios.com"],                                  tier: 2 },
  semafor:      { label: "Semafor",          domains: ["semafor.com"],                                tier: 2 },
  politico:     { label: "Politico",         domains: ["politico.com", "politico.eu"],                tier: 2 },
  forbes:       { label: "Forbes",           domains: ["forbes.com"],                                 tier: 2 },
  fortune:      { label: "Fortune",          domains: ["fortune.com"],                                tier: 2 },
  bbc:          { label: "BBC",              domains: ["bbc.com", "bbc.co.uk"],                       tier: 2 },
  cnn:          { label: "CNN Business",     domains: ["cnn.com", "edition.cnn.com"],                 tier: 2 },
  aljazeera:    { label: "Al Jazeera",       domains: ["aljazeera.com"],                              tier: 2 },

  // ── Tier 3: top regional reference outlets ────────────────────────
  // Asia
  nikkei:       { label: "Nikkei",           domains: ["nikkei.com", "asia.nikkei.com"],              tier: 3 },
  scmp:         { label: "SCMP",             domains: ["scmp.com"],                                   tier: 3 },
  chinadaily:   { label: "China Daily",      domains: ["chinadaily.com.cn"],                          tier: 3 },
  caixin:       { label: "Caixin",           domains: ["caixinglobal.com", "caixin.com"],             tier: 3 },
  straitstimes: { label: "Straits Times",    domains: ["straitstimes.com"],                           tier: 3 },
  bangkokpost:  { label: "Bangkok Post",     domains: ["bangkokpost.com"],                            tier: 3 },
  thehindu:     { label: "The Hindu",        domains: ["thehindu.com"],                               tier: 3 },
  livemint:     { label: "Mint",             domains: ["livemint.com"],                               tier: 3 },
  // DACH / Europe
  handelsblatt: { label: "Handelsblatt",     domains: ["handelsblatt.com"],                           tier: 3 },
  manager:      { label: "Manager Magazin",  domains: ["manager-magazin.de"],                         tier: 3 },
  faz:          { label: "FAZ",              domains: ["faz.net"],                                    tier: 3 },
  boerse:       { label: "Börse Online",     domains: ["boerse-online.de"],                           tier: 3 },
  nzz:          { label: "NZZ",              domains: ["nzz.ch"],                                     tier: 3 },
  derstandard:  { label: "Der Standard",     domains: ["derstandard.at"],                             tier: 3 },
  lesechos:     { label: "Les Echos",        domains: ["lesechos.fr"],                                tier: 3 },
  lemonde:      { label: "Le Monde",         domains: ["lemonde.fr"],                                 tier: 3 },
  elpais:       { label: "El País",          domains: ["elpais.com"],                                 tier: 3 },
  expansion:    { label: "Expansión",        domains: ["expansion.com"],                              tier: 3 },
  ilsole24ore:  { label: "Il Sole 24 Ore",   domains: ["ilsole24ore.com"],                            tier: 3 },
  // Americas
  globeandmail: { label: "Globe and Mail",   domains: ["theglobeandmail.com"],                        tier: 3 },
  valor:        { label: "Valor",            domains: ["valor.globo.com"],                            tier: 3 },
  // ME / Africa
  arabnews:     { label: "Arab News",        domains: ["arabnews.com"],                               tier: 3 },
  haaretz:      { label: "Haaretz",          domains: ["haaretz.com"],                                tier: 3 },
  jpost:        { label: "Jerusalem Post",   domains: ["jpost.com"],                                  tier: 3 },
  // Russia/CIS (read with caution but useful for breadth)
  tass:         { label: "TASS",             domains: ["tass.com"],                                   tier: 3 },
};

const Input = z.object({
  country: z.string().min(1).max(80),
  sources: z.array(z.string().min(1).max(40)).max(80).optional(),
  limit: z.number().int().min(1).max(8).optional(),
});

export type CountryNewsItem = {
  id: string;
  title: string;
  url: string;
  source: string; // key
  sourceLabel: string;
  tier: 1 | 2 | 3;
  snippet: string;
  publishedAt?: string;
  ageHours?: number; // computed at fetch time — drives the "Fresh today" badge
};

type FirecrawlSearchResponse = {
  success?: boolean;
  data?: {
    web?: Array<{ url?: string; title?: string; description?: string; markdown?: string; publishedDate?: string }>;
    news?: Array<{ url?: string; title?: string; snippet?: string; date?: string }>;
  } | Array<{ url?: string; title?: string; description?: string; date?: string }>;
};

function pickSourceForUrl(url: string, allowed: string[]): { key: string; label: string; tier: 1 | 2 | 3 } | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    for (const key of allowed) {
      const entry = SOURCE_DOMAINS[key];
      if (!entry) continue;
      if (entry.domains.some((d) => host === d || host.endsWith("." + d) || host.endsWith(d))) {
        return { key, label: entry.label, tier: entry.tier };
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

function ageHoursFrom(date?: string): number | undefined {
  if (!date) return undefined;
  const ts = Date.parse(date);
  if (!Number.isFinite(ts)) return undefined;
  return Math.max(0, Math.round((Date.now() - ts) / 3_600_000));
}

/**
 * Pull from Firecrawl with multiple complementary macro angles so a country
 * panel surfaces monetary, fiscal AND geopolitical signal — not just markets.
 */
async function searchAngle(apiKey: string, query: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      limit: 12,
      tbs: "qdr:d", // last 24h — daily freshness like World Monitor
      sources: ["web", "news"],
    }),
  });
  if (!res.ok) return [] as Array<{ url?: string; title?: string; description?: string; date?: string }>;
  const json = (await res.json()) as FirecrawlSearchResponse;
  const raw: Array<{ url?: string; title?: string; description?: string; date?: string }> = [];
  if (Array.isArray(json.data)) raw.push(...json.data);
  else if (json.data && typeof json.data === "object") {
    if (Array.isArray(json.data.web)) raw.push(...json.data.web.map((r) => ({ url: r.url, title: r.title, description: r.description ?? r.markdown, date: r.publishedDate })));
    if (Array.isArray(json.data.news)) raw.push(...json.data.news.map((r) => ({ url: r.url, title: r.title, description: r.snippet, date: r.date })));
  }
  return raw;
}

export const getCountryNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }): Promise<{ items: CountryNewsItem[]; error: string | null }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { items: [], error: "Firecrawl is not connected. Connect it in Connectors to enable live news." };
    }

    // Default to a broad, world-class set when the user hasn't narrowed it.
    const allKeys = Object.keys(SOURCE_DOMAINS);
    const requested = (data.sources && data.sources.length > 0 ? data.sources : allKeys).filter((k) => SOURCE_DOMAINS[k]);
    if (requested.length === 0) return { items: [], error: "No supported news sources are enabled." };

    const limit = data.limit ?? 6;
    const country = data.country;

    // Three angles, run in parallel — wider lens than a single query.
    const angles = [
      `${country} economy inflation central bank monetary policy`,
      `${country} fiscal deficit debt bonds yields`,
      `${country} geopolitics trade sanctions election`,
    ];

    try {
      const batches = await Promise.all(angles.map((q) => searchAngle(apiKey, q)));
      const raw = batches.flat();

      // Diversify: prefer Tier-1 first, then Tier-2, then Tier-3; max 2 stories per source.
      const perSource = new Map<string, number>();
      const seenUrls = new Set<string>();
      const candidates: CountryNewsItem[] = [];
      for (const r of raw) {
        if (!r.url || !r.title) continue;
        if (seenUrls.has(r.url)) continue;
        const match = pickSourceForUrl(r.url, requested);
        if (!match) continue;
        const used = perSource.get(match.key) ?? 0;
        if (used >= 2) continue;
        seenUrls.add(r.url);
        perSource.set(match.key, used + 1);
        candidates.push({
          id: `${match.key}-${candidates.length}`,
          title: shorten(r.title, 140),
          url: r.url,
          source: match.key,
          sourceLabel: match.label,
          tier: match.tier,
          snippet: shorten(r.description ?? "", 220),
          publishedAt: r.date,
          ageHours: ageHoursFrom(r.date),
        });
      }

      // Rank: lower tier number = better; then fresher.
      candidates.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return (a.ageHours ?? 999) - (b.ageHours ?? 999);
      });

      return { items: candidates.slice(0, limit), error: null };
    } catch (err) {
      console.error("getCountryNews failed", err);
      return { items: [], error: "Live news service is currently unavailable." };
    }
  });
