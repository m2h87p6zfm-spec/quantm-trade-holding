import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radar, Flame, Compass, Network } from "lucide-react";
import { HeatmapPage } from "./heatmap";
import { SectorRotationPage } from "./sectors";
import { CorrelationsPage } from "./correlations";

type Tab = "heatmap" | "sectors" | "correlations";

export const Route = createFileRoute("/markt-radar")({
  component: MarktRadarPage,
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const t = s.tab;
    return t === "heatmap" || t === "sectors" || t === "correlations" ? { tab: t } : {};
  },
});

function MarktRadarPage() {
  const navigate = useNavigate({ from: "/markt-radar" });
  const { tab } = useSearch({ from: "/markt-radar" });
  const active: Tab = tab ?? "heatmap";

  const setTab = (v: string) =>
    navigate({ search: { tab: v as Tab }, replace: true });

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Unified Hero */}
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Radar className="h-3 w-3 text-primary" /> Markt-Radar
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Wo bewegt sich der Markt — und warum?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Drei Perspektiven auf eine Frage: Welche Werte laufen, welche Sektoren führen
          und welche Positionen bewegen sich praktisch identisch. Zusammen ergeben sie ein
          vollständiges Bild der Marktstruktur.
        </p>
      </div>

      {/* Tab-Navigation als visuell ansprechende Karten */}
      <Tabs value={active} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full h-auto grid-cols-3 gap-2 rounded-2xl border border-border bg-card/40 p-2 backdrop-blur">
          <TabTriggerCard
            value="heatmap"
            icon={<Flame className="h-4 w-4" />}
            label="Heatmap"
            sub="Marktpuls — was läuft heute?"
            tone="bear"
          />
          <TabTriggerCard
            value="sectors"
            icon={<Compass className="h-4 w-4" />}
            label="Sektor-Rotation"
            sub="Risk-On oder Risk-Off?"
            tone="primary"
          />
          <TabTriggerCard
            value="correlations"
            icon={<Network className="h-4 w-4" />}
            label="Korrelationen"
            sub="Klumpenrisiko erkennen"
            tone="violet"
          />
        </TabsList>

        <TabsContent value="heatmap" className="mt-0">
          <HeatmapPage embedded />
        </TabsContent>
        <TabsContent value="sectors" className="mt-0">
          <SectorRotationPage embedded />
        </TabsContent>
        <TabsContent value="correlations" className="mt-0">
          <CorrelationsPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabTriggerCard({
  value,
  icon,
  label,
  sub,
  tone,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  tone: "bull" | "bear" | "primary" | "violet";
}) {
  const toneText =
    tone === "bear" ? "text-bear"
    : tone === "bull" ? "text-bull"
    : tone === "violet" ? "text-violet-accent"
    : "text-primary";
  return (
    <TabsTrigger
      value={value}
      className="group flex h-auto flex-col items-start gap-1 rounded-xl px-4 py-3 text-left data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border"
    >
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 ring-1 ring-border/60 ${toneText}`}>
          {icon}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-[11px] text-muted-foreground hidden sm:block">{sub}</span>
    </TabsTrigger>
  );
}
