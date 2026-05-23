import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Microscope, Sparkles, CalendarIcon, ChevronRight, ChevronLeft, Search,
  Loader2, TrendingUp, TrendingDown, BookOpen, Newspaper, LineChart, Scale,
  Compass, RotateCcw, CheckCircle2, AlertTriangle, Landmark, Lightbulb, Zap,
  ExternalLink, Wallet, Clock,
} from "lucide-react";
import { PRODUCTS, searchProducts, findProduct, type Product } from "@/lib/products";
import { FeatureGate } from "@/lib/featureGate";
import { DisclaimerInline } from "@/components/Disclaimer";
import { TradeChatPanel } from "@/components/TradeChatPanel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getCurrentAccessToken } from "@/lib/auth-token";

export const Route = createFileRoute("/explain-trade")({
  component: () => (
    <FeatureGate
      feature="risk_analytics"
      title="Explain-My-Trade ist Elite-exklusiv"
      description="Verstehe deinen Trade in Sekunden — die App holt sich Kaufpreis, aktuellen Kurs und Benchmark-Vergleich automatisch und erklärt dir, was passiert ist."
    >
      <ExplainTradePage />
    </FeatureGate>
  ),
  head: () => ({ meta: [{ title: "Explain My Trade — Quantm Trade" }] }),
});

type Source = { title: string; url: string; description: string; source: string };

type AnalysisResult = {
  symbol: string;
  name: string;
  requestedDate: string;
  resolvedDate: string;
  adjusted: boolean;
  shares: number;
  entryClose: number;
  currentClose: number;
  totalCost: number;
  currentValue: number;
  pnlAbs: number;
  pnlPct: number;
  heldDays: number;
  heldMonths: number;
  heldYears: number;
  benchmarks: { sp500: number | null; dax: number | null; msciWorld: number | null };
  analysis: string;
  aiError?: string | null;
  sold: boolean;
  sellRequestedDate: string | null;
  sellResolvedDate: string | null;
  sellAdjusted: boolean;
  sellClose: number | null;
  realizedPnlAbs: number | null;
  realizedPnlPct: number | null;
  postSellPct: number | null;
  valueIfHeld: number | null;
  sources: Source[];
};

type Step = 1 | 2 | 3 | 4 | 5;

function ExplainTradePage() {
  const { session, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [customSymbol, setCustomSymbol] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sharesStr, setSharesStr] = useState<string>("");
  const [sold, setSold] = useState<boolean | null>(null);
  const [sellDate, setSellDate] = useState<Date | undefined>(undefined);

  const mutation = useMutation({
    mutationFn: async (input: { symbol: string; name: string; buyDate: string; shares: number; sellDate: string | null; sector?: string }) => {
      const token = await getCurrentAccessToken(session?.access_token);
      if (!token) throw new Error("Deine Anmeldung wird gerade wiederhergestellt. Bitte warte kurz und starte die Analyse erneut.");
      const r = await fetch("/api/public/explain-trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });
      const j = (await r.json()) as AnalysisResult | { error: string; code?: string };
      if (!r.ok || "error" in j) {
        if (r.status === 401) throw new Error("Bitte melde dich neu an — deine Sitzung ist abgelaufen.");
        if (r.status === 402) throw new Error("Diese Funktion ist Pro/Elite-exklusiv. Bitte upgrade dein Abo.");
        throw new Error("error" in j ? j.error : "Fehler bei der Analyse");
      }
      return j as AnalysisResult;
    },
  });

  const result = mutation.data;
  const shares = Number(sharesStr.replace(",", "."));
  const sharesValid = Number.isFinite(shares) && shares > 0;
  const selectedSymbol = product?.symbol || customSymbol.trim().toUpperCase();
  const selectedName = product?.name || selectedSymbol;
  const selectedSector = product?.sector;

  const totalSteps = sold === true ? 5 : 4;

  function reset() {
    mutation.reset();
    setStep(1);
    setProduct(null);
    setCustomSymbol("");
    setDate(undefined);
    setSharesStr("");
    setSold(null);
    setSellDate(undefined);
  }

  function submit() {
    if (authLoading) return;
    if (!selectedSymbol || !date || !sharesValid) return;
    if (sold === true && !sellDate) return;
    mutation.mutate({
      symbol: selectedSymbol,
      name: selectedName,
      buyDate: format(date, "yyyy-MM-dd"),
      shares,
      sellDate: sold === true && sellDate ? format(sellDate, "yyyy-MM-dd") : null,
      sector: selectedSector,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
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
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Live-News & KI
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Aktie wählen, Kaufdatum, Stückzahl — optional Verkaufsdatum. Wir holen Kurse, Benchmarks und aktuelle Nachrichten automatisch.
          </p>
        </div>
      </header>

      {!result && !mutation.isPending && (
        <>
          <Stepper current={step} total={totalSteps} sold={sold} />
          <section className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm">
            {step === 1 && (
              <StepSymbol
                product={product}
                setProduct={setProduct}
                customSymbol={customSymbol}
                setCustomSymbol={setCustomSymbol}
                onNext={() => selectedSymbol && setStep(2)}
              />
            )}
            {step === 2 && (
              <StepDate
                date={date}
                setDate={setDate}
                onBack={() => setStep(1)}
                onNext={() => date && setStep(3)}
              />
            )}
            {step === 3 && (
              <StepShares
                shares={sharesStr}
                setShares={setSharesStr}
                onBack={() => setStep(2)}
                onNext={() => sharesValid && setStep(4)}
                summary={{ name: selectedName, symbol: selectedSymbol, date: date ? format(date, "dd.MM.yyyy", { locale: de }) : "" }}
              />
            )}
            {step === 4 && (
              <StepSold
                sold={sold}
                setSold={(v) => { setSold(v); if (v === false) setSellDate(undefined); }}
                onBack={() => setStep(3)}
                onNext={() => {
                  if (sold === false) submit();
                  else if (sold === true) setStep(5);
                }}
                buyDate={date ? format(date, "dd.MM.yyyy", { locale: de }) : ""}
              />
            )}
            {step === 5 && (
              <StepSellDate
                sellDate={sellDate}
                setSellDate={setSellDate}
                minDate={date}
                onBack={() => setStep(4)}
                onSubmit={submit}
                summary={{
                  name: selectedName, symbol: selectedSymbol,
                  buyDate: date ? format(date, "dd.MM.yyyy", { locale: de }) : "",
                  shares: sharesStr,
                }}
              />
            )}
          </section>
        </>
      )}

      {mutation.isPending && (
        <div className="rounded-2xl border border-border bg-card/60 p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-base font-medium">Analyse wird erstellt…</div>
            <div className="text-sm text-muted-foreground">Wir holen historische Kurse, aktuelle Nachrichten, staatliche Programme und Branchen-Updates — das dauert einen Moment.</div>
          </div>
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-2xl border border-bear/40 bg-bear/5 p-5 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-bear" />
            <div>
              <div className="font-medium">Analyse fehlgeschlagen</div>
              <div className="text-muted-foreground">{(mutation.error as Error).message}</div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => mutation.reset()}>Erneut versuchen</Button>
            </div>
          </div>
        </div>
      )}

      {result && <ResultView result={result} onReset={reset} />}

      {/* Trading-Chat (isoliert vom Analyse-Agent) */}
      <section className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Trading-Chat zu deinem Trade</h2>
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            eigene Historie
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Stell Folgefragen, vergleiche mit früheren Trades, lerne aus Mustern. Jede Antwort folgt der 5-Punkt-Struktur und erklärt Fachbegriffe automatisch.
        </p>
        <TradeChatPanel
          seedOnFirstMessage={
            result
              ? {
                  title: `${result.name} (${result.symbol})`,
                  symbol: result.symbol,
                  summary: {
                    name: result.name,
                    symbol: result.symbol,
                    buyDate: result.resolvedDate,
                    sellDate: result.sellResolvedDate,
                    shares: result.shares,
                    entryClose: result.entryClose,
                    referenceClose: result.sellClose ?? result.currentClose,
                    pnlPct: result.pnlPct,
                    pnlAbs: result.pnlAbs,
                    benchmarks: result.benchmarks,
                    sold: result.sold,
                  },
                  analysisMarkdown: result.analysis,
                }
              : null
          }
        />
      </section>

      <DisclaimerInline />
    </div>
  );
}

/* ---------------- Stepper ---------------- */

function Stepper({ current, total, sold }: { current: Step; total: number; sold: boolean | null }) {
  const allSteps = [
    { n: 1, label: "Aktie / ETF" },
    { n: 2, label: "Kaufdatum" },
    { n: 3, label: "Anzahl" },
    { n: 4, label: "Verkauft?" },
    { n: 5, label: "Verkaufsdatum" },
  ] as const;
  const steps = allSteps.filter((s) => s.n <= total || (sold === true && s.n <= 5));
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition",
              active && "border-primary bg-primary text-primary-foreground",
              done && "border-bull/60 bg-bull/15 text-bull",
              !active && !done && "border-border bg-card text-muted-foreground",
            )}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
            </div>
            <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Step 1: Symbol ---------------- */

function StepSymbol({
  product, setProduct, customSymbol, setCustomSymbol, onNext,
}: {
  product: Product | null;
  setProduct: (p: Product | null) => void;
  customSymbol: string;
  setCustomSymbol: (s: string) => void;
  onNext: () => void;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return PRODUCTS.slice(0, 12);
    return searchProducts(q).slice(0, 25);
  }, [q]);
  const customSym = q.trim().toUpperCase().replace(/\s+/g, "");
  const noMatchYet = q.trim().length >= 1 && !results.some((p) => p.symbol.toUpperCase() === customSym);
  const selected = product?.symbol || customSymbol;

  return (
    <div className="space-y-4">
      <StepHeader n={1} title="Welche Aktie oder ETF hast du gekauft?" subtitle="Suche nach Name oder Ticker-Symbol." />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => { setQ(e.target.value); setProduct(null); setCustomSymbol(""); }}
          placeholder="z. B. NVIDIA oder NVDA"
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="max-h-64 overflow-auto rounded-lg border border-border bg-background/40">
        {results.map((p) => {
          const active = product?.symbol === p.symbol;
          return (
            <button
              key={p.symbol}
              type="button"
              onClick={() => { setProduct(p); setCustomSymbol(""); }}
              className={cn(
                "flex w-full items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-left text-sm transition hover:bg-accent last:border-0",
                active && "bg-primary/10",
              )}
            >
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.symbol} · {p.sector}</div>
              </div>
              {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
        {results.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">Keine Treffer in der Liste</div>
        )}
      </div>

      {noMatchYet && customSym.length >= 1 && !product && (
        <button
          type="button"
          onClick={() => setCustomSymbol(customSym)}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition",
            customSymbol === customSym
              ? "border-primary bg-primary/10"
              : "border-dashed border-primary/40 hover:bg-primary/5",
          )}
        >
          <div className="font-semibold">Symbol direkt verwenden: {customSym}</div>
          <div className="text-xs text-muted-foreground">Wenn Yahoo Finance den Ticker kennt, laden wir die Daten trotzdem.</div>
        </button>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-xs text-muted-foreground">
          {selected ? <>Auswahl: <span className="font-semibold text-foreground">{selected}</span></> : "Noch nichts ausgewählt"}
        </div>
        <Button onClick={onNext} disabled={!selected}>
          Weiter <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Step 2: Date ---------------- */

function StepDate({
  date, setDate, onBack, onNext,
}: {
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <StepHeader n={2} title="Wann hast du gekauft?" subtitle="Wir holen automatisch den Schlusskurs dieses Tages. Wochenende oder Feiertag? Dann nehmen wir den nächsten Handelstag." />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-11",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "EEEE, dd. MMMM yyyy", { locale: de }) : "Kaufdatum wählen"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => { setDate(d); setOpen(false); }}
            disabled={(d) => d > new Date() || d < new Date("1980-01-01")}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        <Button onClick={onNext} disabled={!date}>
          Weiter <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Step 3: Shares ---------------- */

function StepShares({
  shares, setShares, onBack, onNext, summary,
}: {
  shares: string;
  setShares: (s: string) => void;
  onBack: () => void;
  onNext: () => void;
  summary: { name: string; symbol: string; date: string };
}) {
  const valid = Number.isFinite(Number(shares.replace(",", "."))) && Number(shares.replace(",", ".")) > 0;
  return (
    <div className="space-y-4">
      <StepHeader n={3} title="Wie viele Anteile hast du gekauft?" subtitle="Bruchstücke sind erlaubt (z. B. 2.5)." />

      <input
        autoFocus
        inputMode="decimal"
        value={shares}
        onChange={(e) => setShares(e.target.value)}
        placeholder="z. B. 10"
        className="w-full rounded-md border border-input bg-background px-3 py-3 text-lg font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="rounded-lg border border-border bg-background/40 p-3 text-xs space-y-1">
        <div className="text-muted-foreground">Bisher:</div>
        <div><span className="text-muted-foreground">Wertpapier:</span> <span className="font-medium">{summary.name} ({summary.symbol})</span></div>
        <div><span className="text-muted-foreground">Kaufdatum:</span> <span className="font-medium">{summary.date}</span></div>
        {valid && <div><span className="text-muted-foreground">Anzahl:</span> <span className="font-medium">{shares}</span></div>}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        <Button onClick={onNext} disabled={!valid}>
          Weiter <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Step 4: Sold? ---------------- */

function StepSold({
  sold, setSold, onBack, onNext, buyDate,
}: {
  sold: boolean | null;
  setSold: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  buyDate: string;
}) {
  return (
    <div className="space-y-4">
      <StepHeader n={4} title="Hast du diese Position bereits verkauft?" subtitle={`Kaufdatum: ${buyDate}. Falls verkauft, berechnen wir realisierten Gewinn/Verlust und was du seit dem Verkauf zusätzlich verpasst oder vermieden hättest.`} />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSold(false)}
          className={cn(
            "rounded-xl border p-4 text-left transition",
            sold === false ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border hover:bg-accent",
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold">Nein, halte ich noch</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Analyse mit heutigem Kurs als Referenz.</p>
        </button>
        <button
          type="button"
          onClick={() => setSold(true)}
          className={cn(
            "rounded-xl border p-4 text-left transition",
            sold === true ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border hover:bg-accent",
          )}
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-semibold">Ja, schon verkauft</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Realisierter Gewinn + Was-wäre-wenn-Vergleich.</p>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        <Button onClick={onNext} disabled={sold === null} size={sold === false ? "lg" : "default"}>
          {sold === false ? (<><Microscope className="mr-2 h-4 w-4" /> Trade analysieren</>) : (<>Weiter <ChevronRight className="ml-1 h-4 w-4" /></>)}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Step 5: Sell date ---------------- */

function StepSellDate({
  sellDate, setSellDate, minDate, onBack, onSubmit, summary,
}: {
  sellDate: Date | undefined;
  setSellDate: (d: Date | undefined) => void;
  minDate: Date | undefined;
  onBack: () => void;
  onSubmit: () => void;
  summary: { name: string; symbol: string; buyDate: string; shares: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <StepHeader n={5} title="Wann hast du verkauft?" subtitle="Wir nehmen den Schlusskurs dieses Tages — bei Wochenende/Feiertag den nächsten Handelstag." />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !sellDate && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {sellDate ? format(sellDate, "EEEE, dd. MMMM yyyy", { locale: de }) : "Verkaufsdatum wählen"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
          <Calendar
            mode="single"
            selected={sellDate}
            onSelect={(d) => { setSellDate(d); setOpen(false); }}
            disabled={(d) => d > new Date() || (minDate ? d < minDate : false)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <div className="rounded-lg border border-border bg-background/40 p-3 text-xs space-y-1">
        <div className="text-muted-foreground">Zusammenfassung:</div>
        <div><span className="text-muted-foreground">Wertpapier:</span> <span className="font-medium">{summary.name} ({summary.symbol})</span></div>
        <div><span className="text-muted-foreground">Kauf:</span> <span className="font-medium">{summary.buyDate}</span> · <span className="text-muted-foreground">Anzahl:</span> <span className="font-medium">{summary.shares}</span></div>
        {sellDate && <div><span className="text-muted-foreground">Verkauf:</span> <span className="font-medium">{format(sellDate, "dd.MM.yyyy", { locale: de })}</span></div>}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        <Button onClick={onSubmit} disabled={!sellDate} size="lg">
          <Microscope className="mr-2 h-4 w-4" /> Trade analysieren
        </Button>
      </div>
    </div>
  );
}

function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Schritt {n}</div>
      <h2 className="mt-0.5 text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/* ---------------- Result ---------------- */

function ResultView({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const positive = result.pnlAbs >= 0;
  const sign = result.pnlAbs >= 0 ? "+" : "";
  const heldLabel = result.heldYears > 0
    ? `${result.heldYears} J. ${result.heldMonths - result.heldYears * 12} M.`
    : result.heldMonths > 0
      ? `${result.heldMonths} M. ${result.heldDays - result.heldMonths * 30} T.`
      : `${result.heldDays} T.`;

  // What-if since sell
  const missedPositive = result.postSellPct != null && result.postSellPct >= 0;

  return (
    <div className="space-y-4">
      {result.adjusted && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            <span className="font-medium">Hinweis:</span> Dein Kaufdatum ({fmtDate(result.requestedDate)}) war kein Handelstag — wir haben den nächsten verwendet: <span className="font-semibold">{fmtDate(result.resolvedDate)}</span>.
          </div>
        </div>
      )}
      {result.sold && result.sellAdjusted && result.sellRequestedDate && result.sellResolvedDate && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            <span className="font-medium">Verkaufsdatum angepasst:</span> {fmtDate(result.sellRequestedDate)} → <span className="font-semibold">{fmtDate(result.sellResolvedDate)}</span> (nächster Handelstag).
          </div>
        </div>
      )}

      {/* Hero P&L card */}
      <div className={cn(
        "rounded-2xl border p-5 shadow-sm",
        positive ? "border-bull/40 bg-gradient-to-br from-bull/15 via-transparent to-transparent" : "border-bear/40 bg-gradient-to-br from-bear/15 via-transparent to-transparent",
      )}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{result.name} · {result.symbol}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Gekauft am {fmtDate(result.resolvedDate)} · {result.shares} Anteile
              {result.sold && result.sellResolvedDate && <> · Verkauft am {fmtDate(result.sellResolvedDate)}</>}
            </div>
          </div>
          {positive ? <TrendingUp className="h-8 w-8 text-bull" /> : <TrendingDown className="h-8 w-8 text-bear" />}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {result.sold ? "Realisierter Gewinn / Verlust" : "Gewinn / Verlust"}
            </div>
            <div className={cn("text-4xl font-bold tabular-nums", positive ? "text-bull" : "text-bear")}>
              {sign}{formatMoney(result.pnlAbs)}
            </div>
            <div className={cn("text-base font-semibold tabular-nums", positive ? "text-bull" : "text-bear")}>
              {sign}{(result.pnlPct * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {result.sold ? "Verkaufserlös" : "Aktueller Gesamtwert"}
            </div>
            <div className="text-4xl font-bold tabular-nums">{formatMoney(result.currentValue)}</div>
            <div className="text-xs text-muted-foreground">Kaufwert: {formatMoney(result.totalCost)}</div>
          </div>
        </div>
      </div>

      {/* Numbers grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Kaufpreis" value={formatPrice(result.entryClose)} />
        <Stat
          label={result.sold ? "Verkaufspreis" : "Aktueller Kurs"}
          value={formatPrice(result.sellClose ?? result.currentClose)}
        />
        <Stat label="Anzahl Anteile" value={String(result.shares)} />
        <Stat label="Haltedauer" value={heldLabel} hint={`${result.heldDays} Tage`} />
      </div>

      {/* What-if card — only when sold */}
      {result.sold && result.postSellPct != null && result.valueIfHeld != null && (
        <div className={cn(
          "rounded-2xl border p-5 shadow-sm",
          missedPositive ? "border-amber-500/40 bg-amber-500/5" : "border-bull/40 bg-bull/5",
        )}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Was wäre, wenn du gehalten hättest?</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Entwicklung seit Verkauf</div>
              <div className={cn("text-3xl font-bold tabular-nums", missedPositive ? "text-amber-500" : "text-bull")}>
                {missedPositive ? "+" : ""}{(result.postSellPct * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Heutiger Wert (wenn gehalten)</div>
              <div className="text-3xl font-bold tabular-nums">{formatMoney(result.valueIfHeld)}</div>
              <div className="text-xs text-muted-foreground">
                {missedPositive
                  ? `Verpasst: ${formatMoney(result.valueIfHeld - result.currentValue)}`
                  : `Vermieden: ${formatMoney(result.currentValue - result.valueIfHeld)}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark comparison */}
      <Card icon={Scale} title={result.sold ? "Performance-Vergleich im Halte-Zeitraum" : "Performance-Vergleich seit Kauf"}>
        <div className="space-y-2">
          <BenchRow label={result.name} pct={result.pnlPct} highlight />
          <BenchRow label="S&P 500" pct={result.benchmarks.sp500} />
          <BenchRow label="DAX" pct={result.benchmarks.dax} />
          <BenchRow label="MSCI World" pct={result.benchmarks.msciWorld} />
        </div>
      </Card>

      {/* AI sections */}
      {result.aiError ? (
        <Card icon={AlertTriangle} title="Analyse nicht verfügbar">
          <p className="text-sm text-muted-foreground">{result.aiError}</p>
        </Card>
      ) : (
        <AiSections markdown={result.analysis} />
      )}

      {/* Sources */}
      {result.sources && result.sources.length > 0 && (
        <Card icon={ExternalLink} title="Quellen (Live-Websuche)">
          <ul className="space-y-2 text-sm">
            {result.sources.map((s) => (
              <li key={s.url} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline break-words">
                    {s.title || s.url}
                  </a>
                  <div className="text-[11px] text-muted-foreground">{s.source}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex items-center justify-center pt-2">
        <Button onClick={onReset} variant="outline" size="lg">
          <RotateCcw className="mr-2 h-4 w-4" /> Neue Analyse starten
        </Button>
      </div>
    </div>
  );
}

function AiSections({ markdown }: { markdown: string }) {
  const sections = parseSections(markdown);
  const icons: Record<string, typeof BookOpen> = {
    "Zusammenfassung des Trades": BookOpen,
    "Was damals passierte": Newspaper,
    "Politische & wirtschaftliche Rückenwind-Faktoren": Landmark,
    "Katalysatoren für die Kursbewegung": Zap,
    "Warum sich der Kurs seitdem so entwickelt hat": LineChart,
    "Bewertung des Trades": Scale,
    "Was du vielleicht noch nicht weißt": Lightbulb,
    "Ausblick": Compass,
  };
  const order = [
    "Zusammenfassung des Trades",
    "Was damals passierte",
    "Politische & wirtschaftliche Rückenwind-Faktoren",
    "Katalysatoren für die Kursbewegung",
    "Warum sich der Kurs seitdem so entwickelt hat",
    "Bewertung des Trades",
    "Was du vielleicht noch nicht weißt",
    "Ausblick",
  ];
  const remaining = sections.filter((s) => !order.includes(s.title));
  const ordered = [
    ...order.map((t) => sections.find((s) => s.title === t)).filter(Boolean) as { title: string; body: string }[],
    ...remaining,
  ];
  if (ordered.length === 0) {
    return (
      <Card icon={BookOpen} title="Analyse">
        <p className="whitespace-pre-wrap text-sm text-foreground/90">{markdown}</p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {ordered.map((s) => {
        const Icon = icons[s.title] ?? BookOpen;
        return (
          <Card key={s.title} icon={Icon} title={s.title}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{s.body.trim()}</p>
          </Card>
        );
      })}
    </div>
  );
}

function parseSections(md: string): { title: string; body: string }[] {
  if (!md) return [];
  const lines = md.split("\n");
  const out: { title: string; body: string }[] = [];
  let curTitle: string | null = null;
  let curBody: string[] = [];
  for (const ln of lines) {
    const m = ln.match(/^##\s+(.+)$/);
    if (m) {
      if (curTitle) out.push({ title: curTitle, body: curBody.join("\n") });
      curTitle = m[1].trim();
      curBody = [];
    } else if (curTitle) {
      curBody.push(ln);
    }
  }
  if (curTitle) out.push({ title: curTitle, body: curBody.join("\n") });
  return out;
}

function Card({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function BenchRow({ label, pct, highlight }: { label: string; pct: number | null; highlight?: boolean }) {
  if (pct == null) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className={cn(highlight ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
        <span className="text-muted-foreground">n/a</span>
      </div>
    );
  }
  const pos = pct >= 0;
  const pctNum = pct * 100;
  const barWidth = Math.min(100, Math.abs(pctNum) * 2);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className={cn(highlight ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
        <span className={cn("font-semibold tabular-nums", pos ? "text-bull" : "text-bear")}>
          {pos ? "+" : ""}{pctNum.toFixed(2)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", pos ? "bg-bull" : "bg-bear")}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(x: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(x);
}

function formatPrice(x: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
}

// touch unused imports to keep tree-shaking happy
void findProduct;
