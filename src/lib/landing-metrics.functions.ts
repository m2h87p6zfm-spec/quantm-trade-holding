import { createServerFn } from "@tanstack/react-start";

export type LandingMetrics = {
  assetsCovered: number;        // distinct tickers analyzed (lifetime)
  picks24h: number;             // new analyses in last 24h
  picks7d: number;              // new analyses in last 7d
  totalAnalyses: number;        // lifetime analyses
  evaluated: number;            // outcomes with a verdict
  hits: number;                 // outcomes flagged correct
  hitRate: number | null;       // hits / evaluated  (0..1)
  avgReturn7d: number | null;   // mean of return_7d  (decimal, e.g. -0.0169)
  avgConfidence7d: number | null; // mean confidence_score in last 7d (0..100)
  sectorsCovered: number;       // distinct sectors
  lastScanIso: string | null;   // most recent scan_history.scanned_at
  generatedAt: string;          // server timestamp
};

/**
 * Public landing metrics — aggregate-only, no PII.
 * Reads via supabaseAdmin (RLS bypass) but only returns rolled-up counters/averages.
 */
export const getLandingMetrics = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingMetrics> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const iso24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const iso7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel.
    const [
      assetsRes,
      total24Res,
      total7Res,
      totalAllRes,
      evalRes,
      hitsRes,
      ret7Res,
      conf7Res,
      sectorRes,
      scanRes,
    ] = await Promise.all([
      // distinct tickers — paginate up to 20k rows to dodge the 1000-row default.
      supabaseAdmin
        .from("apex_analyses")
        .select("ticker")
        .range(0, 19999)
        .then((r) => {
          const set = new Set<string>();
          for (const row of (r.data ?? []) as Array<{ ticker: string | null }>) {
            if (row.ticker) set.add(row.ticker);
          }
          return set.size;
        }),

      supabaseAdmin
        .from("apex_analyses")
        .select("id", { count: "exact", head: true })
        .gte("analyzed_at", iso24h)
        .then((r) => r.count ?? 0),
      supabaseAdmin
        .from("apex_analyses")
        .select("id", { count: "exact", head: true })
        .gte("analyzed_at", iso7d)
        .then((r) => r.count ?? 0),
      supabaseAdmin
        .from("apex_analyses")
        .select("id", { count: "exact", head: true })
        .then((r) => r.count ?? 0),
      supabaseAdmin
        .from("apex_outcomes")
        .select("id", { count: "exact", head: true })
        .not("is_correct", "is", null)
        .then((r) => r.count ?? 0),
      supabaseAdmin
        .from("apex_outcomes")
        .select("id", { count: "exact", head: true })
        .eq("is_correct", true)
        .then((r) => r.count ?? 0),
      supabaseAdmin
        .from("apex_outcomes")
        .select("return_7d")
        .not("return_7d", "is", null)
        .limit(5000)
        .then((r) => {
          const rows = (r.data ?? []) as Array<{ return_7d: number | null }>;
          if (!rows.length) return null;
          const sum = rows.reduce((a, x) => a + (x.return_7d ?? 0), 0);
          return sum / rows.length;
        }),
      supabaseAdmin
        .from("apex_analyses")
        .select("confidence_score")
        .gte("analyzed_at", iso7d)
        .not("confidence_score", "is", null)
        .limit(5000)
        .then((r) => {
          const rows = (r.data ?? []) as Array<{ confidence_score: number | null }>;
          if (!rows.length) return null;
          const sum = rows.reduce((a, x) => a + (x.confidence_score ?? 0), 0);
          return sum / rows.length;
        }),
      supabaseAdmin
        .from("apex_analyses")
        .select("sector")
        .not("sector", "is", null)
        .range(0, 19999)
        .then((r) => {
          const set = new Set<string>();
          for (const row of (r.data ?? []) as Array<{ sector: string | null }>) {
            if (row.sector) set.add(row.sector);
          }
          return set.size;
        }),

      supabaseAdmin
        .from("scan_history")
        .select("scanned_at")
        .order("scanned_at", { ascending: false })
        .limit(1)
        .then((r) => (r.data?.[0] as { scanned_at: string } | undefined)?.scanned_at ?? null),
    ]);

    const hitRate = evalRes > 0 ? hitsRes / evalRes : null;

    return {
      assetsCovered: assetsRes,
      picks24h: total24Res,
      picks7d: total7Res,
      totalAnalyses: totalAllRes,
      evaluated: evalRes,
      hits: hitsRes,
      hitRate,
      avgReturn7d: ret7Res,
      avgConfidence7d: conf7Res,
      sectorsCovered: sectorRes,
      lastScanIso: scanRes,
      generatedAt: now.toISOString(),
    };
  },
);
