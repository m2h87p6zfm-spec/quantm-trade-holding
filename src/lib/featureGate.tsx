import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { useSubscription, type Tier } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/lib/settings";
import { useAlerts } from "@/lib/alerts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Feature → benötigter Mindest-Tier
// ---------------------------------------------------------------------------
export type Feature =
  | "ai_learning"
  | "portfolio"
  | "calendar"
  | "news_sentiment"
  | "smart_alerts_unlimited"
  | "watchlist_unlimited"
  | "realtime"
  | "custom_webhooks"
  | "risk_analytics"
  | "priority_ai";

export const FEATURE_TIERS: Record<Feature, Tier> = {
  ai_learning: "elite",
  portfolio: "pro",
  calendar: "pro",
  news_sentiment: "pro",
  smart_alerts_unlimited: "pro",
  watchlist_unlimited: "pro",
  realtime: "elite",
  custom_webhooks: "elite",
  risk_analytics: "elite",
  priority_ai: "elite",
};

const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, elite: 2 };

export function tierAllows(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export function useFeature(feature: Feature) {
  const { tier, loading } = useSubscription();
  const required = FEATURE_TIERS[feature];
  return {
    allowed: tierAllows(tier, required),
    tier,
    required,
    loading,
  };
}

// ---------------------------------------------------------------------------
// Limits (Free Plan)
// ---------------------------------------------------------------------------
export const LIMITS = {
  watchlist: { free: 5, pro: Infinity, elite: Infinity },
  alerts: { free: 1, pro: Infinity, elite: Infinity },
  portfolio: { free: 10, pro: Infinity, elite: Infinity },
} as const;


export function useWatchlistLimit() {
  const { tier } = useSubscription();
  const { settings, toggleWatch } = useSettings();
  const max = LIMITS.watchlist[tier];
  const count = settings.watchlist.length;
  const guardedAdd = (symbol: string) => {
    const exists = settings.watchlist.includes(symbol);
    if (!exists && count >= max) {
      toast.error(`Watchlist-Limit erreicht (${max})`, {
        description: "Upgrade auf Pro für unlimitierte Watchlist-Werte.",
        action: { label: "Upgrade", onClick: () => (window.location.href = "/preise") },
      });
      return false;
    }
    toggleWatch(symbol);
    return true;
  };
  return { tier, max, count, atLimit: count >= max, guardedAdd };
}

export function useAlertsLimit() {
  const { tier } = useSubscription();
  const { alerts, add } = useAlerts();
  const max = LIMITS.alerts[tier];
  const active = alerts.filter((a) => !a.triggeredAt).length;
  const guardedAdd: typeof add = (rule) => {
    if (active >= max) {
      toast.error(`Alert-Limit erreicht (${max})`, {
        description: "Upgrade auf Pro für unlimitierte Smart Alerts.",
        action: { label: "Upgrade", onClick: () => (window.location.href = "/preise") },
      });
      return;
    }
    add(rule);
  };
  return { tier, max, count: active, atLimit: active >= max, guardedAdd };
}

// ---------------------------------------------------------------------------
// FeatureGate Wrapper
// ---------------------------------------------------------------------------
const TIER_LABEL: Record<Tier, string> = { free: "Free", pro: "Pro", elite: "Elite" };

export function FeatureGate({
  feature,
  title,
  description,
  children,
}: {
  feature: Feature;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { allowed, required, loading } = useFeature(feature);
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-md p-8">
        <div className="h-40 animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  const Icon = required === "elite" ? Crown : Sparkles;
  const ring = required === "elite" ? "border-gold/40 from-gold/10" : "border-primary/40 from-primary/10";
  const tint = required === "elite" ? "text-gold" : "text-primary";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card className={`border bg-gradient-to-br ${ring} via-transparent to-transparent p-8 text-center`}>
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-background/60 ring-1 ${tint}`}>
          <Lock className="h-6 w-6" />
        </div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {TIER_LABEL[required]} Feature
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {title ?? "Dieses Feature ist gesperrt"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description ?? `Upgrade auf den ${TIER_LABEL[required]}-Plan, um diesen Bereich freizuschalten.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/preise">
              <Icon className="mr-1.5 h-4 w-4" /> Auf {TIER_LABEL[required]} upgraden
            </Link>
          </Button>
          {!user && (
            <Button asChild variant="outline">
              <Link to="/login">Anmelden</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
