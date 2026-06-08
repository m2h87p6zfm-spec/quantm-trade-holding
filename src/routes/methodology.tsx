import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, Brain, GitBranch, Scale, Sigma, Dices } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodik — Wie Quantm Trade Signale berechnet" },
      { name: "description", content: "Transparente Quant-Methodik: RSI, MACD, Bollinger, Z-Score, Broker-Konsens und Monte Carlo zu klaren Kauf-, Halte- und Verkaufssignalen." },
      { property: "og:title", content: "Methodik — Quantm Trade" },
      { property: "og:description", content: "Transparente Quant-Methodik: RSI, MACD, Bollinger, Z-Score, Broker-Konsens und Monte Carlo zu klaren Signalen." },
      { property: "og:url", content: "https://quantmtrade.com/methodology" },
      { name: "twitter:title", content: "Methodik — Quantm Trade" },
      { name: "twitter:description", content: "Transparente Quant-Methodik: RSI, MACD, Bollinger, Z-Score, Broker-Konsens und Monte Carlo zu klaren Signalen." },
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

function Formula({ children }: { children: string }) {
  return (
    <div className="rounded-md bg-background/50 px-3 py-2 overflow-x-auto text-sm">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
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
          Relative Strength Index über 14 Perioden. Werte unter 30 deuten auf überverkaufte Bedingungen (potenzieller Kauf), über 70 auf überkaufte (potenzieller Verkauf).
        </p>
        <Formula>{"$$RSI = 100 - \\frac{100}{1 + RS}, \\quad RS = \\frac{\\overline{U}_{14}}{\\overline{D}_{14}}$$"}</Formula>
        <Formula>{"$$\\text{Score}_{RSI} = \\text{clip}\\!\\left(\\frac{50 - RSI}{50},\\; -1,\\; +1\\right)$$"}</Formula>
      </Section>

      <Section icon={BarChart3} title="2. Trend (MACD)">
        <p>
          MACD-Linie (EMA12 − EMA26) gegen Signallinie (EMA9 des MACD). Bullishe Kreuzungen erhöhen den Score, bärische senken ihn.
        </p>
        <Formula>{"$$MACD = EMA_{12}(P) - EMA_{26}(P), \\quad Signal = EMA_9(MACD)$$"}</Formula>
        <Formula>{"$$\\text{Score}_{MACD} = \\text{sign}(MACD - Signal) \\cdot \\min\\!\\left(\\frac{|MACD - Signal|}{\\sigma_{MACD}},\\, 1\\right)$$"}</Formula>
      </Section>

      <Section icon={Scale} title="3. Volatilität & Mean-Reversion (Bollinger + Z-Score)">
        <p>
          Bollinger Bands (20, 2σ) plus rollierender 20-Tage Z-Score des Preises. |Z| über 2 signalisiert statistische Extreme — Reversion ist wahrscheinlich.
        </p>
        <Formula>{"$$BB_{\\text{upper/lower}} = \\mu_{20} \\pm 2\\sigma_{20}, \\quad Z = \\frac{P - \\mu_{20}}{\\sigma_{20}}$$"}</Formula>
        <Formula>{"$$\\text{Score}_{Z} = \\text{clip}(-Z/2,\\; -1,\\; +1)$$"}</Formula>
      </Section>

      <Section icon={GitBranch} title="4. Broker-Konsens">
        <p>
          Aggregierte Analyst-Ratings von Wall-Street-Brokern (Goldman, JPM, MS, etc.).
          Gewichtet nach historischer Trefferquote des jeweiligen Hauses.
        </p>
      </Section>

      <Section icon={Dices} title="5. Monte-Carlo-Simulation (GBM + GARCH)">
        <p>
          Geometrische Brownsche Bewegung (GBM) mit GARCH(1,1)-Volatilität. 4.000 Pfade über 30 Handelstage erzeugen eine empirische Preisverteilung.
        </p>
        <Formula>{"$$S_{t+1} = S_t \\cdot \\exp\\!\\left[\\left(\\mu - \\tfrac{1}{2}\\sigma^2\\right)\\Delta t + \\sigma\\sqrt{\\Delta t}\\, Z_t\\right], \\quad Z_t \\sim \\mathcal{N}(0,1)$$"}</Formula>
        <Formula>{"$$\\text{Score}_{MC} = \\text{clip}\\!\\left(\\frac{\\tilde{S}_{30} - S_0}{S_0} \\cdot 10,\\; -1,\\; +1\\right)$$"}</Formula>
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
        <Formula>{"$$\\text{Score}_{final} = 0.22 \\cdot M + 0.22 \\cdot T + 0.18 \\cdot Z + 0.25 \\cdot B + 0.13 \\cdot MC$$"}</Formula>
        <p className="text-xs text-muted-foreground mt-2">
          M = Momentum (RSI) · T = Trend (MACD) · Z = Mean-Reversion · B = Broker-Konsens · MC = Monte Carlo
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          Verdict-Mapping: <span className="text-bull">≥ +0.4 STRONG BUY</span> ·{" "}
          <span className="text-bull/80">+0.15 – +0.4 BUY</span> ·{" "}
          <span className="text-muted-foreground">±0.15 HOLD</span> ·{" "}
          <span className="text-bear/80">-0.4 – -0.15 SELL</span> ·{" "}
          <span className="text-bear">≤ -0.4 STRONG SELL</span>
        </p>
      </section>

      <Section icon={Brain} title="7. Backtesting vs. Monte Carlo — Warum beide nötig sind">
        <p>
          Ein Backtest zeigt einen einzigen historischen Pfad. Das Problem: Märkte hätten sich auch anders entwickeln können. Ein Backtest, der +40 % p.a. zeigt, hat möglicherweise in 35 % aller plausiblen Marktszenarien zu massiven Verlusten geführt — nur nicht im tatsächlich beobachteten Pfad.
        </p>
        <p>
          Monte Carlo simuliert 4.000 alternative Marktpfade auf Basis derselben statistischen Parameter. Das Ergebnis: eine Wahrscheinlichkeitsverteilung über mögliche Renditen — nicht eine einzelne Zahl. Erst beide zusammen geben ein vollständiges Bild.
        </p>
        <p>
          Quantm kombiniert deshalb historische Signalvalidierung (Backtest) mit forward-looking Monte-Carlo-Projektionen. Signale, die in beiden Verfahren überzeugen, erhalten höhere Gewichtung im Composite Score.
        </p>
      </Section>

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
