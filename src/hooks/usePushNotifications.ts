// usePushNotifications — Browser-Helper für Web Push (Service Worker
// registrieren, Subscription anlegen/aufheben, Status melden).
// Wird in den Alert-Settings genutzt; serverseitig liest der Cron
// `push_subscriptions` aus.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  savePushSubscription,
  removePushSubscription,
} from "@/lib/push.functions";

export type PushStatus =
  | "unsupported"   // kein Browser-Support
  | "denied"        // Nutzer hat blockiert
  | "default"       // noch nicht gefragt
  | "subscribed"    // aktiv
  | "loading";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const saveFn = useServerFn(savePushSubscription);
  const removeFn = useServerFn(removePushSubscription);

  const refresh = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setEndpoint(sub.endpoint);
        setStatus("subscribed");
      } else {
        setStatus(Notification.permission === "default" ? "default" : "default");
      }
    } catch {
      setStatus("default");
    }
  }, []);

  useEffect(() => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    // Service Worker registrieren (idempotent)
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => refresh())
      .catch(() => setStatus("default"));
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setStatus(perm === "denied" ? "denied" : "default");
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/public/vapid-public-key");
      if (!keyRes.ok) throw new Error("VAPID key missing");
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const raw = sub.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
        throw new Error("Subscription incomplete");
      }
      await saveFn({
        data: {
          endpoint: raw.endpoint,
          p256dh: raw.keys.p256dh,
          auth: raw.keys.auth,
          userAgent: navigator.userAgent.slice(0, 500),
        },
      });
      setEndpoint(raw.endpoint);
      setStatus("subscribed");
      return true;
    } catch (e) {
      console.error("Push subscribe failed", e);
      return false;
    }
  }, [saveFn]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const ep = sub.endpoint;
        await sub.unsubscribe();
        await removeFn({ data: { endpoint: ep } });
      }
      setEndpoint(null);
      setStatus("default");
      return true;
    } catch {
      return false;
    }
  }, [removeFn]);

  return { status, endpoint, subscribe, unsubscribe, refresh };
}
