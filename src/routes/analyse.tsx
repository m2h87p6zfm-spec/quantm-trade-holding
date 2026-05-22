import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, Bot, User, TrendingUp, Search, Activity, LineChart, Brain, Coins, Lock } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { useSettings } from "@/lib/settings";
import { useAnalysis, useQuote } from "@/lib/useMarketData";
import { scoreIndicators, buildDecision, stabilizeDecision } from "@/lib/analysis";
import { findProduct, PRODUCTS } from "@/lib/products";
import { DisclaimerInline } from "@/components/Disclaimer";

import { detectRegime, deriveScenarioTag } from "@/lib/ai-learning";
import { recordPrediction } from "@/lib/ai-learning.functions";
import { recordApexAnalysis } from "@/lib/track-record.functions";
import { consumeAnalysisCredit } from "@/lib/credits.functions";
import { creditLabel } from "@/lib/credits";
import { AnalysisCreditBadge } from "@/components/AnalysisCreditBadge";
import { useAuth } from "@/hooks/use-auth";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { supabase } from "@/integrations/supabase/client";
import { buildIndicatorPrompt } from "@/lib/indicator-prompt";
import { ApexDashboard, ApexLoading } from "@/components/ApexDashboard";
import type { IndicatorSet } from "@/lib/indicators";
import type { MarketRegime } from "@/lib/ai-learning";




export const Route = createFileRoute("/analyse")({ component: AnalysePage });




type Msg = { role: "user" | "agent"; text: string; symbol?: string; query?: string };

function AiCommentary({ query, symbol, indicators, regime }: { query: string; symbol?: string; indicators?: IndicatorSet | null; regime?: MarketRegime }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setText("");
    setError(null);
    setDone(false);

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const sys = symbol
          ? `Der Nutzer fragt nach ${symbol}.

PFLICHT:
1. Berechne einen eigenen Gesamtscore (0–100) aus den unten gelieferten Indikatoren — nicht aus dem Bauch heraus. Zeige die 3–5 wichtigsten Teilscores kurz (Momentum, Trend, Volatilität, Risiko, ggf. Fundamentaldaten).
2. Mappe daraus die Empfehlung: 80–100 STRONG BUY · 65–79 BUY · 45–64 HOLD · 25–44 SELL · 0–24 STRONG SELL.
3. HOLD ist NUR erlaubt, wenn der Score wirklich zwischen 45 und 64 liegt. Niemals "aus Vorsicht" oder "wegen hoher Vola" auf HOLD ausweichen — Vola erhöht die Positionsgröße-Empfehlung, nicht die Richtung.
4. Variiere Einstieg, Reihenfolge und Tonfall jedes Mal. Verboten sind Floskeln wie "in hochvolatilem Umfeld abwarten", "Markt beobachten", "Lage unsicher" — nur erlaubt mit direkt dahinter stehender messbarer Begründung.
5. Jeder Fachbegriff/Wert bekommt eine kurze Klammer-Erklärung für Anfänger (z. B. *RSI 68 — Skala 0–100, >70 = überhitzt*).
6. Länge: 6–12 Sätze, kompakt und konkret. Keine Wiederholung früherer Antworten.

Zufallsseed für Variation: ${Math.random().toString(36).slice(2, 10)}-${Date.now()}.`
          : "Beantworte die Nutzerfrage kompakt, variantenreich und mit erklärten Fachbegriffen.";
        const indicatorBlock =
          symbol && indicators && regime ? buildIndicatorPrompt(symbol, indicators, regime) : null;
        const msgs = [
          { role: "system", content: sys },
          ...(indicatorBlock ? [{ role: "system", content: indicatorBlock }] : []),
          { role: "user", content: query },
        ];
        const res = await fetch("/api/public/agent-chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: msgs,
            sessionId: `analyse-${symbol ?? "free"}-${Date.now()}`,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Fehler ${res.status}`);
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let acc = "";
        let finished = false;
        while (!finished) {
          const { value, done: d } = await reader.read();
          if (d) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") { finished = true; break; }
            try {
              const p = JSON.parse(json);
              const c = p.choices?.[0]?.delta?.content as string | undefined;
              if (c) { acc += c; setText(acc); }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }
        setDone(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message);
      }
    })();

    return () => controller.abort();
  }, [query, symbol, indicators, regime]);

  if (error) {
    return <div className="rounded-lg border border-bear/30 bg-bear/5 p-3 text-xs text-bear">KI-Kommentar fehlgeschlagen: {error}</div>;
  }
  if (!text && !done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        APEX denkt nach …
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm leading-relaxed">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">APEX · KI-Einschätzung</div>
      <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-strong:font-semibold prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-table:my-2 prose-th:border prose-th:border-border prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      {!done && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-primary align-middle" />}
    </div>
  );
}


const NAME_STOPWORDS = new Set([
  "inc", "inc.", "corp", "corp.", "corporation", "company", "co", "co.", "ag", "se", "sa", "nv", "plc",
  "ltd", "ltd.", "limited", "holdings", "holding", "group", "the", "and", "of", "&",
  "technologies", "technology", "tech", "systems", "industries", "international", "global",
  "platforms", "motors", "motor", "bank", "banco", "vz", "pharmaceuticals", "pharma",
]);

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-zäöüß0-9]+/)
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

function extractSymbol(q: string): string | null {
  const upper = q.toUpperCase();
  const lower = q.toLowerCase();
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 1) Direkter Symbol-Match (längste zuerst)
  for (const p of [...PRODUCTS].sort((a, b) => b.symbol.length - a.symbol.length)) {
    const symbol = p.symbol.toUpperCase();
    if (new RegExp(`(^|[^A-Z0-9])${escapeRe(symbol)}($|[^A-Z0-9])`).test(upper)) return p.symbol;
  }

  // 2) Name-Match: irgendein bedeutsamer Token des Firmennamens muss als Wort in der Query stehen
  //    Längere Tokens bekommen Vorrang (z.B. "vertiv" > "tech").
  const candidates: Array<{ symbol: string; score: number }> = [];
  for (const p of PRODUCTS) {
    const tokens = nameTokens(p.name);
    for (const t of tokens) {
      if (new RegExp(`(^|[^a-zäöüß0-9])${escapeRe(t)}($|[^a-zäöüß0-9])`).test(lower)) {
        candidates.push({ symbol: p.symbol, score: t.length });
        break;
      }
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].symbol;
  }

  // 3) Aliase / gängige Spitznamen
  const aliases: Record<string, string> = {
    apple: "AAPL", tesla: "TSLA", nvidia: "NVDA", microsoft: "MSFT", amazon: "AMZN", meta: "META", facebook: "META",
    google: "GOOGL", alphabet: "GOOGL", netflix: "NFLX", "deutsche bank": "DBK.DE", siemens: "SIE.DE",
    volkswagen: "VOW3.DE", bmw: "BMW.DE", bayer: "BAYN.DE", airbus: "AIR.PA", sap: "SAP", asml: "ASML",
    dax: "EWG", "s&p": "SPY", "s&p 500": "SPY", nasdaq: "QQQ", "dow jones": "DIA", dow: "DIA", nikkei: "EWJ",
    vertiv: "VRT", palantir: "PLTR", berkshire: "BRK.B", buffett: "BRK.B",
  };
  for (const [k, v] of Object.entries(aliases)) if (lower.includes(k)) return v;

  // 4) Fallback: irgendein groß geschriebenes Token sieht nach Ticker aus
  const blocked = new Set(["ICH", "WIE", "KAUF", "KAUFEN", "VERKAUF", "VERKAUFEN", "HALTEN", "SOLL", "LONG", "SHORT"]);
  for (const match of upper.matchAll(/\b[A-Z]{1,5}(?:[.:-][A-Z]{1,5})?\b/g)) {
    if (!blocked.has(match[0])) return match[0];
  }
  return null;
}


type CreditState =
  | { phase: "checking" }
  | { phase: "anon" }
  | { phase: "blocked"; tier: string; limit: number; used: number }
  | { phase: "ok" };

function AgentResponse({ symbol, userQuery }: { symbol: string; userQuery: string }) {
  const product = findProduct(symbol);
  const { indicators, candles } = useAnalysis(symbol);
  const quoteQ = useQuote(symbol);
  const { settings } = useSettings();
  const { user } = useAuth();
  const consume = useServerFn(consumeAnalysisCredit);
  const record = useServerFn(recordPrediction);
  const queryClient = useQueryClient();

  const [credit, setCredit] = useState<CreditState>({ phase: "checking" });

  // Credit pro Symbol-Analyse verbrauchen (1× pro Mount)
  useEffect(() => {
    if (!user) {
      setCredit({ phase: "anon" });
      return;
    }
    let alive = true;
    setCredit({ phase: "checking" });
    consume({ data: { symbol } })
      .then((r) => {
        if (!alive) return;
        queryClient.invalidateQueries({ queryKey: ["analysis-credits"] });
        if (r.allowed) setCredit({ phase: "ok" });
        else setCredit({ phase: "blocked", tier: r.tier, limit: r.limit, used: r.used });
      })
      .catch(() => alive && setCredit({ phase: "ok" })); // bei Netzwerkfehler nicht hart blocken
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, user?.id]);

  const productName = product?.name ?? symbol;

  if (credit.phase === "anon") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Lock className="h-4 w-4 text-primary" />
          Login für die Analyse erforderlich
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Jeder Plan bekommt monatlich eigene Analyse-Credits. Logge dich ein, um loszulegen — Free startet mit 3 gratis Analysen.
        </p>
        <Link
          to="/login"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Einloggen
        </Link>
      </div>
    );
  }

  if (credit.phase === "checking") {
    return <div className="text-sm text-muted-foreground">Prüfe Credits…</div>;
  }

  if (credit.phase === "blocked") {
    return (
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-amber-300">
          <Coins className="h-4 w-4" />
          Credits aufgebraucht ({credit.used} / {credit.limit})
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Du hast dein monatliches Analyse-Limit im <span className="font-medium text-foreground">{creditLabel(credit.tier as "free" | "pro" | "elite")}</span>-Plan erreicht. Upgrade für mehr — Pro: 50/Monat, Elite: 250/Monat.
        </p>
        <Link
          to="/preise"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Plan upgraden
        </Link>
      </div>
    );
  }

  if ((candles.isLoading && !candles.data) || !candles.data || !indicators) {
    return <ApexLoading name={productName} />;
  }

  const sig = scoreIndicators(indicators, settings.risk);
  const regime = detectRegime(indicators);
  const scenarioTag = deriveScenarioTag(indicators, regime);
  const rawDecision = buildDecision(symbol, productName, indicators, sig, regime);
  const stable = stabilizeDecision(symbol, rawDecision.decision, rawDecision.confidence);
  const decision = stable.decision === rawDecision.decision
    ? { ...rawDecision, adjustments: [...rawDecision.adjustments, `Stabilität: ${stable.reason}`] }
    : { ...rawDecision, decision: stable.decision, adjustments: [...rawDecision.adjustments, `Stabilität: ${stable.reason}`] };

  return (
    <AgentAnalysisView
      symbol={symbol}
      name={productName}
      decision={decision}
      sig={sig}
      indicators={indicators}
      candles={candles.data}
      quote={quoteQ.data}
      regime={regime}
      scenarioTag={scenarioTag}
      user={user}
      record={record}
      userQuery={userQuery}
    />
  );
}

function AgentAnalysisView({
  symbol,
  name,
  decision,
  sig,
  indicators,
  candles,
  quote,
  regime,
  scenarioTag,
  user,
  record,
  userQuery,
}: {
  symbol: string;
  name: string;
  decision: ReturnType<typeof buildDecision>;
  sig: ReturnType<typeof scoreIndicators>;
  indicators: NonNullable<ReturnType<typeof useAnalysis>["indicators"]>;
  candles: NonNullable<ReturnType<typeof useAnalysis>["candles"]["data"]>;
  quote: ReturnType<typeof useQuote>["data"];
  regime: ReturnType<typeof detectRegime>;
  scenarioTag: string;
  user: ReturnType<typeof useAuth>["user"];
  record: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  userQuery: string;
}) {
  const recordTrack = useServerFn(recordApexAnalysis);
  useEffect(() => {
    if (!user) return;
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

    // APEX Track Record speichern (anonym, öffentlich abrufbar)
    const product = findProduct(symbol);
    const verdictMap: Record<string, "KAUF" | "HALTEN" | "VERKAUFEN"> = {
      LONG: "KAUF",
      SHORT: "VERKAUFEN",
      NEUTRAL: "HALTEN",
    };
    const tVerdict = verdictMap[sig.verdict] ?? "HALTEN";
    const confidence100 = Math.round(Math.max(0, Math.min(1, sig.confidence)) * 100);
    if (Number.isFinite(indicators.price) && indicators.price > 0) {
      recordTrack({
        data: {
          ticker: symbol,
          name,
          sector: product?.sector ?? null,
          asset_type: "Aktie",
          verdict: tVerdict,
          confidence_score: confidence100,
          price_at_analysis: indicators.price,
          indicators: {
            score: sig.score,
            zScore: indicators.zScore,
            rsi: indicators.rsi,
            regime,
            scenarioTag,
          },
        },
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, scenarioTag, regime, sig.verdict, user?.id]);

  return (
    <div className="space-y-4">
      <ApexDashboard
        symbol={symbol}
        name={name}
        decision={decision}
        indicators={indicators}
        candles={candles}
        quote={quote}
        regime={regime}
      />
      <AiCommentary query={userQuery} symbol={symbol} indicators={indicators} regime={regime} />
      <div className="pt-1">
        <Link to="/produkte/$symbol" params={{ symbol }} className="text-xs text-cyan-accent hover:underline">
          Vollständige Detailansicht →
        </Link>
      </div>
      <DisclaimerInline />

    </div>
  );
}





function AnalysePage() {
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => `analyse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const initial: Msg[] = [
    { role: "agent", text: "Bereit. Frag mich nach einem Ticker oder Namen — z. B. *Analysiere NVDA*, *Wie steht der DAX*, oder *Soll ich Tesla kaufen*." },
  ];
  const [messages, setMessages] = useState(initial);

  const sendQuery = (text: string) => {
    const sym = extractSymbol(text);
    const userMsg: Msg = { role: "user", text };
    const reply: Msg = { role: "agent", text: "", symbol: sym ?? undefined, query: text };
    setMessages((m) => [...m, userMsg, reply]);
    setInput("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendQuery(input);
  };

  const suggestions = [
    { icon: TrendingUp, label: "Analysiere NVDA", query: "Analysiere NVDA" },
    { icon: Activity, label: "Wie steht der DAX?", query: "Wie steht der DAX" },
    { icon: Search, label: "Soll ich Tesla kaufen?", query: "Soll ich Tesla kaufen" },
    { icon: LineChart, label: "Bewerte Apple", query: "Bewerte Apple" },
  ];

  const showSuggestions = messages.length <= 1;

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col p-6">
      {/* Header mit Icon + Glow */}
      <div className="mb-5 flex items-start gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-primary/30 blur-xl" aria-hidden />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <Brain className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">APEX <span className="text-muted-foreground font-normal text-base">· by Apex Trades</span></h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              LIVE
            </span>
            <AnalysisCreditBadge />
          </div>

          <p className="text-sm text-muted-foreground">Dein statistischer Analyse-Agent. Klare Urteile, datengetrieben.</p>

        </div>
      </div>

      {/* Chat-Fläche mit subtilem Verlauf */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card/60 to-card/20 shadow-inner">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/40 to-transparent" aria-hidden />
        <div className="h-full space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) => {
            const prevUser = m.role === "agent" ? [...messages.slice(0, i)].reverse().find((x) => x.role === "user")?.text ?? "" : "";
            return (
            <div key={i} className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "agent" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border border-border bg-card"
                }`}
              >
                {m.symbol ? (
                  <AgentResponse symbol={m.symbol} userQuery={m.query ?? ""} />
                ) : m.query ? (
                  <AiCommentary query={m.query} />
                ) : (
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: m.text.replace(/\*(.*?)\*/g, '<em class="text-primary not-italic font-medium">$1</em>') }}
                  />
                )}
                {m.role === "agent" && i > 0 && (
                  <FeedbackButtons
                    sessionId={sessionId}
                    userPrompt={prevUser}
                    assistantMessage={m.symbol ? `Analyse: ${m.symbol}` : m.text}
                  />
                )}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
            );
          })}

          {showSuggestions && (
            <div className="pt-2">
              <div className="mb-2 flex items-center gap-1.5 pl-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Schnellstart
              </div>
              <div className="grid grid-cols-1 gap-2 pl-9 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => sendQuery(s.query)}
                    className="group flex items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-card hover:shadow-sm"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
                      <s.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-muted-foreground group-hover:text-foreground">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Eingabe-Bar */}
      <form onSubmit={submit} className="mt-4">
        <div className="group relative flex items-center gap-2 rounded-2xl border border-border bg-card/80 p-1.5 shadow-sm transition focus-within:border-primary/50 focus-within:shadow-md">
          <div className="flex h-8 w-8 items-center justify-center text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='z. B. "Analysiere Apple" oder "Wie bewertest du NVDA?"'
            className="flex-1 bg-transparent px-1 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Senden
          </button>
        </div>
        <p className="mt-2 pl-2 text-[11px] text-muted-foreground/70">
          Tipp: Du kannst Ticker (NVDA, SAP) oder volle Namen verwenden.
        </p>
      </form>
    </div>
  );
}

