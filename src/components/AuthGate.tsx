import { useEffect, type ReactNode } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTradingProfile } from "@/hooks/use-trading-profile";
import { Loader2 } from "lucide-react";

/** Routes that must remain reachable without a session. */
const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/passwort-vergessen",
  "/passwort-zuruecksetzen",
  "/checkout/return",
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
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (!isPublic(pathname)) navigate({ to: "/login", replace: true });
      return;
    }
    // Logged in — wait for profile, then force onboarding if not done.
    if (profileLoading) return;
    const needsOnboarding = !profile || profile.onboarding_completed === false;
    if (needsOnboarding && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!needsOnboarding && pathname === "/onboarding") {
      navigate({ to: "/", replace: true });
    }
  }, [user, authLoading, profile, profileLoading, pathname, navigate]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isPublic(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Block protected content from flashing while we redirect to /onboarding.
  if (user && profile && !profile.onboarding_completed && pathname !== "/onboarding") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
