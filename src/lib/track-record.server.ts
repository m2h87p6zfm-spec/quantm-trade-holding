// Server-only helpers für den APEX Track Record (Supabase admin, no RLS).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";

export type RecordPayload = {
  ticker: string;
  name: string;
  sector?: string | null;
  asset_type?: "Aktie" | "ETF";
  verdict: "KAUF" | "HALTEN" | "VERKAUFEN";
  confidence_score: number;
  price_at_analysis: number;
  indicators: Record<string, unknown>;
};

export async function insertAnalysisAndOutcome(p: RecordPayload) {
  const { data, error } = await supabaseAdmin
    .from("apex_analyses")
    .insert({
      ticker: p.ticker.toUpperCase(),
      name: p.name,
      sector: p.sector ?? null,
      asset_type: p.asset_type ?? "Aktie",
      verdict: p.verdict,
      confidence_score: p.confidence_score,
      price_at_analysis: p.price_at_analysis,
      indicators: p.indicators as never,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("apex_outcomes").insert({ analysis_id: data!.id });
  return data!.id as string;
}

/** Ruft den Schlusskurs zu einem bestimmten Datum ab (nächster Handelstag). */
export async function fetchClosePriceAt(symbol: string, isoDate: string): Promise<number | null> {
  // 2-Wochen-Range, damit Wochenend-/Feiertags-Verschiebungen abgefangen werden.
  const res = await fetchYahooChartCached(symbol, "1d", "1mo", 60 * 60 * 6);
  const r = res.value?.chart?.result?.[0];
  if (!r) return null;
  const ts: number[] = r.timestamp || [];
  const closes: number[] = r.indicators?.quote?.[0]?.close || [];
  const target = new Date(isoDate).getTime() / 1000;
  let bestIdx = -1;
  let bestDelta = Infinity;
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue;
    const d = Math.abs(ts[i] - target);
    if (d < bestDelta) { bestDelta = d; bestIdx = i; }
  }
  if (bestIdx < 0) return null;
  // Nur akzeptieren wenn innerhalb 10 Tagen
  if (bestDelta > 10 * 86400) return null;
  return Number(closes[bestIdx]);
}

function determineCorrect(verdict: string, ret: number): boolean {
  if (verdict === "KAUF") return ret > 0;
  if (verdict === "VERKAUFEN") return ret < 0;
  return Math.abs(ret) < 5; // HALTEN
}

/** Aktualisiert alle fälligen Outcomes. Wird vom Cron-Hook aufgerufen. */
export async function trackPendingOutcomes(): Promise<{ scanned: number; updated: number }> {
  const now = Date.now();
  // Auswertbar, sobald eine Analyse mindestens 7 Tage alt ist.
  const { data: analyses, error } = await supabaseAdmin
    .from("apex_analyses")
    .select("id, ticker, analyzed_at, verdict, price_at_analysis, apex_outcomes(price_after_7d, price_after_30d, price_after_60d, price_after_90d, return_7d, return_30d, return_60d, return_90d, is_correct)")
    .lte("analyzed_at", new Date(now - 7 * 86400_000).toISOString())
    .order("analyzed_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  let updated = 0;
  for (const a of analyses ?? []) {
    const out = Array.isArray(a.apex_outcomes) ? a.apex_outcomes[0] : a.apex_outcomes;
    const base = Number(a.price_at_analysis);
    if (!base) continue;
    const ageDays = (now - new Date(a.analyzed_at as string).getTime()) / 86400_000;
    const patch: Record<string, number | boolean | null> = {};

    const tryFetch = async (days: number, field: "7d" | "30d" | "60d" | "90d") => {
      if (ageDays < days) return;
      if (out && (out as Record<string, unknown>)[`price_after_${field}`] != null) return;
      const isoTarget = new Date(new Date(a.analyzed_at as string).getTime() + days * 86400_000).toISOString();
      const price = await fetchClosePriceAt(a.ticker as string, isoTarget);
      if (price == null) return;
      patch[`price_after_${field}`] = price;
      patch[`return_${field}`] = ((price - base) / base) * 100;
    };
    await tryFetch(7, "7d");
    await tryFetch(30, "30d");
    await tryFetch(60, "60d");
    await tryFetch(90, "90d");

    // is_correct: bevorzugt 30d, sonst vorläufig aus 7d.
    const ret30 = (patch.return_30d as number | undefined) ?? (out?.return_30d as number | null | undefined);
    const ret7 = (patch.return_7d as number | undefined) ?? (out?.return_7d as number | null | undefined);
    const refReturn = ret30 ?? ret7;
    const refUpdated = patch.return_30d != null || patch.return_7d != null;
    if (refReturn != null && (out?.is_correct == null || refUpdated)) {
      patch.is_correct = determineCorrect(a.verdict as string, Number(refReturn));
    }

    if (Object.keys(patch).length === 0) continue;
    const { error: upErr } = await supabaseAdmin
      .from("apex_outcomes")
      .update(patch as never)
      .eq("analysis_id", a.id as string);
    if (!upErr) updated++;
  }
  return { scanned: analyses?.length ?? 0, updated };
}
