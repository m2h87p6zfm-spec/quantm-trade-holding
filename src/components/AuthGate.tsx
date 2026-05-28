import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTradingProfile } from "@/hooks/use-trading-profile";
import { FirstRunTour } from "@/components/FirstRunTour";
import { ApexLogo } from "@/components/ApexLogo";

/**
 * Brand splash — silver Q + wordmark on a deep, vignetted canvas.
 * Refined typographic spacing, a hairline divider, and a thin
 * indeterminate progress sliver instead of a pulsing logo.
 */
function ApexLoadingScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Ambient backdrop — Apple-style vignette + primary aurora */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 35%, color-mix(in oklab, var(--primary) 10%, transparent) 0%, transparent 60%), radial-gradient(900px 600px at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 65%)",
        }}
      />
      {/* Fine grid — TradingView terminal vibe, very subtle */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* Slow rotating conic glow behind the mark */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] opacity-40 animate-[apexglow_22s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary) 35%, transparent) 90deg, transparent 180deg, color-mix(in oklab, var(--primary) 20%, transparent) 270deg, transparent 360deg)",
          filter: "blur(60px)",
          transformOrigin: "center",
          marginLeft: "-21rem",
          marginTop: "-21rem",
        }}
      />

      <div className="relative flex flex-col items-center px-6 w-full max-w-[min(90vw,32rem)] animate-[apexfade_700ms_ease-out_both]">
        {/* Q monogram with ring + rotating arc */}
        <div
          className="relative"
          style={{ width: "clamp(4rem, 9vw + 2vh, 7rem)", height: "clamp(4rem, 9vw + 2vh, 7rem)" }}
        >
          <div className="absolute inset-0 rounded-full border border-foreground/10" />
          <svg
            className="absolute inset-0 h-full w-full animate-[apexarc_3.6s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="none"
          >
            <defs>
              <linearGradient id="apexArc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="48"
              stroke="url(#apexArc)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="60 240"
            />
          </svg>
          <div className="absolute inset-[14%] overflow-hidden">
            <ApexLogo className="h-full w-full animate-[apexbreathe_3.2s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[apexshimmer_2.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/10 to-transparent [mask-image:radial-gradient(circle,black_55%,transparent_75%)]" />
          </div>
        </div>

        {/* Wordmark — matches sidebar header style */}
        <div
          className="flex items-baseline justify-center"
          style={{ marginTop: "clamp(1rem, 2.4vh + 0.5vw, 2rem)" }}
        >
          <span
            className="font-bold tracking-tight text-foreground leading-none"
            style={{ fontSize: "clamp(1.75rem, 3.6vw + 1.2vh, 3rem)" }}
          >
            Quantm{" "}
            <span className="font-medium text-muted-foreground">Trade</span>
          </span>
        </div>

        {/* Tagline — quiet, confident */}
        <p
          className="text-[0.7rem] uppercase tracking-[0.32em] text-foreground/45"
          style={{ marginTop: "clamp(0.75rem, 1.6vh, 1.25rem)" }}
        >
          Markets · Signals · Intelligence
        </p>

        {/* Hairline divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
          style={{
            width: "clamp(8rem, 26vw, 16rem)",
            marginTop: "clamp(1rem, 2.4vh, 1.75rem)",
          }}
        />

        {/* Indeterminate progress sliver */}
        <div
          className="relative h-[2px] overflow-hidden rounded-full bg-foreground/10"
          style={{
            width: "clamp(8rem, 28vw, 18rem)",
            marginTop: "clamp(0.875rem, 2vh, 1.5rem)",
          }}
        >
          <div className="absolute inset-y-0 left-0 w-1/3 animate-[apexbar_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-gradient-to-r from-transparent via-foreground/85 to-transparent" />
        </div>

        {/* Live status pip */}
        <div
          className="flex items-center gap-2 text-[0.7rem] text-foreground/45"
          style={{ marginTop: "clamp(0.75rem, 1.6vh, 1.25rem)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull/60 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
          </span>
          <span className="tracking-[0.18em] uppercase">Connecting to live markets</span>
        </div>
      </div>

      <style>{`
        @keyframes apexbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(420%); } }
        @keyframes apexshimmer { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(200%); } }
        @keyframes apexbreathe { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
        @keyframes apexfade { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes apexarc { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes apexglow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[apexshimmer_2\\.6s_ease-in-out_infinite\\],
          .animate-\\[apexshimmer_3s_ease-in-out_infinite\\],
          .animate-\\[apexbreathe_3\\.2s_ease-in-out_infinite\\],
          .animate-\\[apexbar_1\\.6s_cubic-bezier\\(0\\.4\\,0\\,0\\.2\\,1\\)_infinite\\],
          .animate-\\[apexarc_3\\.6s_linear_infinite\\],
          .animate-\\[apexglow_22s_linear_infinite\\],
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
  "/impressum",
  "/agb",
  "/datenschutz",
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

  // Watchdog: never keep the splash up for more than 12s. If auth or the
  // trading-profile fetch stalls (slow network, background tab, transient
  // Supabase hiccup), force-release the splash so the app can render and
  // surface its own loading/error UI instead of an indefinite splash screen.
  const [watchdogElapsed, setWatchdogElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWatchdogElapsed(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // If a Supabase auth link redirected the user back to any page other than
  // /auth/confirm with auth tokens / codes / errors in the URL, forward the
  // full URL (search + hash) to /auth/confirm so it can complete the flow.
  const [authRedirecting, setAuthRedirecting] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === "/auth/confirm") return;
    const search = window.location.search;
    const hash = window.location.hash;
    const combined = `${search}${hash}`;
    const hasAuthPayload =
      /[?#&](code|token_hash|access_token|refresh_token|error|error_description|type)=/.test(
        combined,
      );
    if (hasAuthPayload) {
      setAuthRedirecting(true);
      window.location.replace(`/auth/confirm${search}${hash}`);
    }
  }, [pathname]);

  if (authRedirecting) {
    return <ApexLoadingScreen />;
  }


  if (publicRoute) {
    return <>{children}</>;
  }



  const stillLoading = authLoading;
  if ((stillLoading && !watchdogElapsed) || !minSplashElapsed) {
    return <ApexLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileLoading) {
    return <>{children}</>;
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
