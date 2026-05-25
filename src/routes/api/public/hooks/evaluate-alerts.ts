// Alert-Evaluator — wird per pg_cron alle 1–2 Min während Marktzeit aufgerufen.
// Holt aktive `price_alerts`, lädt aktuelle Kurse (batched), prüft die
// Schwellen, markiert ausgelöste Alarme und verschickt Web-Push an alle
// registrierten Geräte des jeweiligen Nutzers.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/api-auth.server";
import { getQuotesBatch } from "@/lib/twelvedata.server";
import { sendPushTo } from "@/lib/vapid.server";

type AlertRow = {
  id: string;
  user_id: string;
  symbol: string;
  kind: "price_above" | "price_below" | "score_above" | "score_below";
  threshold: number | string;
  note: string | null;
};

type SubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function shouldTrigger(kind: AlertRow["kind"], threshold: number, price: number): boolean {
  switch (kind) {
    case "price_above": return price >= threshold;
    case "price_below": return price <= threshold;
    // Score-Alarme werden hier nicht ausgewertet (kein Score-Stream im Cron).
    default: return false;
  }
}

async function pushToUser(userId: string, payload: Record<string, unknown>) {
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return 0;
  let delivered = 0;
  for (const s of subs as SubRow[]) {
    try {
      const res = await sendPushTo(
        {
          endpoint: s.endpoint,
          expirationTime: null,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        payload,
        { ttl: 600, urgency: "high", topic: String(payload.tag ?? "alert") },
      );
      if (res.ok) {
        delivered += 1;
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", s.id)
          .neq("id", s.id); // no-op; placeholder to keep types happy
      } else if (res.gone) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
      }
    } catch (e) {
      console.error("[alerts] push failed", e);
    }
  }
  return delivered;
}

async function runEvaluation(): Promise<Response> {
  const { data: alerts } = await supabaseAdmin
    .from("price_alerts")
    .select("id, user_id, symbol, kind, threshold, note")
    .eq("active", true)
    .is("triggered_at", null)
    .in("kind", ["price_above", "price_below"])
    .limit(500);

  if (!alerts || alerts.length === 0) {
    return Response.json({ checked: 0, triggered: 0 });
  }

  const symbols = Array.from(new Set((alerts as AlertRow[]).map((a) => a.symbol)));
  let quotes: Record<string, { c?: number }>;
  try {
    quotes = await getQuotesBatch(symbols);
  } catch (e) {
    console.error("[alerts] quote batch failed", e);
    return Response.json({ checked: 0, triggered: 0, error: "quote_fetch_failed" }, { status: 500 });
  }

  let triggered = 0;
  let pushes = 0;

  for (const a of alerts as AlertRow[]) {
    const q = quotes[a.symbol];
    const price = q?.c;
    if (typeof price !== "number" || !isFinite(price)) continue;

    // last_checked_price aktualisieren, ohne triggered_at zu setzen
    await supabaseAdmin
      .from("price_alerts")
      .update({ last_checked_price: price })
      .eq("id", a.id);

    const threshold = Number(a.threshold);
    if (!isFinite(threshold)) continue;
    if (!shouldTrigger(a.kind, threshold, price)) continue;

    const { error: updErr } = await supabaseAdmin
      .from("price_alerts")
      .update({ triggered_at: new Date().toISOString(), active: false })
      .eq("id", a.id)
      .is("triggered_at", null); // race-safe
    if (updErr) continue;

    triggered += 1;
    const direction = a.kind === "price_above" ? "über" : "unter";
    const title = `${a.symbol} ${direction} ${threshold}`;
    const body = `Aktueller Kurs: ${price.toFixed(2)}${a.note ? ` · ${a.note}` : ""}`;
    pushes += await pushToUser(a.user_id, {
      title,
      body,
      tag: `alert-${a.id}`,
      url: `/produkte/${encodeURIComponent(a.symbol)}`,
      data: { alertId: a.id, symbol: a.symbol, price, threshold },
    });
  }

  return Response.json({ checked: alerts.length, triggered, pushes });
}

export const Route = createFileRoute("/api/public/hooks/evaluate-alerts")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const denied = requireCronSecret(request);
        return denied ?? runEvaluation();
      },
      GET: ({ request }) => {
        const denied = requireCronSecret(request);
        return denied ?? runEvaluation();
      },
    },
  },
});
