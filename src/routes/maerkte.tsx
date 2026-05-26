import { createFileRoute, Link } from "@tanstack/react-router";
import { INDICES, PRODUCTS_BY_SECTOR, SECTORS } from "@/lib/products";
import {
  Cpu, Flame, Landmark, HeartPulse, ShoppingBag, Factory, Gem, Globe2, TrendingUp, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/maerkte")({ component: MaerktePage });

const SECTOR_META: Record<string, { icon: any; gradient: string; ring: string; tint: string; label: string }> = {
  Technologie: { icon: Cpu,        gradient: "from-cyan-accent/25 via-primary/15 to-transparent", ring: "ring-cyan-accent/30",   tint: "text-cyan-accent",     label: "Tech & Software" },
  Energie:     { icon: Flame,      gradient: "from-bear/25 via-gold/15 to-transparent",            ring: "ring-bear/30",          tint: "text-bear",            label: "Öl, Gas & Energie" },
  Finanzen:    { icon: Landmark,   gradient: "from-gold/25 via-primary/15 to-transparent",         ring: "ring-gold/30",          tint: "text-gold",            label: "Banken & Versicherer" },
  Gesundheit:  { icon: HeartPulse, gradient: "from-bull/25 via-cyan-accent/15 to-transparent",     ring: "ring-bull/30",          tint: "text-bull",            label: "Pharma & Biotech" },
  Konsum:      { icon: ShoppingBag,gradient: "from-violet-accent/25 via-primary/15 to-transparent",ring: "ring-violet-accent/30", tint: "text-violet-accent",   label: "Konsumgüter & Retail" },
  Industrie:   { icon: Factory,    gradient: "from-primary/25 via-cyan-accent/15 to-transparent",  ring: "ring-primary/30",       tint: "text-primary",         label: "Maschinen & Bau" },
  Rohstoffe:   { icon: Gem,        gradient: "from-gold/25 via-bear/15 to-transparent",            ring: "ring-gold/30",          tint: "text-gold",            label: "Edelmetalle & Materials" },
};

const REGION_FLAG: Record<string, string> = {
  US: "🇺🇸", DE: "🇩🇪", EU: "🇪🇺", UK: "🇬🇧", JP: "🇯🇵",
};

function SectorCard({ sector }: { sector: string }) {
  const meta = SECTOR_META[sector];
  const Icon = meta?.icon ?? Globe2;
  const list = PRODUCTS_BY_SECTOR.get(sector) ?? [];
  const preview = list.slice(0, 9);

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/10`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta?.gradient ?? ""} opacity-60`} />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-background/70 ring-1 ${meta?.ring ?? "ring-border"}`}>
              <Icon className={`h-5 w-5 ${meta?.tint ?? "text-foreground"}`} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">{sector}</h3>
              <p className="text-[11px] text-muted-foreground">{meta?.label}</p>
            </div>
          </div>
          <span className={`rounded-full bg-background/60 px-2 py-0.5 font-mono text-xs ${meta?.tint ?? ""}`}>
            {list.length}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {preview.map((p) => (
            <Link
              key={p.symbol}
              to="/produkte/$symbol"
              params={{ symbol: p.symbol }}
              className="group/sym flex items-center justify-between rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs font-mono backdrop-blur transition hover:border-primary/60 hover:bg-primary/10"
            >
              <span className="truncate">{p.symbol}</span>
              <span className="ml-1 text-[10px] opacity-60">{REGION_FLAG[p.region]}</span>
            </Link>
          ))}
        </div>

        <Link
          to="/produkte"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Alle {list.length} ansehen <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function IndexCard({ idx }: { idx: { symbol: string; name: string; region: string } }) {
  return (
    <Link
      to="/produkte/$symbol"
      params={{ symbol: idx.symbol }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:border-gold/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/10"
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-gold/20 to-transparent blur-xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{idx.name}</div>
          <div className="mt-1 font-mono text-xl font-bold text-gradient-gold">{idx.symbol}</div>
        </div>
        <span className="text-base">{REGION_FLAG[idx.region]}</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <TrendingUp className="h-3 w-3" /> Live öffnen
      </div>
    </Link>
  );
}

function MaerktePage() {
  const activeSectors = SECTORS.filter((s) => PRODUCTS.some((p) => p.sector === s));
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Globe2 className="h-3 w-3 text-gold" /> Globale Marktübersicht
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Märkte & <span className="text-gradient-gold">Sektoren</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {PRODUCTS.length} handelbare Symbole quer durch {activeSectors.length} Sektoren und {Object.keys(REGION_FLAG).length} Regionen.
          Kurse werden erst beim Öffnen geladen — schonend für den Edge-Cache.
        </p>
      </div>

      {/* Indizes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Leitindizes</h2>
          <span className="text-[10px] text-muted-foreground">{INDICES.length} Benchmarks</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {INDICES.map((idx) => (
            <IndexCard key={idx.symbol} idx={idx} />
          ))}
        </div>
      </section>

      {/* Sektoren */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sektoren</h2>
          <Link to="/heatmap" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold">
            <Flame className="h-3 w-3" /> Heatmap ansehen
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeSectors.map((s) => <SectorCard key={s} sector={s} />)}
        </div>
      </section>
    </div>
  );
}
