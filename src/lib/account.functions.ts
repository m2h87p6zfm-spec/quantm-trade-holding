import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

/**
 * GDPR-konforme Komplettlöschung:
 * 1. Alle aktiven Stripe-Subscriptions des Users sofort kündigen (best-effort)
 * 2. Auth-User löschen → cascadiert auf profiles / subscriptions / credits via FK ON DELETE CASCADE
 */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // 1) Stripe-Subs kündigen (beide Environments, alle Zeilen)
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, environment, status")
      .eq("user_id", userId);

    for (const s of subs ?? []) {
      if (!s.stripe_subscription_id) continue;
      if (s.status === "canceled") continue;
      try {
        const stripe = createStripeClient(s.environment as StripeEnv);
        await stripe.subscriptions.cancel(s.stripe_subscription_id);
      } catch (err) {
        // Best-effort: weitermachen, Sub könnte schon weg sein
        console.error("Cancel sub failed", s.stripe_subscription_id, err);
      }
    }

    // 2) Auth-User löschen (cascadiert via FK)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
