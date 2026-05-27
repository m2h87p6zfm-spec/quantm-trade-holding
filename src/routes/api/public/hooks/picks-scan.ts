import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/api-auth.server";
import { getCandlesCached } from "@/lib/twelvedata.server";
import { fetchCandles } from "@/lib/quant-fetch.server";
import { PRODUCTS, type Product } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, buildDecision } from "@/lib/analysis";
import { detectRegime } from "@/lib/ai-learning";

// Cron endpoints under /api/public/* may also authenticate via the standard
// Supabase anon `apikey` header (canonical pg_cron pattern). The anon key
// is fully public (embedded in every client bundle), so checking it doesn't
// add real security — it just filters out unrelated bots. We accept any of
// the common env-var names Supabase exposes.
const PROJECT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5bXB6cGRmaGFyaW9oZGthbWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTExNDcsImV4cCI6MjA5NDk2NzE0N30.5_o977dQodLw5kK6DxnlV6UmUthOcz8osKOr0KJtHyE";

function isAnonApiKey(request: Request): boolean {
  const got =
    request.headers.get("apikey") ??
    (request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  if (!got) return false;
  const candidates = [
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    PROJECT_ANON_KEY,
  ].filter(Boolean) as string[];
  return candidates.some((k) => k === got);
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

type PickRow = {
  symbol: string; name: string; sector: string; region: string;
  confidence: number; compositeScore: number | null;
  decision: string; last: number; change: number; upsidePct: number;
  regime: string; score: number; rsi: number; macdHist: number;
  zScore: number; volatility: number; momentum: number;
  sma50: number; sma200: number;
  entry: number | null; target: number | null; stop: number | null;
};
type ScanResult = { ok: true; pick: PickRow | null } | { ok: false };

async function scanOne(p: Product): Promise<ScanResult> {
  try {
    // PRIMÄR: Yahoo (kostenlos, hohe Quoten) — bringt die Fehlerrate von
    // ~90 % (TD Free-Plan-Limit) auf <5 %. Nur wenn Yahoo nichts liefert,
    // wird Twelve Data als Backup angefragt.
    let closes: number[] | null = null;
    const ycandles = await fetchCandles(p.symbol, "1y", "1d");
    if (ycandles.length >= 60) {
      closes = ycandles.map((k) => k.c);
    } else {
      const r = await getCandlesCached(p.symbol, "1d", "1y", 3600);
      if (r.value && r.value.c.length >= 60) closes = r.value.c;
    }
    if (!closes) return { ok: true, pick: null };
    const c = { c: closes } as { c: number[] };
    // Insufficient data is not a "fetch error" — treat as ok with no pick.
    if (c.c.length < 60) return { ok: true, pick: null };
    const ind = computeAll(c.c);
    const sig = scoreIndicators(ind, "ausgewogen");
    const regime = detectRegime(ind);
    const report = buildDecision(p.symbol, p.name, ind, sig, regime, {
      historicalCloses: c.c,
    }, {
      // 10k MC-Pfade pro Aktie sprengen im Worker das CPU-Limit; 1.2k bleibt stabil.
      monteCarloPaths: 1_200,
    });
    if (report.decision !== "BUY") return { ok: true, pick: null };
    const last = c.c.at(-1) ?? 0;
    const prev = c.c.at(-2) ?? last;
    const change = prev ? ((last - prev) / prev) * 100 : 0;
    const upsidePct =
      sig.target && sig.entry ? ((sig.target - sig.entry) / sig.entry) * 100 : 0;
    const regimeBonus =
      regime === "bull" ? 5 : regime === "low_vol" ? 2 : regime === "bear" ? -8 : 0;
    const score = report.confidence + upsidePct * 0.4 + regimeBonus;
    return {
      ok: true,
      pick: {
        symbol: p.symbol, name: p.name, sector: p.sector, region: p.region,
        confidence: report.confidence,
        compositeScore: report.compositeScore ?? null,
        decision: report.decision, last, change, upsidePct, regime, score,
        rsi: ind.rsi, macdHist: ind.macd.histogram, zScore: ind.zScore,
        volatility: ind.volatility, momentum: ind.momentum,
        sma50: ind.sma50, sma200: ind.sma200,
        entry: sig.entry ?? null, target: sig.target ?? null, stop: sig.stop ?? null,
      },
    };
  } catch {
    return { ok: false };
  }
}

async function runScan(scope: Scope, concurrency = 6) {
  const universe = filterUniverse(scope);
  const total = universe.length;
  const results: PickRow[] = [];
  let succeeded = 0;
  let failed = 0;
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (idx < total) {
      const i = idx++;
      const r = await scanOne(universe[i]);
      if (r.ok) {
        succeeded++;
        if (r.pick) results.push(r.pick);
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
    const prevArr = (prev?.picks as unknown[] | null | undefined) ?? [];
    const prevPicks = prevArr as never;
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
    await supabaseAdmin.from("scan_history").insert({
      scope_key: scopeKey(scope),
      universe: scope.universe,
      sector: scope.sector,
      region: scope.region,
      total_scanned: total,
      succeeded,
      failed,
      picks_count: prevArr.length,
      preserved: true,
    });
    return { total, succeeded, failed, picks: prevArr.length, preserved: true };
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
  await supabaseAdmin.from("scan_history").insert({
    scope_key: scopeKey(scope),
    universe: scope.universe,
    sector: scope.sector,
    region: scope.region,
    total_scanned: total,
    succeeded,
    failed,
    picks_count: top.length,
    preserved: false,
  });
  return { total, succeeded, failed, picks: top.length, preserved: false };
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
        const buyPicksBySymbol = new Map<string, PickRow>();
        for (const s of scopes) {
          try {
            const result = await runScan(s);
            out.push({ scope: scopeKey(s), result });
          } catch (e) {
            console.error("picks-scan failed for scope", scopeKey(s), e);
            out.push({
              scope: scopeKey(s),
              result: { total: 0, succeeded: 0, failed: 0, picks: 0, preserved: false },
            });
          }
        }

        // Persist BUY picks into the Track Record (apex_analyses) for
        // gapless history — dedupe per ticker per 24h so the hourly cron
        // doesn't spam duplicates.
        try {
          const { data: cachedRows } = await supabaseAdmin
            .from("picks_cache")
            .select("picks, scope_key")
            .in("scope_key", scopes.map(scopeKey));
          for (const row of cachedRows ?? []) {
            const picks = (row.picks as unknown as PickRow[]) ?? [];
            for (const p of picks) {
              if (p?.decision === "BUY" && p.symbol) {
                if (!buyPicksBySymbol.has(p.symbol)) buyPicksBySymbol.set(p.symbol, p);
              }
            }
          }
          const symbols = [...buyPicksBySymbol.keys()];
          let recorded = 0;
          if (symbols.length > 0) {
            const sinceIso = new Date(Date.now() - 24 * 3600_000).toISOString();
            const { data: existing } = await supabaseAdmin
              .from("apex_analyses")
              .select("ticker, analyzed_at")
              .in("ticker", symbols)
              .gte("analyzed_at", sinceIso);
            const skip = new Set((existing ?? []).map((r) => (r.ticker as string).toUpperCase()));
            const toInsert = symbols
              .filter((s) => !skip.has(s.toUpperCase()))
              .map((s) => {
                const p = buyPicksBySymbol.get(s)!;
                return {
                  ticker: s.toUpperCase(),
                  name: p.name,
                  sector: p.sector ?? null,
                  asset_type: "Aktie" as const,
                  verdict: "KAUF" as const,
                  confidence_score: Math.round(p.confidence ?? 0),
                  price_at_analysis: Number(p.last) || 0,
                  indicators: {
                    source: "cron-picks-scan",
                    rsi: p.rsi,
                    macdHist: p.macdHist,
                    zScore: p.zScore,
                    volatility: p.volatility,
                    momentum: p.momentum,
                    sma50: p.sma50,
                    sma200: p.sma200,
                    regime: p.regime,
                    entry: p.entry,
                    target: p.target,
                    stop: p.stop,
                    compositeScore: p.compositeScore,
                  } as Record<string, unknown>,
                };
              })
              .filter((r) => r.price_at_analysis > 0);
            if (toInsert.length > 0) {
              const { data: inserted, error: insErr } = await supabaseAdmin
                .from("apex_analyses")
                .insert(toInsert as never)
                .select("id");
              if (insErr) {
                console.error("apex_analyses insert failed", insErr);
              } else if (inserted && inserted.length > 0) {
                recorded = inserted.length;
                await supabaseAdmin
                  .from("apex_outcomes")
                  .insert(inserted.map((r) => ({ analysis_id: r.id as string })) as never);
              }
            }
          }
          return new Response(
            JSON.stringify({ ok: true, scans: out, recorded_trackrecord: recorded, ts: new Date().toISOString() }),
            { status: 200, headers: JSON_HEADERS },
          );
        } catch (e) {
          console.error("track-record persist failed", e);
          return new Response(
            JSON.stringify({ ok: true, scans: out, recorded_trackrecord: 0, ts: new Date().toISOString() }),
            { status: 200, headers: JSON_HEADERS },
          );
        }
      },
    },
  },
});
