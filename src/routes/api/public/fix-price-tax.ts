import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient } from "@/lib/stripe.server";

// One-off admin route to recreate apex_pro_monthly with tax_behavior=inclusive.
// Delete after running.
export const Route = createFileRoute("/api/public/fix-price-tax")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (token !== "quantm-fix-2026") {
          return new Response("Unauthorized", { status: 401 });
        }
        const env = (url.searchParams.get("env") ?? "sandbox") as "sandbox" | "live";
        const lookupKey = url.searchParams.get("lookup_key") ?? "apex_pro_monthly";
        const amount = Number(url.searchParams.get("amount") ?? "999");
        const interval = (url.searchParams.get("interval") ?? "month") as "month" | "year";

        const stripe = createStripeClient(env);

        // Find existing price by lookup_key to get product id
        const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
        if (!existing.data.length) return new Response("Price not found", { status: 404 });
        const oldPrice = existing.data[0];
        const productId = typeof oldPrice.product === "string" ? oldPrice.product : oldPrice.product.id;

        // Create new inclusive-tax price; transfer_lookup_key moves the key over
        const newPrice = await stripe.prices.create({
          product: productId,
          currency: "eur",
          unit_amount: amount,
          recurring: { interval },
          tax_behavior: "inclusive",
          lookup_key: lookupKey,
          transfer_lookup_key: true,
          nickname: lookupKey,
        });

        // Archive the old one
        await stripe.prices.update(oldPrice.id, { active: false });

        return new Response(
          JSON.stringify({ ok: true, newPriceId: newPrice.id, oldPriceId: oldPrice.id }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
