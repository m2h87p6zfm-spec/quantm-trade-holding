import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard } from "lucide-react";

/**
 * Renders "Anmelden" when no session exists and "Dashboard" otherwise.
 * Used in public marketing-style headers so a signed-in user is never
 * prompted to log in again when navigating between public pages.
 */
export function AuthNavButton({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  const base =
    "inline-flex h-9 items-center rounded-lg bg-primary px-3 sm:px-4 text-xs sm:text-sm font-semibold text-primary-foreground transition hover:opacity-90";
  const cls = className ?? base;

  // While the session is still hydrating, render a neutral placeholder of the
  // same size so the layout does not shift and we never flash "Anmelden" to a
  // signed-in user.
  if (loading) {
    return <span className={cls + " opacity-0 pointer-events-none"}>···</span>;
  }

  if (user) {
    return (
      <Link to="/konto" className={cls}>
        <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
        Mein Konto
      </Link>
    );
  }
  return (
    <Link to="/login" className={cls}>
      Anmelden
    </Link>
  );
}
