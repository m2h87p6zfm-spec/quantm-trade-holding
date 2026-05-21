import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useSettings } from "@/lib/settings";
import { useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators, buildDecision } from "@/lib/analysis";
import { DecisionCard } from "@/components/DecisionCard";
import { IndicatorBreakdown } from "@/components/IndicatorBreakdown";
import { findProduct, PRODUCTS } from "@/lib/products";
import { SignalBadge } from "@/components/SignalBadge";
import { DisclaimerInline } from "@/components/Disclaimer";
import { LearningProgressBlock } from "@/components/LearningProgressBlock";
import { detectRegime, deriveScenarioTag } from "@/lib/ai-learning";
import { recordPrediction } from "@/lib/ai-learning.functions";


export const Route = createFileRoute("/analyse")({ component: AnalysePage });



type Msg = { role: "user" | "agent"; text: string; symbol?: string };

function extractSymbol(q: string): string | null {
  const upper = q.toUpperCase();
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Direkter Symbol-Match
  for (const p of [...PRODUCTS].sort((a, b) => b.symbol.length - a.symbol.length)) {
    const symbol = p.symbol.toUpperCase();
    if (new RegExp(`(^|[^A-Z0-9])${escapeRe(symbol)}($|[^A-Z0-9])`).test(upper)) return p.symbol;
  }
  // Name-Match
  const lower = q.toLowerCase();
  for (const p of PRODUCTS) {
    const n = p.name.toLowerCase().split(/[\s.]/)[0];
    if (n.length >= 3 && lower.includes(n)) return p.symbol;
  }
  // Aliase
  const aliases: Record<string, string> = {
    apple: "AAPL", tesla: "TSLA", nvidia: "NVDA", microsoft: "MSFT", amazon: "AMZN", meta: "META", facebook: "META",
    google: "GOOGL", alphabet: "GOOGL", netflix: "NFLX", "deutsche bank": "DBK.DE", siemens: "SIE.DE",
    volkswagen: "VOW3.DE", bmw: "BMW.DE", bayer: "BAYN.DE", airbus: "AIR.PA", sap: "SAP", asml: "ASML",
    dax: "EWG", "s&p": "SPY", "s&p 500": "SPY", nasdaq: "QQQ", "dow jones": "DIA", dow: "DIA", nikkei: "EWJ",
  };
  for (const [k, v] of Object.entries(aliases)) if (lower.includes(k)) return v;
  const blocked = new Set(["ICH", "WIE", "KAUF", "KAUFEN", "VERKAUF", "VERKAUFEN", "HALTEN", "SOLL", "LONG", "SHORT"]);
  for (const match of upper.matchAll(/\b[A-Z]{1,5}(?:[.:-][A-Z]{1,5})?\b/g)) {
    if (!blocked.has(match[0])) return match[0];
  }
  return null;
}

function AgentResponse({ symbol }: { symbol: string }) {
  const product = findProduct(symbol);
  const { indicators, candles } = useAnalysis(symbol);
  const { settings } = useSettings();

  if (candles.isLoading && !candles.data) return <div className="text-sm text-muted-foreground">Lade Echtzeit-Daten für {symbol}…</div>;
  if (!candles.data) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Live-Daten werden aktualisiert… Bitte einen Moment.
      </div>
    );
  }
  if (!indicators) return <div className="text-sm text-muted-foreground">Daten werden vorbereitet…</div>;

  const sig = scoreIndicators(indicators, settings.risk);
  const regime = detectRegime(indicators);
  const scenarioTag = deriveScenarioTag(indicators, regime);
  const decision = buildDecision(symbol, product?.name ?? symbol, indicators, sig, regime);
  const record = useServerFn(recordPrediction);

  useEffect(() => {
    record({
      data: {
        symbol,
        scenarioTag,
        marketRegime: regime,
        verdict: sig.verdict,
        confidence: Math.max(0, Math.min(1, sig.confidence)),
        horizonDays: 5,
        priceAtPrediction: indicators.price,
        reasoning: { score: sig.score, zScore: indicators.zScore, rsi: indicators.rsi },
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, scenarioTag, regime, sig.verdict]);

  return (
    <div className="space-y-4">
      <DecisionCard report={decision} symbol={symbol} />
      <div className="flex items-center gap-2 pt-1">
        <SignalBadge verdict={sig.verdict} confidence={sig.confidence} />
        <Link to="/produkte/$symbol" params={{ symbol }} className="text-xs text-cyan-accent hover:underline">Detailansicht →</Link>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Indikator-Analyse — was die Daten sagen</h3>
        <IndicatorBreakdown ind={indicators} />
      </div>
      <LearningProgressBlock
        symbol={symbol}
        scenarioTag={scenarioTag}
        marketRegime={regime}
        currentVerdict={sig.verdict}
        currentConfidence={sig.confidence}
      />
      <DisclaimerInline />
    </div>
  );
}

function Stat({ label, v, hint }: { label: string; v: string; hint?: string }) {
  return (
    <div className="group relative rounded-md border border-border bg-background/60 px-2 py-1.5" title={hint}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="text-muted-foreground/60 cursor-help">ⓘ</span>}
      </div>
      <div className="font-mono text-sm tabular-nums">{v}</div>
      {hint && (
        <div className="pointer-events-none absolute left-0 right-0 top-full z-20 mt-1 hidden rounded-md border border-border bg-popover p-2 text-[11px] font-normal normal-case tracking-normal leading-snug text-popover-foreground shadow-lg group-hover:block">
          {hint}
        </div>
      )}
    </div>
  );
}

function AnalysePage() {
  const [input, setInput] = useState("");
  const initial: Msg[] = [
    { role: "agent", text: "Bereit. Frag mich nach einem Ticker oder Namen — z. B. Analysiere NVDA, Wie steht der DAX, oder Soll ich Tesla kaufen." },
  ];
  const [messages, setMessages] = useState(initial);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const sym = extractSymbol(input);
    const userMsg: Msg = { role: "user", text: input };
    const reply: Msg = sym
      ? { role: "agent", text: "", symbol: sym }
      : { role: "agent", text: "Kein bekanntes Symbol erkannt. Versuch's mit einem Ticker (AAPL, NVDA, SAP) oder einem Namen (Apple, Siemens, DAX)." };
    setMessages((m) => [...m, userMsg, reply]);
    setInput("");
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Analyse-Agent</h1>
        <p className="text-sm text-muted-foreground">Dein statistischer Wall-Street-Broker. Klare Urteile, datengetrieben.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-border bg-card/40 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
              {m.symbol ? <AgentResponse symbol={m.symbol} /> : (
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: m.text.replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='z. B. "Analysiere Apple" oder "Wie bewertest du NVDA?"'
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Send className="h-4 w-4" /> Senden
        </button>
      </form>
    </div>
  );
}
