import { useEffect, type ReactNode } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
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
  // Allow any auth callback / api hits
  if (pathname.startsWith("/api/")) return true;
  return false;
}

/**
 * Global gate: blocks the entire app for unauthenticated users.
 * Anyone hitting a non-public route while signed out is bounced to /login.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic(pathname)) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, pathname, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isPublic(pathname)) {
    // Render nothing while the redirect effect fires — prevents flash of protected content.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
