import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User as UserIcon, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { useQueries } from "@tanstack/react-query";
import { fetchCandles, getApiKey } from "@/lib/finnhub";
import { findProduct } from "@/lib/products";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators } from "@/lib/analysis";
import { useSettings } from "@/lib/settings";
import { AnalysisReport, isStructuredReport, parseReport } from "@/components/signal/AnalysisReport";
import { QuickFollowups } from "@/components/signal/QuickFollowups";


type Msg = { role: "user" | "assistant"; content: string };

function score(ind: ReturnType<typeof computeAll>): number {
  let s = 0;
  if (ind.rsi < 30) s += 2;
  else if (ind.rsi > 70) s -= 2;
  else if (ind.rsi >= 55) s += 1;
  else if (ind.rsi <= 45) s -= 1;
  if (ind.macd.macd > ind.macd.signal) s += 2; else s -= 2;
  if (ind.price > ind.sma20) s += 1;
  if (!isNaN(ind.sma50) && ind.price > ind.sma50) s += 1;
  if (ind.momentum > 5) s += 1;
  else if (ind.momentum < -5) s -= 1;
  return s;
}

const QUICK = ["Dashboard", "Stärkste Signale heute", "Bullishe Signale", "RSI-Extreme"];

export function SignalChat() {
  const { settings } = useSettings();
  const symbols = settings.watchlist;

  const candleQs = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ["candles", symbol],
      queryFn: () => fetchCandles(symbol, "D", 260),
      enabled: !!getApiKey(),
      staleTime: 12 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const rows = symbols.map((symbol, i) => {
    const c = candleQs[i].data;
    if (!c) return null;
    const p = findProduct(symbol);
    const ind = computeAll(c.c);
    const sig = scoreIndicators(ind, settings.risk);
    const last = c.c.at(-1) ?? 0;
    const prev = c.c.at(-2) ?? last;
    const change = prev ? ((last - prev) / prev) * 100 : 0;
    // ATR(14) from candles
    let atr = NaN;
    if (c.h && c.l && c.c.length > 14) {
      const trs: number[] = [];
      for (let k = Math.max(1, c.c.length - 14); k < c.c.length; k++) {
        const tr = Math.max(c.h[k] - c.l[k], Math.abs(c.h[k] - c.c[k - 1]), Math.abs(c.l[k] - c.c[k - 1]));
        trs.push(tr);
      }
      atr = trs.reduce((a, b) => a + b, 0) / trs.length;
    }
    return {
      symbol,
      name: p?.name,
      price: last,
      changePct: change,
      sector: p?.sector,
      rsi: ind.rsi,
      macd: ind.macd.macd,
      macdSignal: ind.macd.signal,
      sma20: ind.sma20,
      sma50: ind.sma50,
      bbUpper: ind.bollinger.upper,
      bbLower: ind.bollinger.lower,
      bbMid: ind.bollinger.middle,
      momentum10: ind.momentum,
      atr14: atr,
      volatility: ind.volatility,
      score: score(ind),
      sigConfidence: sig.confidence,
    };
  }).filter(Boolean) as Array<Record<string, unknown> & { symbol: string }>;

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Willkommen bei **SIGNAL** ⚡\n\nMathematisches Marktsignal-System — basiert auf RSI, MACD, SMA, Bollinger, Momentum, ATR.\n\nProbier z. B.:\n- *Dashboard*\n- *Stärkste Signale heute*\n- *Scanne AAPL*\n- *RSI-Extreme*\n\n⚠️ Alle Ausgaben sind technische Indikatoren — keine Anlageberatung.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/public/signal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, rows: rowsRef.current }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Fehler" }));
        throw new Error(err.error ?? "Fehler beim Senden");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(msg);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  const loadingData = candleQs.some((q) => q.isLoading);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[640px]">
      <div className="border-b border-border px-5 py-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">SIGNAL Assistent</div>
          <div className="text-[11px] text-muted-foreground">
            Mathematische Indikatoren · RSI · MACD · SMA · Bollinger · ATR
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {loadingData ? "Lade Daten…" : `${rows.length}/${symbols.length} Werte live`}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full ${
                m.role === "user" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
              }`}
            >
              {m.role === "user" ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"
              }`}
            >
              {m.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:bg-background/50 [&_pre]:text-xs [&_code]:text-xs">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : loading && i === messages.length - 1 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => send(q)}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder='z. B. "Scanne AAPL" oder "Bullishe Signale"'
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
