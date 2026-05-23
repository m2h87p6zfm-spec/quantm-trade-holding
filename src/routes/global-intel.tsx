import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@/lib/global-intel-data";
import { useSettings } from "@/lib/settings";
import { AGENCY_META } from "@/components/AgencyLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CircleDot,
  Coins,
  Eye,
  Flame,
  Gauge,
  Globe2,
  Landmark,
  Layers,
  Minus,
  Newspaper,
  Radio,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/global-intel")({
  head: () => ({
    meta: [
      { title: "Global Market Intelligence War Room — Apex Trades" },
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
};

function GlobalIntelPage() {
  const [world, setWorld] = useState<WorldGeo | null>(null);
  const [selected, setSelected] = useState<CountryIntel | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [utc, setUtc] = useState<string>("");
  const [layers, setLayers] = useState<LayerToggles>({ trade: true, tensions: true, events: true });

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

  return (
    <div className="min-h-screen bg-[oklch(0.09_0.014_260)] text-foreground">
      {/* Top command bar */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.14_0.025_260)] via-[oklch(0.11_0.018_260)] to-transparent" />
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
                  <span>Apex</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span>Global Intelligence War Room</span>
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[1.7rem]">
                  Global Market & Geopolitical Monitor
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 font-mono text-[11px] tabular-nums text-foreground/80 backdrop-blur">
              <Radio className="h-3 w-3 text-emerald-400" />
              <span className="text-muted-foreground">LIVE</span>
              <span className="mx-1 h-3 w-px bg-white/10" />
              <span>{utc || "--:--:-- UTC"}</span>
            </div>
          </div>

          <GlobalSummaryStrip />
        </div>
      </header>

      {/* Main grid: map + side panel + feed */}
      <main className="mx-auto max-w-[1700px] px-4 py-5 sm:px-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            {/* Map */}
            <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[oklch(0.13_0.02_260)] to-[oklch(0.09_0.014_260)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
              <CornerOrnaments />

              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-md">
                <Activity className="h-3 w-3 text-primary" />
                <span>Intelligence Layer · 2D</span>
              </div>

              <LayerControls layers={layers} setLayers={setLayers} />

              {hovered && (
                <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80 backdrop-blur-md">
                  {hovered}
                </div>
              )}

              <div className="relative aspect-[1000/520] w-full">
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
                    hovered={hovered}
                    layers={layers}
                    onHover={setHovered}
                    onSelectCountry={(c) => {
                      setSelected(c);
                      setSelectedEvent(null);
                    }}
                    onSelectEvent={(e) => setSelectedEvent(e)}
                  />
                )}
              </div>

              <MapLegend />
            </section>

            {/* Tracked countries strip */}
            <section className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Tracked countries
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {COUNTRIES.length} markets
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES.map((c) => {
                  const isSel = selected?.iso2 === c.iso2;
                  return (
                    <button
                      key={c.iso2}
                      onClick={() => {
                        setSelected(c);
                        setSelectedEvent(null);
                      }}
                      className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition-all ${
                        isSel
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:-translate-y-0.5 hover:border-white/25 hover:text-foreground"
                      }`}
                    >
                      <span aria-hidden>{c.flag}</span>
                      <span className="font-medium">{c.name}</span>
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: RISK_COLOR[c.risk] }}
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right column: country panel + intel feed */}
          <aside className="space-y-5 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <CountryPanel
              country={selected}
              onClose={() => setSelected(null)}
            />
            {selectedEvent && (
              <EventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            )}
            <IntelFeed />
          </aside>
        </div>
      </main>
    </div>
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
  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-black/55 p-1 backdrop-blur-md">
      <Layers className="ml-1 h-3 w-3 text-muted-foreground" />
      <Item on={layers.trade} onClick={() => setLayers({ ...layers, trade: !layers.trade })} icon={RouteIcon} label="Flows" />
      <Item on={layers.tensions} onClick={() => setLayers({ ...layers, tensions: !layers.tensions })} icon={Flame} label="Tensions" />
      <Item on={layers.events} onClick={() => setLayers({ ...layers, events: !layers.events })} icon={Eye} label="Events" />
    </div>
  );
}

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] bg-black/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
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

function GlobalSummaryStrip() {
  const s = GLOBAL_SUMMARY;
  type Tone = "ok" | "warn" | "bad" | "info";
  const items: { label: string; value: string; tone: Tone }[] = [
    { label: "Risk Sentiment", value: s.sentiment === "risk-on" ? "Risk-On" : s.sentiment === "risk-off" ? "Risk-Off" : "Mixed", tone: s.sentiment === "risk-on" ? "ok" : s.sentiment === "risk-off" ? "bad" : "warn" },
    { label: "Liquidity", value: s.trend === "expanding" ? "Expanding" : s.trend === "recession" ? "Tightening" : "Stable", tone: s.trend === "expanding" ? "ok" : s.trend === "recession" ? "bad" : "warn" },
    { label: "Volatility", value: s.volatility === "low" ? "Low" : s.volatility === "high" ? "High" : "Medium", tone: s.volatility === "low" ? "ok" : s.volatility === "high" ? "bad" : "warn" },
    { label: "USD Strength", value: s.usd === "strong" ? "Strong" : s.usd === "weak" ? "Weak" : "Neutral", tone: "info" },
    { label: "Trend Bias", value: s.mood === "bullish" ? "Bullish" : s.mood === "bearish" ? "Bearish" : "Uncertain", tone: s.mood === "bullish" ? "ok" : s.mood === "bearish" ? "bad" : "warn" },
  ];
  const tc = (t: Tone) =>
    t === "ok"
      ? "oklch(0.72 0.10 155)"
      : t === "bad"
        ? "oklch(0.66 0.13 25)"
        : t === "warn"
          ? "oklch(0.78 0.10 78)"
          : "oklch(0.74 0.08 240)";
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => {
        const c = tc(it.tone);
        return (
          <div
            key={it.label}
            className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-3.5 py-3 backdrop-blur transition hover:border-white/20"
          >
            <span
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }}
            />
            <div className="flex items-center justify-between">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {it.label}
              </div>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
            </div>
            <div
              className="mt-1.5 font-display text-base font-bold tabular-nums tracking-tight"
              style={{ color: c }}
            >
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────── World Map ───────────────────── */

function WorldMap({
  world,
  geo,
  selected,
  hovered,
  layers,
  onHover,
  onSelectCountry,
  onSelectEvent,
}: {
  world: WorldGeo | null;
  geo: { path: ReturnType<typeof geoPath>; projection: ReturnType<typeof geoNaturalEarth1> };
  selected: CountryIntel | null;
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

      {/* Countries — institutional baseline; every country visible */}
      <g>
        {world.features.map((f, i) => {
          const name = f.properties?.name ?? "";
          const intel = COUNTRIES_BY_NAME.get(name);
          const isSelected = selected?.name === name;
          const isHovered = hovered === name;
          const tint = intel ? RISK_COLOR[intel.risk] : null;
          const d = geo.path(f as any) ?? "";
          // Always visible: neutral base + subtle risk tint overlay only for tracked countries
          return (
            <g key={i}>
              <path
                d={d}
                fill={NEUTRAL_LAND}
                fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.78}
                stroke={isSelected ? "oklch(0.96 0 0)" : "oklch(0.18 0.015 260)"}
                strokeWidth={isSelected ? 0.8 : 0.3}
                style={{
                  cursor: intel ? "pointer" : "default",
                  transition: "fill-opacity 220ms ease, stroke-width 220ms ease",
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
                  fillOpacity={isSelected ? 0.34 : isHovered ? 0.26 : 0.18}
                  stroke="none"
                  pointerEvents="none"
                />
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
            return (
              <g key={f.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.55}
                  strokeWidth={0.9}
                  strokeDasharray={dashed ? "3 3" : undefined}
                  filter="url(#softGlow)"
                >
                  <title>{f.label} — {f.status} · {f.note}</title>
                </path>
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
                strokeOpacity={t.level === "high" ? 0.55 : 0.4}
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
            return (
              <g key={e.id} style={{ cursor: "pointer" }} onClick={() => onSelectEvent(e)}>
                <circle cx={x} cy={y} r={4.6} fill={color} fillOpacity={0.18} />
                <circle cx={x} cy={y} r={2.4} fill={color} stroke="oklch(0.10 0.014 260)" strokeWidth={0.6}>
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

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[oklch(0.14_0.022_260)] to-[oklch(0.10_0.016_260)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
      <div
        className="relative border-b border-white/[0.06] p-5"
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
                <div className="col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
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
                    className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5 text-xs leading-relaxed text-foreground/85"
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
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
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
        </div>
      </ScrollArea>
    </div>
  );
}

/* ───────────────────── Event Panel ───────────────────── */

function EventPanel({ event, onClose }: { event: GlobalEvent; onClose: () => void }) {
  const color = EVENT_COLOR[event.type];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[oklch(0.12_0.018_260)] backdrop-blur">
      <div
        className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-4"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${color} 14%, transparent), transparent)`,
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {event.category} · {event.date}
          </div>
          <div className="mt-1 font-display text-base font-bold tracking-tight">{event.title}</div>
          <div className="text-[11px] text-muted-foreground">{event.location}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white/10" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs leading-relaxed text-foreground/85">{event.summary}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {event.impact.fx && <ImpactTag label="FX" value={event.impact.fx} />}
          {event.impact.commodities && <ImpactTag label="Commodities" value={event.impact.commodities} />}
          {event.impact.equities && <ImpactTag label="Equities" value={event.impact.equities} />}
          {event.impact.regions && <ImpactTag label="Regions" value={event.impact.regions} />}
        </div>
      </div>
    </div>
  );
}

function ImpactTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-[11px] text-foreground/85">{value}</div>
    </div>
  );
}

/* ───────────────────── Intel feed ───────────────────── */

function IntelFeed() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[oklch(0.11_0.016_260)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
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
              <li key={f.id} className="px-4 py-3 transition hover:bg-white/[0.02]">
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
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
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
      className={`rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/15 ${
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/15">
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
    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition hover:border-white/15">
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
    queryFn: () => fetchNews({ data: { country: country.name, sources: trusted, limit: 3 } }),
    enabled: trusted.length > 0,
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (trusted.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        No trusted news sources selected. Choose your sources in settings.
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
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
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-muted-foreground">
        No fresh stories from your trusted sources for {country.name} in the past week.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => {
        const meta = (AGENCY_META as Record<string, { label: string }>)[n.source] ?? { label: n.sourceLabel };
        return (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition hover:border-primary/30 hover:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[9px] uppercase tracking-wider">
                {meta.label}
              </Badge>
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live · 7d
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
          </a>
        );
      })}
    </div>
  );
}
