import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ActionSchema = z.object({
  check_name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  severity: z.enum(["info", "warn", "error", "critical"]),
  status: z.enum(["detected", "healed", "failed", "escalated", "ok"]),
  details: z.record(z.string(), z.any()).default({}),
  auto_healed: z.boolean().default(false),
  error_message: z.string().max(2000).nullable().optional(),
});

export const logHealingActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ actions: z.array(ActionSchema).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.actions.map((a) => ({
      ...a,
      details: a.details ?? {},
      error_message: a.error_message ?? null,
      user_id: userId,
    }));
    const { error } = await supabase.from("self_healing_logs").insert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: rows.length };
  });

export const getHealingLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        limit: z.number().min(1).max(500).default(100),
        severity: z.enum(["info", "warn", "error", "critical"]).optional(),
        category: z.string().max(50).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Admin check
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      throw new Error("Forbidden");
    }
    let q = supabase
      .from("self_healing_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.severity) q = q.eq("severity", data.severity);
    if (data.category) q = q.eq("category", data.category);
    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);
    return { logs: logs ?? [] };
  });

export const getHealingStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [d24, d7, esc] = await Promise.all([
      supabase
        .from("self_healing_logs")
        .select("status, auto_healed", { count: "exact" })
        .gte("created_at", since24h),
      supabase
        .from("self_healing_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7d),
      supabase
        .from("self_healing_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "escalated")
        .gte("created_at", since7d),
    ]);

    const total24h = d24.count ?? 0;
    const healed24h = (d24.data ?? []).filter((r: any) => r.auto_healed).length;
    return {
      total_24h: total24h,
      healed_24h: healed24h,
      heal_rate: total24h > 0 ? healed24h / total24h : 0,
      total_7d: d7.count ?? 0,
      escalations_7d: esc.count ?? 0,
    };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });
