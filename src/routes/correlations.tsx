import { createFileRoute } from "@tanstack/react-router";
import { CorrelationsPage } from "@/components/pages/CorrelationsPage";

export const Route = createFileRoute("/correlations")({
  component: () => <CorrelationsPage />,
});
