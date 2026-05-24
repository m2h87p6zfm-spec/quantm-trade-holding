import { createFileRoute, redirect } from "@tanstack/react-router";

// Screener wurde in Quantm Picks (Modus „Durchsuchen") integriert.
// Diese Route leitet permanent dorthin um, damit alte Links/Bookmarks weiter funktionieren.
export const Route = createFileRoute("/screener")({
  beforeLoad: () => {
    throw redirect({ to: "/picks" });
  },
});
