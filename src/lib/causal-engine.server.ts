// QUANTM Causal Engine — Server-only Kernlogik.
// Wird NICHT direkt aus Client-Code importiert (server-only suffix).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================
// Konstanten
// ============================================================
export const EVENT_TYPES = [
  "government_contract",
  "earnings_beat",
  "earnings_miss",
  "insider_buy",
  "insider_sell",
  "government_investment",
  "partnership_announcement",
  "product_launch",
  "regulatory_approval",
  "regulatory_rejection",
  "analyst_upgrade",
  "analyst_downgrade",
  "macro_interest_rate_change",
  "macro_geopolitical",
  "sentiment_spike_positive",
  "sentiment_spike_negative",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const HORIZONS = [3, 7, 14, 30, 90] as const;

// ============================================================
// Klassifikation: Snippet → EventType
// Keyword-basiert, nur eindeutige Treffer (sonst null → skip).
// ============================================================
const CLASSIFIERS: { type: EventType; any: RegExp[]; not?: RegExp[] }[] = [
  { type: "government_contract", any: [/\bgovernment\s+contract\b/i, /\bdepartment of (defense|energy)\b/i, /\bpentagon\s+(award|contract)\b/i, /\b(d?a)rpa\s+contract\b/i, /\bnasa\s+contract\b/i] },
  { type: "government_investment", any: [/\bgovernment\s+(investment|stake|equity)\b/i, /\bfederal\s+(subsidy|grant|funding)\b/i, /\bchips\s+act\s+(award|funding)\b/i] },
  { type: "earnings_beat", any: [/\b(beats?|tops?|exceeds?|surpass(es)?)\s+(earnings|estimates|expectations|revenue|eps)\b/i, /\bearnings\s+beat\b/i] },
  { type: "earnings_miss", any: [/\b(misses?|missed)\s+(earnings|estimates|expectations|revenue|eps)\b/i, /\bearnings\s+miss\b/i, /\bfalls?\s+short\s+of\s+(earnings|estimates)\b/i] },
  { type: "insider_buy", any: [/\binsider\s+buy(ing)?\b/i, /\b(ceo|cfo|director|executive)\s+buys?\b/i, /\bform\s+4\s+.*\bpurchase\b/i] },
  { type: "insider_sell", any: [/\binsider\s+sell(ing)?\b/i, /\b(ceo|cfo|director|executive)\s+sells?\b/i, /\bform\s+4\s+.*\b(sale|dispos)/i] },
  { type: "partnership_announcement", any: [/\b(partner(ship)?|strategic\s+alliance|joint\s+venture|collaborat(es?|ion))\s+(with|announce)/i, /\bannounces?\s+partnership\b/i] },
  { type: "product_launch", any: [/\b(launches?|unveils?|introduces?|releases?)\s+(new\s+)?(product|platform|chip|service)\b/i, /\bproduct\s+launch\b/i] },
  { type: "regulatory_approval", any: [/\b(fda|ema|sec|ftc)\s+approv(es|al)\b/i, /\bregulatory\s+approval\b/i, /\bcleared\s+by\s+(fda|regulators?)\b/i] },
  { type: "regulatory_rejection", any: [/\b(fda|ema|sec|ftc)\s+reject(s|ion)\b/i, /\bregulatory\s+(setback|rejection|denial)\b/i] },
  { type: "analyst_upgrade", any: [/\banalyst\s+upgrade\b/i, /\bupgraded?\s+to\s+(buy|outperform|overweight)\b/i, /\bprice\s+target\s+(raised|increased)\b/i] },
  { type: "analyst_downgrade", any: [/\banalyst\s+downgrade\b/i, /\bdowngraded?\s+to\s+(sell|underperform|underweight)\b/i, /\bprice\s+target\s+(cut|lowered|reduced)\b/i] },
  { type: "macro_interest_rate_change", any: [/\b(fed|federal reserve|ecb)\s+(raises|cuts|hikes|lowers)\s+(rates?|interest)\b/i, /\binterest\s+rate\s+(hike|cut|change)\b/i] },
  { type: "macro_geopolitical", any: [/\b(war|sanctions?|invasion|conflict|tariff|trade\s+war)\b/i, /\bgeopolitical\s+(tension|risk|crisis)\b/i] },
  { type: "sentiment_spike_positive", any: [/\b(surge|soars?|rallies|skyrockets?|jumps?)\b/i, /\b(bullish|optimistic)\s+sentiment\b/i] },
  { type: "sentiment_spike_negative", any: [/\b(plunge|tumbles?|crashes?|sinks?|slumps?)\b/i, /\b(bearish|pessimistic)\s+sentiment\b/i] },
];

export function classifyEvent(text: string): EventType | null {
  if (!text) return null;
  const matches = new Set<EventType>();
  for (const c of CLASSIFIERS) {
    for (const re of c.any) {
      if (re.test(text)) { matches.add(c.type); break; }
    }
  }
  if (matches.size === 0) return null;
  // Eindeutigkeit: bei Konflikt zwischen positiv/negativ-Paar → skip
  const conflicts: [EventType, EventType][] = [
    ["earnings_beat", "earnings_miss"],
    ["insider_buy", "insider_sell"],
    ["regulatory_approval", "regulatory_rejection"],
    ["analyst_upgrade", "analyst_downgrade"],
    ["sentiment_spike_positive", "sentiment_spike_negative"],
  ];
  for (const [a, b] of conflicts) {
    if (matches.has(a) && matches.has(b)) { matches.delete(a); matches.delete(b); }
  }
  if (matches.size === 0) return null;
  // Spezifischere Kategorien priorisieren vor generischem Sentiment
  const priority: EventType[] = [
    "government_contract", "government_investment", "earnings_beat", "earnings_miss",
    "regulatory_approval", "regulatory_rejection", "analyst_upgrade", "analyst_downgrade",
    "insider_buy", "insider_sell", "partnership_announcement", "product_launch",
    "macro_interest_rate_change", "macro_geopolitical",
    "sentiment_spike_positive", "sentiment_spike_negative",
  ];
  for (const t of priority) if (matches.has(t)) return t;
  return null;
}

// ============================================================
// Twelve Data: historischer Schlusskurs an einem konkreten Datum
// (oder nächstgelegener vorheriger Handelstag).
// ============================================================
async function fetchClosePriceOnOrBefore(symbol: string, isoDate: string): Promise<number | null> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) return null;
  const end = new Date(isoDate);
  if (Number.isNaN(end.getTime())) return null;
  // Suche 10 Tage Fenster davor, damit Wochenenden/Feiertage abgedeckt sind
  const start = new Date(end.getTime() - 10 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("start_date", fmt(start));
  url.searchParams.set("end_date", fmt(end));
  url.searchParams.set("order", "DESC");
  url.searchParams.set("apikey", apiKey);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) return null;
    const j: unknown = await res.json();
    const obj = j as { status?: string; values?: Array<{ datetime?: string; close?: string }> };
    if (obj?.status === "error" || !Array.isArray(obj?.values) || obj.values.length === 0) return null;
    const first = obj.values[0];
    const close = Number(first?.close);
    return Number.isFinite(close) ? close : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ============================================================
// Hilfsfunktionen
// ============================================================
function tradingDaysFromNow(eventDateIso: string, tradingDays: number): Date {
  // Approx: 1 Handelstag ≈ 1.4 Kalendertage über mehrere Wochen
  const base = new Date(eventDateIso);
  const calendarDays = Math.round(tradingDays * 1.4);
  return new Date(base.getTime() + calendarDays * 24 * 3600 * 1000);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// 1) Events einsammeln (Firecrawl-Search + Klassifikation)
// ============================================================
type FcResult = { title?: string; url?: string; description?: string; date?: string };

async function firecrawlSearch(query: string, limit = 5): Promise<FcResult[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, tbs: "qdr:m" }),
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { web?: FcResult[] } | FcResult[] };
    const arr = Array.isArray(json.data) ? json.data : json.data?.web ?? [];
    return arr;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export async function recordEventsForTicker(ticker: string, companyName: string): Promise<number> {
  const tk = ticker.toUpperCase();
  const year = new Date().getFullYear();
  const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${year}`;
  const queries = [
    `${tk} government contract ${year}`,
    `${tk} earnings ${quarter}`,
    `${tk} insider buying OR insider selling ${year}`,
    `${tk} partnership announcement ${year}`,
    `${tk} analyst upgrade OR analyst downgrade ${year}`,
    `${companyName} government investment OR subsidy ${year}`,
  ];

  const buckets = await Promise.all(queries.map((q) => firecrawlSearch(q, 5)));
  const seen = new Set<string>();
  let inserted = 0;

  for (const bucket of buckets) {
    for (const r of bucket) {
      const url = r.url ?? "";
      const title = r.title ?? "";
      const desc = r.description ?? "";
      const key = (url || title).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (/(reddit\.com|twitter\.com|x\.com|tiktok\.com|facebook\.com|instagram\.com)/i.test(url)) continue;

      const text = `${title}. ${desc}`;
      const type = classifyEvent(text);
      if (!type) continue;

      // Datum bestmöglich ableiten
      let eventDate = r.date ? r.date.slice(0, 10) : todayIso();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) eventDate = todayIso();

      // Dedup: gleicher ticker + type ±3 Tage
      const since = new Date(new Date(eventDate).getTime() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const until = new Date(new Date(eventDate).getTime() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { data: existing } = await supabaseAdmin
        .from("causal_events")
        .select("id")
        .eq("ticker", tk)
        .eq("event_type", type)
        .gte("event_date", since)
        .lte("event_date", until)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const description = (title || desc).slice(0, 500);
      const { data: ins, error } = await supabaseAdmin
        .from("causal_events")
        .insert({
          ticker: tk,
          event_date: eventDate,
          event_type: type,
          event_description: description || `${type} event`,
          source_url: url || null,
        })
        .select("id, event_date")
        .single();
      if (error || !ins) continue;
      inserted++;

      // Preis am Event-Datum
      const px = await fetchClosePriceOnOrBefore(tk, ins.event_date as string);
      if (px != null) {
        await supabaseAdmin.from("causal_outcomes").insert({
          event_id: ins.id,
          ticker: tk,
          price_at_event: px,
        });
      }
    }
  }
  return inserted;
}

// ============================================================
// 2) Outcomes backfillen (Cron-Job, täglich)
// ============================================================
export async function backfillOutcomes(): Promise<{ processed: number; tickers: string[] }> {
  // Mindestens 3 Handelstage in der Vergangenheit (≈ 5 Kalendertage Puffer)
  const cutoff = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { data: rows, error } = await supabaseAdmin
    .from("causal_outcomes")
    .select("id, event_id, ticker, price_at_event, causal_events!inner(event_date)")
    .is("price_after_3d", null)
    .lte("causal_events.event_date", cutoff)
    .limit(200);
  if (error || !rows) return { processed: 0, tickers: [] };

  const touched = new Set<string>();
  let processed = 0;
  for (const row of rows) {
    const r = row as unknown as {
      id: string; ticker: string; price_at_event: number;
      causal_events: { event_date: string };
    };
    const eventDate = r.causal_events.event_date;
    const today = new Date();
    const updates: Record<string, number | null> = {};
    for (const h of HORIZONS) {
      const target = tradingDaysFromNow(eventDate, h);
      if (target.getTime() > today.getTime()) {
        // Noch in der Zukunft → null lassen
        continue;
      }
      const targetIso = target.toISOString().slice(0, 10);
      const px = await fetchClosePriceOnOrBefore(r.ticker, targetIso);
      if (px == null || !r.price_at_event) continue;
      const ret = ((px - Number(r.price_at_event)) / Number(r.price_at_event)) * 100;
      updates[`price_after_${h}d`] = Number(px.toFixed(4));
      updates[`return_${h}d`] = Number(ret.toFixed(4));
    }
    if (Object.keys(updates).length === 0) continue;
    updates["updated_at"] = Date.now() as unknown as number; // placeholder; will overwrite below
    delete updates["updated_at"];
    await supabaseAdmin
      .from("causal_outcomes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", r.id);
    processed++;
    touched.add(r.ticker);
  }

  // Patterns für alle berührten Ticker neu berechnen
  for (const tk of touched) {
    await recalcPatternsFor(tk);
  }
  return { processed, tickers: Array.from(touched) };
}

// ============================================================
// 3) Patterns neu berechnen
// ============================================================
export async function recalcPatternsFor(ticker: string): Promise<number> {
  const tk = ticker.toUpperCase();
  const { data: rows, error } = await supabaseAdmin
    .from("causal_outcomes")
    .select("return_3d, return_7d, return_14d, return_30d, return_90d, causal_events!inner(event_type, ticker)")
    .eq("ticker", tk)
    .not("return_30d", "is", null);
  if (error || !rows) return 0;

  type Row = {
    return_3d: number | null; return_7d: number | null; return_14d: number | null;
    return_30d: number | null; return_90d: number | null;
    causal_events: { event_type: EventType };
  };
  const groups = new Map<EventType, Row[]>();
  for (const r of rows as unknown as Row[]) {
    const et = r.causal_events?.event_type;
    if (!et) continue;
    const arr = groups.get(et) ?? [];
    arr.push(r);
    groups.set(et, arr);
  }

  let upserted = 0;
  for (const [et, list] of groups) {
    const total = list.length;
    const positives: Record<number, number> = {};
    const avg: Record<number, number> = {};
    for (const h of HORIZONS) {
      const vals = list.map((x) => x[`return_${h}d` as keyof Row] as number | null).filter((v): v is number => v != null);
      positives[h] = vals.filter((v) => v > 0).length;
      avg[h] = vals.length ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(4)) : 0;
    }
    const basis = total > 0 ? (positives[30] / total) * 100 : 0;
    const weight = Math.min(total / 10, 1);
    const repeatability = total < 3 ? 0 : Number((basis * weight).toFixed(2));

    const { error: upErr } = await supabaseAdmin
      .from("causal_patterns")
      .upsert({
        ticker: tk,
        event_type: et,
        total_occurrences: total,
        positive_outcomes_3d: positives[3],
        positive_outcomes_7d: positives[7],
        positive_outcomes_14d: positives[14],
        positive_outcomes_30d: positives[30],
        positive_outcomes_90d: positives[90],
        avg_return_3d: avg[3],
        avg_return_7d: avg[7],
        avg_return_14d: avg[14],
        avg_return_30d: avg[30],
        avg_return_90d: avg[90],
        repeatability_score: repeatability,
        last_calculated_at: new Date().toISOString(),
      }, { onConflict: "ticker,event_type" });
    if (!upErr) upserted++;
  }
  return upserted;
}

// ============================================================
// 4) Score berechnen & Verdict speichern
// ============================================================
export type CausalAnalysisPayload = {
  ticker: string;
  analyzedAt: string;
  causalScore: number;
  repeatabilityScore: number;
  verdict: "STARK_KAUSAL" | "MODERAT_KAUSAL" | "SCHWACH_KAUSAL" | "KEINE_DATEN";
  summary: string;
  events: Array<{
    id: string;
    event_date: string;
    event_type: EventType;
    event_description: string;
    source_url: string | null;
    pattern?: {
      avg_return_30d: number;
      positive_outcomes_30d: number;
      total_occurrences: number;
    } | null;
  }>;
  patterns: Array<{
    event_type: EventType;
    total_occurrences: number;
    avg_return_30d: number;
    positive_outcomes_30d: number;
    repeatability_score: number;
  }>;
};

const VERDICT_LABEL_DE: Record<EventType, string> = {
  government_contract: "Regierungsauftrag",
  earnings_beat: "Gewinn übertrifft Erwartungen",
  earnings_miss: "Gewinn enttäuscht",
  insider_buy: "Insider kaufen",
  insider_sell: "Insider verkaufen",
  government_investment: "Staatliche Investition",
  partnership_announcement: "Partnerschaft",
  product_launch: "Produkteinführung",
  regulatory_approval: "Behördliche Zulassung",
  regulatory_rejection: "Behördliche Ablehnung",
  analyst_upgrade: "Analysten-Upgrade",
  analyst_downgrade: "Analysten-Downgrade",
  macro_interest_rate_change: "Zinsänderung",
  macro_geopolitical: "Geopolitik",
  sentiment_spike_positive: "Positiver Sentiment-Schub",
  sentiment_spike_negative: "Negativer Sentiment-Einbruch",
};

export function eventTypeLabel(t: EventType): string {
  return VERDICT_LABEL_DE[t] ?? t;
}

export async function computeCausalScore(ticker: string): Promise<CausalAnalysisPayload> {
  const tk = ticker.toUpperCase();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { data: events } = await supabaseAdmin
    .from("causal_events")
    .select("id, event_date, event_type, event_description, source_url")
    .eq("ticker", tk)
    .gte("event_date", since)
    .order("event_date", { ascending: false });

  const { data: patterns } = await supabaseAdmin
    .from("causal_patterns")
    .select("event_type, total_occurrences, avg_return_3d, avg_return_7d, avg_return_14d, avg_return_30d, avg_return_90d, positive_outcomes_30d, repeatability_score")
    .eq("ticker", tk);

  const patternMap = new Map<EventType, NonNullable<typeof patterns>[number]>();
  for (const p of patterns ?? []) patternMap.set(p.event_type as EventType, p);

  // Score-Berechnung
  let positivePoints = 0;
  let negativePoints = 0;
  let avgRepeat = 0;
  let repeatCount = 0;

  for (const ev of events ?? []) {
    const p = patternMap.get(ev.event_type as EventType);
    if (!p) continue;
    const pts = Number(p.repeatability_score) * (Number(p.avg_return_30d) / 100);
    if (pts > 0) positivePoints += pts;
    else if (pts < 0) negativePoints += pts;
    avgRepeat += Number(p.repeatability_score);
    repeatCount++;
  }

  let causalScore = 50 + positivePoints * 10 - Math.abs(negativePoints) * 10;
  causalScore = Math.max(0, Math.min(100, causalScore));
  const repeatabilityScore = repeatCount > 0 ? avgRepeat / repeatCount : 0;

  let verdict: CausalAnalysisPayload["verdict"];
  const hasData = (events?.length ?? 0) > 0 && repeatCount > 0;
  if (!hasData) verdict = "KEINE_DATEN";
  else if (causalScore >= 70) verdict = "STARK_KAUSAL";
  else if (causalScore >= 50) verdict = "MODERAT_KAUSAL";
  else verdict = "SCHWACH_KAUSAL";

  const summary = hasData
    ? `Basierend auf ${events!.length} aktuellen Ereignis(sen) und ${repeatCount} historischen Mustern für ${tk}: ${verdict.replace("_", " ")} (Score ${causalScore.toFixed(0)}/100).`
    : `Noch nicht genug historische Daten für ${tk}, um ein kausales Urteil zu bilden.`;

  const enrichedEvents = (events ?? []).map((ev) => {
    const p = patternMap.get(ev.event_type as EventType);
    return {
      id: ev.id as string,
      event_date: ev.event_date as string,
      event_type: ev.event_type as EventType,
      event_description: ev.event_description as string,
      source_url: (ev.source_url as string | null) ?? null,
      pattern: p
        ? {
            avg_return_30d: Number(p.avg_return_30d),
            positive_outcomes_30d: Number(p.positive_outcomes_30d),
            total_occurrences: Number(p.total_occurrences),
          }
        : null,
    };
  });

  const patternsArr = (patterns ?? []).map((p) => ({
    event_type: p.event_type as EventType,
    total_occurrences: Number(p.total_occurrences),
    avg_return_30d: Number(p.avg_return_30d),
    positive_outcomes_30d: Number(p.positive_outcomes_30d),
    repeatability_score: Number(p.repeatability_score),
  }));

  const analyzedAt = new Date().toISOString();
  await supabaseAdmin.from("causal_analysis_results").insert({
    ticker: tk,
    analyzed_at: analyzedAt,
    current_events_detected: enrichedEvents,
    patterns_applied: patternsArr,
    causal_score: Number(causalScore.toFixed(2)),
    repeatability_score: Number(repeatabilityScore.toFixed(2)),
    causal_verdict: verdict,
    summary_text: summary,
  });

  return {
    ticker: tk,
    analyzedAt,
    causalScore: Number(causalScore.toFixed(2)),
    repeatabilityScore: Number(repeatabilityScore.toFixed(2)),
    verdict,
    summary,
    events: enrichedEvents,
    patterns: patternsArr,
  };
}
