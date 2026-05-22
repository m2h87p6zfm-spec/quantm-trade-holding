import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_LIMITS, type CreditTier } from "./credits";

const PRO_PRICES = new Set(["apex_pro_monthly", "apex_pro_yearly"]);
const ELITE_PRICES = new Set(["apex_elite_monthly", "apex_elite_yearly"]);
const ACTIVE = new Set(["active", "trialing", "past_due"]);

async function resolveTier(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<CreditTier> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, price_id, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  for (const s of (data ?? []) as Array<{
    status: string;
    price_id: string | null;
    current_period_end: string | null;
  }>) {
    const active =
      ACTIVE.has(s.status) ||
      (s.status === "canceled" &&
        !!s.current_period_end &&
        new Date(s.current_period_end) > new Date());
    if (!active || !s.price_id) continue;
    if (ELITE_PRICES.has(s.price_id)) return "elite";
    if (PRO_PRICES.has(s.price_id)) return "pro";
  }
  return "free";
}

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function countUsedThisMonth(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("analysis_credit_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("used_at", monthStartIso());
  return count ?? 0;
}

export const getAnalysisCreditStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const tier = await resolveTier(supabase, userId);
    const limit = CREDIT_LIMITS[tier];
    const used = await countUsedThisMonth(supabase, userId);
    return { tier, limit, used, remaining: Math.max(0, limit - used) };
  });

export const consumeAnalysisCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { symbol: string }) =>
    z
      .object({
        symbol: z
          .string()
          .min(1)
          .max(32)
          .regex(/^[A-Za-z0-9.:\-_^]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const tier = await resolveTier(supabase, userId);
    const limit = CREDIT_LIMITS[tier];
    const used = await countUsedThisMonth(supabase, userId);
    if (used >= limit) {
      return { allowed: false as const, tier, limit, used, remaining: 0 };
    }
    await supabase
      .from("analysis_credit_usage")
      .insert({ user_id: userId, symbol: data.symbol.toUpperCase() });
    return {
      allowed: true as const,
      tier,
      limit,
      used: used + 1,
      remaining: limit - used - 1,
    };
  });
