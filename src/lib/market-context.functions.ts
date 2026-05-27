// ============================================================================
//  MARKET CONTEXT PIPELINE
// ----------------------------------------------------------------------------
//  Holt News-, Makro- und Geopolitik-Headlines (Firecrawl) und destilliert sie
//  über das Lovable-AI-Gateway in normierte Features für die Composite-Engine:
//    - newsSentiment    [-1, +1]   (negativ = bearish)
//    - geopoliticalRisk [ 0,  1]   (0 = ruhig, 1 = Krise)
//    - riskOnOff        [-1, +1]   (+1 = Risk-On, -1 = Risk-Off)
//
//  Die Auswertung wird in `public.market_context_cache` zwischengespeichert
//  (1h TTL, geteilt zwischen allen Nutzern), damit Firecrawl- & AI-Credits
//  pro Stunde maximal einmal pro Cache-Key verbraucht werden.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — synchron zu Picks-Throttle

export type MarketContextHeadline = {
  title: string;
  url: string;
  source: "macro" | "symbol";
};

export type MarketContextPayload = {
  asOf: string;
  newsSentiment: number;      // -1..+1
  geopoliticalRisk: number;   //  0..1
  riskOnOff: number;          // -1..+1
  summary: string;            // 1–2 Sätze, trader-grade
  headlines: MarketContextHeadline[];
  source: "live" | "cache" | "fallback";
};

// ----------------------------------------------------------------------------
//  Firecrawl: Headlines holen
// ----------------------------------------------------------------------------

type FirecrawlResult = { url?: string; title?: string };
type FirecrawlResponse = {
  data?:
    | { web?: FirecrawlResult[]; news?: FirecrawlResult[] }
    | FirecrawlResult[];
};

async function firecrawlSearch(apiKey: string, query: string, limit = 6): Promise<FirecrawlResult[]> {
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, limit, tbs: "qdr:d", sources: ["web", "news"] }),
    });
    if (!r.ok) return [];
    const j = (await r.json()) as FirecrawlResponse;
    const out: FirecrawlResult[] = [];
    if (Array.isArray(j.data)) out.push(...j.data);
    else if (j.data) {
      if (j.data.web) out.push(...j.data.web);
      if (j.data.news) out.push(...j.data.news);
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchMacroHeadlines(apiKey: string): Promise<MarketContextHeadline[]> {
  const queries = [
    "global markets today S&P 500 Fed rates dollar",
    "geopolitics war oil energy supply today",
    "central bank inflation policy decision today",
  ];
  const results = await Promise.all(queries.map((q) => firecrawlSearch(apiKey, q, 5)));
  const seen = new Set<string>();
  const out: MarketContextHeadline[] = [];
  for (const arr of results) {
    for (const r of arr) {
      if (!r.url || !r.title || seen.has(r.url)) continue;
      seen.add(r.url);
      out.push({ title: r.title, url: r.url, source: "macro" });
    }
  }
  return out.slice(0, 18);
}

async function fetchSymbolHeadlines(apiKey: string, symbol: string, name?: string): Promise<MarketContextHeadline[]> {
  const subject = name && name.length > 1 ? `${symbol} ${name}` : symbol;
  const queries = [
    `${subject} stock news earnings analyst`,
    `${subject} guidance upgrade downgrade today`,
  ];
  const results = await Promise.all(queries.map((q) => firecrawlSearch(apiKey, q, 5)));
  const seen = new Set<string>();
  const out: MarketContextHeadline[] = [];
  for (const arr of results) {
    for (const r of arr) {
      if (!r.url || !r.title || seen.has(r.url)) continue;
      seen.add(r.url);
      out.push({ title: r.title, url: r.url, source: "symbol" });
    }
  }
  return out.slice(0, 12);
}

// ----------------------------------------------------------------------------
//  Lovable AI Gateway: Sentiment / Risk-On-Off / Geopolitical-Risk Scoring
// ----------------------------------------------------------------------------

async function classifyHeadlines(
  aiKey: string,
  headlines: MarketContextHeadline[],
  subject: string,
): Promise<Pick<MarketContextPayload, "newsSentiment" | "geopoliticalRisk" | "riskOnOff" | "summary">> {
  const fallback = { newsSentiment: 0, geopoliticalRisk: 0.2, riskOnOff: 0, summary: "Keine signifikanten Nachrichten." };
  if (headlines.length === 0) return fallback;

  const block = headlines.map((h, i) => `[${i + 1}] ${h.title}`).join("\n");

  const system =
    "You are a senior cross-asset macro strategist. Read the headlines and output strict JSON with normalized risk features. Do not hedge; produce numbers.";

  const user = `Subject: ${subject}

Headlines (last 24h):
${block}

Return strict JSON with these fields (all numbers within the stated ranges):
{
  "newsSentiment": number in [-1, 1],   // -1 strongly bearish for the subject, +1 strongly bullish
  "geopoliticalRisk": number in [0, 1], // 0 calm, 1 active crisis (war, sanctions, supply shock)
  "riskOnOff": number in [-1, 1],       // +1 strong risk-on, -1 strong risk-off
  "summary": string                      // <= 240 chars, trader-grade, concrete (rates, oil, VIX, DXY)
}`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      console.error("market-context AI error", r.status, (await r.text().catch(() => "")).slice(0, 200));
      return fallback;
    }
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: Partial<MarketContextPayload> = {};
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* keep fallback */ } }
    }
    const clamp = (n: unknown, lo: number, hi: number, def: number) => {
      const x = typeof n === "number" && Number.isFinite(n) ? n : def;
      return Math.max(lo, Math.min(hi, x));
    };
    return {
      newsSentiment: clamp(parsed.newsSentiment, -1, 1, 0),
      geopoliticalRisk: clamp(parsed.geopoliticalRisk, 0, 1, 0.2),
      riskOnOff: clamp(parsed.riskOnOff, -1, 1, 0),
      summary: String(parsed.summary ?? "").slice(0, 240) || "Mischung aus neutralen Headlines.",
    };
  } catch (e) {
    console.error("classifyHeadlines failed", e);
    return fallback;
  }
}

// ----------------------------------------------------------------------------
//  Cache Helpers (DB-shared, service-role writes)
// ----------------------------------------------------------------------------

async function readCache(key: string): Promise<MarketContextPayload | null> {
  try {
    const { data } = await supabaseAdmin
      .from("market_context_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return { ...(data.payload as MarketContextPayload), source: "cache" };
  } catch {
    return null;
  }
}

async function writeCache(key: string, payload: MarketContextPayload): Promise<void> {
  try {
    await supabaseAdmin.from("market_context_cache").upsert({
      cache_key: key,
      payload,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    });
  } catch (e) {
    console.error("writeCache failed", e);
  }
}

// ----------------------------------------------------------------------------
//  Server Function
// ----------------------------------------------------------------------------

const InputSchema = z.object({
  symbol: z.string().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/).optional(),
  name: z.string().min(1).max(120).optional(),
});

export type MarketContextResult = {
  macro: MarketContextPayload;
  symbol: MarketContextPayload | null;
};

export const getMarketContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => InputSchema.parse(raw ?? {}))
  .handler(async ({ data }): Promise<MarketContextResult> => {
    const fcKey = process.env.FIRECRAWL_API_KEY;
    const aiKey = process.env.LOVABLE_API_KEY;

    // ---- MACRO (immer, geteilt) ------------------------------------------
    const macroKey = "macro:global";
    let macro = await readCache(macroKey);
    if (!macro) {
      if (!fcKey || !aiKey) {
        macro = {
          asOf: new Date().toISOString(),
          newsSentiment: 0, geopoliticalRisk: 0.2, riskOnOff: 0,
          summary: "Pipeline nicht konfiguriert — neutrale Defaults aktiv.",
          headlines: [],
          source: "fallback",
        };
      } else {
        const headlines = await fetchMacroHeadlines(fcKey);
        const cls = await classifyHeadlines(aiKey, headlines, "Global macro & cross-asset risk");
        macro = {
          asOf: new Date().toISOString(),
          ...cls,
          headlines,
          source: "live",
        };
        await writeCache(macroKey, macro);
      }
    }

    // ---- SYMBOL (optional) -----------------------------------------------
    let symbolCtx: MarketContextPayload | null = null;
    if (data.symbol) {
      const symKey = `symbol:${data.symbol.toUpperCase()}`;
      symbolCtx = await readCache(symKey);
      if (!symbolCtx) {
        if (!fcKey || !aiKey) {
          symbolCtx = {
            asOf: new Date().toISOString(),
            newsSentiment: 0, geopoliticalRisk: macro.geopoliticalRisk, riskOnOff: macro.riskOnOff,
            summary: "Pipeline nicht konfiguriert — Symbol-Nachrichten übersprungen.",
            headlines: [],
            source: "fallback",
          };
        } else {
          const headlines = await fetchSymbolHeadlines(fcKey, data.symbol, data.name);
          const cls = await classifyHeadlines(aiKey, headlines, `${data.symbol} ${data.name ?? ""}`.trim());
          symbolCtx = {
            asOf: new Date().toISOString(),
            ...cls,
            // Geopolitik & Risk-On/Off vom Symbol-Layer übernehmen wir nicht 1:1
            // — diese sind makro-getrieben. Nur newsSentiment ist hier idiosynkratisch.
            geopoliticalRisk: macro.geopoliticalRisk,
            riskOnOff: macro.riskOnOff,
            headlines,
            source: "live",
          };
          await writeCache(symKey, symbolCtx);
        }
      }
    }

    return { macro, symbol: symbolCtx };
  });
