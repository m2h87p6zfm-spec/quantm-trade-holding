import { type ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTradingProfile } from "@/hooks/use-trading-profile";
import { FirstRunTour } from "@/components/FirstRunTour";
import { ApexLogo, ApexWordmark } from "@/components/ApexLogo";

// Brand splash — silver Q + full wordmark with a subtle pulse, sized
// large enough to read the metallic wordmark cleanly.
function ApexLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex flex-col items-center gap-6">
        <ApexLogo className="h-24 w-24 animate-pulse" />
        <ApexWordmark className="h-7 w-auto opacity-90" />
        <div className="mt-2 h-0.5 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[loadbar_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
        </div>
      </div>
      <style>{`@keyframes loadbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
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

  return (
    <>
      {children}
      <FirstRunTour />
    </>
  );
}
