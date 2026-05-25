// Geteilter Marktdaten-Cache via Supabase.
// Alle Worker-Isolates teilen sich denselben Cache → Hit-Rate steigt
// von ~30 % (in-memory) auf 80–95 %. Spart dramatisch TD-Credits.
//
// Schichten-Modell: in-memory (heißeste Daten, < 1 ms) → Supabase
// (geteilt zwischen Isolates, ~30–80 ms) → Twelve Data (kostet Credits).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Hit<T> = { value: T; lastUpdated: number; stale: boolean };

export async function sharedGet<T>(key: string): Promise<Hit<T> | null> {
  try {
    const { data } = await supabaseAdmin
      .from("market_cache")
      .select("payload, expires_at, updated_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    const expires = new Date(data.expires_at).getTime();
    const updated = new Date(data.updated_at).getTime();
    const stale = expires <= Date.now();
    return { value: data.payload as T, lastUpdated: updated, stale };
  } catch {
    return null;
  }
}

export async function sharedSet<T>(key: string, value: T, ttlSec: number): Promise<void> {
  try {
    const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
    await supabaseAdmin
      .from("market_cache")
      .upsert({ cache_key: key, payload: value as any, expires_at, updated_at: new Date().toISOString() }, { onConflict: "cache_key" });
  } catch {
    // Cache-Fehler dürfen nie den Request brechen.
  }
}
