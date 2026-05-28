import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      setLoading(false);
      if (evt === "SIGNED_IN") logLogin(s);
      if (evt === "SIGNED_OUT") loggedUsers.clear();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
