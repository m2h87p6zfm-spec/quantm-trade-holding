import { createFileRoute } from "@tanstack/react-router";
import { OnboardingGate } from "@/components/OnboardingGate";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Quantm Trade" },
      { name: "description", content: "Personalisiere deine Quantm Trade AI-Plattform." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <OnboardingGate />
    </div>
  );
}
