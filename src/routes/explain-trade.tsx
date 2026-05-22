import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Microscope, Calendar, TrendingUp, TrendingDown, Sparkles, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { fetchCandles } from "@/lib/finnhub";
import { computeAll, type IndicatorSet } from "@/lib/indicators";
import { scoreIndicators, type Signal } from "@/lib/analysis";
import { PRODUCTS, findProduct } from "@/lib/products";
import { FeatureGate } from "@/lib/featureGate";
import { DisclaimerInline } from "@/components/Disclaimer";

export const Route = createFileRoute("/explain-trade")({
  component: () => (
    <FeatureGate
      feature="risk_analytics"
      title="Explain-My-Trade ist Elite-exklusiv"
      description="Reverse-Backtest deiner echten Trades — die App rekonstruiert, welche Signale zum Entry aktiv waren und ob dein Trade systematisch oder zufällig war."
    >
      <ExplainTradePage />
    </FeatureGate>
  ),
  head: () => ({ meta: [{ title: "Explain My Trade — Apex Trades" }] }),
});

type Side = "long" | "short";

type TradeInput = {
  symbol: string;
  side: Side;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
};

type Reconstruction = {
  entryIdx: number;
  exitIdx: number;
  entryClose: number;
  exitClose: number;
  indicatorsAtEntry: IndicatorSet;
  signalAtEntry: Signal;
  pnlPct: number;
  alignment: "aligned" | "opposed" | "neutral";
  verdict: TradeVerdict;
  signalDirection: "LONG" | "SHORT" | "NEUTRAL";
};

type TradeVerdict =
  | "systematic_win"
  | "lucky_win"
  | "systematic_loss"
  | "discipline_warning"
  | "neutral_outcome";

function reconstruct(closes: number[], times: number[], input: TradeInput): Reconstruction | { error: string } {
  const entryTs = Date.parse(input.entryDate) / 1000;
  const exitTs = Date.parse(input.exitDate) / 1000;
  if (!Number.isFinite(entryTs) || !Number.isFinite(exitTs)) return { error: "Ungültiges Datum." };
  if (exitTs <= entryTs) return { error: "Exit-Datum muss nach dem Entry liegen." };

  // Closest trading day (must be ≤ entryTs, otherwise we'd see the future)
  let entryIdx = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= entryTs) entryIdx = i;
    else break;
  }
  let exitIdx = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= exitTs) exitIdx = i;
    else break;
  }
  if (entryIdx < 50) return { error: "Nicht genug Historie vor dem Entry — wähle ein späteres Datum oder ein liquideres Symbol." };
  if (exitIdx <= entryIdx) return { error: "Exit-Datum liegt vor verfügbaren Daten." };

  const slice = closes.slice(0, entryIdx + 1);
  const indicatorsAtEntry = computeAll(slice);
  const signalAtEntry = scoreIndicators(indicatorsAtEntry, "ausgewogen");

  const entryClose = closes[entryIdx];
  const exitClose = closes[exitIdx];
  const rawPnl = (exitClose - entryClose) / entryClose;
  const pnlPct = input.side === "long" ? rawPnl : -rawPnl;

  const signalDirection = signalAtEntry.verdict;
  const userDirection: "LONG" | "SHORT" = input.side === "long" ? "LONG" : "SHORT";

  let alignment: Reconstruction["alignment"];
  if (signalDirection === "NEUTRAL") alignment = "neutral";
  else if (signalDirection === userDirection) alignment = "aligned";
  else alignment = "opposed";

  let verdict: TradeVerdict;
  if (Math.abs(pnlPct) < 0.005) verdict = "neutral_outcome";
  else if (pnlPct > 0 && alignment === "aligned") verdict = "systematic_win";
  else if (pnlPct > 0 && alignment !== "aligned") verdict = "lucky_win";
  else if (pnlPct < 0 && alignment === "aligned") verdict = "systematic_loss";
  else verdict = "discipline_warning";

  return { entryIdx, exitIdx, entryClose, exitClose, indicatorsAtEntry, signalAtEntry, pnlPct, alignment, verdict, signalDirection };
}

function ExplainTradePage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);

  const [symbol, setSymbol] = useState("NVDA");
  const [side, setSide] = useState<Side>("long");
  const [entryDate, setEntryDate] = useState(monthAgo);
  const [entryPrice, setEntryPrice] = useState("");
  const [exitDate, setExitDate] = useState(today);
  const [exitPrice, setExitPrice] = useState("");
  const [submitted, setSubmitted] = useState<TradeInput | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-start gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-primary/30 blur-xl" aria-hidden />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <Microscope className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Explain My Trade</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
              <Sparkles className="h-3 w-3" /> Reverse-Backtest
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Trag einen echten Trade ein — wir rekonstruieren, welche statistischen Signale am Entry-Tag aktiv waren und sagen dir, ob dein Trade <em>systematisch</em> oder <em>zufällig</em> war.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const ep = parseFloat(entryPrice.replace(",", "."));
            const xp = parseFloat(exitPrice.replace(",", "."));
            if (!symbol || !ep || !xp) return;
            setSubmitted({ symbol: symbol.toUpperCase(), side, entryDate, entryPrice: ep, exitDate, exitPrice: xp });
          }}
        >
          <Field label="Symbol">
            <input
              list="explain-symbols"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <datalist id="explain-symbols">
              {PRODUCTS.map((p) => <option key={p.symbol} value={p.symbol}>{p.name}</option>)}
            </datalist>
          </Field>
          <Field label="Richtung">
            <div className="flex gap-2">
              <SideButton active={side === "long"} onClick={() => setSide("long")} kind="long" />
              <SideButton active={side === "short"} onClick={() => setSide("short")} kind="short" />
            </div>
          </Field>
          <Field label="Entry-Datum"><DateInput value={entryDate} onChange={setEntryDate} /></Field>
          <Field label="Entry-Preis"><PriceInput value={entryPrice} onChange={setEntryPrice} placeholder="z. B. 425.10" /></Field>
          <Field label="Exit-Datum"><DateInput value={exitDate} onChange={setExitDate} /></Field>
          <Field label="Exit-Preis"><PriceInput value={exitPrice} onChange={setExitPrice} placeholder="z. B. 461.00" /></Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Microscope className="h-4 w-4" /> Trade analysieren
            </button>
          </div>
        </form>
      </section>

      {submitted && <Result input={submitted} />}
      <DisclaimerInline />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
        required
      />
    </div>
  );
}

function PriceInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      required
    />
  );
}

function SideButton({ active, onClick, kind }: { active: boolean; onClick: () => void; kind: Side }) {
  const isLong = kind === "long";
  const Icon = isLong ? TrendingUp : TrendingDown;
  const activeCls = isLong
    ? "border-bull/60 bg-bull/15 text-bull"
    : "border-bear/60 bg-bear/15 text-bear";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition ${active ? activeCls : "border-input bg-background text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-4 w-4" /> {isLong ? "Long" : "Short"}
    </button>
  );
}

function Result({ input }: { input: TradeInput }) {
  const range = compute3yRange(input.entryDate);
  const q = useQuery({
    queryKey: ["explain-candles", input.symbol, range],
    queryFn: () => fetchCandles(input.symbol, "D", range),
    retry: 1,
  });

  if (q.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Historische Kerzen für {input.symbol} laden…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="rounded-2xl border border-bear/40 bg-bear/5 p-5 text-sm">
        Konnte Marktdaten für {input.symbol} nicht laden. Symbol prüfen oder später erneut versuchen.
      </div>
    );
  }

  const rec = reconstruct(q.data.c, q.data.t, input);
  if ("error" in rec) {
    return <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-5 text-sm">{rec.error}</div>;
  }

  const product = findProduct(input.symbol);
  return <ResultCard input={input} rec={rec} name={product?.name ?? input.symbol} />;
}

function compute3yRange(entryDate: string): number {
  // Pull enough history to cover entry + 200-day window before it.
  const daysSince = Math.max(30, Math.round((Date.now() - Date.parse(entryDate)) / 86400000));
  return Math.min(1825, daysSince + 365);
}

function ResultCard({ input, rec, name }: { input: TradeInput; rec: Reconstruction; name: string }) {
  const v = VERDICT_META[rec.verdict];
  const ind = rec.indicatorsAtEntry;
  const sig = rec.signalAtEntry;
  const pnlSign = rec.pnlPct >= 0 ? "+" : "";
  const heldDays = Math.round((Date.parse(input.exitDate) - Date.parse(input.entryDate)) / 86400000);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${v.ring} ${v.bg} p-5 shadow-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-80">
              <v.Icon className="h-4 w-4" /> {v.tag}
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{v.title}</h2>
            <p className="mt-2 max-w-xl text-sm opacity-90">{v.body(rec, input.side === "long" ? "Long" : "Short")}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest opacity-70">P&amp;L</div>
            <div className={`text-3xl font-bold tabular-nums ${rec.pnlPct >= 0 ? "text-bull" : "text-bear"}`}>
              {pnlSign}{(rec.pnlPct * 100).toFixed(2)}%
            </div>
            <div className="mt-0.5 text-[10px] opacity-60">{heldDays} Tage gehalten</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FactCard label="Dein Trade">
          <Row k={`${name} (${input.symbol})`} v={input.side === "long" ? "Long" : "Short"} />
          <Row k="Entry" v={`${input.entryPrice.toFixed(2)} am ${fmtDate(input.entryDate)}`} />
          <Row k="Exit" v={`${input.exitPrice.toFixed(2)} am ${fmtDate(input.exitDate)}`} />
          <Row k="Markt-Close Entry" v={rec.entryClose.toFixed(2)} />
          <Row k="Markt-Close Exit" v={rec.exitClose.toFixed(2)} />
        </FactCard>

        <FactCard label="Signal-Lage am Entry-Tag">
          <Row k="Signal-Richtung" v={<VerdictChip v={rec.signalDirection} />} />
          <Row k="Konfidenz" v={`${sig.confidence.toFixed(0)}%`} />
          <Row k="Alignment" v={<AlignmentChip a={rec.alignment} />} />
          <Row k="Score" v={`${sig.score > 0 ? "+" : ""}${sig.score}`} />
        </FactCard>
      </div>

      <FactCard label="Indikatoren — exakt rekonstruiert wie sie am Entry-Tag aussahen">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Z-Score" value={ind.zScore.toFixed(2)} hint={Math.abs(ind.zScore) > 2 ? "extrem" : "normal"} />
          <Stat label="RSI(14)" value={ind.rsi.toFixed(1)} hint={ind.rsi >= 70 ? "überkauft" : ind.rsi <= 30 ? "überverkauft" : "neutral"} />
          <Stat label="MACD-Hist" value={ind.macd.histogram.toFixed(3)} hint={ind.macd.histogram > 0 ? "bullisch" : "bärisch"} />
          <Stat label="Momentum 10T" value={`${(ind.momentum * 100).toFixed(1)}%`} hint={ind.momentum > 0 ? "aufwärts" : "abwärts"} />
          <Stat label="SMA50" value={isNaN(ind.sma50) ? "—" : ind.sma50.toFixed(2)} hint="Trend mittel" />
          <Stat label="SMA200" value={isNaN(ind.sma200) ? "—" : ind.sma200.toFixed(2)} hint="Trend lang" />
          <Stat label="Vola (ann.)" value={`${(ind.volatility * 100).toFixed(0)}%`} hint={ind.volatility > 0.5 ? "hoch" : "normal"} />
          <Stat label="Sharpe" value={ind.sharpe.toFixed(2)} hint={ind.sharpe > 1 ? "gut" : ind.sharpe < 0 ? "schwach" : "ok"} />
        </div>
      </FactCard>

      <FactCard label="Was der Agent zum Entry-Zeitpunkt gesagt hätte">
        <ul className="space-y-1.5 text-sm leading-relaxed">
          {sig.rationale.slice(0, 6).map((r, i) => (
            <li key={i} className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: "• " + r.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }} />
          ))}
        </ul>
      </FactCard>
    </div>
  );
}

function FactCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function VerdictChip({ v }: { v: "LONG" | "SHORT" | "NEUTRAL" }) {
  if (v === "LONG") return <span className="rounded-md bg-bull/15 px-2 py-0.5 text-xs font-semibold text-bull">LONG</span>;
  if (v === "SHORT") return <span className="rounded-md bg-bear/15 px-2 py-0.5 text-xs font-semibold text-bear">SHORT</span>;
  return <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">NEUTRAL</span>;
}

function AlignmentChip({ a }: { a: "aligned" | "opposed" | "neutral" }) {
  if (a === "aligned") return <span className="rounded-md bg-bull/15 px-2 py-0.5 text-xs font-semibold text-bull">übereinstimmend</span>;
  if (a === "opposed") return <span className="rounded-md bg-bear/15 px-2 py-0.5 text-xs font-semibold text-bear">entgegengesetzt</span>;
  return <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">kein klares Signal</span>;
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const VERDICT_META: Record<TradeVerdict, {
  tag: string;
  title: string;
  Icon: typeof CheckCircle2;
  ring: string;
  bg: string;
  body: (r: Reconstruction, side: string) => string;
}> = {
  systematic_win: {
    tag: "Systematischer Treffer",
    title: "Dieser Trade war kein Zufall.",
    Icon: CheckCircle2,
    ring: "border-bull/50",
    bg: "bg-gradient-to-br from-bull/15 via-transparent to-transparent text-foreground",
    body: (r, s) =>
      `Am Entry-Tag deutete die Statistik mit ${r.signalAtEntry.confidence.toFixed(0)}% Konfidenz in Richtung ${s}. Dein Ergebnis ist die logische Folge mehrerer übereinstimmender Signale (Z-Score, RSI, MACD, Trend). Reproduzierbar — genau diese Konstellation darfst du wieder traden.`,
  },
  lucky_win: {
    tag: "Glücktreffer",
    title: "Gewonnen — aber gegen die Statistik.",
    Icon: HelpCircle,
    ring: "border-amber-400/50",
    bg: "bg-gradient-to-br from-amber-400/15 via-transparent to-transparent text-foreground",
    body: (r, s) =>
      `Am Entry-Tag sprach die Signallage ${r.signalDirection === "NEUTRAL" ? "für gar nichts (kein klares Setup)" : `tendenziell gegen einen ${s}-Trade`}. Du hast trotzdem Geld verdient — Glück oder ein Faktor, den unser Modell nicht sieht (News, Insider, Story). Solche Trades systematisch zu wiederholen ist riskant.`,
  },
  systematic_loss: {
    tag: "Faires Verlieren",
    title: "Das Setup war gut — die Wahrscheinlichkeit hat verloren.",
    Icon: XCircle,
    ring: "border-bear/50",
    bg: "bg-gradient-to-br from-bear/10 via-transparent to-transparent text-foreground",
    body: (r, s) =>
      `Die Signallage stützte deinen ${s}-Trade (Konfidenz ${r.signalAtEntry.confidence.toFixed(0)}%) — aber Märkte sind Wahrscheinlichkeiten, nicht Garantien. Ein Setup darf verlieren, ohne dass deine Methode falsch ist. Nicht überanpassen.`,
  },
  discipline_warning: {
    tag: "Disziplin-Warnung",
    title: "Gegen die Statistik getradet — und verloren.",
    Icon: AlertTriangle,
    ring: "border-bear/60",
    bg: "bg-gradient-to-br from-bear/20 via-transparent to-transparent text-foreground",
    body: (r, s) =>
      `Am Entry-Tag warnte die Signallage ${r.signalDirection === "NEUTRAL" ? "vor unklaren Verhältnissen" : `explizit vor einem ${s}-Trade (Signal stand auf ${r.signalDirection})`}. Du bist gegen die Wahrscheinlichkeit gegangen — und das Ergebnis bestätigt das. Solche Trades sind die teuersten Gewohnheiten.`,
  },
  neutral_outcome: {
    tag: "Wash",
    title: "Im Rauschen verloren.",
    Icon: HelpCircle,
    ring: "border-border",
    bg: "bg-card/60 text-foreground",
    body: () => `Bewegung zu klein, um sie statistisch zu bewerten. Kein Erkenntnisgewinn — Gebühren wahrscheinlich die einzige reale Größe.`,
  },
};
