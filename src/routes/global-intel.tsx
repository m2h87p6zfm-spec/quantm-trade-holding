import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCountryNews, type CountryNewsItem } from "@/lib/country-news.functions";
import { getEventArticle } from "@/lib/event-article.functions";
import { getMacroExplanations } from "@/lib/macro-explanations.functions";
import { trackView } from "@/lib/popularity-tracker";
import { MostTrackedCountries } from "@/components/MostTrackedCountries";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import {
  COUNTRIES,
  COUNTRIES_BY_NAME,
  COUNTRY_COORDS,
  COUNTRY_EXTRAS,
  EVENTS,
  EVENT_COLOR,
  GLOBAL_SUMMARY,
  MARKET_FEED,
  NEUTRAL_LAND,
  RISK_COLOR,
  RISK_LABEL,
  ROUTE_COLOR,
  TENSIONS,
  TRADE_FLOWS,
  type CountryIntel,
  type GlobalEvent,
  type FeedItem,
} from "@/lib/global-intel-data";
import {
  computeRiskScore,
  RISK_BAND_COLOR,
  RISK_BAND_LABEL,
  heatmapValue,
  heatColor,
  HEATMAP_LABEL,
  type HeatmapMode,
  tickersForCountry,
  useUserCountryExposure,
} from "@/lib/country-derived";
import { useSettings } from "@/lib/settings";
import { AGENCY_META } from "@/components/AgencyLogo";
import { PageExplainer } from "@/components/PageExplainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  ChevronDown,
  CircleDot,
  Coins,
  Compass,
  DollarSign,
  Droplets,
  Eye,
  Flame,
  Gauge,
  Globe2,
  HeartPulse,
  Landmark,
  Layers,
  ExternalLink,
  LineChart,
  Minus,
  Newspaper,
  Radio,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Wind,
  X,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/global-intel")({
  head: () => ({
    meta: [
      { title: "Global Market Intelligence War Room — Quantm Trade" },
      {
        name: "description",
        content:
          "Institutional global macro & geopolitical intelligence layer: trade flows, tension lines, event dots and country impact analytics.",
      },
      { property: "og:title", content: "Global Market Intelligence War Room" },
      {
        property: "og:description",
        content:
          "Bloomberg-style world intelligence map: macro, geopolitics, supply chains and market transmission in one view.",
      },
    ],
  }),
  component: GlobalIntelPage,
});

const WORLD_TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MAP_W = 1000;
const MAP_H = 520;

type WorldGeo = FeatureCollection<Geometry, { name: string }>;

type LayerToggles = {
  trade: boolean;
  tensions: boolean;
  events: boolean;
  heatmap: HeatmapMode;
};

function GlobalIntelPage() {
  const [world, setWorld] = useState<WorldGeo | null>(null);
  const [selected, setSelected] = useState<CountryIntel | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [utc, setUtc] = useState<string>("");
  const [layers, setLayers] = useState<LayerToggles>({ trade: true, tensions: true, events: true, heatmap: "none" });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setUtc(
        `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")} UTC`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(WORLD_TOPO_URL)
      .then((r) => {
        if (!r.ok) throw new Error("Map data unavailable");
        return r.json();
      })
      .then((topo: any) => {
        if (!alive) return;
        const geo = feature(topo, topo.objects.countries) as unknown as WorldGeo;
        setWorld(geo);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const path = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize(
      [MAP_W, MAP_H],
      world ?? ({ type: "Sphere" } as any),
    );
    return { path: geoPath(projection), projection };
  }, [world]);

  type AsideTab = "spotlight" | "country" | "event" | "feed";
  const [asideTab, setAsideTab] = useState<AsideTab>("spotlight");

  useEffect(() => { if (selected) { setAsideTab("country"); trackView("country", selected.iso2); } }, [selected]);
  useEffect(() => { if (selectedEvent) setAsideTab("event"); }, [selectedEvent]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top command bar */}
      <header className="relative overflow-hidden border-b border-white/[0.14]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-card/80 via-card/40 to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[1700px] px-4 pb-5 pt-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30">
                <Globe2 className="h-5 w-5 text-primary" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400/80" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  <span>Quantm</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span>Global Intelligence War Room</span>
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[1.7rem]">
                  Global Market &amp; Geopolitical Monitor
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-white/[0.14] bg-black/30 px-3 py-1.5 font-mono text-[11px] tabular-nums text-foreground/80 backdrop-blur">
              <Radio className="h-3 w-3 text-emerald-400" />
              <span className="text-muted-foreground">LIVE</span>
              <span className="mx-1 h-3 w-px bg-white/10" />
              <span>{utc || "--:--:-- UTC"}</span>
            </div>
          </div>

          <MovingMarketsBar />
        </div>
      </header>

      {/* Sticky in-page chip nav (TradingView-style) */}
      <SectionNav />

      <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-8">
        <PageExplainer
          title="Was siehst du hier — und warum bewegt das den Markt?"
          intro="Globale Politik, Konflikte und Handelsströme entscheiden über Rohstoffpreise, Währungen und Aktien. Diese Karte bündelt, was Profi-Trader morgens als Erstes checken: Wo brennt es geopolitisch, welche Lieferketten sind bedroht und welche Sektoren reagieren? Du musst kein Geopolitik-Experte sein — klick einfach Länder und Event-Punkte an, um die Folgen für deine Trades zu sehen."
          points={[
            { q: "Rote/Orange Punkte", a: "Aktive geopolitische Ereignisse (Konflikte, Sanktionen, Wahlen). Größe = Marktrelevanz. Klick → siehst betroffene Sektoren." },
            { q: "Linien auf der Karte", a: "Blau = Handelsströme (z.B. Öl, Chips). Rot = militärische/diplomatische Spannungen. Beides verschiebt globale Preise sofort." },
            { q: "Länder anklicken", a: "Öffnet ein Briefing: BIP, Risk-Score, größte Exporte und welche Aktien/ETFs typischerweise auf das Land reagieren." },
            { q: "Wie nutze ich das?", a: "Vor wichtigen Trades: Schau, ob ein aktives Event deine Position beeinflusst (z.B. Öl-Position bei Nahost-Spannungen)." },
          ]}
          cta="Tipp: Der Live Feed in der Seitenleiste zeigt eingehende Nachrichten mit ihrer Marktwirkung — perfekt für den Morgen-Check."
        />

        {/* 1. MARKET OVERVIEW */}
        <Panel id="briefing" eyebrow="At a glance" title="Global Market Overview" icon={Globe2} collapsible defaultOpen>
          <StrategicBriefing />
        </Panel>


        {/* 2. COMMAND CENTER (Map + tabbed aside) */}
        <Panel id="command" eyebrow="Realtime" title="Global Intelligence Map" icon={Globe2} padded={false}>
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_440px]">
            {/* Map */}
            <div className="relative border-b border-white/[0.10] xl:border-b-0 xl:border-r">
              <CornerOrnaments />

              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/[0.14] bg-black/50 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-md">
                <Activity className="h-3 w-3 text-primary" />
                <span>Intelligence Layer · 2D</span>
              </div>

              <LayerControls layers={layers} setLayers={setLayers} />

              {hovered && (() => {
                const hc = COUNTRIES_BY_NAME.get(hovered);
                return (
                  <div className="pointer-events-none absolute bottom-16 left-4 z-10 max-w-[280px] rounded-lg border border-white/[0.14] bg-black/75 p-2.5 backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      {hc && <span className="text-base leading-none">{hc.flag}</span>}
                      <span className="text-[11px] font-semibold text-foreground">{hovered}</span>
                      {hc && (
                        <span
                          className="ml-auto rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
                          style={{
                            color: RISK_COLOR[hc.risk],
                            backgroundColor: `color-mix(in oklab, ${RISK_COLOR[hc.risk]} 18%, transparent)`,
                          }}
                        >
                          {RISK_LABEL[hc.risk]}
                        </span>
                      )}
                    </div>
                    {hc ? (
                      <>
                        <div className="mt-1.5 text-[11px] leading-snug text-foreground/80">{hc.summary}</div>
                        <div className="mt-1.5 border-t border-white/10 pt-1.5 text-[10px] text-primary/90">
                          Klick → volle Marktanalyse für deine Trades
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-[10px] text-muted-foreground">Keine Daten verfügbar</div>
                    )}
                  </div>
                );
              })()}

              {selectedEvent && (
                <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 rounded-md border border-amber-400/30 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-300/90 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  Propagation · {selectedEvent.title}
                </div>
              )}

              <div className="relative aspect-[4/3] w-full sm:aspect-[1000/520]">
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Map unavailable: {error}
                  </div>
                )}
                {!error && (
                  <WorldMap
                    world={world}
                    geo={path}
                    selected={selected}
                    selectedEvent={selectedEvent}
                    hovered={hovered}
                    layers={layers}
                    onHover={setHovered}
                    onSelectCountry={(c) => { setSelected(c); setSelectedEvent(null); }}
                    onSelectEvent={(e) => setSelectedEvent(e)}
                  />
                )}
              </div>

              <MapLegend />
            </div>

            {/* Tabbed side panel — replaces stacked aside, cuts vertical sprawl */}
            <aside className="flex max-h-none min-h-[320px] flex-col xl:max-h-[calc(100vh-6rem)] xl:min-h-[480px]">
              <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/[0.10] bg-white/[0.02] px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <AsideTabBtn active={asideTab === "spotlight"} onClick={() => setAsideTab("spotlight")} icon={Flame} label="Spotlight" />
                <AsideTabBtn
                  active={asideTab === "country"}
                  onClick={() => selected && setAsideTab("country")}
                  icon={Compass}
                  label={selected ? selected.name : "Country"}
                  disabled={!selected}
                />
                <AsideTabBtn
                  active={asideTab === "event"}
                  onClick={() => selectedEvent && setAsideTab("event")}
                  icon={Zap}
                  label="Event"
                  disabled={!selectedEvent}
                />
                <AsideTabBtn active={asideTab === "feed"} onClick={() => setAsideTab("feed")} icon={Newspaper} label="Live Feed" />
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {asideTab === "spotlight" && (
                  <ActiveFlashpoints
                    onSelectEvent={(e) => setSelectedEvent(e)}
                    onSelectCountry={(c) => setSelected(c)}
                  />
                )}
                {asideTab === "country" && selected && (
                  <CountryPanel country={selected} onClose={() => { setSelected(null); setAsideTab("spotlight"); }} />
                )}
                {asideTab === "event" && selectedEvent && (
                  <EventPanel event={selectedEvent} onClose={() => { setSelectedEvent(null); setAsideTab("spotlight"); }} />
                )}
                {asideTab === "feed" && <IntelFeed />}
              </div>
            </aside>
          </div>
        </Panel>

        {/* 3. COUNTRIES */}
        <Panel id="countries" eyebrow="Search and filter" title="Tracked Countries" icon={Search}>
          <div className="mb-4">
            <MostTrackedCountries
              onSelect={(c) => {
                setSelected(c);
                setSelectedEvent(null);
                if (typeof document !== "undefined") {
                  document.getElementById("command")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            />
          </div>
          <CountryFinder
            selected={selected}
            onSelect={(c) => {
              setSelected(c);
              setSelectedEvent(null);
              if (typeof document !== "undefined") {
                document.getElementById("command")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          />
        </Panel>
      </main>
    </div>
  );
}

/* ─────────────────── Panel + SectionNav + AsideTabBtn ─────────────────── */

function Panel({
  id,
  eyebrow,
  title,
  icon: Icon,
  action,
  children,
  padded = true,
  collapsible = false,
  defaultOpen = true,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      id={id}
      className="scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]"
    >
      <header className="flex items-center gap-3 border-b border-white/[0.10] bg-white/[0.025] px-5 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action}
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-white/[0.10] bg-white/[0.02] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"}
          </button>
        )}
      </header>
      {open && <div className={padded ? "p-5" : ""}>{children}</div>}
    </section>
  );
}

function SectionNav() {
  const items: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "briefing", label: "Briefing", icon: Sparkles },
    { id: "command", label: "Map & Intel", icon: Globe2 },
    { id: "countries", label: "Countries", icon: Search },
  ];
  return (
    <nav
      className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md"
      aria-label="Section navigation"
    >
      <div className="mx-auto flex max-w-[1700px] items-center gap-1 overflow-x-auto px-4 py-2 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/[0.08] hover:text-primary"
          >
            <it.icon className="h-3 w-3" />
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function AsideTabBtn({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition ${
        active
          ? "bg-primary/15 text-primary"
          : disabled
            ? "cursor-not-allowed text-muted-foreground/40"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      }`}
    >
      <Icon className="h-3 w-3" />
      <span className="max-w-[120px] truncate">{label}</span>
    </button>
  );
}

/* ───────────────────── Components ───────────────────── */

function CornerOrnaments() {
  const cls = "pointer-events-none absolute h-4 w-4 border-primary/40";
  return (
    <>
      <span className={`${cls} left-2 top-2 border-l border-t`} />
      <span className={`${cls} right-2 top-2 border-r border-t`} />
      <span className={`${cls} bottom-2 left-2 border-b border-l`} />
      <span className={`${cls} bottom-2 right-2 border-b border-r`} />
    </>
  );
}

function LayerControls({
  layers,
  setLayers,
}: {
  layers: LayerToggles;
  setLayers: (l: LayerToggles) => void;
}) {
  const Item = ({
    on,
    onClick,
    icon: Icon,
    label,
  }: {
    on: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
        on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
  const heatModes: HeatmapMode[] = ["none", "risk", "influence", "stability", "inflation"];
  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/55 p-1 backdrop-blur-md">
        <Layers className="ml-1 h-3 w-3 text-muted-foreground" />
        <Item on={layers.trade} onClick={() => setLayers({ ...layers, trade: !layers.trade })} icon={RouteIcon} label="Flows" />
        <Item on={layers.tensions} onClick={() => setLayers({ ...layers, tensions: !layers.tensions })} icon={Flame} label="Tensions" />
        <Item on={layers.events} onClick={() => setLayers({ ...layers, events: !layers.events })} icon={Eye} label="Events" />
      </div>
      <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/55 p-1 backdrop-blur-md">
        <Gauge className="ml-1 h-3 w-3 text-muted-foreground" />
        <span className="mr-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Heatmap</span>
        {heatModes.map((m) => (
          <button
            key={m}
            onClick={() => setLayers({ ...layers, heatmap: m })}
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition ${
              layers.heatmap === m ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {HEATMAP_LABEL[m]}
          </button>
        ))}
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.12] bg-black/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
      <span className="flex items-center gap-1.5"><Dot color={RISK_COLOR.low} /> Stable</span>
      <span className="flex items-center gap-1.5"><Dot color={RISK_COLOR.medium} /> Watch</span>
      <span className="flex items-center gap-1.5"><Dot color={RISK_COLOR.high} /> Elevated</span>
      <span className="mx-2 h-3 w-px bg-white/10" />
      <span className="flex items-center gap-1.5"><Dot color={EVENT_COLOR.positive} /> Positive event</span>
      <span className="flex items-center gap-1.5"><Dot color={EVENT_COLOR.watch} /> Watch event</span>
      <span className="flex items-center gap-1.5"><Dot color={EVENT_COLOR.negative} /> Negative event</span>
      <span className="mx-2 h-3 w-px bg-white/10" />
      <span className="flex items-center gap-1.5"><LineSwatch color={ROUTE_COLOR.stable} /> Stable flow</span>
      <span className="flex items-center gap-1.5"><LineSwatch color={ROUTE_COLOR.tense} /> Tense</span>
      <span className="flex items-center gap-1.5"><LineSwatch color={ROUTE_COLOR.disrupted} dashed /> Disrupted</span>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />;
}
function LineSwatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      className="inline-block h-[2px] w-5"
      style={{
        backgroundImage: dashed
          ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`
          : undefined,
        backgroundColor: dashed ? undefined : color,
      }}
    />
  );
}

/* ───────── Moving Markets bar ───────── */

function MovingMarketsBar() {
  // Pick a tight, scannable subset — institutional, no spam.
  const items = MARKET_FEED.slice(0, 6);
  // Duplicate for seamless marquee loop.
  const loop = [...items, ...items];
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.12] bg-black/30 backdrop-blur">
      <div className="flex items-stretch">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-white/[0.12] bg-primary/10 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Activity className="h-3 w-3" />
          What's moving markets
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex animate-ticker whitespace-nowrap py-2 will-change-transform"
            style={{ animationDuration: "75s" }}
          >
            {loop.map((it, i) => {
              const tone =
                it.impact === "high"
                  ? "text-[oklch(0.78_0.12_25)]"
                  : it.impact === "medium"
                    ? "text-[oklch(0.82_0.10_78)]"
                    : "text-emerald-400/90";
              return (
                <span
                  key={`${it.id}-${i}`}
                  className="mx-5 inline-flex items-center gap-2 text-[12px] text-foreground/85"
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone.replace("text-", "bg-")}`} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {it.category}
                  </span>
                  <span className="font-medium text-foreground/95">{it.title}</span>
                  <span className="text-muted-foreground">— {it.body}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Strategic Briefing (cause → effect → markets) ───────── */

type Tone = "ok" | "warn" | "bad" | "info";
const TONE_COLOR: Record<Tone, string> = {
  ok: "oklch(0.74 0.12 155)",
  warn: "oklch(0.80 0.12 78)",
  bad: "oklch(0.68 0.15 25)",
  info: "oklch(0.74 0.10 240)",
};

/* (Strategic Briefing replaced by 3-layer Global Market Overview below) */


function ToneChip({ label, tone }: { label: string; tone: Tone }) {
  const color = TONE_COLOR[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold"
      style={{
        color,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

/* ───────── Global Market Overview — 3-layer dashboard ───────── */

type PillTone = "ok" | "warn" | "bad" | "info";
type Direction = "up" | "down" | "neutral";

const PILL_TONE: Record<PillTone, { fg: string; bg: string; ring: string; dot: string }> = {
  ok:   { fg: "text-emerald-300", bg: "bg-emerald-500/[0.07]", ring: "ring-emerald-500/25", dot: "bg-emerald-400" },
  warn: { fg: "text-amber-300",   bg: "bg-amber-500/[0.07]",   ring: "ring-amber-500/25",   dot: "bg-amber-400" },
  bad:  { fg: "text-rose-300",    bg: "bg-rose-500/[0.07]",    ring: "ring-rose-500/25",    dot: "bg-rose-400" },
  info: { fg: "text-sky-300",     bg: "bg-sky-500/[0.07]",     ring: "ring-sky-500/25",     dot: "bg-sky-400" },
};

function deriveSnapshot() {
  const s = GLOBAL_SUMMARY;
  // Map the underlying signal data to human-readable status words.
  const globalRisk: { label: string; tone: PillTone } =
    s.sentiment === "risk-on" ? { label: "Risk-On", tone: "ok" }
    : s.sentiment === "risk-off" ? { label: "Risk-Off", tone: "bad" }
    : { label: "Mixed", tone: "warn" };

  const marketTrend: { label: string; tone: PillTone } =
    s.mood === "bullish" ? { label: "Bullish", tone: "ok" }
    : s.mood === "bearish" ? { label: "Bearish", tone: "bad" }
    : { label: "Uncertain", tone: "warn" };

  const liquidity: { label: string; tone: PillTone } =
    s.trend === "expanding" ? { label: "Expanding", tone: "ok" }
    : s.trend === "recession" || s.trend === "slowing" ? { label: "Tight", tone: "bad" }
    : { label: "Stable", tone: "info" };

  const usd: { label: string; tone: PillTone } =
    s.usd === "strong" ? { label: "Strong", tone: "warn" }
    : s.usd === "weak" ? { label: "Weak", tone: "info" }
    : { label: "Neutral", tone: "info" };

  const vol: { label: string; tone: PillTone } =
    s.volatility === "high" ? { label: "High", tone: "bad" }
    : s.volatility === "low" ? { label: "Low", tone: "ok" }
    : { label: "Medium", tone: "warn" };

  return { globalRisk, marketTrend, liquidity, usd, vol };
}

/* Click-to-explain popover, shared by Snapshot pills + Driver cards. */
function ExplainPopover({
  metricKey,
  label,
  status,
  loading,
  explanation,
  children,
}: {
  metricKey: string;
  label: string;
  status: string;
  loading: boolean;
  explanation: { why: string; impact: string; citations: string[] } | undefined;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group relative w-full cursor-pointer rounded-2xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Explain ${label}: ${status}`}
        >
          {children}
          <span className="pointer-events-none absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/[0.06] text-[9px] font-bold text-muted-foreground ring-1 ring-white/10 transition group-hover:bg-primary/15 group-hover:text-primary">
            ?
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[320px] border-border bg-card p-0 text-foreground/90 shadow-2xl"
      >
        <div className="border-b border-white/[0.08] px-4 py-2.5">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 text-[13px] font-semibold">{status}</div>
        </div>
        <div className="space-y-3 px-4 py-3 text-[12.5px] leading-relaxed">
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Reading today's market signal…
            </div>
          )}
          {!loading && !explanation && (
            <p className="text-[11.5px] text-muted-foreground">
              Live explanation unavailable right now. Tap again in a moment.
            </p>
          )}
          {!loading && explanation && (
            <>
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Why
                </div>
                <p className="mt-1 text-foreground/95">{explanation.why}</p>
              </div>
              {explanation.impact && (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.05] p-2.5">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-primary/80">
                    What it means
                  </div>
                  <p className="mt-1 text-[12px] text-foreground/95">{explanation.impact}</p>
                </div>
              )}
              {explanation.citations.length > 0 && (
                <div className="border-t border-white/[0.06] pt-2">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                    Based on today's headlines
                  </div>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    {explanation.citations.map((c, i) => (
                      <li key={i}>· {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <div className="border-t border-white/[0.06] pt-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
            Updates several times a day · ID: {metricKey}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusPill({
  icon: Icon,
  label,
  status,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: string;
  tone: PillTone;
}) {
  const t = PILL_TONE[tone];
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.01] px-3 py-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
          <span className={`text-[13px] font-semibold leading-none ${t.fg}`}>{status}</span>
        </div>
      </div>
    </div>
  );
}

function DriverCard({
  icon: Icon,
  label,
  status,
  direction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: string;
  direction: Direction;
}) {
  const Arrow = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const dirTone: PillTone = direction === "up" ? "ok" : direction === "down" ? "bad" : "info";
  const t = PILL_TONE[dirTone];

  return (
    <article className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.01] px-4 py-3 transition hover:border-white/[0.12]">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className={`mt-1 text-[15px] font-semibold leading-none ${t.fg}`}>{status}</div>
      </div>
      <Arrow className={`h-4 w-4 shrink-0 ${t.fg}`} />
    </article>
  );
}

function ContextAccordion({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden border-b border-white/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:text-primary"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground/90">{title}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pb-4 pl-6 pr-2 text-[13px] leading-relaxed text-foreground/75">
          {children}
        </div>
      )}
    </div>
  );
}

function StrategicBriefing() {
  const snap = useMemo(deriveSnapshot, []);
  const s = GLOBAL_SUMMARY;

  // Direction inference for the 4 driver cards.
  const positioningDir: Direction =
    s.sentiment === "risk-on" ? "up" : s.sentiment === "risk-off" ? "down" : "neutral";
  const liquidityDir: Direction =
    s.trend === "expanding" ? "up" : s.trend === "recession" || s.trend === "slowing" ? "down" : "neutral";
  const usdDir: Direction =
    s.usd === "strong" ? "up" : s.usd === "weak" ? "down" : "neutral";
  const growthDir: Direction =
    s.trend === "expanding" ? "up" : s.trend === "recession" || s.trend === "slowing" ? "down" : "neutral";

  // Build the list of metrics whose explanations we want from the AI.
  const metrics = useMemo(
    () => [
      { key: "globalRisk" as const,  label: "Global Risk",            status: snap.globalRisk.label },
      { key: "marketTrend" as const, label: "Market Trend",           status: snap.marketTrend.label },
      { key: "liquidity" as const,   label: "Liquidity",              status: snap.liquidity.label },
      { key: "usd" as const,         label: "USD Strength",           status: snap.usd.label },
      { key: "vol" as const,         label: "Volatility",             status: snap.vol.label },
      { key: "positioning" as const, label: "Investor Positioning",   status: snap.globalRisk.label },
      { key: "liquidityCB" as const, label: "Liquidity & Central Banks", status: snap.liquidity.label },
      { key: "currency" as const,    label: "Currency Pressure",      status: snap.usd.label },
      { key: "growth" as const,      label: "Global Growth Outlook",  status: snap.liquidity.label },
    ],
    [snap],
  );

  const fetchExplanations = useServerFn(getMacroExplanations);
  const { data: explData, isLoading: explLoading } = useQuery({
    queryKey: ["macro-explanations", metrics.map((m) => `${m.key}:${m.status}`).join("|")],
    queryFn: () => fetchExplanations({ data: { metrics } }),
    staleTime: 6 * 60 * 60 * 1000, // 6h
    refetchOnWindowFocus: false,
  });
  const expl = explData?.explanations ?? {};

  return (
    <section aria-label="Global market overview" className="space-y-8">
      {/* ── LAYER 1 · Global Snapshot ─────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Global Snapshot
          </h3>
          <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
            Tap for reasoning
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <ExplainPopover metricKey="globalRisk" label="Global Risk" status={snap.globalRisk.label} loading={explLoading} explanation={expl.globalRisk}>
            <StatusPill icon={Gauge}      label="Global Risk"   status={snap.globalRisk.label}  tone={snap.globalRisk.tone} />
          </ExplainPopover>
          <ExplainPopover metricKey="marketTrend" label="Market Trend" status={snap.marketTrend.label} loading={explLoading} explanation={expl.marketTrend}>
            <StatusPill icon={LineChart}  label="Market Trend"  status={snap.marketTrend.label} tone={snap.marketTrend.tone} />
          </ExplainPopover>
          <ExplainPopover metricKey="liquidity" label="Liquidity" status={snap.liquidity.label} loading={explLoading} explanation={expl.liquidity}>
            <StatusPill icon={Droplets}   label="Liquidity"     status={snap.liquidity.label}   tone={snap.liquidity.tone} />
          </ExplainPopover>
          <ExplainPopover metricKey="usd" label="USD Strength" status={snap.usd.label} loading={explLoading} explanation={expl.usd}>
            <StatusPill icon={DollarSign} label="USD Strength"  status={snap.usd.label}         tone={snap.usd.tone} />
          </ExplainPopover>
          <ExplainPopover metricKey="vol" label="Volatility" status={snap.vol.label} loading={explLoading} explanation={expl.vol}>
            <StatusPill icon={Wind}       label="Volatility"    status={snap.vol.label}         tone={snap.vol.tone} />
          </ExplainPopover>
        </div>
      </div>

      {/* ── LAYER 2 · Core Market Drivers ─────────────────────────── */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Core Market Drivers
          </h3>
          <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
            Tap for reasoning
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ExplainPopover metricKey="positioning" label="Investor Positioning" status={snap.globalRisk.label} loading={explLoading} explanation={expl.positioning}>
            <DriverCard icon={Users}      label="Investor Positioning"   status={snap.globalRisk.label} direction={positioningDir} />
          </ExplainPopover>
          <ExplainPopover metricKey="liquidityCB" label="Liquidity & Central Banks" status={snap.liquidity.label} loading={explLoading} explanation={expl.liquidityCB}>
            <DriverCard icon={Landmark}   label="Liquidity & Central Banks" status={snap.liquidity.label} direction={liquidityDir} />
          </ExplainPopover>
          <ExplainPopover metricKey="currency" label="Currency Pressure" status={snap.usd.label} loading={explLoading} explanation={expl.currency}>
            <DriverCard icon={DollarSign} label="Currency Pressure"      status={snap.usd.label}         direction={usdDir} />
          </ExplainPopover>
          <ExplainPopover metricKey="growth" label="Global Growth Outlook" status={snap.liquidity.label} loading={explLoading} explanation={expl.growth}>
            <DriverCard icon={Globe2}     label="Global Growth Outlook"  status={snap.liquidity.label}   direction={growthDir} />
          </ExplainPopover>
        </div>
      </div>

      {/* ── LAYER 3 · Market Context (expandable) ─────────────────── */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Market Context
          </h3>
          <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
            Tap to expand
          </span>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-4">
          <ContextAccordion icon={Eye} title="Why markets are reacting this way" defaultOpen>
            <p>{s.headline}</p>
            <p className="mt-2 text-foreground/65">
              The combination of a firm dollar, sticky inflation pressure and decelerating
              global growth is driving capital toward US assets and away from the rest of the
              world. Investors are paying a premium for liquidity, quality and short-duration
              exposure — and discounting anything that depends on a synchronised global recovery.
            </p>
          </ContextAccordion>

          <ContextAccordion icon={ShieldCheck} title="Key geopolitical influences">
            <ul className="space-y-1.5 text-foreground/75">
              <li>· Middle East tensions keep an oil-risk premium baked into Brent and gold.</li>
              <li>· US–China tech and tariff posture is the single biggest swing factor for global capital flows.</li>
              <li>· European political risk (France / Germany) is widening sovereign spreads inside the eurozone.</li>
              <li>· Ukraine remains a structural driver for European energy mix and defence spending.</li>
            </ul>
          </ContextAccordion>

          <ContextAccordion icon={Flame} title="Commodity pressure drivers">
            <ul className="space-y-1.5 text-foreground/75">
              <li>· <span className="text-foreground">Oil:</span> OPEC+ discipline + Middle East risk = firm floor; demand softening at the margin.</li>
              <li>· <span className="text-foreground">Gold:</span> Central-bank buying + safe-haven flows offset a strong dollar.</li>
              <li>· <span className="text-foreground">Industrial metals:</span> Chinese demand remains the swing variable; AI capex lifts copper.</li>
              <li>· <span className="text-foreground">Grains:</span> Black Sea logistics and weather drive price spikes.</li>
            </ul>
          </ContextAccordion>

          <ContextAccordion icon={Globe2} title="Regional breakdown">
            <ul className="space-y-1.5 text-foreground/75">
              <li>· <span className="text-foreground">United States:</span> Earnings resilience and AI capex keep equities supported despite restrictive rates.</li>
              <li>· <span className="text-foreground">Europe:</span> Industrial weakness in Germany / France; energy gap to the US persists.</li>
              <li>· <span className="text-foreground">China:</span> Property unwind continues to drag goods inflation and commodity demand lower.</li>
              <li>· <span className="text-foreground">Emerging markets:</span> Strong dollar tightens conditions; India remains the standout growth story.</li>
              <li>· <span className="text-foreground">Japan:</span> BoJ normalisation is the biggest tail risk for global carry trades.</li>
            </ul>
          </ContextAccordion>
        </div>
      </div>
    </section>
  );
}


/* ───────── Event cause→effect chains (drives EventPanel + map propagation) ───────── */

type EventChain = {
  who: string[];               // countries affected (must match COUNTRY_COORDS keys)
  routes: string[];            // TradeFlow ids that light up
  direct: { label: string; tone: Tone; note: string }[];
  secondary: { label: string; tone: Tone; note: string }[];
  global: string;              // one-line global consequence
};

const EVENT_CHAINS: Record<string, EventChain> = {
  "ukr-war": {
    who: ["Russia", "Ukraine", "Germany", "France", "United Kingdom"],
    routes: ["ru-eu-gas", "ru-asia-oil"],
    direct: [
      { label: "Brent / TTF gas", tone: "bad", note: "Energy risk premium stays elevated in Europe." },
      { label: "EU wheat", tone: "bad", note: "Black-Sea grain corridor disruption keeps food prices firm." },
      { label: "EUR", tone: "bad", note: "Geopolitical risk premium weighs on the euro." },
    ],
    secondary: [
      { label: "Defence equities", tone: "ok", note: "Sustained re-arming cycle across NATO." },
      { label: "EU industry", tone: "bad", note: "Higher energy costs erode margins for autos & chemicals." },
      { label: "USD", tone: "ok", note: "Safe-haven flows support the dollar." },
    ],
    global: "Europe has to rebuild its entire energy supply, which keeps costs high for households and factories. Food prices also stay higher because of the disruption to Ukrainian grain. On top of that, NATO countries are spending much more on defence.",
  },
  mideast: {
    who: ["Israel", "Iran", "Saudi Arabia", "United States of America"],
    routes: ["hormuz-asia", "sa-eu"],
    direct: [
      { label: "Brent crude", tone: "bad", note: "Risk premium re-rates higher on any escalation." },
      { label: "Gold", tone: "ok", note: "Safe-haven bid intensifies." },
      { label: "USD / CHF / JPY", tone: "ok", note: "Funding currencies catch a safe-haven bid." },
    ],
    secondary: [
      { label: "Airlines", tone: "bad", note: "Fuel costs + rerouted flight paths squeeze margins." },
      { label: "Energy majors", tone: "ok", note: "Higher Brent flows to upstream earnings." },
      { label: "EM equities", tone: "bad", note: "Higher oil + USD strength tightens EM conditions." },
    ],
    global: "Any escalation can spike oil prices within hours, since the Gulf supplies a huge share of the world's crude. Higher oil quickly lifts inflation everywhere, which makes it harder for central banks to cut rates. Stock markets typically sell off while gold and the dollar rally.",
  },
  redsea: {
    who: ["Yemen", "Saudi Arabia", "Germany", "China"],
    routes: ["redsea-suez", "asia-us-chips"],
    direct: [
      { label: "Container freight", tone: "bad", note: "Shanghai-to-Europe rates stay structurally higher." },
      { label: "Goods inflation", tone: "bad", note: "Second-round pressure on retail prices." },
    ],
    secondary: [
      { label: "Shipping equities", tone: "ok", note: "Maersk, Hapag-Lloyd capture freight upside." },
      { label: "EU retailers", tone: "bad", note: "Longer transit + higher costs hit margins." },
      { label: "Inventories", tone: "warn", note: "Just-in-time supply chains build buffer stock." },
    ],
    global: "Goods between Asia and Europe now take about two weeks longer and cost much more to ship. That extra cost ends up in the price of everyday products in stores. It acts like a hidden tax on European consumers and retailers.",
  },
  taiwan: {
    who: ["Taiwan", "China", "United States of America", "South Korea", "Japan"],
    routes: ["asia-us-chips", "us-cn-pacific"],
    direct: [
      { label: "Semis (TSM, NVDA)", tone: "bad", note: "Tail risk priced into AI / chip supply chain." },
      { label: "Tech volatility", tone: "warn", note: "VIX + SOX vol expand on any flare-up." },
    ],
    secondary: [
      { label: "JPY / KRW", tone: "warn", note: "Asian FX wobble on regional escalation risk." },
      { label: "Defence equities", tone: "ok", note: "Pacific posture lifts US/JP/KR defence names." },
    ],
    global: "Taiwan makes almost all of the world's most advanced chips, with no real backup supplier. A serious conflict would cripple AI, smartphones, cars and data centres globally. That's why every flare-up moves tech stocks worldwide.",
  },
  "us-pol": {
    who: ["United States of America", "Mexico", "China"],
    routes: ["us-cn-pacific", "us-mx-near"],
    direct: [
      { label: "USD", tone: "warn", note: "Tariff & tax-policy noise drives DXY swings." },
      { label: "Treasuries", tone: "warn", note: "Fiscal trajectory under scrutiny — term premium widens." },
    ],
    secondary: [
      { label: "EM FX", tone: "bad", note: "USD strength tightens EM conditions." },
      { label: "Mexican peso", tone: "warn", note: "Tariff threats whip MXN both ways." },
    ],
    global: "The US drives global capital flows, so its policy choices ripple everywhere. New tariffs raise prices for consumers worldwide, and uncertainty about taxes and the Fed pushes the dollar and US bond yields around. That moves nearly every other market with them.",
  },
  "ai-capex": {
    who: ["United States of America", "Taiwan", "South Korea", "Japan"],
    routes: ["asia-us-chips"],
    direct: [
      { label: "Semis", tone: "ok", note: "Hyperscaler orders drive multi-year capex visibility." },
      { label: "Utilities", tone: "ok", note: "Data-centre power demand re-rates regulated utilities." },
    ],
    secondary: [
      { label: "Copper", tone: "ok", note: "Grid + cooling buildouts lift base-metal demand." },
      { label: "Industrials", tone: "ok", note: "HVAC, generators, switchgear all in the AI supply chain." },
      { label: "REITs (data)", tone: "ok", note: "Hyperscale leasing supports cash flows." },
    ],
    global: "This is the biggest spending boom in tech since the dotcom era. The money doesn't just go to chipmakers — it spreads into power grids, cooling, copper, and even nuclear energy. Whole industries are being reshaped to feed AI demand.",
  },
  "india-growth": {
    who: ["India"],
    routes: [],
    direct: [
      { label: "Nifty / Sensex", tone: "ok", note: "Domestic-demand earnings compounding." },
      { label: "INR", tone: "warn", note: "Strong inflows offset by oil import bill." },
    ],
    secondary: [
      { label: "EM equity flows", tone: "ok", note: "India is the largest non-China EM allocation." },
      { label: "Consumer staples", tone: "ok", note: "Premiumisation theme intact." },
    ],
    global: "As China slows down, India is taking over as the main growth engine of the developing world. Global companies and investors are increasingly betting on Indian consumers. That makes India a key destination for emerging-market money.",
  },
  opec: {
    who: ["Saudi Arabia", "Russia", "United States of America"],
    routes: ["hormuz-asia", "sa-eu"],
    direct: [
      { label: "Brent", tone: "warn", note: "Quotas anchor the floor; cuts squeeze refiners." },
      { label: "Petro-FX", tone: "warn", note: "NOK, CAD, MXN move with crude." },
    ],
    secondary: [
      { label: "Inflation path", tone: "warn", note: "Oil floor keeps headline CPI sticky." },
      { label: "Airlines / chemicals", tone: "bad", note: "Higher input costs erode margins." },
    ],
    global: "OPEC+ decides how much oil reaches the market, which directly shapes global inflation. When they cut, fuel and energy bills stay higher for everyone. That feeds into what central banks like the Fed and ECB do next.",
  },
  "boj-exit": {
    who: ["Japan", "United States of America"],
    routes: [],
    direct: [
      { label: "USD/JPY", tone: "warn", note: "Carry unwind risk — sudden moves possible." },
      { label: "JGBs", tone: "warn", note: "Higher Japanese yields = repatriation flows." },
    ],
    secondary: [
      { label: "US treasuries", tone: "warn", note: "Marginal Japanese demand weakens." },
      { label: "Nikkei banks", tone: "ok", note: "Higher rates lift bank NIMs." },
    ],
    global: "For years, investors borrowed cheap yen to invest in higher-yielding assets around the world. As Japan raises rates, those bets get unwound, pulling money back home. That can shake stocks, bonds and currencies far beyond Japan.",
  },
  milei: {
    who: ["Argentina"],
    routes: [],
    direct: [
      { label: "Merval (USD)", tone: "ok", note: "Reform optimism + disinflation lift equities." },
      { label: "ARG sovereign", tone: "ok", note: "Spreads tighten as IMF deal anchors policy." },
    ],
    secondary: [
      { label: "EM reform trade", tone: "ok", note: "Sets template for frontier reform stories." },
      { label: "Lithium", tone: "ok", note: "Capacity unlock supports battery supply chain." },
    ],
    global: "Argentina is a live test of whether tough reforms can fix a broken economy. If it works, other emerging markets may try the same playbook. If it fails, it sets back reform efforts across the region.",
  },
  "de-ind": {
    who: ["Germany", "France"],
    routes: ["ru-eu-gas"],
    direct: [
      { label: "DAX autos / chems", tone: "bad", note: "Energy cost gap vs US erodes competitiveness." },
      { label: "EUR", tone: "bad", note: "Soft industrial pulse weighs on the euro." },
    ],
    secondary: [
      { label: "EU industrial proxies", tone: "bad", note: "Bellwether weakness spreads across the bloc." },
      { label: "Bunds", tone: "ok", note: "Growth fears bid quality fixed income." },
    ],
    global: "Germany is Europe's biggest economy and its factories have stalled. That drags down growth for the entire eurozone, not just Germany. A weak Germany also means a weaker euro and softer demand for global suppliers.",
  },
  "fr-pol": {
    who: ["France", "Germany"],
    routes: [],
    direct: [
      { label: "OAT–Bund spread", tone: "bad", note: "Widening reflects political risk premium." },
      { label: "French banks", tone: "bad", note: "Sovereign exposure pressures BNP, SocGen, CASA." },
    ],
    secondary: [
      { label: "EUR", tone: "bad", note: "Core eurozone political risk filters into the currency." },
      { label: "Periphery spreads", tone: "warn", note: "Italian / Spanish bonds drift with French risk." },
    ],
    global: "France was always seen as a safe core economy in Europe, but markets are starting to doubt that. If trust in France slips, the whole eurozone gets more expensive to borrow. That weakens the euro and pressures European banks.",
  },
  "cn-prop": {
    who: ["China", "Australia", "Brazil"],
    routes: ["au-cn-iron", "br-cn-soy"],
    direct: [
      { label: "Iron ore / copper", tone: "bad", note: "Structural demand drag from housing slowdown." },
      { label: "AUD", tone: "bad", note: "Commodity-linked currency feels the China pulse." },
    ],
    secondary: [
      { label: "EM equities", tone: "bad", note: "China beta drags EM index returns." },
      { label: "Global goods CPI", tone: "ok", note: "Cheaper Chinese exports = global disinflation." },
    ],
    global: "China's slowdown means less demand for raw materials like iron ore and copper, hurting commodity exporters. At the same time, cheap Chinese exports flood other markets and push goods prices down worldwide. Both effects shape global inflation and growth.",
  },
  "kr-chips": {
    who: ["South Korea", "Taiwan", "United States of America"],
    routes: ["asia-us-chips"],
    direct: [
      { label: "Memory (Samsung, SK Hynix)", tone: "ok", note: "HBM / AI memory cycle drives earnings beats." },
      { label: "KOSPI", tone: "ok", note: "Tech-heavy index benefits from up-cycle." },
    ],
    secondary: [
      { label: "Equipment names", tone: "ok", note: "Cap-ex flows to ASML, Applied Materials, TEL." },
      { label: "KRW", tone: "warn", note: "Export upside vs USD strength tug-of-war." },
    ],
    global: "Memory chip demand is a real-time signal for how much the world is spending on AI and cloud. When Korean chipmakers do well, it confirms the AI build-out is still strong. When orders slow, it's an early warning for the whole tech sector.",
  },
};

/* ───────── Always-on Active Flashpoints (right panel default) ───────── */

function ActiveFlashpoints({
  onSelectEvent,
  onSelectCountry,
}: {
  onSelectEvent: (e: GlobalEvent) => void;
  onSelectCountry: (c: CountryIntel) => void;
}) {
  const risk = EVENTS.find((e) => e.id === "mideast") ?? EVENTS.find((e) => e.type === "negative")!;
  const opp = EVENTS.find((e) => e.id === "ai-capex") ?? EVENTS.find((e) => e.type === "positive")!;
  const disruption = EVENTS.find((e) => e.id === "redsea") ?? EVENTS.find((e) => e.category === "Supply Chain")!;
  const watch = EVENTS.find((e) => e.id === "taiwan") ?? EVENTS.find((e) => e.type === "watch")!;

  const rows: { event: GlobalEvent; tone: Tone; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { event: risk, tone: "bad", label: "Top geopolitical risk", icon: Flame },
    { event: opp, tone: "ok", label: "Top growth opportunity", icon: Sparkles },
    { event: disruption, tone: "warn", label: "Largest supply disruption", icon: RouteIcon },
    { event: watch, tone: "info", label: "Strategic watch", icon: Eye },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/[0.12] px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          Active Global Flashpoints
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">live</span>
      </div>
      <ul className="divide-y divide-white/[0.05]">
        {rows.map(({ event, tone, label, icon: Icon }) => {
          const color = TONE_COLOR[tone];
          const chain = EVENT_CHAINS[event.id];
          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(event)}
                className="block w-full px-4 py-3 text-left transition hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none"
              >
                <div className="flex items-center gap-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em]" style={{ color }}>
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <div className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
                  {event.title}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{event.location}</div>
                {chain && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {chain.direct.slice(0, 3).map((d) => (
                      <ToneChip key={d.label} label={d.label} tone={d.tone} />
                    ))}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/[0.12] px-4 py-2.5 text-[10.5px] text-muted-foreground">
        Tap any flashpoint to see the full cause → effect chain and watch it propagate on the map.
        <span className="ml-1 text-foreground/70">
          Or pick a country (e.g.{" "}
          <button
            className="story-link text-primary"
            onClick={() => {
              const us = COUNTRIES.find((c) => c.iso2 === "US");
              if (us) onSelectCountry(us);
            }}
          >
            United States
          </button>
          ) for its macro profile.
        </span>
      </div>
    </div>
  );
}

/* ───────────────────── World Map ───────────────────── */

function WorldMap({
  world,
  geo,
  selected,
  selectedEvent,
  hovered,
  layers,
  onHover,
  onSelectCountry,
  onSelectEvent,
}: {
  world: WorldGeo | null;
  geo: { path: ReturnType<typeof geoPath>; projection: ReturnType<typeof geoNaturalEarth1> };
  selected: CountryIntel | null;
  selectedEvent: GlobalEvent | null;
  hovered: string | null;
  layers: LayerToggles;
  onHover: (n: string | null) => void;
  onSelectCountry: (c: CountryIntel) => void;
  onSelectEvent: (e: GlobalEvent) => void;
}) {
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([0, 0, MAP_W, MAP_H]);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!world) return;
    let target: [number, number, number, number] = [0, 0, MAP_W, MAP_H];
    if (selected) {
      const f = world.features.find((x) => x.properties?.name === selected.name);
      if (f) {
        const [[x0, y0], [x1, y1]] = geo.path.bounds(f as any);
        const padX = (x1 - x0) * 0.6 + 60;
        const padY = (y1 - y0) * 0.6 + 60;
        const w = Math.max(160, x1 - x0 + padX * 2);
        const h = Math.max(120, y1 - y0 + padY * 2);
        const aspect = MAP_W / MAP_H;
        let vw = w;
        let vh = h;
        if (vw / vh > aspect) vh = vw / aspect;
        else vw = vh * aspect;
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        target = [cx - vw / 2, cy - vh / 2, vw, vh];
      }
    }
    const start = performance.now();
    const from: [number, number, number, number] = [...viewBox] as any;
    const dur = 700;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const k = ease(t);
      setViewBox([
        from[0] + (target[0] - from[0]) * k,
        from[1] + (target[1] - from[1]) * k,
        from[2] + (target[2] - from[2]) * k,
        from[3] + (target[3] - from[3]) * k,
      ]);
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.iso2, world]);

  if (!world) {
    return (
      <div className="flex h-full w-full items-center justify-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        Loading world map…
      </div>
    );
  }

  const graticule = geoGraticule10();
  const project = (lng: number, lat: number) => geo.projection([lng, lat]) ?? [0, 0];

  const curvedPath = (a: [number, number], b: [number, number]) => {
    const [x1, y1] = project(a[0], a[1]);
    const [x2, y2] = project(b[0], b[1]);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);
    const k = Math.min(80, dist * 0.18);
    const cx = mx + nx * k;
    const cy = my + ny * k;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  };

  return (
    <svg
      viewBox={viewBox.join(" ")}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
    >
      <defs>
        <radialGradient id="oceanBg" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="oklch(0.15 0.022 260)" />
          <stop offset="70%" stopColor="oklch(0.10 0.016 260)" />
          <stop offset="100%" stopColor="oklch(0.08 0.014 260)" />
        </radialGradient>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="oklch(0.5 0.02 260)" opacity="0.10" />
        </pattern>
      </defs>

      <rect x={-MAP_W} y={-MAP_H} width={MAP_W * 3} height={MAP_H * 3} fill="url(#oceanBg)" />
      <rect x={-MAP_W} y={-MAP_H} width={MAP_W * 3} height={MAP_H * 3} fill="url(#dots)" />

      <path
        d={geo.path(graticule as any) ?? ""}
        fill="none"
        stroke="oklch(0.32 0.015 260)"
        strokeWidth={0.3}
        strokeOpacity={0.35}
      />

      {/* Propagation context — derived from selectedEvent */}
      {(() => null)()}
      {/* Countries — institutional baseline; every country visible */}
      <g>
        {world.features.map((f, i) => {
          const name = f.properties?.name ?? "";
          const intel = COUNTRIES_BY_NAME.get(name);
          const isSelected = selected?.name === name;
          const isHovered = hovered === name;
          const chain = selectedEvent ? EVENT_CHAINS[selectedEvent.id] : null;
          const isAffected = !!chain?.who.includes(name);
          const propagationActive = !!chain;
          const heatV = intel && layers.heatmap !== "none" ? heatmapValue(intel, layers.heatmap) : null;
          const tint = intel
            ? (heatV != null ? heatColor(heatV) : RISK_COLOR[intel.risk])
            : null;
          const d = geo.path(f as any) ?? "";
          // While propagation is active: dim non-affected countries, glow affected ones.
          const baseOpacity = propagationActive
            ? isAffected
              ? 1
              : 0.35
            : isSelected
              ? 0.95
              : isHovered
                ? 0.85
                : 0.78;
          return (
            <g key={i}>
              <path
                d={d}
                fill={NEUTRAL_LAND}
                fillOpacity={baseOpacity}
                stroke={isSelected || isAffected ? "oklch(0.96 0 0)" : "oklch(0.18 0.015 260)"}
                strokeWidth={isSelected || isAffected ? 0.8 : 0.3}
                style={{
                  cursor: intel ? "pointer" : "default",
                  transition: "fill-opacity 320ms ease, stroke-width 220ms ease",
                }}
                onMouseEnter={() => onHover(name)}
                onMouseLeave={() => onHover(null)}
                onClick={() => intel && onSelectCountry(intel)}
              >
                <title>{name}{intel ? ` — ${RISK_LABEL[intel.risk]}` : ""}</title>
              </path>
              {tint && (
                <path
                  d={d}
                  fill={tint}
                  fillOpacity={
                    heatV != null
                      ? 0.18 + heatV * 0.55
                      : isAffected ? 0.45 : isSelected ? 0.34 : isHovered ? 0.26 : propagationActive ? 0.08 : 0.18
                  }
                  stroke="none"
                  pointerEvents="none"
                />
              )}
              {isAffected && (
                <path
                  d={d}
                  fill="none"
                  stroke="oklch(0.85 0.12 78)"
                  strokeOpacity={0.85}
                  strokeWidth={0.6}
                  pointerEvents="none"
                  style={{ filter: "url(#softGlow)" }}
                >
                  <animate
                    attributeName="stroke-opacity"
                    values="0.35;0.95;0.35"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </path>
              )}
            </g>
          );
        })}
      </g>

      {/* Trade & supply chain flows */}
      {layers.trade && (
        <g>
          {TRADE_FLOWS.map((f) => {
            const color = ROUTE_COLOR[f.status];
            const d = curvedPath(f.from, f.to);
            const dashed = f.status === "disrupted";
            const chain = selectedEvent ? EVENT_CHAINS[selectedEvent.id] : null;
            const propagationActive = !!chain;
            const isLit = !!chain?.routes.includes(f.id);
            const opacity = propagationActive ? (isLit ? 0.95 : 0.18) : 0.55;
            const width = propagationActive && isLit ? 1.6 : 0.9;
            return (
              <g key={f.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={isLit ? "oklch(0.85 0.12 78)" : color}
                  strokeOpacity={opacity}
                  strokeWidth={width}
                  strokeDasharray={dashed ? "3 3" : undefined}
                  filter="url(#softGlow)"
                  style={{ transition: "stroke-opacity 320ms ease, stroke-width 320ms ease" }}
                >
                  <title>{f.label} — {f.status} · {f.note}</title>
                </path>
                {isLit && (
                  <circle r={2.2} fill="oklch(0.92 0.10 78)">
                    <animateMotion dur="3.2s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* Tension lines */}
      {layers.tensions && (
        <g>
          {TENSIONS.map((t) => {
            const a = COUNTRY_COORDS[t.from];
            const b = COUNTRY_COORDS[t.to];
            if (!a || !b) return null;
            const color = RISK_COLOR[t.level];
            const d = curvedPath(a, b);
            return (
              <path
                key={t.id}
                d={d}
                fill="none"
                stroke={color}
                strokeOpacity={selectedEvent ? 0.2 : t.level === "high" ? 0.55 : 0.4}
                strokeWidth={t.level === "high" ? 0.9 : 0.7}
                strokeDasharray="1 3"
              >
                <title>{t.from} ↔ {t.to} — {t.topic} · {t.impact}</title>
              </path>
            );
          })}
        </g>
      )}

      {/* Event dots */}
      {layers.events && (
        <g>
          {EVENTS.map((e) => {
            const [x, y] = project(e.coords[0], e.coords[1]);
            const color = EVENT_COLOR[e.type];
            const isActive = selectedEvent?.id === e.id;
            return (
              <g key={e.id} style={{ cursor: "pointer" }} onClick={() => onSelectEvent(e)}>
                <circle cx={x} cy={y} r={isActive ? 8 : 4.6} fill={color} fillOpacity={isActive ? 0.28 : 0.18}>
                  {isActive && (
                    <animate attributeName="r" values="6;14;6" dur="2.4s" repeatCount="indefinite" />
                  )}
                </circle>
                <circle cx={x} cy={y} r={isActive ? 3.2 : 2.4} fill={color} stroke="oklch(0.10 0.014 260)" strokeWidth={0.6}>
                  <title>{e.title} — {e.location}</title>
                </circle>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}


/* ───────────────────── Country Panel ───────────────────── */

function CountryPanel({
  country,
  onClose,
}: {
  country: CountryIntel | null;
  onClose: () => void;
}) {
  if (!country) {
    return (
      <div className="relative flex h-[360px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-8 text-center">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 30%, oklch(0.65 0.10 250 / 0.15), transparent 60%)",
          }}
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Globe2 className="h-6 w-6 text-primary" />
        </div>
        <h3 className="relative mt-4 font-display text-base font-semibold">Select a country</h3>
        <p className="relative mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Click a country on the map or any event dot to load full macro & geopolitical intelligence.
        </p>
      </div>
    );
  }

  const riskColor = RISK_COLOR[country.risk];
  const extras = COUNTRY_EXTRAS[country.name];
  const riskScore = computeRiskScore(country);
  const exposure = useUserCountryExposure();
  const ownsExposure = exposure.has(country.iso2.toUpperCase());
  const tickers = tickersForCountry(country.iso2);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] backdrop-blur">
      <div
        className="relative border-b border-white/[0.12] p-5"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${riskColor} 14%, transparent), transparent)`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${riskColor}, transparent)` }}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl leading-none" aria-hidden>{country.flag}</span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold leading-tight tracking-tight">
                  {country.name}
                </h2>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${riskColor} 18%, transparent)`,
                      color: riskColor,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${riskColor} 40%, transparent)`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: riskColor }} />
                    {RISK_LABEL[country.risk]}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {country.iso2}
                  </span>
                  {ownsExposure && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/30"
                      title="You hold positions exposed to this country"
                    >
                      <Wallet className="h-2.5 w-2.5" />
                      In your portfolio
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-foreground/80">{country.summary}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-full hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[68vh]">
        <div className="space-y-5 p-5">
          {/* Risk Score (numeric 0–100 with drivers) */}
          <Section icon={AlertTriangle} title="Risk score">
            <RiskScoreCard score={riskScore} />
          </Section>

          {/* Global influence */}
          {extras && (
            <Section icon={Gauge} title="Global market influence">
              <InfluenceMeter score={extras.influenceScore} why={extras.influenceWhy} />
              <p className="mt-2.5 text-xs leading-relaxed text-foreground/80">
                <span className="font-semibold text-foreground">Global role · </span>
                {extras.globalRole}
              </p>
            </Section>
          )}

          {/* Country strength index */}
          {extras && (
            <Section icon={ShieldCheck} title="Country strength index">
              <div className="grid grid-cols-2 gap-2">
                <KV label="Government" value={extras.strengthIndex.government} />
                <KV label="Policy consistency" value={extras.strengthIndex.policy} />
                <KV label="Economic health" value={extras.strengthIndex.economy} />
                <KV label="Investor confidence" value={extras.strengthIndex.investorConfidence} />
                <div className="col-span-2 rounded-xl border border-white/[0.14] bg-white/[0.02] px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    Geopolitical stability
                  </div>
                  <StabilityBar score={extras.strengthIndex.geopoliticalStability} />
                </div>
              </div>
            </Section>
          )}

          {/* Transmission effects */}
          {extras && (
            <Section icon={Zap} title="Market transmission effects">
              <ul className="space-y-1.5">
                {extras.transmission.map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-2 rounded-xl border border-white/[0.14] bg-white/[0.02] p-2.5 text-xs leading-relaxed text-foreground/85"
                  >
                    <CircleDot className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Economy */}
          <Section icon={Building2} title="Economic conditions">
            <div className="grid grid-cols-2 gap-2">
              <EconKV
                label="Inflation"
                value={country.economy.inflation}
                map={{ rising: "Rising", stable: "Stable", falling: "Falling" }}
                tone={{ rising: "bad", stable: "info", falling: "ok" }}
                arrows={{ rising: "up", stable: "flat", falling: "down" }}
              />
              <EconKV
                label="Rates"
                value={country.economy.rates}
                map={{ low: "Low", high: "High", tightening: "Tightening", easing: "Easing" }}
                tone={{ low: "info", high: "bad", tightening: "warn", easing: "ok" }}
              />
              <EconKV
                label="GDP"
                value={country.economy.gdp}
                map={{ growing: "Growing", slowing: "Slowing", "recession-risk": "Recession risk" }}
                tone={{ growing: "ok", slowing: "warn", "recession-risk": "bad" }}
                arrows={{ growing: "up", slowing: "flat", "recession-risk": "down" }}
              />
              <EconKV
                label="FX vs USD"
                value={country.economy.fxVsUsd}
                map={{ weakening: "Weakening", stable: "Stable", strengthening: "Strengthening" }}
                tone={{ weakening: "bad", stable: "info", strengthening: "ok" }}
                arrows={{ weakening: "down", stable: "flat", strengthening: "up" }}
              />
            </div>
          </Section>

          {/* Market impact */}
          <Section icon={Activity} title="Market impact">
            <div className="space-y-1.5">
              <ImpactRow icon={TrendingUp} label="Equities" text={country.impact.equities} />
              <ImpactRow icon={Coins} label="Forex" text={country.impact.forex} />
              <ImpactRow icon={Activity} label="Commodities" text={country.impact.commodities} />
              <ImpactRow icon={Globe2} label="Risk sentiment" text={country.impact.sentiment} />
            </div>
            {tickers && <TickerChips tickers={tickers} />}
          </Section>


          {/* Geopolitics */}
          <Section icon={Flame} title="Geopolitical state">
            <div className="grid grid-cols-2 gap-2">
              <KV label="Government" value={country.geopolitics.governmentStability} />
              <KV label="Political risk" value={country.geopolitics.politicalRisk} />
              <KV label="Policy" value={country.geopolitics.policyDirection} />
              <KV label="Tensions" value={country.geopolitics.tensions} tight />
            </div>
          </Section>

          {/* Pivotal event */}
          <Section icon={Landmark} title="Pivotal event">
            <div className="rounded-xl border border-white/[0.14] bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{country.pivotalEvent.title}</div>
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[10px] tabular-nums">
                  {country.pivotalEvent.year}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {country.pivotalEvent.why}
              </p>
            </div>
          </Section>

          {/* Pos / Neg */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ListCard title="Key positives" items={country.positives} tone="ok" icon={ArrowUpRight} />
            <ListCard title="Key risks" items={country.negatives} tone="bad" icon={ArrowDownRight} />
          </div>

          {/* Live news */}
          <Section icon={Newspaper} title="Live news · trusted sources">
            <LiveNews country={country} />
          </Section>

          {/* Source / freshness footer */}
          <div className="rounded-xl border border-white/[0.10] bg-white/[0.015] px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Macro data: curated registry · updated weekly</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span>Live news: Reuters / Bloomberg / FT (24 h)</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span>Map: world-atlas</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

/* ───────────────────── Risk Score & Ticker Chips ───────────────────── */

function RiskScoreCard({ score }: { score: ReturnType<typeof computeRiskScore> }) {
  const color = RISK_BAND_COLOR[score.band];
  const pct = score.score;
  return (
    <div className="rounded-xl border border-white/[0.14] bg-white/[0.02] p-3.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Composite risk · 0–100
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold tabular-nums" style={{ color }}>
              {score.score}
            </span>
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
                color,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 40%, transparent)`,
              }}
            >
              {RISK_BAND_LABEL[score.band]}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <ul className="mt-3 space-y-1">
        {score.drivers.map((d, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground/85">
            <CircleDot className="mt-0.5 h-2.5 w-2.5 shrink-0" style={{ color }} />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TickerChips({ tickers }: { tickers: NonNullable<ReturnType<typeof tickersForCountry>> }) {
  const Group = ({ label, items }: { label: string; items: { symbol: string; name: string }[] }) => (
    <div>
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => (
          <span
            key={t.symbol}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-foreground/90"
            title={t.name}
          >
            <span className="font-semibold tabular-nums">{t.symbol}</span>
            <span className="text-[9px] text-muted-foreground">{t.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
  return (
    <div className="mt-2.5 space-y-2 rounded-xl border border-white/[0.10] bg-white/[0.015] p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary/80">
        Watch these tickers
      </div>
      {tickers.equities.length > 0 && <Group label="Equities" items={tickers.equities} />}
      {tickers.fx && <Group label="FX" items={[tickers.fx]} />}
      {tickers.commodities && tickers.commodities.length > 0 && (
        <Group label="Commodities" items={tickers.commodities} />
      )}
    </div>
  );
}


/* ───────────────────── Event Panel ───────────────────── */

function EventArticleLink({ event }: { event: GlobalEvent }) {
  const { settings } = useSettings();
  const preferredSources = useMemo(
    () =>
      Object.entries(settings.newsSources ?? {})
        .filter(([, on]) => on)
        .map(([k]) => k),
    [settings.newsSources],
  );
  const fetchArticle = useServerFn(getEventArticle);

  const { data, isLoading } = useQuery({
    queryKey: ["event-article", event.id, preferredSources.join(",")],
    queryFn: () =>
      fetchArticle({
        data: { query: event.newsQuery || event.title, preferredSources },
      }),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
        Searching trusted sources…
      </div>
    );
  }

  const article = data?.article;
  if (!article) return null;

  const meta = (AGENCY_META as Record<string, { label: string }>)[article.sourceKey] ?? { label: article.sourceLabel };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2.5 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/[0.06] p-2.5 transition hover:border-primary/60 hover:bg-primary/[0.10]"
    >
      <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-primary/80">
          {article.fromUserSource ? "From your sources" : "Background read"}
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground/80">{meta.label}</span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-foreground/95">
          {article.title}
        </div>
        <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-medium text-primary">
          Read the news article
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
}

function EventPanel({ event, onClose }: { event: GlobalEvent; onClose: () => void }) {
  const color = EVENT_COLOR[event.type];
  const chain = EVENT_CHAINS[event.id];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.14] bg-[oklch(0.12_0.018_260)] backdrop-blur">
      <div
        className="flex items-start justify-between gap-3 border-b border-white/[0.12] p-4"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${color} 14%, transparent), transparent)`,
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {event.category} · {event.date} · {event.location}
          </div>
          <div className="mt-1 font-display text-base font-bold leading-tight tracking-tight">
            {event.title}
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300/90">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            Propagating on map
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white/10" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3.5 p-4">
        {/* A. What happened */}
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
            What happened
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/90 whitespace-pre-line">{event.summary}</p>
          <EventArticleLink event={event} />
        </div>


        {/* B. Why it matters */}
        {chain && (
          <div className="rounded-xl border border-white/[0.14] bg-white/[0.02] p-3">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Why it matters globally
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/90">{chain.global}</p>
          </div>
        )}

        {/* C. Who is affected */}
        {chain && chain.who.length > 0 && (
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Who is affected
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {chain.who.map((name) => {
                const c = COUNTRIES_BY_NAME.get(name);
                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-foreground/85"
                  >
                    {c?.flag ?? "🌐"} {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* D. Direct impact */}
        {chain && chain.direct.length > 0 && (
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Direct market impact
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {chain.direct.map((d) => {
                const c = TONE_COLOR[d.tone];
                return (
                  <li
                    key={d.label}
                    className="flex items-start gap-2 rounded-xl border border-white/[0.12] bg-white/[0.02] p-2.5"
                  >
                    <span
                      className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold" style={{ color: c }}>
                        {d.label}
                      </div>
                      <div className="text-[11.5px] leading-relaxed text-foreground/80">{d.note}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* E. Secondary effects */}
        {chain && chain.secondary.length > 0 && (
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Secondary &amp; cross-asset effects
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {chain.secondary.map((d) => {
                const c = TONE_COLOR[d.tone];
                return (
                  <li
                    key={d.label}
                    className="flex items-start gap-2 rounded-xl border border-white/[0.12] bg-white/[0.02] p-2.5"
                  >
                    <span
                      className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold" style={{ color: c }}>
                        {d.label}
                      </div>
                      <div className="text-[11.5px] leading-relaxed text-foreground/80">{d.note}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Legacy impact tags as quick reference if no chain available */}
        {!chain && (
          <div className="grid grid-cols-2 gap-1.5">
            {event.impact.fx && <ImpactTag label="FX" value={event.impact.fx} />}
            {event.impact.commodities && <ImpactTag label="Commodities" value={event.impact.commodities} />}
            {event.impact.equities && <ImpactTag label="Equities" value={event.impact.equities} />}
            {event.impact.regions && <ImpactTag label="Regions" value={event.impact.regions} />}
          </div>
        )}
      </div>
    </div>
  );
}


function ImpactTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.14] bg-white/[0.02] px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-[11px] text-foreground/85">{value}</div>
    </div>
  );
}

/* ───────────────────── Intel feed ───────────────────── */

const FEED_CATEGORY_EXPLAINER: Record<FeedItem["category"], { what: string; why: string; watch: string }> = {
  FX: {
    what: "FX steht für Foreign Exchange — also den Devisenmarkt. Hier werden Währungen wie USD, EUR oder JPY gehandelt.",
    why: "Ein starker US-Dollar verteuert Rohstoffe für andere Länder, drückt Schwellenländer-Aktien und belastet US-Exporteure.",
    watch: "DXY (Dollar-Index), EUR/USD, USD/JPY — und Kapitalflüsse in Schwellenländer.",
  },
  Commodities: {
    what: "Rohstoffe wie Öl (Brent/WTI), Gas, Industrie- und Edelmetalle. Ihr Preis spiegelt globale Nachfrage und Risiken wider.",
    why: "Steigende Öl- und Gaspreise treiben die Inflation und zwingen Notenbanken zu höheren Zinsen — schlecht für Aktien & Bonds.",
    watch: "Brent, WTI, Erdgas (TTF), Kupfer als Konjunkturbarometer, Gold als Krisenindikator.",
  },
  Equities: {
    what: "Aktienmärkte — also börsennotierte Unternehmen weltweit (S&P 500, Nasdaq, DAX, Nikkei …).",
    why: "Aktienkurse zeigen die Erwartung künftiger Gewinne. Sektorrotationen verraten, woran der Markt gerade glaubt.",
    watch: "Marktbreite, führende Sektoren (Tech, Banken, Energie), Volatilität (VIX).",
  },
  Macro: {
    what: "Makro-Daten sind übergeordnete Wirtschaftsindikatoren: Inflation, Wachstum, Arbeitsmarkt, Notenbankpolitik.",
    why: "Makro bestimmt das Regime — ob Geld günstig oder teuer ist, ob Wachstum oder Rezession dominiert.",
    watch: "CPI/PCE, Arbeitsmarktdaten, BIP, Notenbank-Statements (Fed, EZB, BoJ).",
  },
  Geopolitics: {
    what: "Geopolitische Spannungen: Kriege, Sanktionen, Handelskonflikte, politische Risiken.",
    why: "Solche Ereignisse verändern Lieferketten, Energiepreise und das Vertrauen der Anleger oft schlagartig.",
    watch: "Sicherheitslagen, Öl- und Gaspreise, Safe-Haven-Flüsse (Gold, USD, CHF, JPY).",
  },
  Supply: {
    what: "Lieferketten und Logistik: Frachtraten, Häfen, kritische Routen wie Suez oder Bab el-Mandeb.",
    why: "Gestörte Lieferketten erzeugen Engpässe und treiben Güterpreise — das speist Inflation und belastet Industriegewinne.",
    watch: "Containerraten (z. B. Shanghai Containerized Freight Index), Lagerbestände, Sektor: Logistik & Einzelhandel.",
  },
};

const FEED_IMPACT_INFO: Record<FeedItem["impact"], { label: string; desc: string }> = {
  high: { label: "Hoher Impact", desc: "Kann Indizes, Währungen oder Rohstoffe deutlich bewegen — beobachte Positionen aktiv." },
  medium: { label: "Mittlerer Impact", desc: "Wichtig für Sektoren oder einzelne Assets — relevant für Trading-Entscheidungen." },
  low: { label: "Niedriger Impact", desc: "Hintergrund-Kontext — relevant fürs Verständnis, selten direkter Auslöser." },
};

/* ───────────────────── Intel feed ───────────────────── */

function IntelFeed() {
  const [openFeed, setOpenFeed] = useState<FeedItem | null>(null);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.14] bg-[oklch(0.11_0.016_260)]">
      <div className="flex items-center justify-between border-b border-white/[0.12] px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Radio className="h-3 w-3 text-emerald-400" />
          Market intelligence feed
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {MARKET_FEED.length} signals
        </span>
      </div>
      <ScrollArea className="max-h-[460px]">
        <ul className="divide-y divide-white/[0.05]">
          {MARKET_FEED.map((f) => {
            const c = RISK_COLOR[f.impact];
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setOpenFeed(f)}
                  className="block w-full cursor-pointer px-4 py-3 text-left transition hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
                      <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[9px] uppercase tracking-wider">
                        {f.category}
                      </Badge>
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{f.time}</span>
                  </div>
                  <div className="mt-1.5 text-[12px] font-semibold leading-tight">{f.title}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{f.body}</div>
                  <div className="mt-1.5 text-[10px] font-medium text-primary/80">Details ansehen →</div>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      {openFeed && <FeedDetailModal item={openFeed} onClose={() => setOpenFeed(null)} />}
    </div>
  );
}

function FeedDetailModal({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  const info = FEED_CATEGORY_EXPLAINER[item.category];
  const impact = FEED_IMPACT_INFO[item.impact];
  const dotColor = RISK_COLOR[item.impact];
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mt-12 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
          <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[9px] uppercase tracking-wider">
            {item.category}
          </Badge>
          <span>·</span>
          <span className="font-mono">{item.time}</span>
          <span>·</span>
          <span className="font-medium text-foreground/80">{impact.label}</span>
        </div>

        <h2 className="mt-3 text-xl font-bold leading-tight">{item.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">{item.body}</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Was bedeutet „{item.category}"?</div>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{info.what}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Warum es für Märkte zählt</div>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{info.why}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-primary">Worauf du achten solltest</div>
          <p className="text-sm leading-relaxed text-foreground/85">{info.watch}</p>
        </div>

        <div className="mt-3 rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Impact-Stufe</div>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">
            <span className="font-semibold" style={{ color: dotColor }}>{impact.label}.</span> {impact.desc}
          </p>
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground/70">
          Kurz-Briefing für Einsteiger. Keine Anlageempfehlung — dient zur Einordnung des Marktumfelds.
        </p>
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────── Shared bits ───────────────────── */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" />
        <span>{title}</span>
        <span className="ml-1 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function InfluenceMeter({ score, why }: { score: number; why: string }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  const color =
    score >= 8 ? "oklch(0.74 0.10 78)" : score >= 5 ? "oklch(0.72 0.08 200)" : "oklch(0.62 0.06 260)";
  return (
    <div className="rounded-xl border border-white/[0.14] bg-white/[0.02] p-3.5">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Influence score
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold tabular-nums" style={{ color }}>
              {score.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">/ 10</span>
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{why}</p>
    </div>
  );
}

function StabilityBar({ score }: { score: number }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${(score / 10) * 100}%`,
            backgroundColor:
              score >= 7 ? "oklch(0.72 0.10 155)" : score >= 4 ? "oklch(0.78 0.10 78)" : "oklch(0.66 0.13 25)",
          }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-foreground/85">{score}/10</span>
    </div>
  );
}

function KV({ label, value, tight }: { label: string; value: string; tight?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-white/[0.14] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/15 ${
        tight ? "col-span-2" : ""
      }`}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xs font-semibold text-foreground">{value}</div>
    </div>
  );
}

function EconKV<T extends string>({
  label,
  value,
  map,
  tone,
  arrows,
}: {
  label: string;
  value: T;
  map: Record<T, string>;
  tone: Record<T, "ok" | "warn" | "bad" | "info">;
  arrows?: Record<T, "up" | "down" | "flat">;
}) {
  const t = tone[value];
  const arrow = arrows?.[value];
  const Arrow = arrow === "up" ? TrendingUp : arrow === "down" ? TrendingDown : Minus;
  const color =
    t === "ok"
      ? "text-emerald-300/90"
      : t === "bad"
        ? "text-rose-300/90"
        : t === "warn"
          ? "text-amber-300/90"
          : "text-sky-300/90";
  return (
    <div className="rounded-xl border border-white/[0.14] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/15">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-1 flex items-center gap-1.5 text-xs font-semibold tabular-nums ${color}`}>
        {arrow && <Arrow className="h-3 w-3" />}
        {map[value]}
      </div>
    </div>
  );
}

function ImpactRow({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.14] bg-white/[0.02] p-3 transition hover:border-white/15">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-xs leading-relaxed text-foreground/90">{text}</div>
      </div>
    </div>
  );
}

function ListCard({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: "ok" | "bad";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color = tone === "ok" ? "text-emerald-300/90" : "text-rose-300/90";
  const ring =
    tone === "ok"
      ? "border-emerald-500/15 bg-emerald-500/[0.03]"
      : "border-rose-500/15 bg-rose-500/[0.03]";
  return (
    <div className={`rounded-xl border p-3.5 ${ring}`}>
      <div className={`flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${color}`}>
        <Icon className="h-3 w-3" /> {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((s) => (
          <li key={s} className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground/85">
            <CircleDot className={`mt-0.5 h-2.5 w-2.5 shrink-0 ${color}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LiveNews({ country }: { country: CountryIntel }) {
  const { settings } = useSettings();
  const trusted = useMemo(
    () =>
      Object.entries(settings.newsSources)
        .filter(([, on]) => on)
        .map(([k]) => k),
    [settings.newsSources],
  );

  const fetchNews = useServerFn(getCountryNews);
  const query = useQuery({
    queryKey: ["country-news", country.iso2, trusted.sort().join(",")],
    // Fresh daily, broad source pool (defaults to all 60+ tier-1/2/3 sources
    // when the user hasn't narrowed). Limit 6 = World-Monitor-style depth.
    queryFn: () => fetchNews({ data: { country: country.name, sources: trusted.length > 0 ? trusted : undefined, limit: 6 } }),
    staleTime: 30 * 60 * 1000, // 30 min — daily-fresh feed
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // No hard gate on trusted-source selection any more — we default to a
  // world-class pool of 60+ tier-1/2/3 sources so the feed is rich out of the box.


  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-white/[0.12] bg-white/[0.02] p-3">
            <div className="h-2 w-20 rounded bg-white/10" />
            <div className="mt-2 h-3 w-full rounded bg-white/10" />
            <div className="mt-1.5 h-3 w-4/5 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  const error = query.data?.error ?? (query.isError ? "Failed to load live news." : null);
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {error}
      </div>
    );
  }

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.14] bg-white/[0.02] p-3 text-xs text-muted-foreground">
        No fresh stories on {country.name} in the past 24h. Daily feed refreshes automatically.
      </div>
    );
  }

  return <LiveNewsList items={items} />;
}

function LiveNewsList({ items }: { items: CountryNewsItem[] }) {
  const [openItem, setOpenItem] = useState<CountryNewsItem | null>(null);
  return (
    <>
      <div className="space-y-2">
        {items.map((n) => {
          const meta = (AGENCY_META as Record<string, { label: string }>)[n.source] ?? { label: n.sourceLabel };
          const fresh = (n.ageHours ?? 999) <= 24;
          const tierLabel = n.tier === 1 ? "Tier 1 · Official" : n.tier === 2 ? "Tier 2 · Wire" : "Tier 3 · Regional";
          const tierColor = n.tier === 1 ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/5" : n.tier === 2 ? "text-cyan-300 border-cyan-400/30 bg-cyan-400/5" : "text-amber-200 border-amber-400/30 bg-amber-400/5";
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => setOpenItem(n)}
              className="group block w-full rounded-xl border border-white/[0.14] bg-white/[0.02] p-3 text-left transition hover:border-primary/30 hover:bg-white/[0.04]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[9px] uppercase tracking-wider">
                    {meta.label}
                  </Badge>
                  <Badge variant="outline" className={`font-mono text-[9px] uppercase tracking-wider ${tierColor}`}>
                    {tierLabel}
                  </Badge>
                </div>
                <span className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider ${fresh ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {fresh && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
                  {n.ageHours != null ? (n.ageHours < 1 ? "Just now" : `${n.ageHours}h ago`) : "Recent"}
                </span>
              </div>
              <div className="mt-1.5 text-xs font-semibold leading-snug text-foreground group-hover:text-primary">
                {n.title}
              </div>
              {n.snippet && (
                <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {n.snippet}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {openItem && <NewsDetailModal item={openItem} onClose={() => setOpenItem(null)} />}
    </>
  );
}

function NewsDetailModal({ item, onClose }: { item: CountryNewsItem; onClose: () => void }) {
  const meta = (AGENCY_META as Record<string, { label: string }>)[item.source] ?? { label: item.sourceLabel };
  const published = item.publishedAt ? new Date(item.publishedAt).toLocaleString("de-DE") : null;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mt-12 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[9px] uppercase tracking-wider">
            {meta.label}
          </Badge>
          {published && <span>{published}</span>}
        </div>
        <h2 className="mt-3 text-xl font-bold leading-tight">{item.title}</h2>
        {item.snippet && (
          <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-foreground/85">
            {item.snippet}
          </p>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
        >
          Originalartikel öffnen ↗
        </a>
        <p className="mt-4 text-[10px] text-muted-foreground/70">
          Quelle: {item.sourceLabel}. Inhalte stammen von vertrauenswürdigen Tier-1 Finanzmedien.
        </p>
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────── Country Finder (search + filter) ───────────────────── */

type RiskFilter = "all" | "low" | "medium" | "high";

function CountryFinder({
  selected,
  onSelect,
}: {
  selected: CountryIntel | null;
  onSelect: (c: CountryIntel) => void;
}) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const COLLAPSED_COUNT = 12;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global "/" shortcut to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as HTMLElement).isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((c) => {
      if (risk !== "all" && c.risk !== risk) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.iso2.toLowerCase().includes(q) ||
        c.newsKeywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [query, risk]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, risk]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[activeIdx] ?? filtered[0];
      if (pick) {
        onSelect(pick);
        inputRef.current?.blur();
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Escape") {
      if (query) {
        e.preventDefault();
        setQuery("");
      } else {
        inputRef.current?.blur();
      }
    }
  }

  const riskFilters: { key: RiskFilter; label: string; tint?: string }[] = [
    { key: "all", label: "All" },
    { key: "low", label: "Low", tint: RISK_COLOR.low },
    { key: "medium", label: "Med", tint: RISK_COLOR.medium },
    { key: "high", label: "High", tint: RISK_COLOR.high },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.12] bg-black/20 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Tracked countries
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {filtered.length} / {COUNTRIES.length}
        </div>
      </div>

      {/* Search + risk filters */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search country, code, region…"
            aria-label="Search countries"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-8 pr-16 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="pointer-events-auto rounded p-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">/</kbd>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/[0.12] bg-white/[0.02] p-0.5">
          {riskFilters.map((r) => {
            const active = risk === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRisk(r.key)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                  active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                {r.tint && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.tint }} />}
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted-foreground">
          No countries match <span className="font-semibold text-foreground">"{query}"</span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(showAll || query ? filtered : filtered.slice(0, COLLAPSED_COUNT)).map((c, i) => {
              const isSel = selected?.iso2 === c.iso2;
              const isActive = i === activeIdx && query.length > 0;
              return (
                <button
                  key={c.iso2}
                  onClick={() => onSelect(c)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition-all ${
                    isSel
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : isActive
                        ? "border-primary/40 bg-primary/[0.08] text-foreground"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:-translate-y-0.5 hover:border-white/25 hover:text-foreground"
                  }`}
                >
                  <span aria-hidden>{c.flag}</span>
                  <span className="font-medium">
                    {query ? <Highlight text={c.name} query={query} /> : c.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">{c.iso2}</span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: RISK_COLOR[c.risk] }} />
                </button>
              );
            })}
          </div>
          {!query && filtered.length > COLLAPSED_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/[0.12]"
            >
              {showAll
                ? `Weniger anzeigen`
                : `Alle ${filtered.length} Länder anzeigen (+${filtered.length - COLLAPSED_COUNT})`}
              <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded bg-primary/25 px-0.5 text-primary">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}
