import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  recordEventsForTicker,
  recalcPatternsFor,
  computeCausalScore,
  type CausalAnalysisPayload,
} from "./causal-engine.server";

export const runCausalAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ticker: z.string().min(1).max(20),
        companyName: z.string().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CausalAnalysisPayload> => {
    const tk = data.ticker.toUpperCase();
    try {
      await recordEventsForTicker(tk, data.companyName);
      await recalcPatternsFor(tk);
    } catch (err) {
      console.error("[causal-engine] event collection failed:", err);
      // Trotzdem Score auf Basis vorhandener Daten zurückgeben
    }
    return computeCausalScore(tk);
  });
