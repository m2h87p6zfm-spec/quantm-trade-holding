import { supabase } from "@/integrations/supabase/client";

// Lightweight, fire-and-forget client analytics. Never throws.
const SESSION_KEY = "qt_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "nostore";
  }
}

export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      properties: properties as never,
      session_id: getSessionId(),
      path: window.location.pathname,
      user_id: user?.id ?? null,
    });
  } catch {
    // Silent — analytics never breaks the app.
  }
}

// --- Pricing-page funnel helpers ---------------------------------------------
// Tracks which feature popovers a user opened in this session, so we can
// correlate them with a subsequent upgrade click.
const viewedPopovers = new Map<string, number>(); // featureKey -> timestamp

export function recordPopoverOpen(featureKey: string, plan?: string): void {
  viewedPopovers.set(featureKey, Date.now());
  void trackEvent("pricing_info_popover_opened", { featureKey, plan });
}

export function getPopoverContext() {
  const features = Array.from(viewedPopovers.keys());
  const lastTs = features.length
    ? Math.max(...Array.from(viewedPopovers.values()))
    : null;
  return {
    viewed_feature_count: features.length,
    viewed_features: features,
    seconds_since_last_popover: lastTs ? Math.round((Date.now() - lastTs) / 1000) : null,
  };
}
