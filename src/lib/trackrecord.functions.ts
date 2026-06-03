import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RawOutcome = {
  price_after_7d?: number | null;
  price_after_30d?: number | null;
  price_after_60d?: number | null;
  price_after_90d?: number | null;
  return_7d?: number | null;
  return_30d?: number | null;
  return_60d?: number | null;
  return_90d?: number | null;
  is_correct?: boolean | null;
};

function buildOutcome(o: RawOutcome) {
  const num = (v: number | null | undefined) => (v != null ? Number(v) : null);
  const return_30d = num(o.return_30d);
  const return_7d = num(o.return_7d);
  const display_return = return_30d ?? return_7d;
  const display_horizon_days = return_30d != null ? 30 : return_7d != null ? 7 : null;
  return {
    price_after_7d: num(o.price_after_7d),
    price_after_30d: num(o.price_after_30d),
    price_after_60d: num(o.price_after_60d),
    price_after_90d: num(o.price_after_90d),
    return_7d,
    return_30d,
    return_60d: num(o.return_60d),
    return_90d: num(o.return_90d),
    is_correct: o.is_correct ?? null,
    display_return,
    display_horizon_days,
  };
}


const recordSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  sector: z.string().max(50).nullable().optional(),
  asset_type: z.enum(["Aktie", "ETF"]).optional(),
  verdict: z.enum(["KAUF", "HALTEN", "VERKAUFEN"]),
  confidence_score: z.number().min(0).max(100),
  price_at_analysis: z.number().positive(),
  indicators: z.record(z.string(), z.unknown()),
});

export const recordApexAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => recordSchema.parse(data))
  .handler(async ({ data }) => {
    const { insertAnalysisAndOutcome } = await import("@/lib/track-record.server");
    const id = await insertAnalysisAndOutcome(data);
    return { id };
  });

export type TrackRecordPayload = {
  analyses: Array<{
    id: string;
    ticker: string;
    name: string;
    sector: string | null;
    asset_type: string;
    analyzed_at: string;
    verdict: "KAUF" | "HALTEN" | "VERKAUFEN";
    confidence_score: number;
    price_at_analysis: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    indicators: any;
    outcome: {
      price_after_7d: number | null;
      price_after_30d: number | null;
      price_after_60d: number | null;
      price_after_90d: number | null;
      return_7d: number | null;
      return_30d: number | null;
      return_60d: number | null;
      return_90d: number | null;
      is_correct: boolean | null;
      /** Beste verfügbare Rendite (30d bevorzugt, sonst 7d). */
      display_return: number | null;
      /** Zugehöriger Horizont in Tagen (30 oder 7). */
      display_horizon_days: number | null;
    } | null;
  }>;
  benchmarks: Record<string, { return90d: number | null; return1y: number | null }>;
};

export const getTrackRecord = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { fetchYahooChartCached } = await import("@/lib/yahoo-cache.server");

  const selectColumns = "id, ticker, name, sector, asset_type, analyzed_at, verdict, confidence_score, price_at_analysis, indicators, apex_outcomes(price_after_7d, price_after_30d, price_after_60d, price_after_90d, return_7d, return_30d, return_60d, return_90d, is_correct)";
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 10000; from += pageSize) {
    const { data: page, error } = await supabaseAdmin
      .from("apex_analyses")
      .select(selectColumns)
      .order("analyzed_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(page ?? []));
    if (!page || page.length < pageSize) break;
  }

  // Dedup: pro Ticker pro Kalendertag nur die jüngste Analyse behalten.
  // Mehrfach-Analysen desselben Tages verzerren sonst die Erfolgsquote.
  const seen = new Set<string>();
  const dedupRows = rows.filter((r) => {
    const day = String(r.analyzed_at).slice(0, 10); // YYYY-MM-DD
    const key = `${r.ticker}|${day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const analyses = dedupRows.map((r) => {
    const o = Array.isArray(r.apex_outcomes) ? r.apex_outcomes[0] : r.apex_outcomes;
    const outcome: ReturnType<typeof buildOutcome> | null = o ? buildOutcome(o) : null;
    return {
      id: r.id as string,
      ticker: r.ticker as string,
      name: r.name as string,
      sector: (r.sector as string | null) ?? null,
      asset_type: (r.asset_type as string) ?? "Aktie",
      analyzed_at: r.analyzed_at as string,
      verdict: r.verdict as "KAUF" | "HALTEN" | "VERKAUFEN",
      confidence_score: Number(r.confidence_score),
      price_at_analysis: Number(r.price_at_analysis),
      indicators: (r.indicators as Record<string, unknown>) ?? {},
      outcome,
    };
  });

  async function benchmarkReturn(symbol: string, days: number): Promise<number | null> {
    const range = days <= 100 ? "3mo" : "1y";
    const res = await fetchYahooChartCached(symbol, "1d", range, 60 * 60 * 6);
    const r = res.value?.chart?.result?.[0];
    if (!r) return null;
    const closes: number[] = (r.indicators?.quote?.[0]?.close || []).filter((x: number) => Number.isFinite(x));
    if (closes.length < 2) return null;
    const first = closes[0];
    const last = closes[closes.length - 1];
    return ((last - first) / first) * 100;
  }

  const benchSyms = { "S&P 500": "SPY", "MSCI World": "URTH", DAX: "^GDAXI" } as const;
  const benchmarks: TrackRecordPayload["benchmarks"] = {};
  await Promise.all(
    Object.entries(benchSyms).map(async ([label, sym]) => {
      const [r90, r1y] = await Promise.all([
        benchmarkReturn(sym, 90).catch(() => null),
        benchmarkReturn(sym, 365).catch(() => null),
      ]);
      benchmarks[label] = { return90d: r90, return1y: r1y };
    }),
  );

  return { analyses, benchmarks } as unknown as TrackRecordPayload;
});
