import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, getWebhookSecret, type StripeEnv } from "@/lib/stripe.server";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const envParam = url.searchParams.get("env");
        const env: StripeEnv = envParam === "live" ? "live" : "sandbox";

        const sig = request.headers.get("stripe-signature");
        const body = await request.text();
        if (!sig) return new Response("Missing signature", { status: 400 });

        const stripe = createStripeClient(env);
        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, getWebhookSecret(env));
        } catch (err) {
          console.error("Webhook signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        try {
          await handleEvent(event, env, stripe);
        } catch (err) {
          console.error("Webhook handler error", event.type, err);
          return new Response("Handler error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});

async function handleEvent(event: Stripe.Event, env: StripeEnv, stripe: Stripe) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) return;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      await upsertSubscription(sub, env, session.metadata?.userId ?? sub.metadata?.userId);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub, env, sub.metadata?.userId);
      return;
    }
    default:
      return;
  }
}

async function upsertSubscription(
  sub: Stripe.Subscription,
  env: StripeEnv,
  userIdFromMeta?: string,
) {
  let userId = userIdFromMeta;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  if (!userId) {
    // fallback: lookup existing row by stripe_customer_id
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .eq("environment", env)
      .limit(1)
      .maybeSingle();
    userId = existing?.user_id;
  }
  if (!userId) {
    console.warn("No userId resolvable for subscription", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.lookup_key ?? item?.price?.id ?? null;
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id ?? null;
  const periodEnd = item?.current_period_end ?? null;

  const row = {
    user_id: userId,
    environment: env,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    price_id: priceId,
    product_id: productId,
    status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  };

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) throw new Error(error.message);
}
