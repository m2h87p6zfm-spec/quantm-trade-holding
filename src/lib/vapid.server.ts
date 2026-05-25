// Server-only VAPID helper. Derives the public key from the private key
// on demand (so we only need ONE secret stored) and sends Web Push
// notifications to subscribed browsers using a Worker-compatible library.

import { p256 } from "@noble/curves/nist.js";
import {
  buildPushPayload,
  type PushMessage,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

let cachedPublicKey: string | null = null;

/**
 * Compute the uncompressed P-256 public key (65 bytes, base64url) from the
 * stored VAPID private scalar. Cached per-process.
 */
export function getVapidPublicKey(): string {
  if (cachedPublicKey) return cachedPublicKey;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) throw new Error("VAPID_PRIVATE_KEY not configured");
  const d = b64urlDecode(priv);
  if (d.length !== 32) {
    throw new Error(`VAPID_PRIVATE_KEY has unexpected length ${d.length} (expected 32)`);
  }
  // getPublicKey(privateKey, isCompressed=false) → 65-byte uncompressed point
  const pub = p256.getPublicKey(d, false);
  cachedPublicKey = b64urlEncode(pub);
  return cachedPublicKey;
}

function getVapid(): VapidKeys {
  return {
    subject: process.env.VAPID_SUBJECT,
    publicKey: getVapidPublicKey(),
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
}

export type PushOutcome = {
  ok: boolean;
  status: number;
  gone: boolean; // 404/410 → subscription is dead, delete it
};

export async function sendPushTo(
  subscription: PushSubscription,
  payload: Record<string, unknown> | string,
  options?: { ttl?: number; topic?: string; urgency?: "low" | "normal" | "high" },
): Promise<PushOutcome> {
  const vapid = getVapid();
  const message: PushMessage = {
    data: typeof payload === "string" ? payload : JSON.stringify(payload),
    options: { ttl: options?.ttl ?? 60, ...(options ?? {}) },
  };
  const built = await buildPushPayload(message, subscription, vapid);
  const res = await fetch(subscription.endpoint, {
    method: built.method,
    headers: built.headers,
    body: built.body,
  });
  return {
    ok: res.ok,
    status: res.status,
    gone: res.status === 404 || res.status === 410,
  };
}
