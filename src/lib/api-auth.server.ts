import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PRO_PRICES = new Set([
  "apex_pro_monthly",
  "apex_pro_yearly",
  "apex_elite_monthly",
  "apex_elite_yearly",
]);
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Returns true if the user currently has an active Pro or Elite subscription
 * in any environment (sandbox or live). Server-side source of truth for
 * paywalled endpoints — the frontend tier gate is UX only.
 */
export async function userHasPro(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status, price_id, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (!data) return false;
  const now = Date.now();
  return data.some((row) => {
    if (!row.price_id || !PRO_PRICES.has(row.price_id)) return false;
    if (ACTIVE_STATUSES.has(row.status)) return true;
    if (row.status === "canceled" && row.current_period_end) {
      return new Date(row.current_period_end).getTime() > now;
    }
    return false;
  });
}

/**
 * Authenticates the caller AND verifies they have an active Pro/Elite plan.
 * Returns userId on success, or a 401/402 Response.
 * Usage:
 *   const auth = await requirePro(request);
 *   if (auth instanceof Response) return auth;
 *   const userId = auth;
 */
export async function requirePro(request: Request): Promise<string | Response> {
  const auth = await requireUserId(request);
  if (auth instanceof Response) return auth;
  const ok = await userHasPro(auth);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: "Upgrade required", code: "tier_required" }),
      { status: 402, headers: JSON_HEADERS },
    );
  }
  return auth;
}


const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
} as const;

export async function resolveUserId(request: Request): Promise<string | null> {
  let token: string | null = null;
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    token = auth.slice("Bearer ".length);
  } else {
    // SSE/EventSource cannot set custom headers — accept token via query param.
    try {
      const url = new URL(request.url);
      const q = url.searchParams.get("token");
      if (q) token = q;
    } catch { /* noop */ }
  }
  if (!token) return null;
  try {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns userId string, or a 401 Response if the caller is not authenticated.
 * Usage:
 *   const auth = await requireUserId(request);
 *   if (auth instanceof Response) return auth;
 *   const userId = auth;
 */
export async function requireUserId(request: Request): Promise<string | Response> {
  const userId = await resolveUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  return userId;
}

/**
 * For scheduled / cron endpoints. Requires header `x-cron-secret` matching
 * the `CRON_SECRET` env var. Returns null on success, or a 403 Response.
 */
export function requireCronSecret(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
  const got = request.headers.get("x-cron-secret") ?? "";
  // Timing-safe comparison to prevent prefix-leak side-channel attacks.
  const expectedBuf = Buffer.from(expected, "utf8");
  const gotBuf = Buffer.from(got, "utf8");
  let ok = expectedBuf.length === gotBuf.length;
  if (ok) {
    ok = timingSafeEqual(expectedBuf, gotBuf);
  }
  if (!ok) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }
  return null;
}
