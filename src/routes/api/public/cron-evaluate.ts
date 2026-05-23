import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/api-auth.server";

// ============================================================
// Täglicher Cron: alle Predictions, deren Horizont abgelaufen ist
// und die noch kein Outcome haben, gegen den aktuellen Kurs prüfen.
// Danach: Pattern-Detection pro (scenario_tag, regime) anstoßen.
// ============================================================

const YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart";

async function fetchSpotPrice(symbol: string): Promise<number | null> {
  try {
    const url = `${YAHOO}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 ApexCron/1.0" },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const result = (json as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } }).chart?.result?.[0];
    const px = result?.meta?.regularMarketPrice;
    return typeof px === "number" && isFinite(px) ? px : null;
  } catch {
    return null;
  }
}

function isCorrect(verdict: string, retPct: number): boolean {
  if (verdict === "LONG") return retPct > 0.005;
  if (verdict === "SHORT") return retPct < -0.005;
  // NEUTRAL gilt als korrekt, wenn |Bewegung| < 1.5%
  return Math.abs(retPct) < 0.015;
}

async function detectPatterns(scenarioTag: string, regime: string) {
  // Letzte 20 Outcomes für dieses Cluster
  const { data: rows } = await supabaseAdmin
    .from("ai_predictions")
    .select("id, verdict, confidence, ai_outcomes(correct, realized_return)")
    .eq("scenario_tag", scenarioTag)
    .eq("market_regime", regime)
    .order("created_at", { ascending: false })
    .limit(20);

  const evaluated = (rows ?? [])
    .map((r) => {
      const o = Array.isArray(r.ai_outcomes) ? r.ai_outcomes[0] : r.ai_outcomes;
      return o ? { id: r.id, verdict: r.verdict, confidence: Number(r.confidence), correct: o.correct as boolean, ret: Number(o.realized_return) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (evaluated.length < 5) return;

  const correct = evaluated.filter((e) => e.correct).length;
  const acc = correct / evaluated.length;

  // Nur Lern-Event erzeugen, wenn Accuracy deutlich abweicht (< 40% oder > 75%)
  if (acc >= 0.4 && acc <= 0.75) return;

  // Hatten wir schon ein Event in den letzten 7 Tagen für diesen Cluster?
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("ai_learning_events")
    .select("id")
    .eq("scenario_tag", scenarioTag)
    .eq("market_regime", regime)
    .gte("created_at", sevenDaysAgo)
    .limit(1);
  if (recent && recent.length > 0) return;

  const longBias = evaluated.filter((e) => e.verdict === "LONG").length / evaluated.length;
  const avgRet = evaluated.reduce((s, e) => s + e.ret, 0) / evaluated.length;
  const failedSide = acc < 0.4
    ? (longBias > 0.5 ? "LONG" : "SHORT")
    : (longBias > 0.5 ? "LONG" : "SHORT");

  const pattern = acc < 0.4
    ? `Im Cluster "${scenarioTag}" lagen die letzten ${evaluated.length} Prognosen nur in ${Math.round(acc * 100)}% der Fälle richtig. Bias war ${failedSide} (Ø Rendite ${(avgRet * 100).toFixed(2)}%).`
    : `Im Cluster "${scenarioTag}" lagen die letzten ${evaluated.length} Prognosen in ${Math.round(acc * 100)}% der Fälle richtig — Setup funktioniert verlässlich. Confidence wird angehoben.`;

  const before = acc < 0.4
    ? `Hohe Confidence in ${failedSide}-Setups bei ${scenarioTag}.`
    : `Moderate Confidence in ${scenarioTag}-Setups.`;
  const after = acc < 0.4
    ? `Confidence in ${failedSide}-Setups bei ${scenarioTag} um 25% reduzieren; auf Bestätigung durch Volumen warten.`
    : `Confidence in ${scenarioTag}-Setups um 15% anheben — Cluster validiert.`;

  const weight: Record<string, number> = {};
  weight[`${scenarioTag}__${failedSide}`] = acc < 0.4 ? -0.25 : 0.15;

  await supabaseAdmin.from("ai_learning_events").insert({
    scenario_tag: scenarioTag,
    market_regime: regime,
    pattern_detected: pattern,
    weight_adjustment: weight,
    before_belief: before,
    after_belief: after,
    trigger_prediction_ids: evaluated.map((e) => e.id),
    sample_size: evaluated.length,
    prior_accuracy: acc,
  });
}

async function runEvaluation(): Promise<Response> {
  const now = new Date();

  const { data: pending } = await supabaseAdmin
    .from("ai_predictions")
    .select("id, symbol, verdict, horizon_days, price_at_prediction, created_at, scenario_tag, market_regime")
    .order("created_at", { ascending: true })
    .limit(500);

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ evaluated: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const candidateIds = pending
    .filter((p) => new Date(new Date(p.created_at).getTime() + p.horizon_days * 86400000) <= now)
    .map((p) => p.id);

  if (candidateIds.length === 0) {
    return new Response(JSON.stringify({ evaluated: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const { data: existing } = await supabaseAdmin
    .from("ai_outcomes")
    .select("prediction_id")
    .in("prediction_id", candidateIds);
  const done = new Set((existing ?? []).map((x) => x.prediction_id));

  const todo = pending.filter((p) => candidateIds.includes(p.id) && !done.has(p.id)).slice(0, 100);

  const symbols = Array.from(new Set(todo.map((p) => p.symbol)));
  const priceMap = new Map<string, number | null>();
  for (const s of symbols) priceMap.set(s, await fetchSpotPrice(s));

  const clustersTouched = new Set<string>();
  let evaluated = 0;

  for (const p of todo) {
    const spot = priceMap.get(p.symbol);
    if (spot == null) continue;
    const entry = Number(p.price_at_prediction);
    if (!isFinite(entry) || entry <= 0) continue;
    const ret = (spot - entry) / entry;
    const correct = isCorrect(p.verdict, ret);
    const { error } = await supabaseAdmin.from("ai_outcomes").insert({
      prediction_id: p.id,
      price_at_eval: spot,
      realized_return: ret,
      correct,
      error_magnitude: Math.abs(ret),
    });
    if (!error) {
      evaluated += 1;
      clustersTouched.add(`${p.scenario_tag}::${p.market_regime}`);
    }
  }

  for (const key of clustersTouched) {
    const [tag, regime] = key.split("::");
    await detectPatterns(tag, regime);
  }

  return new Response(
    JSON.stringify({ evaluated, clusters_analyzed: clustersTouched.size }),
    { headers: { "Content-Type": "application/json" } },
  );
}

export const Route = createFileRoute("/api/public/cron-evaluate")({
  server: {
    handlers: {
      POST: () => runEvaluation(),
      GET: () => runEvaluation(),
    },
  },
});
