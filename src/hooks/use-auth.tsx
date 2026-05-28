import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("AUTH_TIMEOUT")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<Session | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 8000);
      setSession(data.session);
      return data.session ?? null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authEventSeen = false;
    const loggedUsers = new Set<string>();
    const logLogin = (s: Session | null) => {
      const uid = s?.user?.id;
      if (!uid || loggedUsers.has(uid)) return;
      loggedUsers.add(uid);
      const provider =
        (s?.user?.app_metadata as { provider?: string } | undefined)?.provider ?? "email";
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      // Fire-and-forget — Login darf nicht blockieren, falls Insert fehlschlägt
      void supabase
        .from("login_events")
        .insert({ user_id: uid, user_agent: ua, provider, event: "SIGNED_IN" });
    };

    void withTimeout(supabase.auth.getSession(), 8000)
      .then(({ data }) => {
        if (!mounted || authEventSeen) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted || authEventSeen) return;
        setSession(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt, s) => {
      if (!mounted) return;
      authEventSeen = true;
      setSession(s);
      setLoading(false);
      if (evt === "SIGNED_IN") logLogin(s);
      if (evt === "SIGNED_OUT") loggedUsers.clear();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    refreshSession,
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setLoading(false);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
