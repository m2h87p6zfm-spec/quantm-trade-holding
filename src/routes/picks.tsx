import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_BY_SYMBOL, type Product } from "@/lib/products";
import { useSettings } from "@/lib/settings";
import { ApexLogo } from "@/components/ApexLogo";
import { PickCard, type BeginnerPick } from "@/components/beginner/PickCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/picks")({
  head: () => ({
    meta: [
      { title: "Quantm Picks — Aktuelle Aktien-Empfehlungen" },
      {
        name: "description",
        content:
          "Klare, beginnerfreundliche Aktien-Empfehlungen — täglich aus tausenden Werten analysiert. Kein Fachjargon, nur klare Kauf- oder Beobachten-Signale.",
      },
      { property: "og:title", content: "Quantm Picks" },
      { property: "og:description", content: "Aktien-Empfehlungen ohne Fachjargon." },
    ],
  }),
  component: PicksPage,
});

const SECTORS = ["Alle", "Technologie", "Gesundheit", "Finanzen", "Konsum", "Energie", "Industrie", "Rohstoffe"] as const;
const STRENGTHS = ["Alle", "Stark", "Mittel"] as const;
const CAPS = ["Alle", "Large Cap", "Mid Cap", "Small Cap"] as const;
const REGIONS = ["Alle", "US", "DE", "EU", "UK", "JP"] as const;

type Sector = (typeof SECTORS)[number];
type Strength = (typeof STRENGTHS)[number];
type CapFilter = (typeof CAPS)[number];
type RegionFilter = (typeof REGIONS)[number];

const CAP_LABEL: Record<NonNullable<Product["cap"]>, string> = {
  large: "Large Cap",
  mid: "Mid Cap",
  small: "Small Cap",
};
const CAP_DESCRIPTION: Record<NonNullable<Product["cap"]>, string> = {
  large: "Etablierte Konzerne (>10 Mrd. USD) — geringere Schwankung, stabiler.",
  mid: "Mittelgroße Unternehmen (2–10 Mrd. USD) — gute Balance aus Wachstum und Stabilität.",
  small: "Kleinere Werte (<2 Mrd. USD) — höhere Chance, aber auch höheres Risiko.",
};

type CachedPick = {
  symbol: string;
  name?: string;
  sector?: Product["sector"];
  region?: Product["region"];
  confidence?: number;
  upsidePct?: number;
  last?: number;
  rsi?: number;
  zScore?: number;
  macdHist?: number;
  volatility?: number;
  momentum?: number;
  decision?: string;
  regime?: string;
  scannedAt?: string;
  mtfConfirmation?: "confirmed" | "diverging" | "neutral";
  earningsInDays?: number;
  obvScore?: number;
  cmfScore?: number;
};

function buildReason(p: CachedPick, capKey?: NonNullable<Product["cap"]> | null): string {
  const parts: string[] = [];
  if (typeof p.momentum === "number" && p.momentum > 0.02) parts.push("starkes Aufwärts-Momentum");
  if (typeof p.rsi === "number") {
    if (p.rsi < 35) parts.push("technisch überverkauft");
    else if (p.rsi > 65) parts.push("kurzfristig stark gelaufen");
  }
  if (typeof p.macdHist === "number" && p.macdHist > 0) parts.push("Trendwechsel nach oben");
  if (typeof p.upsidePct === "number" && p.upsidePct > 5) parts.push(`Kursziel ~${p.upsidePct.toFixed(0)} % höher`);
  if (p.regime === "bull") parts.push("Markt insgesamt freundlich");
  if (capKey === "small") parts.push("Small Cap — höhere Chance, aber auch höheres Risiko");
  else if (capKey === "mid") parts.push("solider Mid-Cap-Wert");
  else if (capKey === "large") parts.push("etablierter Large Cap");
  if (parts.length === 0) parts.push("Algorithmus sieht eine günstige Konstellation");
  const capitalized = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return capitalized + (parts.length > 1 ? ", " + parts.slice(1).join(", ") : "") + ".";
}

function PicksPage() {
  const { settings } = useSettings();
  const [sector, setSector] = useState<Sector>("Alle");
  const [strength, setStrength] = useState<Strength>("Alle");
  const [cap, setCap] = useState<CapFilter>("Alle");
  const [region, setRegion] = useState<RegionFilter>("Alle");
  const [rawPicks, setRawPicks] = useState<CachedPick[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("picks_cache")
        .select("picks")
        .eq("scope_key", "combined|Alle|Alle")
        .maybeSingle();
      if (cancelled) return;
      const list = ((data?.picks as unknown[] | undefined) ?? []) as CachedPick[];
      setRawPicks(list);
      setLoaded(true);
    })().catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  type Enriched = {
    pick: BeginnerPick;
    capKey: NonNullable<Product["cap"]> | null;
    regionKey: Product["region"] | null;
  };

  const enriched: Enriched[] = useMemo(() => {
    const list = rawPicks ?? [];
    return list
      .map((p): Enriched | null => {
        const sym = String(p.symbol);
        const product = PRODUCT_BY_SYMBOL.get(sym);
        const name = product?.name ?? p.name ?? sym;
        const productSector = product?.sector ?? p.sector ?? null;
        const capKey = product?.cap ?? null;
        const regionKey = product?.region ?? p.region ?? null;
        const confidence = Math.max(0, Math.min(100, Number(p.confidence ?? 0)));
        const action: BeginnerPick["action"] = confidence >= settings.minConfidence ? "KAUFEN" : "BEOBACHTEN";
        const last = Number(p.last ?? 0);
        const upsidePct = Number(p.upsidePct ?? 0);
        const target = last && upsidePct ? last * (1 + upsidePct / 100) : null;
        const capSuffix = capKey ? ` · ${CAP_LABEL[capKey]}` : "";
        const sectorLabel = productSector ? `${productSector}${capSuffix}` : capKey ? CAP_LABEL[capKey] : null;
        const pick: BeginnerPick = {
          symbol: sym,
          name,
          sector: sectorLabel,
          reason: buildReason(p, capKey),
          confidence,
          targetPrice: target,
          lastPrice: last || null,
          date: p.scannedAt ?? new Date().toISOString(),
          action,
          mtfConfirmation: p.mtfConfirmation,
          earningsInDays: typeof p.earningsInDays === "number" ? p.earningsInDays : undefined,
          obvScore: typeof p.obvScore === "number" ? p.obvScore : undefined,
          cmfScore: typeof p.cmfScore === "number" ? p.cmfScore : undefined,
          advanced: [
            { label: "Marktkapitalisierung", value: capKey ? CAP_LABEL[capKey] : "—", tooltip: capKey ? CAP_DESCRIPTION[capKey] : "Größenklasse des Unternehmens." },
            { label: "Region", value: regionKey ?? "—", tooltip: "Heimatbörse / Hauptnotierung." },
            { label: "RSI", value: p.rsi != null ? Number(p.rsi).toFixed(0) : "—", tooltip: "Misst, ob eine Aktie kurzfristig über- oder unterverkauft ist (0–100). Unter 30 = überverkauft, über 70 = überkauft." },
            { label: "Z-Faktor", value: p.zScore != null ? Number(p.zScore).toFixed(2) : "—", tooltip: "Wie weit der Kurs von seinem Durchschnitt entfernt ist — ein statistisches Maß für 'außergewöhnlich'." },
            { label: "MACD Hist.", value: p.macdHist != null ? Number(p.macdHist).toFixed(2) : "—", tooltip: "Zeigt Trendwechsel an. Positive Werte deuten auf Aufwärtsdynamik hin." },
            { label: "Volatilität", value: p.volatility != null ? `${(Number(p.volatility) * 100).toFixed(0)} %` : "—", tooltip: "Wie stark der Kurs typischerweise schwankt — höhere Werte = mehr Risiko." },
            { label: "Marktregime", value: String(p.regime ?? "—"), tooltip: "Aktuelle Marktverfassung: bull, bear, chop usw." },
            { label: "Konfidenz (Rohwert)", value: `${Number(p.confidence ?? 0).toFixed(0)} %`, tooltip: "Wahrscheinlichkeit aus dem Algorithmus, dass die Empfehlung aufgeht." },
          ],
        };
        return { pick, capKey, regionKey };
      })
      .filter((e): e is Enriched => e !== null);
  }, [rawPicks, settings.minConfidence]);

  const filtered = useMemo(() => {
    return enriched
      .filter((e) => (sector === "Alle" ? true : e.pick.sector?.startsWith(sector)))
      .filter((e) => {
        if (strength === "Alle") return true;
        if (strength === "Stark") return e.pick.confidence >= 75;
        if (strength === "Mittel") return e.pick.confidence >= 55 && e.pick.confidence < 75;
        return true;
      })
      .filter((e) => {
        if (cap === "Alle") return true;
        if (!e.capKey) return false;
        return CAP_LABEL[e.capKey] === cap;
      })
      .filter((e) => (region === "Alle" ? true : e.regionKey === region))
      .sort((a, b) => b.pick.confidence - a.pick.confidence);
  }, [enriched, sector, strength, cap, region]);

  const picks = filtered.map((e) => e.pick);

  const stats = useMemo(() => {
    const buys = picks.filter((p) => p.action === "KAUFEN").length;
    const avg = picks.length ? Math.round(picks.reduce((s, p) => s + p.confidence, 0) / picks.length) : 0;
    const capCounts = { large: 0, mid: 0, small: 0 } as Record<NonNullable<Product["cap"]>, number>;
    for (const e of filtered) if (e.capKey) capCounts[e.capKey]++;
    return { total: picks.length, buys, avg, capCounts };
  }, [picks, filtered]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <ApexLogo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">Quantm Trade</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link to="/track-record" className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition">Track Record</Link>
            <Link to="/wie-es-funktioniert" className="hidden sm:inline-flex px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Wie es funktioniert</Link>
            <Link to="/login" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 sm:px-4 text-xs sm:text-sm font-semibold text-primary-foreground transition hover:opacity-90">Anmelden</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        {/* Hero */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3 w-3" /> Aktuelle Empfehlungen
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Quantm Picks</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Unser Algorithmus prüft täglich tausende Aktien. Hier sehen Sie nur die, bei denen sich ein Einstieg gerade lohnen könnte — mit klarer Begründung, ohne Fachjargon.
          </p>
        </section>

        {/* Filters */}
        <section className="grid gap-3 sm:grid-cols-3">
          <FilterSelect label="Sektor" value={sector} options={SECTORS} onChange={(v) => setSector(v as Sector)} />
          <FilterSelect label="Signalstärke" value={strength} options={STRENGTHS} onChange={(v) => setStrength(v as Strength)} />
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <Link
              to="/track-record"
              className="mt-1 flex h-10 items-center justify-between rounded-md border border-border/60 bg-card/60 px-3 text-sm text-foreground/90 transition hover:border-primary/40"
            >
              <span>Abgeschlossene Picks → Track Record</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* Picks */}
        {!loaded ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl border border-border/60 bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {picks.map((p) => (
              <PickCard key={p.symbol} pick={p} />
            ))}
          </section>
        )}

        {/* Footer CTA */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-6 text-center">
          <p className="text-sm text-foreground/90">
            Möchten Sie eine Benachrichtigung erhalten, sobald eine neue Empfehlung kommt?
          </p>
          <Link
            to="/preise"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            7 Tage Elite gratis testen <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Quantm Trade — Keine Anlageberatung.
      </footer>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-10 bg-card/60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
      <h3 className="text-lg font-semibold">Gerade keine aktiven Empfehlungen</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Unser Algorithmus wartet auf die richtige Gelegenheit. Das ist auch eine Strategie — keine Empfehlung zu geben, wenn die Datenlage nicht eindeutig ist.
      </p>
    </div>
  );
}
