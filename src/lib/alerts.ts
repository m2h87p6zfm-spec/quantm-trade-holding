// Smart Alerts — persistent in Supabase (price_alerts), mit Migration aus
// LocalStorage. API bleibt kompatibel zur alten LocalStorage-Version:
//   useAlerts() → { alerts, add, remove, markTriggered, loading }
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AlertRule = {
  id: string;
  symbol: string;
  kind: "price_above" | "price_below" | "score_above" | "score_below";
  threshold: number;
  createdAt: number;
  triggeredAt?: number;
  note?: string;
};

const LS_KEY = "apex.alerts.v1";
const MIGRATED_FLAG = "apex.alerts.migrated.v1";

type Row = {
  id: string;
  symbol: string;
  kind: AlertRule["kind"];
  threshold: number | string;
  note: string | null;
  triggered_at: string | null;
  created_at: string;
};

function rowToRule(r: Row): AlertRule {
  return {
    id: r.id,
    symbol: r.symbol,
    kind: r.kind,
    threshold: Number(r.threshold),
    note: r.note ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    triggeredAt: r.triggered_at ? new Date(r.triggered_at).getTime() : undefined,
  };
}

function readLocal(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

async function migrateLocalAlerts(userId: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_FLAG)) return;
  const local = readLocal();
  localStorage.setItem(MIGRATED_FLAG, "1"); // immer setzen, auch wenn leer
  if (local.length === 0) return;
  const rows = local.map((a) => ({
    user_id: userId,
    symbol: a.symbol,
    kind: a.kind,
    threshold: a.threshold,
    note: a.note ?? null,
    triggered_at: a.triggeredAt ? new Date(a.triggeredAt).toISOString() : null,
    active: !a.triggeredAt,
  }));
  await supabase.from("price_alerts").insert(rows);
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;
    userIdRef.current = uid;
    if (!uid) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("price_alerts")
      .select("id,symbol,kind,threshold,note,triggered_at,created_at")
      .order("created_at", { ascending: false });
    setAlerts((data as Row[] | null)?.map(rowToRule) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) await migrateLocalAlerts(uid);
      await refresh();

      if (cancelled || !uid) return;
      // Realtime: andere Tabs / Cron-Trigger.
      // Channel-Topic enthält die User-ID — damit greift die RLS auf
      // realtime.messages, die Subscriptions auf Topics ohne eigene
      // User-ID blockiert (verhindert das Mitlesen fremder Alerts).
      const channelName = `price_alerts_self:${uid}:${Math.random().toString(36).slice(2)}`;
      ch = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table: "price_alerts" }, () => refresh())
        .subscribe();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user?.id) {
        await migrateLocalAlerts(session.user.id);
      }
      refresh();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (ch) supabase.removeChannel(ch);
    };
  }, [refresh]);

  const add = useCallback(async (rule: Omit<AlertRule, "id" | "createdAt">) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await supabase.from("price_alerts").insert({
      user_id: uid,
      symbol: rule.symbol,
      kind: rule.kind,
      threshold: rule.threshold,
      note: rule.note ?? null,
      active: !rule.triggeredAt,
      triggered_at: rule.triggeredAt ? new Date(rule.triggeredAt).toISOString() : null,
    });
    refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    refresh();
  }, [refresh]);

  const markTriggered = useCallback(async (id: string) => {
    await supabase
      .from("price_alerts")
      .update({ triggered_at: new Date().toISOString(), active: false })
      .eq("id", id);
    refresh();
  }, [refresh]);

  return { alerts, add, remove, markTriggered, loading };
}

export function evaluate(rule: AlertRule, ctx: { price?: number; score?: number }): boolean {
  if ((rule.kind === "price_above" || rule.kind === "price_below") && ctx.price == null) return false;
  if ((rule.kind === "score_above" || rule.kind === "score_below") && ctx.score == null) return false;
  switch (rule.kind) {
    case "price_above": return ctx.price! >= rule.threshold;
    case "price_below": return ctx.price! <= rule.threshold;
    case "score_above": return ctx.score! >= rule.threshold;
    case "score_below": return ctx.score! <= rule.threshold;
  }
}
