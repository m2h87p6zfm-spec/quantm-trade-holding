import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Send } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useAnalysis } from "@/lib/useMarketData";
import { brokerNarrative, scoreIndicators } from "@/lib/analysis";
import { findProduct, PRODUCTS } from "@/lib/products";
import { SignalBadge } from "@/components/SignalBadge";
import { DisclaimerInline } from "@/components/Disclaimer";

export const Route = createFileRoute("/analyse")({ component: AnalysePage });

type Msg = { role: "user" | "agent"; text: string; symbol?: string };

function extractSymbol(q: string): string | null {
  const upper = q.toUpperCase();
  // Direkter Symbol-Match
  for (const p of PRODUCTS) {
    if (upper.includes(p.symbol.toUpperCase())) return p.symbol;
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
  return null;
}

function AgentResponse({ symbol }: { symbol: string }) {
  const product = findProduct(symbol);
  const { indicators, candles, quote } = useAnalysis(symbol);
  const { settings } = useSettings();

  if (candles.isLoading) return <div className="text-sm text-muted-foreground">Lade Echtzeit-Daten für {symbol}…</div>;
  if (candles.error) return <div className="text-sm text-bear">Datenfeed-Fehler: {(candles.error as Error).message}<div className="mt-1 text-xs text-muted-foreground">Twelve Data Free erlaubt nur 8 Anfragen/Minute. Kurz warten und erneut senden, oder Watchlist verkleinern (Einstellungen).</div></div>;
  if (!candles.data) return <div className="text-sm text-muted-foreground">Keine Kerzendaten für {symbol}. Symbol prüfen.</div>;
  if (!indicators || !product) return <div className="text-sm text-muted-foreground">Keine Daten verfügbar.</div>;

  const sig = scoreIndicators(indicators, settings.risk);
  const text = brokerNarrative(symbol, product.name, indicators, sig);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SignalBadge verdict={sig.verdict} confidence={sig.confidence} />
        <Link to="/produkte/$symbol" params={{ symbol }} className="text-xs text-cyan-accent hover:underline">Detailansicht →</Link>
      </div>
      <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Stat label="Z-Score" v={indicators.zScore.toFixed(2)} />
        <Stat label="RSI(14)" v={indicators.rsi.toFixed(1)} />
        <Stat label="MACD-Hist" v={indicators.macd.histogram.toFixed(3)} />
        <Stat label="Vola ann." v={(indicators.volatility * 100).toFixed(1) + "%"} />
        <Stat label="Sharpe" v={indicators.sharpe.toFixed(2)} />
        <Stat label="Beta" v={indicators.beta.toFixed(2)} />
        <Stat label="Momentum 10P" v={(indicators.momentum * 100).toFixed(2) + "%"} />
        <Stat label="Bollinger ±" v={indicators.bollinger.lower.toFixed(2) + " / " + indicators.bollinger.upper.toFixed(2)} />
      </div>
      <DisclaimerInline />
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm tabular-nums">{v}</div>
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
