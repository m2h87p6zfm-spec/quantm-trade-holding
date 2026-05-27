import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/api-auth.server";
import { getCandlesCached } from "@/lib/twelvedata.server";
import { PRODUCTS, type Product } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, buildDecision } from "@/lib/analysis";
import { detectRegime } from "@/lib/ai-learning";

// Cron endpoints under /api/public/* may also authenticate via the standard
// Supabase anon `apikey` header (canonical pg_cron pattern). We accept either
// the legacy x-cron-secret OR the anon key.
function isAnonApiKey(request: Request): boolean {
  const got = request.headers.get("apikey") ?? "";
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  return !!got && !!expected && got === expected;
}

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

type Scope = { universe: "top" | "extended" | "all" | "combined"; sector: string; region: string };

function scopeKey(s: Scope) {
  return `${s.universe}|${s.sector}|${s.region}`;
}

function filterUniverse(s: Scope): Product[] {
  let list = PRODUCTS;
  if (s.sector !== "Alle") list = list.filter((p) => p.sector === s.sector);
  if (s.region !== "Alle") list = list.filter((p) => p.region === s.region);
  if (s.universe === "combined") {
    list = list.filter((p) => p.cap === "large" || p.cap === "mid" || p.cap === "small");
  } else {
    const wantCap: Product["cap"] =
      s.universe === "top" ? "large" : s.universe === "extended" ? "mid" : "small";
    list = list.filter((p) => p.cap === wantCap);
  }
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
  const topN = scope.universe === "top" ? 10 : scope.universe === "extended" ? 25 : scope.universe === "all" ? 50 : 60;
  const top = results.slice(0, topN);

  // If the new scan produced ZERO BUY-Kandidaten, preserve the previously
  // cached picks (user explicit request: "wenn keine da sind, zeig die vom
  // letzten Scan"). We still bump scanned_at + counters so we know it ran.
  if (top.length === 0) {
    const { data: prev } = await supabaseAdmin
      .from("picks_cache")
      .select("picks")
      .eq("scope_key", scopeKey(scope))
      .maybeSingle();
    const prevPicks = (prev?.picks ?? []) as never;
    await supabaseAdmin
      .from("picks_cache")
      .upsert(
        {
          scope_key: scopeKey(scope),
          universe: scope.universe,
          sector: scope.sector,
          region: scope.region,
          picks: prevPicks,
          total_scanned: total,
          succeeded,
          failed,
          scanned_at: new Date().toISOString(),
        },
        { onConflict: "scope_key" },
      );
    return { total, succeeded, failed, picks: prevPicks.length, preserved: true };
  }

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
        // Accept either x-cron-secret OR Supabase anon apikey header
        // (canonical pg_cron pattern).
        if (!isAnonApiKey(request)) {
          const authErr = requireCronSecret(request);
          if (authErr) return authErr;
        }

        // Default: scannt alle Cap-Buckets + Combined-Scope.
        let scopes: Scope[] = [
          { universe: "top", sector: "Alle", region: "Alle" },
          { universe: "extended", sector: "Alle", region: "Alle" },
          { universe: "all", sector: "Alle", region: "Alle" },
          { universe: "combined", sector: "Alle", region: "Alle" },
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
