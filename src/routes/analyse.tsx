import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, Bot, User, TrendingUp, Search, Activity, LineChart, Brain, Coins, Lock } from "lucide-react";

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
import { consumeAnalysisCredit } from "@/lib/credits.functions";
import { creditLabel } from "@/lib/credits";
import { AnalysisCreditBadge } from "@/components/AnalysisCreditBadge";
import { useAuth } from "@/hooks/use-auth";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { supabase } from "@/integrations/supabase/client";




export const Route = createFileRoute("/analyse")({ component: AnalysePage });



type Msg = { role: "user" | "agent"; text: string; symbol?: string; query?: string };

function AiCommentary({ query, symbol }: { query: string; symbol?: string }) {
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
          ? `Der Nutzer fragt nach ${symbol}. Liefere eine kompakte, frische Einschätzung (max. 8 Sätze) — variiere Einstieg, beziehe Memory & Feedback ein, keine Wiederholung früherer Antworten.`
          : "Beantworte die Nutzerfrage kompakt und variantenreich.";
        const res = await fetch("/api/public/agent-chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: [
              { role: "system", content: sys },
              { role: "user", content: query },
            ],
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
  }, [query, symbol]);

  if (error) {
    return <div className="rounded-lg border border-bear/30 bg-bear/5 p-3 text-xs text-bear">KI-Kommentar fehlgeschlagen: {error}</div>;
  }
  if (!text && !done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        ARIA denkt nach …
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm leading-relaxed whitespace-pre-wrap">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">ARIA · KI-Einschätzung</div>
      {text}
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

  // KI-Tracking läuft weiterhin nur für eingeloggte Nutzer
  // (siehe useEffect unten)
  return (
    <AgentAnalysisView
      symbol={symbol}
      decision={decision}
      sig={sig}
      indicators={indicators}
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
  decision,
  sig,
  indicators,
  regime,
  scenarioTag,
  user,
  record,
  userQuery,
}: {
  symbol: string;
  decision: ReturnType<typeof buildDecision>;
  sig: ReturnType<typeof scoreIndicators>;
  indicators: NonNullable<ReturnType<typeof useAnalysis>["indicators"]>;
  regime: ReturnType<typeof detectRegime>;
  scenarioTag: string;
  user: ReturnType<typeof useAuth>["user"];
  record: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  userQuery: string;
}) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, scenarioTag, regime, sig.verdict, user?.id]);

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
    const reply: Msg = sym
      ? { role: "agent", text: "", symbol: sym }
      : { role: "agent", text: "Kein bekanntes Symbol erkannt. Versuch's mit einem Ticker (AAPL, NVDA, SAP) oder einem Namen (Apple, Siemens, DAX)." };
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
            <h1 className="text-2xl font-bold tracking-tight">Analyse-Agent</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              LIVE
            </span>
            <AnalysisCreditBadge />
          </div>

          <p className="text-sm text-muted-foreground">Dein statistischer Wall-Street-Broker. Klare Urteile, datengetrieben.</p>
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
                  <AgentResponse symbol={m.symbol} />
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

