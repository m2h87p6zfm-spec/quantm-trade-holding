import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, Brain, GitBranch, Scale, Sigma, Dices } from "lucide-react";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodik — Wie Quantm Trade Signale berechnet" },
      { name: "description", content: "Vollständige Transparenz: RSI, MACD, Bollinger Bands, Z-Score, Broker-Konsens, Monte-Carlo-Simulation und Composite-Scoring — wie Quantm Trade Kauf-, Halte- und Verkaufssignale ableitet." },
      { property: "og:title", content: "Methodik — Quantm Trade" },
      { property: "og:description", content: "Vollständige Transparenz zu RSI, MACD, Bollinger, Z-Score, Broker-Konsens, Monte Carlo und Composite-Scoring." },
      { name: "twitter:title", content: "Methodik — Quantm Trade" },
      { name: "twitter:description", content: "Vollständige Transparenz zu RSI, MACD, Bollinger, Z-Score, Broker-Konsens, Monte Carlo und Composite-Scoring." },
    ],
  }),
  component: MethodologyPage,
});

function Section({ icon: Icon, title, children }: { icon: typeof Sigma; title: string; children: React.ReactNode }) {
  return (
    <section className="surface p-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-xl font-display font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-12">{children}</div>
    </section>
  );
}

function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <span className="label-eyebrow">Transparenz</span>
        <h1 className="text-4xl font-display font-bold tracking-tight">
          Wie wir <span className="text-gradient-primary">Signale berechnen</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Jedes Quantm-Signal basiert auf einem Composite-Score aus mindestens sechs
          unabhängigen Quellen. Hier ist exakt, wie es funktioniert. Nichts wird versteckt.
        </p>
      </header>

      <Section icon={Activity} title="1. Momentum (RSI)">
        <p>
          Relative Strength Index über 14 Perioden. Werte &lt; 30 deuten auf überverkaufte
          Bedingungen (potenzieller Kauf), &gt; 70 auf überkaufte (potenzieller Verkauf).
        </p>
        <p className="text-foreground/80">
          <span className="font-mono text-xs">Score = (50 - RSI) / 50</span>, normalisiert auf [-1, +1].
        </p>
      </Section>

      <Section icon={BarChart3} title="2. Trend (MACD)">
        <p>
          MACD-Linie (EMA12 − EMA26) gegen Signallinie (EMA9 des MACD). Bullishe
          Kreuzungen (MACD &gt; Signal) erhöhen den Score, bärische senken ihn.
        </p>
      </Section>

      <Section icon={Scale} title="3. Volatilität & Mean-Reversion (Bollinger + Z-Score)">
        <p>
          Bollinger Bands (20, 2σ) plus rollierender 20-Tage Z-Score des Preises.
          |Z| &gt; 2 signalisiert statistische Extreme — Reversion ist wahrscheinlich.
        </p>
      </Section>

      <Section icon={GitBranch} title="4. Broker-Konsens">
        <p>
          Aggregierte Analyst-Ratings von Wall-Street-Brokern (Goldman, JPM, MS, etc.).
          Gewichtet nach historischer Trefferquote des jeweiligen Hauses.
        </p>
      </Section>

      <Section icon={Dices} title="5. Monte-Carlo-Simulation (GBM + GARCH)">
        <p>
          Geometrische Brownsche Bewegung (GBM) mit Drift μ (annualisierter Log-Return)
          und GARCH(1,1)-Volatilität σ. 4 000 Pfade über 30 Handelstage erzeugen eine
          empirische Preisverteilung.
        </p>
        <p className="text-foreground/80">
          <span className="font-mono text-xs">S(t+1) = S(t) · exp((μ − ½σ²)·Δt + σ·√Δt·Z)</span>
        </p>
        <p>
          Aus der Verteilung lesen wir Quantile (P05, P25, P50, P75, P95) sowie
          VaR/CVaR(95%) ab. Liegt der Spot deutlich unter P25, fließt ein positiver
          Beitrag in den Score (asymmetrisches Upside-Profil). Umgekehrt zieht ein
          Spot über P75 den Score nach unten.
        </p>
        <p className="text-foreground/80">
          <span className="font-mono text-xs">Score = clip((Median₃₀ − Spot) / Spot · 10, -1, +1)</span>
        </p>
      </Section>

      <Section icon={Brain} title="6. KI-Synthese (Lovable AI)">
        <p>
          Ein Large Language Model verarbeitet die obigen Faktoren plus aktuelle Nachrichten
          und liefert eine natürlichsprachliche Erklärung. Das LLM trifft keine Entscheidung —
          es interpretiert nur die Zahlen.
        </p>
      </Section>

      <section className="surface p-6 border-primary/30">
        <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Sigma className="h-4 w-4 text-primary" /> Composite Score
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Final Score = <span className="font-mono text-foreground">0.22·Momentum + 0.22·Trend + 0.18·MeanRev + 0.25·Broker + 0.13·MonteCarlo</span>
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          Verdict-Mapping: <span className="text-bull">≥ +0.4 STRONG BUY</span> ·{" "}
          <span className="text-bull/80">+0.15 – +0.4 BUY</span> ·{" "}
          <span className="text-muted-foreground">±0.15 HOLD</span> ·{" "}
          <span className="text-bear/80">-0.4 – -0.15 SELL</span> ·{" "}
          <span className="text-bear">≤ -0.4 STRONG SELL</span>
        </p>
      </section>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-muted-foreground leading-relaxed">
        <strong className="text-amber-200/90 font-display">Disclaimer:</strong> Quantm-Signale sind
        keine Anlageberatung. Vergangene Performance ist kein Indikator für zukünftige Ergebnisse.
        Trading-Entscheidungen liegen ausschließlich beim Nutzer.
      </div>

      <div className="flex gap-3">
        <Link to="/about" className="text-sm text-primary hover:underline">← Über uns</Link>
        <Link to="/status" className="text-sm text-primary hover:underline ml-auto">System-Status →</Link>
      </div>
    </div>
  );
}
