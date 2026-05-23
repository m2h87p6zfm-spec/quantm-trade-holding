import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import {
  COUNTRIES,
  COUNTRIES_BY_NAME,
  GLOBAL_SUMMARY,
  RISK_COLOR,
  RISK_LABEL,
  type CountryIntel,
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
  Globe2,
  Landmark,
  Minus,
  Newspaper,
  Radio,
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
      { title: "Global Macro Intelligence — Apex Trades" },
      {
        name: "description",
        content:
          "Interaktiver geopolitischer Welt-Macro-Monitor: Klick ein Land und verstehe sofort Risiko, Wirtschaft, Politik und Marktauswirkungen.",
      },
      { property: "og:title", content: "Global Macro Intelligence — Apex Trades" },
      {
        property: "og:description",
        content:
          "Bloomberg-Style Welt-Karte mit live Risikofarben, geopolitischen Daten und Markt-Wirkungs-Analyse.",
      },
    ],
  }),
  component: GlobalIntelPage,
});

const WORLD_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MAP_W = 1000;
const MAP_H = 520;

type WorldGeo = FeatureCollection<Geometry, { name: string }>;

function GlobalIntelPage() {
  const [world, setWorld] = useState<WorldGeo | null>(null);
  const [selected, setSelected] = useState<CountryIntel | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [utc, setUtc] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      const ss = String(d.getUTCSeconds()).padStart(2, "0");
      setUtc(`${hh}:${mm}:${ss} UTC`);
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
    const projection = geoNaturalEarth1().fitSize([MAP_W, MAP_H], world ?? {
      type: "Sphere",
    } as any);
    return geoPath(projection);
  }, [world]);

  return (
    <div className="min-h-screen bg-[oklch(0.10_0.018_265)] text-foreground">
      {/* Hero / global summary */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        {/* layered backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.16_0.04_265)] via-[oklch(0.12_0.025_265)] to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at top, black 30%, transparent 75%)",
            }}
          />
          <div className="absolute -top-32 left-1/2 h-72 w-[60rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1600px] px-4 pb-6 pt-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30">
                <Globe2 className="h-5 w-5 text-primary" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_oklch(0.72_0.18_150)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  <span>Apex</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span>Macro Intelligence Terminal</span>
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

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3.5 py-2.5 backdrop-blur">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-foreground/75">
              {GLOBAL_SUMMARY.headline}
            </p>
          </div>
        </div>
      </header>

      {/* Map + panel */}
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
          {/* Map */}
          <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[oklch(0.13_0.025_265)] to-[oklch(0.09_0.02_265)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
            {/* corner ornaments */}
            <CornerOrnaments />

            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-md">
              <Activity className="h-3 w-3 text-primary" />
              <span>2D · Risk Heatmap</span>
            </div>
            <div className="absolute right-4 top-4 z-10 flex items-center gap-3 rounded-md border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md">
              <LegendDot color={RISK_COLOR.low} label="Stable" />
              <LegendDot color={RISK_COLOR.medium} label="Neutral" />
              <LegendDot color={RISK_COLOR.high} label="High Risk" />
            </div>

            {hovered && (
              <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80 backdrop-blur-md">
                {hovered}
              </div>
            )}

            <div className="relative aspect-[1000/520] w-full">
              {error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  Karte konnte nicht geladen werden: {error}
                </div>
              )}
              {!error && (
                <WorldMap
                  world={world}
                  path={path}
                  selected={selected}
                  hovered={hovered}
                  onHover={setHovered}
                  onSelect={(c) => setSelected(c)}
                />
              )}
            </div>
          </section>

          {/* Side panel */}
          <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
            <CountryPanel country={selected} onClose={() => setSelected(null)} />
          </aside>
        </div>

        {/* Countries strip */}
        <section className="mt-6 rounded-2xl border border-white/[0.06] bg-black/20 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Tracked Countries
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
                  onClick={() => setSelected(c)}
                  className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition-all ${
                    isSel
                      ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_0_3px_oklch(0.65_0.18_260/0.08)]"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:-translate-y-0.5 hover:border-white/25 hover:text-foreground"
                  }`}
                >
                  <span aria-hidden>{c.flag}</span>
                  <span className="font-medium">{c.name}</span>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: RISK_COLOR[c.risk],
                      boxShadow: `0 0 6px ${RISK_COLOR[c.risk]}`,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ───────────────────── Components ───────────────────── */

function CornerOrnaments() {
  const cls =
    "pointer-events-none absolute h-4 w-4 border-primary/40";
  return (
    <>
      <span className={`${cls} left-2 top-2 border-l border-t`} />
      <span className={`${cls} right-2 top-2 border-r border-t`} />
      <span className={`${cls} bottom-2 left-2 border-b border-l`} />
      <span className={`${cls} bottom-2 right-2 border-b border-r`} />
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      {label}
    </div>
  );
}

function GlobalSummaryStrip() {
  const s = GLOBAL_SUMMARY;
  const items: { label: string; value: string; tone: "ok" | "warn" | "bad" | "info" }[] = [
    {
      label: "Risk Sentiment",
      value:
        s.sentiment === "risk-on" ? "Risk-On" : s.sentiment === "risk-off" ? "Risk-Off" : "Mixed",
      tone: s.sentiment === "risk-on" ? "ok" : s.sentiment === "risk-off" ? "bad" : "warn",
    },
    {
      label: "Volatility",
      value: s.volatility === "low" ? "Low" : s.volatility === "high" ? "High" : "Medium",
      tone: s.volatility === "low" ? "ok" : s.volatility === "high" ? "bad" : "warn",
    },
    {
      label: "USD Strength",
      value: s.usd === "strong" ? "Strong" : s.usd === "weak" ? "Weak" : "Neutral",
      tone: s.usd === "strong" ? "info" : s.usd === "weak" ? "warn" : "info",
    },
    {
      label: "Global Trend",
      value:
        s.trend === "expanding" ? "Expanding" : s.trend === "recession" ? "Recession Risk" : "Slowing",
      tone: s.trend === "expanding" ? "ok" : s.trend === "recession" ? "bad" : "warn",
    },
    {
      label: "Market Mood",
      value: s.mood === "bullish" ? "Bullish" : s.mood === "bearish" ? "Bearish" : "Uncertain",
      tone: s.mood === "bullish" ? "ok" : s.mood === "bearish" ? "bad" : "warn",
    },
  ];
  const toneColor = (t: "ok" | "warn" | "bad" | "info") =>
    t === "ok"
      ? "oklch(0.78 0.17 150)"
      : t === "bad"
      ? "oklch(0.7 0.21 25)"
      : t === "warn"
      ? "oklch(0.82 0.16 75)"
      : "oklch(0.75 0.12 250)";

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => {
        const c = toneColor(it.tone);
        return (
          <div
            key={it.label}
            className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-3.5 py-3 backdrop-blur transition hover:border-white/20"
          >
            <span
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
              }}
            />
            <div className="flex items-center justify-between">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {it.label}
              </div>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }}
              />
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

function WorldMap({
  world,
  path,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  world: WorldGeo | null;
  path: ReturnType<typeof geoPath>;
  selected: CountryIntel | null;
  hovered: string | null;
  onHover: (name: string | null) => void;
  onSelect: (c: CountryIntel) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([0, 0, MAP_W, MAP_H]);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!world) return;
    let target: [number, number, number, number] = [0, 0, MAP_W, MAP_H];
    if (selected) {
      const f = world.features.find((x) => x.properties?.name === selected.name);
      if (f) {
        const [[x0, y0], [x1, y1]] = path.bounds(f as any);
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

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox.join(" ")}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
    >
      <defs>
        <radialGradient id="oceanBg" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="oklch(0.17 0.03 260)" />
          <stop offset="70%" stopColor="oklch(0.11 0.02 265)" />
          <stop offset="100%" stopColor="oklch(0.08 0.018 265)" />
        </radialGradient>
        <filter id="countryGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="oklch(0.5 0.02 265)" opacity="0.15" />
        </pattern>
      </defs>

      <rect x={-MAP_W} y={-MAP_H} width={MAP_W * 3} height={MAP_H * 3} fill="url(#oceanBg)" />
      <rect x={-MAP_W} y={-MAP_H} width={MAP_W * 3} height={MAP_H * 3} fill="url(#dots)" />

      {/* graticule */}
      <path
        d={path(graticule as any) ?? ""}
        fill="none"
        stroke="oklch(0.3 0.02 265)"
        strokeWidth={0.3}
        strokeOpacity={0.4}
      />

      <g>
        {world.features.map((f, i) => {
          const name = f.properties?.name ?? "";
          const intel = COUNTRIES_BY_NAME.get(name);
          const isSelected = selected?.name === name;
          const isHovered = hovered === name;
          const baseFill = intel ? RISK_COLOR[intel.risk] : "oklch(0.24 0.018 265)";
          const fillOpacity = intel ? (isSelected ? 0.92 : isHovered ? 0.78 : 0.62) : 0.55;
          const d = path(f as any) ?? "";
          return (
            <path
              key={i}
              d={d}
              fill={baseFill}
              fillOpacity={fillOpacity}
              stroke={isSelected ? "oklch(0.98 0 0)" : "oklch(0.16 0.02 265)"}
              strokeWidth={isSelected ? 0.9 : 0.35}
              filter={isSelected ? "url(#countryGlow)" : undefined}
              style={{
                cursor: intel ? "pointer" : "default",
                transition: "fill-opacity 220ms ease, stroke-width 220ms ease",
              }}
              onMouseEnter={() => onHover(name)}
              onMouseLeave={() => onHover(null)}
              onClick={() => intel && onSelect(intel)}
            >
              <title>
                {name}
                {intel ? ` — ${RISK_LABEL[intel.risk]}` : " — (no data yet)"}
              </title>
            </path>
          );
        })}
      </g>
    </svg>
  );
}

function CountryPanel({
  country,
  onClose,
}: {
  country: CountryIntel | null;
  onClose: () => void;
}) {
  if (!country) {
    return (
      <div className="relative flex h-full min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-8 text-center">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, oklch(0.65 0.18 260 / 0.15), transparent 60%)",
        }} />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Globe2 className="h-6 w-6 text-primary" />
        </div>
        <h3 className="relative mt-4 font-display text-base font-semibold">Select a country</h3>
        <p className="relative mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Klick auf die Karte oder unten auf ein Land, um geopolitische Lage, Wirtschaft, Marktauswirkungen und News zu sehen.
        </p>
      </div>
    );
  }
  const riskColor = RISK_COLOR[country.risk];
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[oklch(0.14_0.025_265)] to-[oklch(0.10_0.02_265)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
      <div
        className="relative border-b border-white/[0.06] p-5"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${riskColor} 18%, transparent), transparent)`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${riskColor}, transparent)`,
          }}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl leading-none" aria-hidden>
                {country.flag}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold leading-tight tracking-tight">
                  {country.name}
                </h2>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${riskColor} 20%, transparent)`,
                      color: riskColor,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${riskColor} 40%, transparent)`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: riskColor, boxShadow: `0 0 6px ${riskColor}` }}
                    />
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

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-5">
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

          {/* Geopolitics */}
          <Section icon={ShieldCheck} title="Geopolitical state">
            <div className="grid grid-cols-2 gap-2">
              <KV label="Government" value={country.geopolitics.governmentStability} />
              <KV label="Political risk" value={country.geopolitics.politicalRisk} />
              <KV label="Policy" value={country.geopolitics.policyDirection} />
              <KV label="Tensions" value={country.geopolitics.tensions} tight />
            </div>
          </Section>

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
                map={{
                  low: "Low",
                  high: "High",
                  tightening: "Tightening",
                  easing: "Easing",
                }}
                tone={{ low: "info", high: "bad", tightening: "warn", easing: "ok" }}
              />
              <EconKV
                label="GDP"
                value={country.economy.gdp}
                map={{
                  growing: "Growing",
                  slowing: "Slowing",
                  "recession-risk": "Recession risk",
                }}
                tone={{ growing: "ok", slowing: "warn", "recession-risk": "bad" }}
                arrows={{ growing: "up", slowing: "flat", "recession-risk": "down" }}
              />
              <EconKV
                label="FX vs USD"
                value={country.economy.fxVsUsd}
                map={{
                  weakening: "Weakening",
                  stable: "Stable",
                  strengthening: "Strengthening",
                }}
                tone={{ weakening: "bad", stable: "info", strengthening: "ok" }}
                arrows={{ weakening: "down", stable: "flat", strengthening: "up" }}
              />
            </div>
          </Section>

          {/* Market impact */}
          <Section icon={Zap} title="Market impact zones">
            <div className="space-y-1.5">
              <ImpactRow icon={TrendingUp} label="Equities" text={country.impact.equities} />
              <ImpactRow icon={Coins} label="Forex" text={country.impact.forex} />
              <ImpactRow icon={Activity} label="Commodities" text={country.impact.commodities} />
              <ImpactRow icon={Globe2} label="Risk sentiment" text={country.impact.sentiment} />
            </div>
          </Section>

          {/* Pos / Neg */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ListCard
              title="Positives"
              items={country.positives}
              tone="ok"
              icon={ArrowUpRight}
            />
            <ListCard
              title="Negatives"
              items={country.negatives}
              tone="bad"
              icon={ArrowDownRight}
            />
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
      ? "text-emerald-400"
      : t === "bad"
      ? "text-rose-400"
      : t === "warn"
      ? "text-amber-400"
      : "text-sky-300";
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
  const color = tone === "ok" ? "text-emerald-400" : "text-rose-400";
  const ring =
    tone === "ok" ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-rose-500/15 bg-rose-500/[0.04]";
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

  const items = useMemo(() => {
    if (trusted.length === 0) return [];
    return country.newsKeywords.slice(0, 3).map((kw, i) => {
      const sourceKey = trusted[i % trusted.length];
      const meta = (AGENCY_META as any)[sourceKey] ?? { label: sourceKey };
      return {
        id: `${country.iso2}-${i}`,
        source: sourceKey,
        label: meta.label,
        headline: `${country.flag} ${kw}: ${
          country.risk === "high"
            ? "Risiken eskalieren — Anleger beobachten Volatilität."
            : country.risk === "medium"
            ? "Märkte gemischt — Analysten warten auf nächste Datenpunkte."
            : "Sentiment stabil — Fokus auf Fundamentaldaten."
        }`,
      };
    });
  }, [country, trusted]);

  if (trusted.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Keine vertrauten News-Quellen ausgewählt. Wähle deine Quellen in den Einstellungen.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div
          key={n.id}
          className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition hover:border-white/15"
        >
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[9px] uppercase tracking-wider">
              {n.label}
            </Badge>
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <div className="mt-1.5 text-xs leading-relaxed text-foreground/90">{n.headline}</div>
        </div>
      ))}
      <p className="font-mono text-[10px] italic text-muted-foreground">
        Headlines aus Apex News-Engine · deine vertrauten Quellen.
      </p>
    </div>
  );
}
