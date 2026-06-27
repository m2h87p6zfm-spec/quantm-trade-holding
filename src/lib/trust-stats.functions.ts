import { createServerFn } from "@tanstack/react-start";

export type TrustStats = {
  totalPicks: number;
  evaluatedPicks: number;
  hitRate: number | null;
  trackedDays: number;
  uniqueTickers: number;
  asOf: string;
};

/**
 * Public, low-cost aggregate stats for the marketing landing.
 * Uses service-role admin client because the table is otherwise locked,
 * but only returns aggregate counts — no per-row PII or proprietary detail.
 */
export const getTrustStats = createServerFn({ method: "GET" }).handler(async (): Promise<TrustStats> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count: totalPicks } = await supabaseAdmin
    .from("apex_analyses")
    .select("id", { count: "exact", head: true });

  const { data: outcomesRaw } = await supabaseAdmin
    .from("apex_outcomes")
    .select("is_correct, return_30d");
  const outcomes = (outcomesRaw ?? []) as Array<{ is_correct: boolean | null; return_30d: number | null }>;
  const evaluated = outcomes.filter((o) => o.is_correct != null);
  const wins = evaluated.filter((o) => o.is_correct === true).length;
  const hitRate = evaluated.length > 0 ? (wins / evaluated.length) * 100 : null;

  const { data: firstRow } = await supabaseAdmin
    .from("apex_analyses")
    .select("analyzed_at")
    .order("analyzed_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const trackedDays = firstRow
    ? Math.max(1, Math.floor((Date.now() - new Date(firstRow.analyzed_at as string).getTime()) / 86_400_000))
    : 0;

  const { data: tickerRows } = await supabaseAdmin
    .from("apex_analyses")
    .select("ticker")
    .limit(10_000);
  const uniqueTickers = new Set((tickerRows ?? []).map((r) => (r as { ticker: string }).ticker)).size;

  return {
    totalPicks: totalPicks ?? 0,
    evaluatedPicks: evaluated.length,
    hitRate,
    trackedDays,
    uniqueTickers,
    asOf: new Date().toISOString(),
  };
});
