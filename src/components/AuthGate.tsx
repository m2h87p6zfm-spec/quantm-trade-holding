import { useEffect, useState, type ReactNode } from "react";
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
      <div className="relative flex flex-col items-center px-6 w-full max-w-[min(90vw,28rem)] animate-[apexfade_700ms_ease-out_both]">
        <div className="relative overflow-hidden" style={{ width: "clamp(6rem, 18vw + 4vh, 13rem)", height: "clamp(6rem, 18vw + 4vh, 13rem)" }}>
          <ApexLogo className="h-full w-full animate-[apexbreathe_3.2s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[apexshimmer_2.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent [mask-image:radial-gradient(circle,black_55%,transparent_75%)]" />
        </div>
        <div
          className="h-px bg-gradient-to-r from-transparent via-zinc-300/50 to-transparent"
          style={{
            width: "clamp(7rem, 28vw, 18rem)",
            marginTop: "clamp(0.875rem, 2.5vh + 0.5vw, 2.5rem)",
          }}
        />
        <div
          className="relative overflow-hidden max-w-full"
          style={{ marginTop: "clamp(0.875rem, 2.5vh + 0.5vw, 2.5rem)" }}
        >
          <ApexWordmark
            className="w-auto max-w-full opacity-95 animate-[apexbreathe_3.2s_ease-in-out_infinite]"
            style={{ height: "clamp(3rem, 6vw + 3vh, 8rem)" }}
          />
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[apexshimmer_2.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <div
          className="relative h-[2px] overflow-hidden rounded-full bg-white/[0.06]"
          style={{
            width: "clamp(7rem, 28vw, 18rem)",
            marginTop: "clamp(1.25rem, 3.5vh + 0.5vw, 3.5rem)",
          }}
        >
          <div className="absolute inset-y-0 left-0 w-1/3 animate-[apexbar_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
        </div>
      </div>
      <style>{`
        @keyframes apexbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(420%); } }
        @keyframes apexshimmer { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(200%); } }
        @keyframes apexbreathe { 0%, 100% { opacity: 0.82; } 50% { opacity: 1; } }
        @keyframes apexfade { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[apexshimmer_2\\.6s_ease-in-out_infinite\\],
          .animate-\\[apexbreathe_3\\.2s_ease-in-out_infinite\\],
          .animate-\\[apexbar_1\\.4s_cubic-bezier\\(0\\.4\\,0\\,0\\.2\\,1\\)_infinite\\],
          .animate-\\[apexfade_700ms_ease-out_both\\] { animation: none !important; }
        }
      `}</style>
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

  // Enforce a minimum splash duration so the brand mark is legible on first paint.
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinSplashElapsed(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (authLoading || (user && profileLoading) || !minSplashElapsed) {
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
