import { supabase } from "@/integrations/supabase/client";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCurrentAccessToken(preferredToken?: string | null): Promise<string | null> {
  if (preferredToken) return preferredToken;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;

    if (attempt === 0) {
      const refreshed = await supabase.auth.refreshSession().catch(() => null);
      if (refreshed?.data.session?.access_token) return refreshed.data.session.access_token;
    }

    await wait(120 * (attempt + 1));
  }

  return null;
}