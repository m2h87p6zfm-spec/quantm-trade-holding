import { type ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTradingProfile } from "@/hooks/use-trading-profile";
import { FirstRunTour } from "@/components/FirstRunTour";
import { ApexLogo, ApexWordmark } from "@/components/ApexLogo";

/**
 * Brand splash — silver Q + wordmark on a deep, vignetted canvas.
 * Refined typographic spacing, a hairline divider, and a thin
 * indeterminate progress sliver instead of a pulsing logo.
 */
function ApexLoadingScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      {/* subtle radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 55%), radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div className="relative flex flex-col items-center px-6">
        <ApexLogo className="h-40 w-40 sm:h-52 sm:w-52" />
        <div className="mt-10 h-px w-40 bg-gradient-to-r from-transparent via-zinc-400/40 to-transparent" />
        <ApexWordmark className="mt-10 h-12 w-auto sm:h-16 opacity-95" />
        <div className="relative mt-12 h-[2px] w-56 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="absolute inset-y-0 left-0 w-1/3 animate-[apexbar_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
        </div>
      </div>
      <style>{`@keyframes apexbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(420%); } }`}</style>
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

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useTradingProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const publicRoute = isPublic(pathname);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (authLoading || (user && profileLoading)) {
    return <ApexLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
