import { createFileRoute, redirect } from "@tanstack/react-router";

// Quant-Signale wurden in die Watchlist (Startseite) integriert.
// Alte Lesezeichen werden weitergeleitet.
export const Route = createFileRoute("/signale")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
