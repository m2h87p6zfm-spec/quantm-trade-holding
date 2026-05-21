import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/agent")({
  component: AgentPage,
  head: () => ({
    meta: [
      { title: "AI Analyst — Apex Markets" },
      { name: "description", content: "AI-gestützter Markt-Stratege: stelle Fragen zu Charts, Setups, Sektor-Rotation und Risiken." },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Wie ist die aktuelle Lage im Tech-Sektor und was treibt NVDA?",
  "Erkläre die Mean-Reversion-Strategie und wann sie historisch funktioniert.",
  "Vergleiche Gold und US-Treasuries als Absicherung bei Stagflation.",
  "Worauf achtet ein Hedge-Fund-Analyst bei den NVDA-Quartalszahlen?",
];

function AgentPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantText = "";
    const pushChunk = (delta: string) => {
      assistantText += delta;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m));
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    try {
      const res = await fetch("/api/public/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Fehler ${res.status}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content as string | undefined;
            if (c) pushChunk(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || loading) return;
    send(t);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-4xl flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 via-gold/20 to-violet-accent/20 ring-1 ring-primary/30">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Apex AI Analyst</h1>
          <p className="text-xs text-muted-foreground">Institutioneller Markt-Stratege — gestützt auf Lovable AI.</p>
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-border bg-card/40 p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Stelle eine Frage oder wähle einen Startpunkt:</p>
            <div className="grid gap-2 md:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-md border border-border bg-background/60 p-3 text-left text-sm hover:border-primary/60 hover:bg-muted/30">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">Apex denkt nach…</div>}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frage den Analysten…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Send className="h-4 w-4" /> Senden
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {content}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
