import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/api-auth.server";
import { getCandlesCached } from "@/lib/twelvedata.server";
import { PRODUCTS, type Product } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, buildDecision } from "@/lib/analysis";
import { detectRegime } from "@/lib/ai-learning";

// ============================================================
// Stündlicher Cron: Quantm Picks im Hintergrund berechnen.
// Iteriert über das gewählte Universum (Top 80 / Erweitert 250),
// holt 1-Tages-Kerzen via Twelve Data (Shared-Cache!), berechnet
// die Composite-Engine-Faktoren und persistiert die Top-15 BUY-
// Kandidaten in `picks_cache`. Die Frontend-Seite liest dieses
// Ergebnis ohne eigenen Scan und zeigt nur den simulierten
// Ladebalken.
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-cron-secret",
} as const;
const JSON_HEADERS = { "Content-Type": "application/json", ...CORS } as const;

type Scope = { universe: "top" | "extended" | "all"; sector: string; region: string };

function scopeKey(s: Scope) {
  return `${s.universe}|${s.sector}|${s.region}`;
}

function filterUniverse(s: Scope): Product[] {
  let list = PRODUCTS;
  if (s.sector !== "Alle") list = list.filter((p) => p.sector === s.sector);
  if (s.region !== "Alle") list = list.filter((p) => p.region === s.region);
  // Universum = Bucket, nicht nur Pool. So liefert jeder Tab andere Namen.
  if (s.universe === "top") list = list.slice(0, 80);              // Large Caps
  else if (s.universe === "extended") list = list.slice(80, 250);  // Mid Caps
  else list = list.slice(250);                                      // Small/Micro Caps
  return list;

}

async function scanOne(p: Product) {
  try {
    const r = await getCandlesCached(p.symbol, "1d", "1y", 3600);
    const c = r.value;
    if (!c || c.c.length < 60) return null;
    const ind = computeAll(c.c);
    const sig = scoreIndicators(ind, "ausgewogen");
    const regime = detectRegime(ind);
    const report = buildDecision(p.symbol, p.name, ind, sig, regime, {
      historicalCloses: c.c,
    });
    if (report.decision !== "BUY") return null;
    const last = c.c.at(-1) ?? 0;
    const prev = c.c.at(-2) ?? last;
    const change = prev ? ((last - prev) / prev) * 100 : 0;
    const upsidePct =
      sig.target && sig.entry ? ((sig.target - sig.entry) / sig.entry) * 100 : 0;
    const regimeBonus =
      regime === "bull" ? 5 : regime === "low_vol" ? 2 : regime === "bear" ? -8 : 0;
    const score = report.confidence + upsidePct * 0.4 + regimeBonus;
    return {
      symbol: p.symbol,
      name: p.name,
      sector: p.sector,
      region: p.region,
      confidence: report.confidence,
      compositeScore: report.compositeScore ?? null,
      decision: report.decision,
      last,
      change,
      upsidePct,
      regime,
      score,
      rsi: ind.rsi,
      macdHist: ind.macd.histogram,
      zScore: ind.zScore,
      volatility: ind.volatility,
      momentum: ind.momentum,
      sma50: ind.sma50,
      sma200: ind.sma200,
      entry: sig.entry ?? null,
      target: sig.target ?? null,
      stop: sig.stop ?? null,
    };

  } catch {
    return null;
  }
}

async function runScan(scope: Scope, concurrency = 6) {
  const universe = filterUniverse(scope);
  const total = universe.length;
  const results: Array<NonNullable<Awaited<ReturnType<typeof scanOne>>>> = [];
  let succeeded = 0;
  let failed = 0;
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (idx < total) {
      const i = idx++;
      const r = await scanOne(universe[i]);
      if (r) {
        results.push(r);
        succeeded++;
      } else {
        failed++;
      }
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, 15);
  await supabaseAdmin
    .from("picks_cache")
    .upsert(
      {
        scope_key: scopeKey(scope),
        universe: scope.universe,
        sector: scope.sector,
        region: scope.region,
        picks: top,
        total_scanned: total,
        succeeded,
        failed,
        scanned_at: new Date().toISOString(),
      },
      { onConflict: "scope_key" },
    );
  return { total, succeeded, failed, picks: top.length };
}

export const Route = createFileRoute("/api/public/hooks/picks-scan")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const authErr = requireCronSecret(request);
        if (authErr) return authErr;

        // Default: scannt die drei populärsten Standard-Scopes.
        let scopes: Scope[] = [
          { universe: "top", sector: "Alle", region: "Alle" },
          { universe: "extended", sector: "Alle", region: "Alle" },
        ];
        try {
          const body = (await request.json()) as { scopes?: Scope[] } | null;
          if (body?.scopes && Array.isArray(body.scopes) && body.scopes.length > 0) {
            scopes = body.scopes;
          }
        } catch { /* leerer body → defaults */ }

        const out: Array<{ scope: string; result: Awaited<ReturnType<typeof runScan>> }> = [];
        for (const s of scopes) {
          try {
            const result = await runScan(s);
            out.push({ scope: scopeKey(s), result });
          } catch (e) {
            console.error("picks-scan failed for scope", scopeKey(s), e);
            out.push({
              scope: scopeKey(s),
              result: { total: 0, succeeded: 0, failed: 0, picks: 0 },
            });
          }
        }
        return new Response(
          JSON.stringify({ ok: true, scans: out, ts: new Date().toISOString() }),
          { status: 200, headers: JSON_HEADERS },
        );
      },
    },
  },
});
