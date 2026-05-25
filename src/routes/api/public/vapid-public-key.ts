import { createFileRoute } from "@tanstack/react-router";
import { getVapidPublicKey } from "@/lib/vapid.server";

// Returns the application server's VAPID public key in base64url form.
// The browser needs this to call PushManager.subscribe(). We derive it
// at runtime from VAPID_PRIVATE_KEY so only one secret has to be stored.
export const Route = createFileRoute("/api/public/vapid-public-key")({
  server: {
    handlers: {
      GET: () => {
        try {
          const key = getVapidPublicKey();
          return new Response(JSON.stringify({ publicKey: key }), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "VAPID not configured";
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
