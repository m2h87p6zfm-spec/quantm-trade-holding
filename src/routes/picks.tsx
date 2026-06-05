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
const STATUSES = ["Offen", "Geschlossen"] as const;

type Sector = (typeof SECTORS)[number];
type Strength = (typeof STRENGTHS)[number];
type Status = (typeof STATUSES)[number];

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
};

function buildReason(p: CachedPick): string {
  const parts: string[] = [];
  if (typeof p.momentum === "number" && p.momentum > 0.02) parts.push("starkes Aufwärts-Momentum");
  if (typeof p.rsi === "number") {
    if (p.rsi < 35) parts.push("technisch überverkauft");
    else if (p.rsi > 65) parts.push("kurzfristig stark gelaufen");
  }
  if (typeof p.macdHist === "number" && p.macdHist > 0) parts.push("Trendwechsel nach oben");
  if (typeof p.upsidePct === "number" && p.upsidePct > 5) parts.push(`Kursziel ~${p.upsidePct.toFixed(0)} % höher`);
  if (p.regime === "bull") parts.push("Markt insgesamt freundlich");
  if (parts.length === 0) parts.push("Algorithmus sieht eine günstige Konstellation");
  const capitalized = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return capitalized + (parts.length > 1 ? ", " + parts.slice(1).join(", ") : "") + ".";
}

function PicksPage() {
  const { settings } = useSettings();
  const [sector, setSector] = useState<Sector>("Alle");
  const [strength, setStrength] = useState<Strength>("Alle");
  const [status, setStatus] = useState<Status>("Offen");
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

  const picks: BeginnerPick[] = useMemo(() => {
    const list = rawPicks ?? [];
    return list
      .map((p): BeginnerPick | null => {
        const sym = String(p.symbol);
        const product = PRODUCT_BY_SYMBOL.get(sym);
        const name = product?.name ?? p.name ?? sym;
        const productSector = product?.sector ?? p.sector ?? null;
        const confidence = Math.max(0, Math.min(100, Number(p.confidence ?? 0)));
        const action: BeginnerPick["action"] = confidence >= settings.minConfidence ? "KAUFEN" : "BEOBACHTEN";
        const last = Number(p.last ?? 0);
        const upsidePct = Number(p.upsidePct ?? 0);
        const target = last && upsidePct ? last * (1 + upsidePct / 100) : null;
        return {
          symbol: sym,
          name,
          sector: productSector,
          reason: buildReason(p),
          confidence,
          targetPrice: target,
          lastPrice: last || null,
          date: p.scannedAt ?? new Date().toISOString(),
          action,
          advanced: [
            { label: "RSI", value: p.rsi != null ? Number(p.rsi).toFixed(0) : "—", tooltip: "Misst, ob eine Aktie kurzfristig über- oder unterverkauft ist (0–100). Unter 30 = überverkauft, über 70 = überkauft." },
            { label: "Z-Faktor", value: p.zScore != null ? Number(p.zScore).toFixed(2) : "—", tooltip: "Wie weit der Kurs von seinem Durchschnitt entfernt ist — ein statistisches Maß für 'außergewöhnlich'." },
            { label: "MACD Hist.", value: p.macdHist != null ? Number(p.macdHist).toFixed(2) : "—", tooltip: "Zeigt Trendwechsel an. Positive Werte deuten auf Aufwärtsdynamik hin." },
            { label: "Volatilität", value: p.volatility != null ? `${(Number(p.volatility) * 100).toFixed(0)} %` : "—", tooltip: "Wie stark der Kurs typischerweise schwankt — höhere Werte = mehr Risiko." },
            { label: "Marktregime", value: String(p.regime ?? "—"), tooltip: "Aktuelle Marktverfassung: bull, bear, chop usw." },
            { label: "Konfidenz (Rohwert)", value: `${Number(p.confidence ?? 0).toFixed(0)} %`, tooltip: "Wahrscheinlichkeit aus dem Algorithmus, dass die Empfehlung aufgeht." },
          ],
        };
      })
      .filter((p): p is BeginnerPick => p !== null)
      .filter((p) => (sector === "Alle" ? true : p.sector === sector))
      .filter((p) => {
        if (strength === "Alle") return true;
        if (strength === "Stark") return p.confidence >= 75;
        if (strength === "Mittel") return p.confidence >= 55 && p.confidence < 75;
        return true;
      })
      // Status: aktuell zeigen wir alle Cache-Picks als "Offen". Status "Geschlossen"
      // ist Teil des Track Records und wird hier nicht dargestellt — Filter bleibt
      // sichtbar für Konsistenz, "Geschlossen" liefert leere Liste mit Hinweis.
      .filter((p) => (status === "Offen" ? true : false))
      .sort((a, b) => b.confidence - a.confidence);
  }, [rawPicks, sector, strength, status, settings.minConfidence]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <ApexLogo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">Quantm Trade</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link to="/track-record" className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Track Record</Link>
            <Link to="/wie-es-funktioniert" className="hidden sm:inline-flex px-3 py-1.5 text-muted-foreground hover:text-foreground transition">Wie es funktioniert</Link>
            <Link to="/login" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Anmelden</Link>
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
          <FilterSelect label="Status" value={status} options={STATUSES} onChange={(v) => setStatus(v as Status)} />
        </section>

        {/* Picks */}
        {!loaded ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl border border-border/60 bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <EmptyState status={status} />
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

function EmptyState({ status }: { status: Status }) {
  if (status === "Geschlossen") {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
        <h3 className="text-lg font-semibold">Abgeschlossene Empfehlungen im Track Record</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Alle bereits ausgewerteten Empfehlungen — mit Einstieg, Ausstieg und Rendite — finden Sie im Track Record.
        </p>
        <Link
          to="/track-record"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/40 px-4 text-sm font-medium text-foreground transition hover:border-primary/40"
        >
          Zum Track Record <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
      <h3 className="text-lg font-semibold">Gerade keine aktiven Empfehlungen</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Unser Algorithmus wartet auf die richtige Gelegenheit. Das ist auch eine Strategie — keine Empfehlung zu geben, wenn die Datenlage nicht eindeutig ist.
      </p>
    </div>
  );
}
