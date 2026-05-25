// Wrapper um fetch, der den aktuellen Supabase-Access-Token als Bearer
// Authorization-Header an interne /api/public/* Endpoints anhängt. Wird
// gebraucht, weil die Markt-Daten-Endpoints jetzt requireUserId erzwingen.
import { getCurrentAccessToken } from "@/lib/auth-token";

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getCurrentAccessToken().catch(() => null);
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export async function getAccessTokenForUrl(): Promise<string | null> {
  return getCurrentAccessToken().catch(() => null);
}
