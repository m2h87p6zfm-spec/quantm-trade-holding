import { type ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTradingProfile } from "@/hooks/use-trading-profile";
import { Loader2 } from "lucide-react";

// Brand-neutral splash — no translated text here, since it renders before
// the language preference is hydrated from localStorage (would otherwise
// cause an SSR/CSR hydration mismatch).
function ApexLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-card shadow-lg shadow-primary/10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">Quantm Trade</p>
        <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
      </div>
    </main>
  );
}


/** Routes that must remain reachable without a session. */
const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/passwort-vergessen",
  "/passwort-zuruecksetzen",
  "/checkout/return",
  "/auth/confirm",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

/**
 * Global gate:
 *  • Logged-out users → /login (only auth screens reachable).
 *  • Logged-in users with incomplete onboarding → /onboarding (forced).
 *  • Everyone else → free roam.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useTradingProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const publicRoute = isPublic(pathname);

  // Auth utility pages must render immediately, even while the auth client is
  // still resolving URL tokens. Otherwise users only see the global loading
  // splash and never reach the visible retry/login button.
  if (publicRoute) {
    return <>{children}</>;
  }

  if (authLoading || (user && profileLoading)) {
    return <ApexLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block protected content from flashing while we redirect to /onboarding.
  // Treat a missing profile as "needs onboarding" so a freshly verified user
  // (whose profile row may not exist yet) is always sent to /onboarding
  // instead of landing on a route that crashes on a null profile.
  const needsOnboarding =
    user && pathname !== "/onboarding" && (profile === null || profile.onboarding_completed === false);
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user && profile?.onboarding_completed === true && pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
