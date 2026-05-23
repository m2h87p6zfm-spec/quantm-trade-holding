import { supabase } from "@/integrations/supabase/client";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasUsableLifetime(token: string | null | undefined): token is string {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 60_000;
  } catch {
    return true;
  }
}

export async function getCurrentAccessToken(preferredToken?: string | null): Promise<string | null> {
  if (hasUsableLifetime(preferredToken)) return preferredToken;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (hasUsableLifetime(data.session?.access_token)) return data.session.access_token;

    if (attempt === 0) {
      const refreshed = await supabase.auth.refreshSession().catch(() => null);
      if (hasUsableLifetime(refreshed?.data.session?.access_token)) return refreshed.data.session.access_token;
    }

    await wait(120 * (attempt + 1));
  }

  return null;
}