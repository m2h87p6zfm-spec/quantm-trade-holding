import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  Brain,
  Database,
  Gauge,
  LineChart,
  Layers,
  Newspaper,
  Radio,
  Shield,
  Signal,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";
import { useSettings } from "@/lib/settings";
import { getLandingMetrics, type LandingMetrics } from "@/lib/landing-metrics.functions";

/* ──────────────────────────────────────────────────────────────────────────
   QUANTM TRADE — INSTITUTIONAL LANDING (v3)
   - All headline numbers are LIVE from the database. No fabricated metrics.
   - Aesthetic: Bloomberg / Palantir / Koyfin. Dense, monochrome, accent-blue.
   - Transparent about hit rate, including periods of negative average return.
   ────────────────────────────────────────────────────────────────────────── */

export function MarketingLanding() {
  const { settings, update } = useSettings();
  const fetchMetrics = useServerFn(getLandingMetrics);
  const [metrics, setMetrics] = useState<LandingMetrics | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMetrics()
      .then((m) => alive && setMetrics(m))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fetchMetrics]);

  return (
    <div className="min-h-screen bg-ink text-pro selection:bg-pro-accent/30">
      <TopBar
        theme={settings.theme}
        onToggleTheme={() =>
          update({ theme: settings.theme === "dark" ? "light" : "dark", themeOptIn: true } as never)
        }
      />
      <Hero metrics={metrics} />
      <PerformanceProof metrics={metrics} />
      <PredictionEngine />
      <ArchitectureBlock />
      <CoverageStrip metrics={metrics} />
      <TrustBlock />
      <FinalCta />
      <FooterBar />
    </div>
  );
}

/* ─────────────────────────── Top bar ─────────────────────────── */

function TopBar({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <ApexLogo className="h-6 w-6" />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Quantm Trade<span className="text-pro-accent">.</span>
          </span>
          <span className="ml-1 hidden rounded-sm border border-hairline px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-pro-3 sm:inline">
            Terminal v3
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          <NavLink to="/picks">Picks</NavLink>
          <NavLink to="/track-record">Track&nbsp;Record</NavLink>
          <NavLink to="/methodology">Methodologie</NavLink>
          <NavLink to="/preise">Pricing</NavLink>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Theme umschalten"
            className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded border border-hairline text-pro-2 transition hover:border-hairline-strong hover:text-pro"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <Link
            to="/login"
            className="ml-2 inline-flex h-8 items-center rounded border border-hairline px-3 text-[12px] font-medium text-pro-2 transition hover:border-hairline-strong hover:text-pro"
          >
            Login
          </Link>
          <Link
            to="/picks"
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded bg-pro-accent px-3 text-[12px] font-semibold text-white transition hover:bg-[var(--pro-accent-2)]"
          >
            Terminal öffnen
            <ArrowRight className="h-3 w-3" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded px-2.5 py-1.5 text-pro-2 transition hover:bg-white/[0.04] hover:text-pro"
    >
      {children}
    </Link>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero({ metrics }: { metrics: LandingMetrics | null }) {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <div className="absolute inset-0 bg-inst-grid opacity-60" aria-hidden />
      <div className="absolute inset-0 inst-spotlight" aria-hidden />

      <div className="relative mx-auto max-w-[1400px] px-5 pt-20 pb-14 md:pt-28 md:pb-20">
        {/* status row */}
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-pro-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inst-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-pro-success" />
            <span className="text-pro-success">Live</span>
          </span>
          <span className="text-pro-3">/</span>
          <span>Quantm Predictive Intelligence</span>
          <span className="text-pro-3">/</span>
          <span>
            {metrics?.lastScanIso
              ? `Last scan ${formatRelative(metrics.lastScanIso)}`
              : "Initialising…"}
          </span>
        </div>

        <h1 className="mt-7 max-w-5xl text-balance font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[68px]">
          Predictive Intelligence
          <br />
          <span className="text-pro-2">For Global Markets.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-pro-2 md:text-[17px]">
          AI-gestützte Prognosen auf Basis multifaktorieller Modelle, makroökonomischer Signale,
          alternativer Daten und probabilistischer Vorhersagesysteme. Gebaut für Investoren, die
          Beweise erwarten — keine Marketingversprechen.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/picks"
            className="group inline-flex h-11 items-center gap-2 rounded bg-pro-accent px-5 text-[13px] font-semibold text-white transition hover:bg-[var(--pro-accent-2)]"
          >
            Live-Signale öffnen
            <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            to="/track-record"
            className="inline-flex h-11 items-center gap-2 rounded border border-hairline px-5 text-[13px] font-medium text-pro-2 transition hover:border-hairline-strong hover:text-pro"
          >
            Track-Record ansehen
          </Link>
          <Link
            to="/methodology"
            className="inline-flex h-11 items-center gap-2 px-2 text-[13px] font-medium text-pro-3 transition hover:text-pro"
          >
            Methodologie · Whitepaper →
          </Link>
        </div>

        {/* live metric strip */}
        <LiveMetricStrip metrics={metrics} />
      </div>
    </section>
  );
}

function LiveMetricStrip({ metrics }: { metrics: LandingMetrics | null }) {
  const items: Array<{
    label: string;
    value: number | null;
    suffix?: string;
    fmt?: "int" | "pct" | "pct1" | "ret";
    hint?: string;
    tone?: "neutral" | "good" | "bad";
  }> = [
    {
      label: "Assets Covered",
      value: metrics?.assetsCovered ?? null,
      fmt: "int",
      hint: "Distinct tickers im Universe",
    },
    {
      label: "Picks · 24h",
      value: metrics?.picks24h ?? null,
      fmt: "int",
      hint: "Neue Signale heute",
    },
    {
      label: "Picks · 7d",
      value: metrics?.picks7d ?? null,
      fmt: "int",
      hint: "Letzte 7 Tage",
    },
    {
      label: "Hit Rate",
      value: metrics?.hitRate != null ? metrics.hitRate * 100 : null,
      fmt: "pct1",
      hint: `${metrics?.evaluated ?? 0} ausgewertete Signale`,
      tone:
        metrics?.hitRate != null
          ? metrics.hitRate >= 0.5
            ? "good"
            : "bad"
          : "neutral",
    },
    {
      label: "Ø Confidence",
      value: metrics?.avgConfidence7d ?? null,
      fmt: "pct1",
      hint: "7-Tage-Schnitt",
    },
    {
      label: "Sektoren",
      value: metrics?.sectorsCovered ?? null,
      fmt: "int",
      hint: "Aktiv beobachtet",
    },
  ];

  return (
    <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded border border-hairline bg-hairline md:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <MetricTile key={it.label} {...it} />
      ))}
    </div>
  );
}

function MetricTile({
  label,
  value,
  fmt = "int",
  suffix,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | null;
  fmt?: "int" | "pct" | "pct1" | "ret";
  suffix?: string;
  hint?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const display = useAnimatedNumber(value);
  const text =
    value == null
      ? "—"
      : fmt === "int"
      ? Math.round(display).toLocaleString("de-DE")
      : fmt === "pct"
      ? `${Math.round(display)}%`
      : fmt === "pct1"
      ? `${display.toFixed(1)}%`
      : `${(display * 100).toFixed(2)}%`;

  const toneClass =
    tone === "good" ? "text-pro-success" : tone === "bad" ? "text-pro-warn" : "text-pro";

  return (
    <div className="bg-ink-surface px-5 py-5">
      <div className="inst-eyebrow">{label}</div>
      <div className={`inst-kpi-num mt-2 text-[26px] leading-none md:text-[30px] ${toneClass}`}>
        {text}
        {suffix}
      </div>
      {hint && <div className="mt-2 text-[11px] text-pro-3">{hint}</div>}
    </div>
  );
}

/* ─────────────────────────── Performance proof ─────────────────────────── */

function PerformanceProof({ metrics }: { metrics: LandingMetrics | null }) {
  const hitRatePct = metrics?.hitRate != null ? metrics.hitRate * 100 : null;
  const avgReturn = metrics?.avgReturn7d != null ? metrics.avgReturn7d * 100 : null;

  return (
    <section className="border-b border-hairline bg-ink-2">
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <SectionHead
          eyebrow="Evidence-First"
          title="Wir zeigen, was wir wirklich messen können."
          sub="Keine inszenierten Backtests. Diese Zahlen kommen direkt aus unserer Outcomes-Pipeline — gleicher Datensatz, den interne Researcher sehen."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-4">
          <ProofCard
            label="Trefferquote · 7d"
            value={hitRatePct != null ? `${hitRatePct.toFixed(1)}%` : "—"}
            sub={`${metrics?.hits ?? 0} Treffer von ${metrics?.evaluated ?? 0} ausgewerteten Signalen`}
            tone={hitRatePct != null ? (hitRatePct >= 50 ? "good" : "warn") : "neutral"}
            icon={Gauge}
          />
          <ProofCard
            label="Ø Return · 7d"
            value={avgReturn != null ? `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%` : "—"}
            sub="Mittlerer Return aller ausgewerteten Picks nach 7 Handelstagen"
            tone={avgReturn != null ? (avgReturn >= 0 ? "good" : "bad") : "neutral"}
            icon={LineChart}
          />
          <ProofCard
            label="Analysen · gesamt"
            value={metrics?.totalAnalyses != null ? metrics.totalAnalyses.toLocaleString("de-DE") : "—"}
            sub={`${metrics?.picks7d ?? 0} davon in den letzten 7 Tagen`}
            tone="neutral"
            icon={Database}
          />
          <ProofCard
            label="Ø Confidence · 7d"
            value={metrics?.avgConfidence7d != null ? `${metrics.avgConfidence7d.toFixed(1)}%` : "—"}
            sub="Modellsicherheit über alle Signale der letzten Woche"
            tone="neutral"
            icon={Signal}
          />
        </div>

        <p className="mt-6 max-w-3xl text-[12px] leading-relaxed text-pro-3">
          <span className="text-pro-2">Hinweis zur Transparenz:</span>{" "}
          {metrics?.evaluated != null && metrics.evaluated > 0
            ? `Nur ${metrics.evaluated} von ${metrics.totalAnalyses} Signalen sind bisher vollständig ausgewertet — der Rest befindet sich noch im 7/30/60/90-Tage-Beobachtungsfenster. `
            : ""}
          30-, 60- und 90-Tage-Returns werden aktuell durch unseren Outcomes-Tracker
          nachgepflegt und erscheinen hier, sobald die Datenfenster vollständig sind.
          Vergangene Performance ist keine Garantie für künftige Ergebnisse.
        </p>

        <div className="mt-10">
          <Link
            to="/track-record"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-pro-accent hover:text-pro"
          >
            Vollständigen Track-Record öffnen
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProofCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "bad" | "warn" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "good"
      ? "text-pro-success"
      : tone === "bad"
      ? "text-pro-danger"
      : tone === "warn"
      ? "text-pro-warn"
      : "text-pro";
  return (
    <div className="group relative bg-ink-surface p-6 inst-lift">
      <div className="flex items-center justify-between">
        <div className="inst-eyebrow">{label}</div>
        <Icon className="h-3.5 w-3.5 text-pro-3" />
      </div>
      <div className={`inst-kpi-num mt-3 text-[32px] leading-none ${toneClass}`}>{value}</div>
      <div className="mt-3 text-[12px] leading-relaxed text-pro-3">{sub}</div>
    </div>
  );
}

/* ─────────────────────────── Prediction engine layers ─────────────────────────── */

function PredictionEngine() {
  const layers = [
    {
      n: "01",
      icon: Activity,
      title: "Technische Signale",
      items: ["Momentum & Trendstärke", "Relative Stärke (RSI/Stoch)", "Volatilität & ATR-Regime", "Volumen-Bestätigung (OBV/CMF)"],
    },
    {
      n: "02",
      icon: LineChart,
      title: "Fundamentaldaten",
      items: ["Umsatz- & Gewinnwachstum", "Cash-Flow-Qualität", "Margen & ROIC", "Bewertungsmultiples"],
    },
    {
      n: "03",
      icon: Layers,
      title: "Makroökonomie",
      items: ["Inflation & Realzinsen", "Anleihekurven & Spreads", "Währungsrelationen", "Liquiditätsbedingungen"],
    },
    {
      n: "04",
      icon: Newspaper,
      title: "Sentiment",
      items: ["News-Analyse (NLP)", "Earnings-Calls & Guidance", "Analystenrevisionen", "Institutionelles Positioning"],
    },
    {
      n: "05",
      icon: Radio,
      title: "Alternative Daten",
      items: ["Such-Trends", "Web-Traffic-Signale", "Hiring-Aktivität", "Ökosystem-Telemetrie"],
    },
  ];

  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <SectionHead
          eyebrow="Prediction Engine"
          title="Fünf Datenschichten, ein probabilistisches Forecast."
          sub="Jede Empfehlung entsteht aus der Aggregation unabhängiger Signale. Wir geben keine simplen Buy/Sell-Etiketten aus — wir liefern Wahrscheinlichkeitsverteilungen, Confidence-Intervalle und Feature-Beiträge."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-5">
          {layers.map((l) => (
            <div key={l.n} className="bg-ink-surface p-6 inst-lift">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] text-pro-3">{l.n}</span>
                <l.icon className="h-4 w-4 text-pro-accent" />
              </div>
              <div className="mt-4 font-display text-[15px] font-semibold tracking-tight">
                {l.title}
              </div>
              <ul className="mt-3 space-y-1.5">
                {l.items.map((it) => (
                  <li
                    key={it}
                    className="flex items-start gap-1.5 text-[12px] leading-snug text-pro-2"
                  >
                    <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-pro-3" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Architecture (ensemble) ─────────────────────────── */

function ArchitectureBlock() {
  const models = [
    { tag: "Model A", name: "Gradient Boosting", desc: "Strukturierte Feature-Interaktionen, robust gegen Outlier." },
    { tag: "Model B", name: "Sequential Trees", desc: "Schnelle Anpassung an neue Regime, low-latency." },
    { tag: "Model C", name: "Financial Transformer", desc: "Lange Zeit-Horizonte, kontextuelle Aufmerksamkeit." },
    { tag: "Model D", name: "Temporal Forecaster", desc: "Multivariate Zeitreihen mit Saisonalität." },
  ];
  return (
    <section className="border-b border-hairline bg-ink-2">
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <SectionHead
          eyebrow="Ensemble Architecture"
          title="Vier Modelle, eine konsensbasierte Prognose."
          sub="Statt auf ein Einzelmodell zu vertrauen, aggregieren wir mehrere Modellfamilien über einen Meta-Layer. Das reduziert Modell-spezifische Biases und erhöht die Robustheit der Confidence."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {models.map((m) => (
            <div key={m.tag} className="inst-panel p-5 inst-lift">
              <div className="font-mono text-[10px] uppercase tracking-widest text-pro-accent">
                {m.tag}
              </div>
              <div className="mt-2 font-display text-[16px] font-semibold tracking-tight">
                {m.name}
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-pro-2">{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Flow arrow */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-hairline" />
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-pro-3">
            ↓ Meta-Layer ↓
          </div>
          <div className="h-px flex-1 bg-hairline" />
        </div>

        <div className="inst-panel-elev p-6">
          <div className="flex items-start gap-4">
            <Brain className="mt-1 h-5 w-5 text-pro-accent" />
            <div className="flex-1">
              <div className="font-display text-[18px] font-semibold tracking-tight">
                Stacked Ensemble · Confidence Aggregator
              </div>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-pro-2">
                Gewichtet die Einzelvotings nach historischer Modellgüte pro Regime, kalibriert die
                Wahrscheinlichkeiten und liefert pro Asset eine Verteilung über die nächsten
                7/30/60/90 Tage — inkl. Feature-Contribution-Breakdown.
              </p>
              <div className="mt-5 grid gap-px overflow-hidden rounded border border-hairline bg-hairline sm:grid-cols-3">
                <MiniStat label="Probability Up" value="62.4%" tone="good" />
                <MiniStat label="Probability Down" value="37.6%" tone="bad" />
                <MiniStat label="Model Agreement" value="3 / 4" tone="neutral" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good" ? "text-pro-success" : tone === "bad" ? "text-pro-danger" : "text-pro";
  return (
    <div className="bg-ink-surface p-4">
      <div className="inst-eyebrow">{label}</div>
      <div className={`inst-kpi-num mt-1.5 text-[22px] ${toneClass}`}>{value}</div>
    </div>
  );
}

/* ─────────────────────────── Coverage strip ─────────────────────────── */

function CoverageStrip({ metrics }: { metrics: LandingMetrics | null }) {
  const rows = [
    { region: "USA", desc: "S&P 500, Nasdaq 100, Russell 2000" },
    { region: "Europa", desc: "DAX, EuroStoxx 50, FTSE 100" },
    { region: "Asien", desc: "Nikkei, Hang Seng, KOSPI" },
    { region: "Themen-Universe", desc: "Tech, AI, Energy, Biotech, Defense" },
  ];
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <SectionHead
          eyebrow="Market Coverage"
          title={`${metrics?.assetsCovered?.toLocaleString("de-DE") ?? "—"} Assets aktiv beobachtet.`}
          sub="Globale Aktien, Indizes und thematische Universen. Jedes Asset wird in jeder Scan-Iteration neu bewertet."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <div key={r.region} className="bg-ink-surface p-5">
              <div className="inst-eyebrow text-pro-accent">{r.region}</div>
              <div className="mt-2 text-[13px] text-pro-2">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Trust ─────────────────────────── */

function TrustBlock() {
  const pillars = [
    {
      icon: Shield,
      title: "Vollständige Transparenz",
      text: "Jede Empfehlung — auch Verluste — wird im öffentlichen Track-Record dokumentiert und nach 7/30/60/90 Tagen ausgewertet.",
    },
    {
      icon: Brain,
      title: "Erklärbare Modelle",
      text: "Jede Prognose zeigt, welche Faktoren wie stark beigetragen haben. Keine Black-Box-Magie, keine Bauchgefühle.",
    },
    {
      icon: Sparkles,
      title: "Keine Anlageberatung",
      text: "Quantm liefert Forschung und Wahrscheinlichkeiten. Die Investitionsentscheidung bleibt bei Ihnen — so will es das deutsche Recht und so wollen wir es auch.",
    },
  ];
  return (
    <section className="border-b border-hairline bg-ink-2">
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <SectionHead eyebrow="Built On Trust" title="Drei Grundregeln, an die wir uns halten." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="inst-panel p-6 inst-lift">
              <p.icon className="h-5 w-5 text-pro-accent" />
              <div className="mt-3 font-display text-[16px] font-semibold tracking-tight">
                {p.title}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-pro-2">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Final CTA ─────────────────────────── */

function FinalCta() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-[1400px] px-5 py-24">
        <div className="inst-panel-elev relative overflow-hidden p-10 md:p-14">
          <div className="absolute inset-0 inst-spotlight opacity-60" aria-hidden />
          <div className="relative">
            <div className="inst-eyebrow text-pro-accent">Terminal Access</div>
            <h2 className="mt-3 max-w-3xl text-balance font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] md:text-[44px]">
              Beginnen Sie mit institutionell-grade Forschung — heute.
            </h2>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-pro-2 md:text-[15px]">
              7 Tage Elite gratis. Voller Zugriff auf alle Signale, Forecasts und
              Confidence-Breakdowns. Keine Kreditkarte für Free-Zugang, jederzeit mit einem Klick
              kündbar.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/preise"
                className="inline-flex h-11 items-center gap-2 rounded bg-pro-accent px-5 text-[13px] font-semibold text-white transition hover:bg-[var(--pro-accent-2)]"
              >
                Elite 7 Tage gratis starten
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/picks"
                className="inline-flex h-11 items-center gap-2 rounded border border-hairline px-5 text-[13px] font-medium text-pro-2 transition hover:border-hairline-strong hover:text-pro"
              >
                Live-Picks ohne Anmeldung ansehen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */

function FooterBar() {
  return (
    <footer className="border-hairline">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-[12px] text-pro-3">
          <ApexLogo className="h-4 w-4" />
          <span>© {new Date().getFullYear()} Quantm Trade</span>
          <span>·</span>
          <span>Keine Anlageberatung — ausschließlich Informations- und Bildungszwecke.</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-pro-3">
          <Link to="/impressum" className="hover:text-pro">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-pro">Datenschutz</Link>
          <Link to="/agb" className="hover:text-pro">AGB</Link>
          <Link to="/methodology" className="hover:text-pro">Methodologie</Link>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="inst-eyebrow text-pro-accent">{eyebrow}</div>
      <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] md:text-[36px]">
        {title}
      </h2>
      {sub && <p className="mt-3 text-[14px] leading-relaxed text-pro-2 md:text-[15px]">{sub}</p>}
    </div>
  );
}

/** Animate a number from 0 → target. Returns the current frame value. */
function useAnimatedNumber(target: number | null, durationMs = 900): number {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  useEffect(() => {
    if (target == null) return;
    fromRef.current = val;
    startRef.current = null;
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(fromRef.current + (target - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);
  return val;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.floor(h / 24);
  return `vor ${d} d`;
}
