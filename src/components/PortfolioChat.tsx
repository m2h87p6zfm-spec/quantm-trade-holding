import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User as UserIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePortfolio, type Position } from "@/lib/portfolio";
import { findProduct } from "@/lib/products";

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

function parseDate(s?: string): number {
  if (!s) return Date.now();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return Date.now();
  return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
}

export function PortfolioChat() {
  const { positions, add, remove } = usePortfolio();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Willkommen bei **PORTFOLIO** 💼\n\nIch helfe dir, dein Aktienportfolio zu verwalten und Kennzahlen zu berechnen.\n\nProbier z. B.:\n- *Füge AAPL hinzu*\n- *Zeig mein Portfolio*\n- *Was ist mein Risiko?*\n- *Welche Aktie läuft am besten?*",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Position[]>(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const applyActions = useCallback(
    (actions: Action[]) => {
      for (const a of actions) {
        if (a.type === "ADD") {
          const sym = a.symbol.toUpperCase();
          if (!a.qty || !a.entry || a.qty <= 0 || a.entry <= 0) {
            toast.error(`${sym}: ungültige Menge oder Preis`);
            continue;
          }
          add({
            symbol: sym,
            qty: a.qty,
            entry: a.entry,
            side: a.side === "SHORT" ? "SHORT" : "LONG",
          });
          toast.success(`${sym} hinzugefügt: ${a.qty} × €${a.entry.toFixed(2)}`);
        } else if (a.type === "REMOVE") {
          const sym = a.symbol.toUpperCase();
          const target = positionsRef.current.find((p) => p.symbol.toUpperCase() === sym);
          if (!target) {
            toast.error(`${sym} nicht im Portfolio gefunden`);
            continue;
          }
          remove(target.id);
          toast.success(`${sym} entfernt`);
        }
      }
    },
    [add, remove],
  );

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const payload = {
        messages: next,
        positions: positionsRef.current.map((p) => ({
          symbol: p.symbol,
          name: findProduct(p.symbol)?.name,
          qty: p.qty,
          entry: p.entry,
          side: p.side,
          openedAt: p.openedAt,
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
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[600px]">
      <div className="border-b border-border px-5 py-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">PORTFOLIO Assistent</div>
          <div className="text-[11px] text-muted-foreground">
            Sprachgesteuerte Verwaltung · Kennzahlen · Risiko-Analyse
          </div>
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
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
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

      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder='z. B. "Füge AAPL hinzu" oder "Zeig mein Portfolio"'
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
