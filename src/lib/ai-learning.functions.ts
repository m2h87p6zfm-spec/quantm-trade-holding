import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================
// Schemas
// ============================================================
const RecordSchema = z.object({
  symbol: z.string().min(1).max(20),
  scenarioTag: z.string().min(1).max(120),
  marketRegime: z.enum(["bull", "bear", "chop", "high_vol", "low_vol"]),
  verdict: z.enum(["LONG", "SHORT", "NEUTRAL"]),
  confidence: z.number().min(0).max(1),
  horizonDays: z.number().int().min(1).max(60),
  priceAtPrediction: z.number().positive(),
  reasoning: z.record(z.string(), z.unknown()).optional(),
  modelVersion: z.string().max(20).optional(),
});

const ContextSchema = z.object({
  symbol: z.string().min(1).max(20),
  scenarioTag: z.string().min(1).max(120),
  marketRegime: z.enum(["bull", "bear", "chop", "high_vol", "low_vol"]),
});

const MetricsSchema = z.object({
  window: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

// ============================================================
// recordPrediction
// ============================================================
export const recordPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RecordSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("ai_predictions")
      .insert({
        user_id: userId,
        symbol: data.symbol,
        scenario_tag: data.scenarioTag,
        market_regime: data.marketRegime,
        verdict: data.verdict,
        confidence: data.confidence,
        horizon_days: data.horizonDays,
        price_at_prediction: data.priceAtPrediction,
        reasoning: (data.reasoning ?? {}) as never,
        model_version: data.modelVersion ?? "v1",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ============================================================
// getLearningContext — frühere Predictions + Hit-Rate + neueste Learning Events
// ============================================================
export const getLearningContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ContextSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // 1. Eigene ähnliche Predictions (gleicher Scenario+Regime), join mit Outcomes
    const { data: preds } = await supabaseAdmin
      .from("ai_predictions")
      .select("id, created_at, symbol, verdict, confidence, ai_outcomes(correct, realized_return)")
      .eq("user_id", userId)
      .eq("scenario_tag", data.scenarioTag)
      .eq("market_regime", data.marketRegime)
      .order("created_at", { ascending: false })
      .limit(50);

    const similar = (preds ?? []).map((p) => {
      const outcome = Array.isArray(p.ai_outcomes) ? p.ai_outcomes[0] : p.ai_outcomes;
      return {
        id: p.id,
        createdAt: p.created_at,
        symbol: p.symbol,
        verdict: p.verdict as "LONG" | "SHORT" | "NEUTRAL",
        confidence: Number(p.confidence),
        correct: outcome?.correct ?? null,
        realizedReturn: outcome?.realized_return != null ? Number(outcome.realized_return) : null,
      };
    });

    const evaluated = similar.filter((s) => s.correct !== null);
    const hits = evaluated.filter((s) => s.correct === true).length;
    const hitRate = evaluated.length > 0 ? hits / evaluated.length : null;

    // 2. Letzte Learning-Events zu diesem Szenario, beschränkt auf eigene Predictions
    const ownPredIds = (preds ?? []).map((p) => p.id);
    const { data: events } = ownPredIds.length > 0
      ? await supabaseAdmin
          .from("ai_learning_events")
          .select("id, created_at, pattern_detected, before_belief, after_belief, weight_adjustment, sample_size, prior_accuracy, trigger_prediction_ids")
          .eq("scenario_tag", data.scenarioTag)
          .eq("market_regime", data.marketRegime)
          .overlaps("trigger_prediction_ids", ownPredIds)
          .order("created_at", { ascending: false })
          .limit(3)
      : { data: [] as any[] };

    return {
      similar: similar.slice(0, 5),
      sampleSize: evaluated.length,
      hitRate,
      learningEvents: (events ?? []).map((e) => ({
        id: e.id,
        createdAt: e.created_at,
        pattern: e.pattern_detected,
        before: e.before_belief,
        after: e.after_belief,
        weightAdjustment: (e.weight_adjustment ?? {}) as Record<string, number>,
        sampleSize: e.sample_size,
        priorAccuracy: e.prior_accuracy != null ? Number(e.prior_accuracy) : null,
      })),
    };
  });

// ============================================================
// getPerformanceMetrics — Accuracy, Calibration, Trend, Heatmap
// ============================================================
export const getPerformanceMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => MetricsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const since = new Date(Date.now() - data.window * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows } = await supabaseAdmin
      .from("ai_predictions")
      .select("id, created_at, symbol, scenario_tag, market_regime, verdict, confidence, ai_outcomes(correct, realized_return, evaluated_at)")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    const evaluated = (rows ?? [])
      .map((r) => {
        const o = Array.isArray(r.ai_outcomes) ? r.ai_outcomes[0] : r.ai_outcomes;
        return o
          ? {
              id: r.id,
              date: o.evaluated_at as string,
              regime: r.market_regime as string,
              scenario: r.scenario_tag as string,
              symbol: r.symbol as string,
              verdict: r.verdict as string,
              confidence: Number(r.confidence),
              correct: o.correct as boolean,
              realizedReturn: Number(o.realized_return),
            }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const total = evaluated.length;
    const correctCount = evaluated.filter((e) => e.correct).length;
    const accuracy = total > 0 ? correctCount / total : 0;

    // Trend: pro Tag rolling accuracy
    const byDay = new Map<string, { c: number; t: number }>();
    evaluated.forEach((e) => {
      const day = e.date.slice(0, 10);
      const bucket = byDay.get(day) ?? { c: 0, t: 0 };
      bucket.t += 1;
      if (e.correct) bucket.c += 1;
      byDay.set(day, bucket);
    });
    const trend = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => ({ date, accuracy: b.c / b.t, count: b.t }));

    // Calibration: bin confidence in 5 buckets
    const bins = [0.2, 0.4, 0.6, 0.8, 1.01];
    const labels = ["0–20%", "20–40%", "40–60%", "60–80%", "80–100%"];
    const calibration = labels.map((label, i) => {
      const lo = i === 0 ? 0 : bins[i - 1];
      const hi = bins[i];
      const bucket = evaluated.filter((e) => e.confidence >= lo && e.confidence < hi);
      const acc = bucket.length > 0 ? bucket.filter((e) => e.correct).length / bucket.length : null;
      const avgConf = bucket.length > 0 ? bucket.reduce((s, e) => s + e.confidence, 0) / bucket.length : (lo + hi) / 2;
      return { bucket: label, expected: avgConf, actual: acc, count: bucket.length };
    });

    // Regime breakdown
    const regimes = new Map<string, { c: number; t: number }>();
    evaluated.forEach((e) => {
      const b = regimes.get(e.regime) ?? { c: 0, t: 0 };
      b.t += 1;
      if (e.correct) b.c += 1;
      regimes.set(e.regime, b);
    });
    const byRegime = Array.from(regimes.entries()).map(([regime, b]) => ({
      regime,
      accuracy: b.c / b.t,
      count: b.t,
    }));

    // Best / Worst Bedingungen
    const sortedRegimes = [...byRegime].sort((a, b) => b.accuracy - a.accuracy);
    const best = sortedRegimes[0] ?? null;
    const worst = sortedRegimes[sortedRegimes.length - 1] ?? null;

    // Recent predictions (mit Outcome) für Tabelle
    const recent = [...evaluated]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20)
      .map((e) => ({
        symbol: e.symbol,
        verdict: e.verdict,
        confidence: e.confidence,
        correct: e.correct,
        realizedReturn: e.realizedReturn,
        scenario: e.scenario,
        regime: e.regime,
        date: e.date,
      }));

    // Improvement trend: erste vs. letzte Hälfte
    const half = Math.floor(trend.length / 2);
    const firstHalf = trend.slice(0, half);
    const secondHalf = trend.slice(half);
    const avg = (xs: { accuracy: number }[]) =>
      xs.length > 0 ? xs.reduce((s, x) => s + x.accuracy, 0) / xs.length : 0;
    const improvement = trend.length >= 4 ? avg(secondHalf) - avg(firstHalf) : 0;

    // Learning Events Timeline
    const { data: events } = await supabaseAdmin
      .from("ai_learning_events")
      .select("id, created_at, scenario_tag, market_regime, pattern_detected, before_belief, after_belief, sample_size, prior_accuracy")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      window: data.window,
      total,
      accuracy,
      trend,
      calibration,
      byRegime,
      best,
      worst,
      recent,
      improvement,
      learningEvents: (events ?? []).map((e) => ({
        id: e.id,
        createdAt: e.created_at,
        scenario: e.scenario_tag,
        regime: e.market_regime,
        pattern: e.pattern_detected,
        before: e.before_belief,
        after: e.after_belief,
        sampleSize: e.sample_size,
        priorAccuracy: e.prior_accuracy != null ? Number(e.prior_accuracy) : null,
      })),
    };
  });

// ============================================================
// recordInteraction — angesehen / gefolgt / ignoriert
// ============================================================
const InteractionSchema = z.object({
  predictionId: z.string().uuid(),
  action: z.enum(["viewed", "followed", "ignored", "dismissed"]),
});

export const recordInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InteractionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("ai_user_interactions").insert({
      user_id: userId,
      prediction_id: data.predictionId,
      action: data.action,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
