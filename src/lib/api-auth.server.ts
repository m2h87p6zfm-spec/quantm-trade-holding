import { createClient } from "@supabase/supabase-js";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
} as const;

export async function resolveUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: auth } },
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
  const got = request.headers.get("x-cron-secret");
  if (got !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }
  return null;
}
