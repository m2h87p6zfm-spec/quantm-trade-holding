import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/settings";

export type PickVerdict = {
  decision: "BUY" | "SELL" | "HOLD";
  verdict: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number; // 0–100, already risk-profile-adjusted
  source: "picks_cache";
};

/**
 * Returns the cached Quantm Picks verdict for a symbol, if it exists.
 *
 * The cron job pre-computes BUY picks per universe and stores them in
 * `picks_cache` under scope keys like `<universe>|Alle|Alle`. The picks page
 * re-scores them client-side using the user's risk profile before display.
 * This hook applies the same logic so the verdict shown on the product
 * overview matches the one shown in Quantm Picks for that symbol.
 *
 * Returns `null` when the symbol isn't in any cached pick (i.e. the server
 * didn't classify it as BUY); callers should fall back to their own live
 * `scoreIndicators()` verdict in that case.
 */
export function usePickVerdict(symbol: string | undefined | null): PickVerdict | null {
  const { settings } = useSettings();
  const [verdict, setVerdict] = useState<PickVerdict | null>(null);

  useEffect(() => {
    if (!symbol) {
      setVerdict(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("picks_cache")
        .select("picks, scope_key")
        .like("scope_key", "%|Alle|Alle");
      if (cancelled) return;
      if (!data || data.length === 0) {
        setVerdict(null);
        return;
      }
      // Find the symbol in any cached universe; prefer the highest confidence.
      let best: { decision: string; confidence: number } | null = null;
      for (const row of data) {
        const picks = (row.picks as unknown[] | null) ?? [];
        for (const raw of picks) {
          const x = raw as Record<string, unknown>;
          if (String(x.symbol) !== symbol) continue;
          const conf = Number(x.confidence ?? 0);
          const dec = String(x.decision ?? "HOLD");
          if (!best || conf > best.confidence) best = { decision: dec, confidence: conf };
        }
      }
      if (!best) {
        setVerdict(null);
        return;
      }
      // Mirror picks.tsx risk-profile adjustment so labels stay consistent.
      const confAdj =
        settings.risk === "konservativ" ? -10 : settings.risk === "spekulativ" ? 5 : 0;
      const adjConfidence = Math.max(0, Math.min(100, best.confidence + confAdj));
      const passes = adjConfidence >= settings.minConfidence;
      const decision: "BUY" | "SELL" | "HOLD" = passes && best.decision === "BUY"
        ? "BUY"
        : best.decision === "SELL"
          ? "SELL"
          : "HOLD";
      const verdictLabel: "LONG" | "SHORT" | "NEUTRAL" =
        decision === "BUY" ? "LONG" : decision === "SELL" ? "SHORT" : "NEUTRAL";
      setVerdict({
        decision,
        verdict: verdictLabel,
        confidence: Math.round(adjConfidence),
        source: "picks_cache",
      });
    })().catch(() => {
      if (!cancelled) setVerdict(null);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, settings.risk, settings.minConfidence]);

  return verdict;
}
