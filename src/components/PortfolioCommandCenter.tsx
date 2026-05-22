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

type Tab = "manual" | "photo" | "ai";

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
            Manuell · Foto-Import · KI-Assistent — alles in einem
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {positions.length} / {max === Infinity ? "∞" : max}
          {tier === "free" && " · Free"}
        </div>
      </header>

      {/* Tabs */}
      <div className="relative flex flex-wrap items-center gap-1 border-b border-border/70 bg-background/40 px-2">
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")} icon={<KeyboardIcon className="h-3.5 w-3.5" />}>
          Manuell
        </TabButton>
        <TabButton active={tab === "photo"} onClick={() => setTab("photo")} icon={<Camera className="h-3.5 w-3.5" />}>
          Foto-Import
          <span className="ml-1.5 rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
            Neu
          </span>
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
        {tab === "manual" && <ManualPanel atLimit={atLimit} tier={tier} />}
        {tab === "photo" && <PhotoImportPanel atLimit={atLimit} />}
        {tab === "ai" && <AiPanel />}
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

/* =========================================================================
   PHOTO IMPORT PANEL — upload screenshot/photo → AI extracts positions
   ========================================================================= */

type Extracted = {
  symbol: string;
  name?: string;
  qty: number;
  entry: number;
  side: "LONG" | "SHORT";
  date?: string;
  currency?: string;
  confidence: number;
  notes?: string;
};

type DraftRow = Extracted & { id: string; enabled: boolean };

const MAX_FILES = 5;
const MAX_FILE_BYTES = 12 * 1024 * 1024; // original file limit before optimization
const TARGET_UPLOAD_BYTES = 1.8 * 1024 * 1024;
const EXTRACT_TIMEOUT_MS = 24_000;

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? 0 : Math.floor((dataUrl.length - comma - 1) * 0.75);
}

function blobToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    r.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Bild konnte nicht optimiert werden"))), "image/jpeg", quality);
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bildformat konnte nicht gelesen werden.")); };
    img.src = url;
  });
}

async function optimizeImageFile(file: File): Promise<string> {
  const source = await createImageBitmap(file).catch(() => loadImageElement(file));
  const settings = [
    { maxEdge: 2200, quality: 0.82 },
    { maxEdge: 1800, quality: 0.76 },
    { maxEdge: 1500, quality: 0.7 },
    { maxEdge: 1200, quality: 0.66 },
  ];

  try {
    for (let i = 0; i < settings.length; i++) {
      const { maxEdge, quality } = settings[i];
      const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Bild konnte nicht verarbeitet werden");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      const dataUrl = await blobToDataUrl(await canvasToBlob(canvas, quality));
      if (dataUrlBytes(dataUrl) <= TARGET_UPLOAD_BYTES || i === settings.length - 1) return dataUrl;
    }
  } finally {
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close();
  }

  throw new Error("Bild konnte nicht optimiert werden");
}

function PhotoImportPanel({ atLimit }: { atLimit: boolean }) {
  const { add } = usePortfolio();
  const [files, setFiles] = useState<{ id: string; file: File; url: string }[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) {
      toast.error("Bitte Bilddateien (JPG/PNG) auswählen.");
      return;
    }
    const room = MAX_FILES - files.length;
    const accepted: { id: string; file: File; url: string }[] = [];
    for (const f of incoming.slice(0, room)) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: zu groß (max. 6 MB)`);
        continue;
      }
      try {
        const url = await optimizeImageFile(f);
        accepted.push({ id: crypto.randomUUID(), file: f, url });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lesefehler");
      }
    }
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
    if (incoming.length > room) toast.warning(`Maximal ${MAX_FILES} Bilder.`);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function extract() {
    if (files.length === 0 || loading) return;
    setLoading(true);
    setDrafts([]);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
      const res = await fetch("/api/public/portfolio-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ images: files.map((f) => f.url) }),
      });
      window.clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Fehler ${res.status}`);

      const positions = Array.isArray(data?.positions) ? (data.positions as Extracted[]) : [];
      if (positions.length === 0) {
        toast.info("Keine Positionen erkannt. Versuch ein klareres Bild.");
      } else {
        toast.success(`${positions.length} ${positions.length === 1 ? "Position" : "Positionen"} erkannt`);
      }
      setDrafts(positions.map((p) => ({ ...p, id: crypto.randomUUID(), enabled: true })));
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.error("Analyse dauert zu lange. Bitte nutze einen enger zugeschnittenen Screenshot und versuch es erneut.");
      } else {
        toast.error(e instanceof Error ? e.message : "Unbekannter Fehler");
      }
    } finally {
      setLoading(false);
    }
  }

  function patch(id: string, p: Partial<DraftRow>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...p } : d)));
  }

  function importAll() {
    const toAdd = drafts.filter((d) => d.enabled);
    if (toAdd.length === 0) {
      toast.error("Keine Position ausgewählt.");
      return;
    }
    if (atLimit) {
      toast.error("Positionslimit erreicht.");
      return;
    }
    let n = 0;
    for (const d of toAdd) {
      if (!d.symbol || d.qty <= 0 || d.entry <= 0) continue;
      add({ symbol: d.symbol.toUpperCase(), qty: d.qty, entry: d.entry, side: d.side });
      n++;
    }
    toast.success(`${n} ${n === 1 ? "Position übernommen" : "Positionen übernommen"} ✓`);
    setDrafts([]);
    setFiles([]);
  }

  return (
    <div className="p-5 space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          dragOver
            ? "border-primary/70 bg-primary/[0.07]"
            : "border-border/70 bg-background/40 hover:border-primary/40 hover:bg-background/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-violet-accent/20 ring-1 ring-primary/30">
          <Camera className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-3 text-sm font-semibold">Screenshot oder Foto hochladen</div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Broker-App, Depotauszug, Excel-Liste, handschriftliche Notiz — die KI liest Ticker, Stückzahl und Einstandskurs aus.
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          Drag & Drop oder Klick · max. {MAX_FILES} Bilder · wird vor dem Senden automatisch optimiert
        </p>
      </div>

      {/* Thumbnails */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div key={f.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted">
              <img src={f.url} alt={f.file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-rose-400"
                aria-label="Entfernen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={extract}
            disabled={loading}
            className="inline-flex h-20 items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-violet-accent px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analysiere…" : "Positionen erkennen"}
          </button>
        </div>
      )}

      {/* Extracted drafts */}
      {drafts.length > 0 && (
        <div className="rounded-xl border border-border bg-background/40">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-primary" />
              Erkannte Positionen
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {drafts.filter((d) => d.enabled).length} / {drafts.length}
              </span>
            </div>
            <button
              type="button"
              onClick={importAll}
              disabled={atLimit}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Ausgewählte übernehmen
            </button>
          </div>
          <div className="divide-y divide-border/60">
            {drafts.map((d) => (
              <DraftRowItem key={d.id} row={d} onPatch={(p) => patch(d.id, p)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftRowItem({ row, onPatch }: { row: DraftRow; onPatch: (p: Partial<DraftRow>) => void }) {
  const lowConf = row.confidence < 0.6;
  return (
    <div className={`flex flex-wrap items-center gap-2 px-3 py-2.5 text-xs ${row.enabled ? "" : "opacity-40"}`}>
      <input
        type="checkbox"
        checked={row.enabled}
        onChange={(e) => onPatch({ enabled: e.target.checked })}
        className="h-4 w-4 accent-primary"
      />
      <input
        value={row.symbol}
        onChange={(e) => onPatch({ symbol: e.target.value.toUpperCase() })}
        className="w-20 rounded border border-input bg-background px-2 py-1 font-semibold tabular-nums focus:border-primary/60 focus:outline-none"
      />
      <input
        type="number" step="any" min={0} value={row.qty}
        onChange={(e) => onPatch({ qty: parseFloat(e.target.value) || 0 })}
        className="w-16 rounded border border-input bg-background px-2 py-1 text-right tabular-nums focus:border-primary/60 focus:outline-none"
        placeholder="Menge"
      />
      <span className="text-muted-foreground">×</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
        <input
          type="number" step="any" min={0} value={row.entry}
          onChange={(e) => onPatch({ entry: parseFloat(e.target.value) || 0 })}
          className="w-24 rounded border border-input bg-background pl-5 pr-2 py-1 text-right tabular-nums focus:border-primary/60 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded border border-input text-[10px] font-semibold">
        {(["LONG", "SHORT"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPatch({ side: s })}
            className={`px-2 py-1 transition-colors ${
              row.side === s
                ? s === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {row.name && <span className="hidden sm:inline max-w-[140px] truncate text-[10px] text-muted-foreground">{row.name}</span>}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            lowConf
              ? "bg-amber-500/15 text-amber-400"
              : "bg-emerald-500/15 text-emerald-400"
          }`}
          title={`Confidence ${(row.confidence * 100).toFixed(0)}%`}
        >
          {lowConf && <AlertTriangle className="h-3 w-3" />}
          {(row.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
