// "Remember me" persistence helper.
//
// Supabase persists sessions in localStorage by default. When the user opts
// OUT of "remember me", we treat the session as tab-scoped: on the next time
// the app boots in a brand-new tab/browser window we sign out, so the user
// is not auto-logged-in on the next browser launch.
//
// Implementation: we set a sessionStorage marker once per tab. If the user
// chose not to be remembered AND that marker is missing on boot, we know the
// tab was just opened fresh and we clear the persisted session.

import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "qt_remember";
const TAB_MARKER = "qt_tab_active";

export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    // Mark this tab as "active" so the current session survives reloads.
    window.sessionStorage.setItem(TAB_MARKER, "1");
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

export function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(REMEMBER_KEY);
    // Default: remember (matches previous behavior, no surprise sign-outs).
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

/**
 * Call once on app boot, BEFORE reading the Supabase session.
 * If the user opted out of "remember me" and this is a fresh tab, sign out
 * so the persisted session does not auto-restore.
 */
export async function enforceRememberMePolicy(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const remember = getRememberMe();
    const tabActive = window.sessionStorage.getItem(TAB_MARKER) === "1";
    if (!remember && !tabActive) {
      await supabase.auth.signOut().catch(() => null);
    }
    window.sessionStorage.setItem(TAB_MARKER, "1");
  } catch {
    /* ignore */
  }
}
