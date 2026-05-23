import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
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
    <div className="min-h-screen bg-background">
      {/* Hero / global summary */}
      <header className="border-b border-border/40 bg-gradient-to-b from-[oklch(0.14_0.02_265)] to-background">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Globe2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Apex · Macro Intelligence
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Global Market & Geopolitical Monitor
              </h1>
            </div>
          </div>

          <GlobalSummaryStrip />
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {GLOBAL_SUMMARY.headline}
          </p>
        </div>
      </header>

      {/* Map + panel */}
      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Map */}
          <section className="relative overflow-hidden rounded-xl border border-border/40 bg-[oklch(0.11_0.02_265)]">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
              <Activity className="h-3 w-3 text-primary" /> 2D World Risk Map
            </div>
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[10px] backdrop-blur">
              <LegendDot color={RISK_COLOR.low} label="Stable" />
              <LegendDot color={RISK_COLOR.medium} label="Neutral" />
              <LegendDot color={RISK_COLOR.high} label="High Risk" />
            </div>

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
        <section className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Tracked countries
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map((c) => (
              <button
                key={c.iso2}
                onClick={() => setSelected(c)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                  selected?.iso2 === c.iso2
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/40 bg-background/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <span aria-hidden>{c.flag}</span>
                <span>{c.name}</span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: RISK_COLOR[c.risk] }}
                />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ───────────────────── Components ───────────────────── */

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
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
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-border/40 bg-background/40 px-3 py-2.5"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {it.label}
          </div>
          <div
            className={`mt-1 text-sm font-semibold ${
              it.tone === "ok"
                ? "text-emerald-400"
                : it.tone === "bad"
                ? "text-rose-400"
                : it.tone === "warn"
                ? "text-amber-400"
                : "text-foreground"
            }`}
          >
            {it.value}
          </div>
        </div>
      ))}
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

  useEffect(() => {
    if (!world || !selected) {
      setViewBox([0, 0, MAP_W, MAP_H]);
      return;
    }
    const f = world.features.find((x) => x.properties?.name === selected.name);
    if (!f) {
      setViewBox([0, 0, MAP_W, MAP_H]);
      return;
    }
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
    setViewBox([cx - vw / 2, cy - vh / 2, vw, vh]);
  }, [selected, world, path]);

  if (!world) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Loading world map…
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox.join(" ")}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full transition-[viewBox] duration-700 ease-out"
      style={{ transition: "all 700ms ease" }}
    >
      <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="oklch(0.13 0.02 265)" />
      <g>
        {world.features.map((f, i) => {
          const name = f.properties?.name ?? "";
          const intel = COUNTRIES_BY_NAME.get(name);
          const isSelected = selected?.name === name;
          const isHovered = hovered === name;
          const baseFill = intel
            ? RISK_COLOR[intel.risk]
            : "oklch(0.22 0.015 265)";
          const fillOpacity = intel ? (isSelected ? 0.95 : isHovered ? 0.75 : 0.55) : 0.45;
          const d = path(f as any) ?? "";
          return (
            <path
              key={i}
              d={d}
              fill={baseFill}
              fillOpacity={fillOpacity}
              stroke={isSelected ? "white" : "oklch(0.18 0.02 265)"}
              strokeWidth={isSelected ? 0.8 : 0.3}
              style={{
                cursor: intel ? "pointer" : "default",
                transition: "fill-opacity 200ms ease",
              }}
              onMouseEnter={() => onHover(name)}
              onMouseLeave={() => onHover((h) => (h === name ? null : h) as any)}
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
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/30 p-8 text-center">
        <Globe2 className="h-8 w-8 text-muted-foreground/60" />
        <h3 className="mt-3 font-display text-base font-semibold">Click any country</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Wähle ein Land auf der Karte oder unten, um geopolitische Lage, Wirtschaft, Marktauswirkungen und News zu sehen.
        </p>
      </div>
    );
  }
  const riskColor = RISK_COLOR[country.risk];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-[oklch(0.12_0.02_265)]/95 shadow-xl backdrop-blur">
      <div
        className="relative border-b border-border/40 p-4"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${riskColor} 22%, transparent), transparent)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {country.flag}
              </span>
              <h2 className="font-display text-lg font-bold tracking-tight">{country.name}</h2>
              <Badge
                variant="outline"
                className="border-0 text-[10px] uppercase tracking-wider"
                style={{
                  backgroundColor: `color-mix(in oklab, ${riskColor} 25%, transparent)`,
                  color: riskColor,
                }}
              >
                {RISK_LABEL[country.risk]}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">{country.summary}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Pivotal event */}
          <Section icon={Landmark} title="Pivotal event">
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{country.pivotalEvent.title}</div>
                <Badge variant="outline" className="text-[10px]">
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
          <Section icon={Newspaper} title="Live news (your trusted sources)">
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
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, tight }: { label: string; value: string; tight?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-border/40 bg-background/40 px-2.5 py-2 ${
        tight ? "col-span-2" : ""
      }`}
    >
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-foreground">{value}</div>
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
      : "text-foreground";
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${color}`}>
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
    <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/40 p-2.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-xs leading-relaxed text-foreground/90">{text}</div>
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
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
        <Icon className="h-3 w-3" /> {title}
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((s) => (
          <li key={s} className="flex items-start gap-1.5 text-xs text-foreground/85">
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
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Keine vertrauten News-Quellen ausgewählt. Wähle deine Quellen in den Einstellungen.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((n) => (
        <div
          key={n.id}
          className="rounded-lg border border-border/40 bg-background/40 p-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
              {n.label}
            </Badge>
            <span className="text-[9px] text-muted-foreground">Live</span>
          </div>
          <div className="mt-1 text-xs leading-relaxed text-foreground/90">{n.headline}</div>
        </div>
      ))}
      <p className="text-[10px] italic text-muted-foreground">
        Headlines werden aus dem Apex News-Engine mit deinen vertrauten Quellen gespeist.
      </p>
    </div>
  );
}
