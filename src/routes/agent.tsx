import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageSquarePlus, Send, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/agent")({
  component: AgentPage,
  head: () => ({
    meta: [
      { title: "AI Analyst — Quantm Trade" },
      { name: "description", content: "AI-gestützter Markt-Stratege: stelle Fragen zu Charts, Setups, Sektor-Rotation und Risiken." },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updated_at: string };

const STARTERS = [
  "Wie ist die aktuelle Lage im Tech-Sektor und was treibt NVDA?",
  "Erkläre die Mean-Reversion-Strategie und wann sie historisch funktioniert.",
  "Vergleiche Gold und US-Treasuries als Absicherung bei Stagflation.",
  "Worauf achtet ein Hedge-Fund-Analyst bei den NVDA-Quartalszahlen?",
];

function AgentPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const scroller = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("agent_conversations")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!error && data) setConversations(data as Conversation[]);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for active conversation
  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    const { data, error } = await supabase
      .from("agent_messages")
      .select("role,content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data as Msg[]);
  }, []);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setInput("");
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase.from("agent_conversations").delete().eq("id", id);
    if (error) { toast.error("Löschen fehlgeschlagen"); return; }
    if (activeId === id) newChat();
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, [activeId, newChat]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ensureConversation(firstMsg: string): Promise<string | null> {
    if (activeId) return activeId;
    if (!user) return null;
    const title = firstMsg.slice(0, 60);
    const { data, error } = await supabase
      .from("agent_conversations")
      .insert({ user_id: user.id, title })
      .select("id,title,updated_at")
      .single();
    if (error || !data) { toast.error("Chat konnte nicht gespeichert werden"); return null; }
    setActiveId(data.id);
    setConversations((prev) => [data as Conversation, ...prev]);
    return data.id;
  }

  async function persistMessage(convId: string, role: "user" | "assistant", content: string) {
    if (!user) return;
    await supabase.from("agent_messages").insert({
      conversation_id: convId, user_id: user.id, role, content,
    });
    await supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  }

  async function send(text: string) {
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    const convId = await ensureConversation(text);
    if (convId) persistMessage(convId, "user", text);

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
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/public/agent-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next, sessionId }),
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

      if (convId && assistantText) {
        await persistMessage(convId, "assistant", assistantText);
        loadConversations();
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
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-6xl gap-4 p-4 md:p-6">
      {/* Sidebar: Chat-Historie */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-lg border border-border bg-card/40 p-3 md:flex">
        <button
          onClick={newChat}
          className="mb-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <MessageSquarePlus className="h-4 w-4" /> Neuer Chat
        </button>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Verlauf</div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {!user && <p className="text-xs text-muted-foreground">Melde dich an, um deine Chats zu speichern.</p>}
          {user && conversations.length === 0 && (
            <p className="text-xs text-muted-foreground">Noch keine Chats.</p>
          )}
          {conversations.map((c) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40 ${activeId === c.id ? "bg-muted/60" : ""}`}>
              <button onClick={() => openConversation(c.id)} className="flex-1 truncate text-left">
                {c.title || "Neuer Chat"}
              </button>
              <button
                onClick={() => deleteConversation(c.id)}
                className="opacity-0 transition group-hover:opacity-100"
                title="Löschen"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 via-gold/20 to-violet-accent/20 ring-1 ring-primary/30">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Quantm AI Analyst</h1>
            <p className="text-xs text-muted-foreground">Institutioneller Markt-Stratege — gestützt auf Lovable AI.</p>
          </div>
          <button
            onClick={newChat}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-1.5 text-xs font-medium hover:bg-muted/40 md:hidden"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" /> Neu
          </button>
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
          {messages.map((m, i) => {
            const prevUser = m.role === "assistant" ? [...messages].slice(0, i).reverse().find((x) => x.role === "user")?.content ?? "" : "";
            const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
            const showFeedback = m.role === "assistant" && (!isLastAssistant || !loading) && m.content.length > 0;
            return (
              <Bubble
                key={i}
                role={m.role}
                content={m.content}
                feedback={showFeedback ? <FeedbackButtons sessionId={sessionId} userPrompt={prevUser} assistantMessage={m.content} /> : null}
              />
            );
          })}
          {loading && <div className="text-xs text-muted-foreground animate-pulse">Quantm denkt nach…</div>}
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
    </div>
  );
}

function Bubble({ role, content, feedback }: { role: "user" | "assistant"; content: string; feedback?: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={`flex max-w-[80%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          {content}
        </div>
        {feedback}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
