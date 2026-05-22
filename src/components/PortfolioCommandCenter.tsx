import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send, Bot, User as UserIcon, Loader2, Sparkles, Search, Plus,
  Wallet, Wand2, KeyboardIcon, Camera, Image as ImageIcon, X, Check, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { usePortfolio, type Position } from "@/lib/portfolio";
import { PRODUCTS, findProduct } from "@/lib/products";
import { useQuote } from "@/lib/useMarketData";
import { usePortfolioLimit } from "@/lib/featureGate";

/* ---------- shared types ---------- */

type Msg = { role: "user" | "assistant"; content: string };
type AddAction = { type: "ADD"; symbol: string; qty: number; entry: number; side?: "LONG" | "SHORT"; date?: string };
type RemoveAction = { type: "REMOVE"; symbol: string };
type Action = AddAction | RemoveAction;

const ACTION_RE = /```action\s*([\s\S]*?)```/gi;

function extractActions(text: string): { cleaned: string; actions: Action[] } {
  const actions: Action[] = [];
  const cleaned = text.replace(ACTION_RE, (_, json: string) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed && typeof parsed === "object" && (parsed.type === "ADD" || parsed.type === "REMOVE")) {
        actions.push(parsed as Action);
      }
    } catch { /* ignore */ }
    return "";
  }).trim();
  return { cleaned, actions };
}

/* ---------- top-level ---------- */

type Tab = "manual" | "ai";

export function PortfolioCommandCenter() {
  const [tab, setTab] = useState<Tab>("manual");
  const { positions } = usePortfolio();
  const { max, atLimit, tier } = usePortfolioLimit(positions.length);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-primary/10">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-violet-accent/10 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-wrap items-center gap-3 border-b border-border/70 bg-gradient-to-r from-primary/[0.08] via-card to-violet-accent/[0.06] px-5 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            Portfolio Command Center
            <Sparkles className="h-3 w-3 text-gold" />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Manuell präzise · KI-gestützt · Live-Kurse & Risiko in einem
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {positions.length} / {max === Infinity ? "∞" : max}
          {tier === "free" && " · Free"}
        </div>
      </header>

      {/* Tabs */}
      <div className="relative flex items-center gap-1 border-b border-border/70 bg-background/40 px-2">
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")} icon={<KeyboardIcon className="h-3.5 w-3.5" />}>
          Manuell hinzufügen
        </TabButton>
        <TabButton active={tab === "ai"} onClick={() => setTab("ai")} icon={<Wand2 className="h-3.5 w-3.5" />}>
          KI-Assistent
          <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
            PORTFOLIO
          </span>
        </TabButton>
      </div>

      {/* Body */}
      <div className="relative">
        {tab === "manual" ? <ManualPanel atLimit={atLimit} tier={tier} /> : <AiPanel />}
      </div>
    </section>
  );
}

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t bg-gradient-to-r from-primary via-primary to-violet-accent" />
      )}
    </button>
  );
}

/* =========================================================================
   MANUAL PANEL — Add position form
   ========================================================================= */

function ManualPanel({ atLimit, tier }: { atLimit: boolean; tier: string }) {
  const { add } = usePortfolio();
  const { guard } = usePortfolioLimit(0); // guard reuses same logic
  const [symbolInput, setSymbolInput] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [qty, setQty] = useState<number>(10);
  const [entry, setEntry] = useState<number>(0);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [showPicker, setShowPicker] = useState(false);

  const selectedProduct = findProduct(selectedSymbol);
  const selectedQuote = useQuote(selectedSymbol, 30_000);

  const searchResults = useMemo(() => {
    const q = symbolInput.trim().toLowerCase();
    if (!q) return PRODUCTS.slice(0, 12);
    return PRODUCTS.filter(
      (p) => p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [symbolInput]);

  function selectSymbol(sym: string) {
    setSelectedSymbol(sym);
    setSymbolInput("");
    setShowPicker(false);
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const finalEntry = entry > 0 ? entry : (selectedQuote.data?.c ?? 0);
    if (!selectedSymbol || qty <= 0 || finalEntry <= 0) {
      toast.error("Bitte Symbol, Menge und Einstandskurs angeben.");
      return;
    }
    if (!guard()) return;
    add({ symbol: selectedSymbol.toUpperCase(), qty, entry: finalEntry, side });
    toast.success(`${side} ${qty} × ${selectedSymbol.toUpperCase()} @ ${finalEntry.toFixed(2)} hinzugefügt`);
    setEntry(0);
  }

  const livePrice = selectedQuote.data?.c;

  return (
    <div className="p-5">
      {atLimit && tier === "free" && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-400/90">
          <span>Limit erreicht — upgrade für unbegrenzte Positionen.</span>
          <a href="/preise" className="font-semibold text-primary hover:underline">
            Pro freischalten →
          </a>
        </div>
      )}

      <form onSubmit={onAdd} className="grid gap-3 md:grid-cols-[2fr,90px,140px,110px,auto]">
        {/* Symbol Picker */}
        <div className="relative">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Symbol / Firma</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={symbolInput || (showPicker ? "" : `${selectedSymbol} · ${selectedProduct?.name ?? ""}`)}
              onChange={(e) => { setSymbolInput(e.target.value); setShowPicker(true); }}
              onFocus={() => { setShowPicker(true); setSymbolInput(""); }}
              onBlur={() => setTimeout(() => setShowPicker(false), 150)}
              placeholder="z. B. AAPL, Apple, Vertiv…"
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          {showPicker && searchResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-xl">
              {searchResults.map((p) => (
                <button
                  key={p.symbol}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectSymbol(p.symbol); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{p.symbol}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{p.name}</div>
                  </div>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">
                    {p.sector} · {p.region}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Menge</label>
          <input
            type="number" min={0} step="any" value={qty}
            onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Einstand</span>
            {livePrice && entry === 0 && (
              <button
                type="button"
                onClick={() => setEntry(livePrice)}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case text-primary hover:bg-primary/20"
              >
                live € {livePrice.toFixed(2)}
              </button>
            )}
          </label>
          <input
            type="number" min={0} step="any" value={entry || ""}
            onChange={(e) => setEntry(parseFloat(e.target.value) || 0)}
            placeholder={livePrice ? livePrice.toFixed(2) : "0.00"}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Richtung</label>
          <div className="grid grid-cols-2 overflow-hidden rounded-md border border-input">
            {(["LONG", "SHORT"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`px-2 py-2 text-xs font-semibold transition-colors ${
                  side === s
                    ? s === "LONG"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit" disabled={atLimit}
          className="inline-flex items-center justify-center gap-1.5 self-end rounded-md bg-gradient-to-r from-primary to-violet-accent px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <Plus className="h-4 w-4" /> Hinzufügen
        </button>
      </form>
    </div>
  );
}

/* =========================================================================
   AI PANEL — Chat
   ========================================================================= */

const QUICK_PROMPTS = [
  "Zeig mein Portfolio",
  "Was ist mein Risiko?",
  "Welche Aktie läuft am besten?",
  "Füge AAPL hinzu",
];

function AiPanel() {
  const { positions, add, remove } = usePortfolio();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        'Willkommen bei **PORTFOLIO** 💼\n\nIch verwalte dein Depot per Sprache, berechne Kennzahlen und führe Risiko-Checks durch.\n\n_Tipp: nutze die Vorschläge unten oder schreib einfach „Füge NVDA hinzu"._',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Position[]>(positions);

  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const applyActions = useCallback((actions: Action[]) => {
    for (const a of actions) {
      if (a.type === "ADD") {
        const sym = a.symbol.toUpperCase();
        if (!a.qty || !a.entry || a.qty <= 0 || a.entry <= 0) {
          toast.error(`${sym}: ungültige Menge oder Preis`);
          continue;
        }
        add({ symbol: sym, qty: a.qty, entry: a.entry, side: a.side === "SHORT" ? "SHORT" : "LONG" });
        toast.success(`${sym} hinzugefügt: ${a.qty} × € ${a.entry.toFixed(2)}`);
      } else if (a.type === "REMOVE") {
        const sym = a.symbol.toUpperCase();
        const target = positionsRef.current.find((p) => p.symbol.toUpperCase() === sym);
        if (!target) { toast.error(`${sym} nicht im Portfolio gefunden`); continue; }
        remove(target.id);
        toast.success(`${sym} entfernt`);
      }
    }
  }, [add, remove]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const payload = {
        messages: next,
        positions: positionsRef.current.map((p) => ({
          symbol: p.symbol, name: findProduct(p.symbol)?.name,
          qty: p.qty, entry: p.entry, side: p.side, openedAt: p.openedAt,
        })),
      };

      const res = await fetch("/api/public/portfolio-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          const p = line.slice(5).trim();
          if (!p || p === "[DONE]") continue;
          try {
            const json = JSON.parse(p);
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

      const { cleaned, actions } = extractActions(acc);
      if (actions.length > 0) {
        applyActions(actions);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: cleaned || "✓ Erledigt." };
          return copy;
        });
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

  return (
    <div className="flex h-[460px] flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                  isUser
                    ? "bg-muted text-muted-foreground ring-border"
                    : "bg-gradient-to-br from-primary/30 to-violet-accent/30 text-primary ring-primary/30"
                }`}
              >
                {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  isUser
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border border-border/60 bg-muted/40 text-foreground"
                }`}
              >
                {m.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:text-xs [&_pre]:bg-background/50 [&_pre]:text-xs">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : loading && i === messages.length - 1 ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 bg-background/30 px-5 py-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              disabled={loading}
              className="rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-border/70 bg-background/40 p-3"
      >
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/70" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder='Frag PORTFOLIO… z. B. "Füge 5 NVDA hinzu"'
            className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2.5 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-accent text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          aria-label="Senden"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
