import { createFileRoute } from "@tanstack/react-router";
import { SectorRotationPage } from "@/components/pages/SectorRotationPage";

export const Route = createFileRoute("/sectors")({
  component: () => <SectorRotationPage />,
});
