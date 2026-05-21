import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "./use-auth";

export type Tier = "free" | "pro" | "elite";

const PRO_PRICES = new Set(["apex_pro_monthly", "apex_pro_yearly"]);
const ELITE_PRICES = new Set(["apex_elite_monthly", "apex_elite_yearly"]);

export interface SubscriptionInfo {
  tier: Tier;
  isPro: boolean;
  isElite: boolean;
  status: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
}

function tierForPrice(priceId: string | null): Tier {
  if (!priceId) return "free";
  if (ELITE_PRICES.has(priceId)) return "elite";
  if (PRO_PRICES.has(priceId)) return "pro";
  return "free";
}

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export function useSubscription(): SubscriptionInfo {
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo>({
    tier: "free",
    isPro: false,
    isElite: false,
    status: null,
    priceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setInfo((p) => ({ ...p, tier: "free", isPro: false, isElite: false, loading: false }));
      return;
    }

    let cancelled = false;
    const env = getStripeEnvironment();

    const load = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const active = data && (
        ACTIVE.has(data.status) ||
        (data.status === "canceled" && data.current_period_end && new Date(data.current_period_end) > new Date())
      );
      const tier = active ? tierForPrice(data!.price_id) : "free";
      setInfo({
        tier,
        isPro: tier === "pro" || tier === "elite",
        isElite: tier === "elite",
        status: data?.status ?? null,
        priceId: data?.price_id ?? null,
        currentPeriodEnd: data?.current_period_end ?? null,
        cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
        loading: false,
      });
    };

    load();
    const channel = supabase
      .channel(`sub:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, authLoading]);

  return info;
}
