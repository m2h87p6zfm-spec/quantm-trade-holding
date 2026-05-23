import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare,
  Send,
  Plus,
  Loader2,
  Trash2,
  Sparkles,
  History,
  Microscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  sendTradeChatMessage,
  listTradeSessions,
  getTradeMessages,
  deleteTradeSession,
} from "@/lib/trade-chat.functions";

type Seed = {
  title: string;
  symbol: string;
  summary?: Record<string, unknown>;
  analysisMarkdown?: string;
} | null;

export function TradeChatPanel({
  initialSessionId,
  seedOnFirstMessage,
  onSessionChange,
}: {
  initialSessionId?: string | null;
  /** When set, the first sent message also creates a session seeded with this trade context. */
  seedOnFirstMessage?: Seed;
  onSessionChange?: (sessionId: string | null) => void;
}) {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const listFn = useServerFn(listTradeSessions);
  const getFn = useServerFn(getTradeMessages);
  const sendFn = useServerFn(sendTradeChatMessage);
  const delFn = useServerFn(deleteTradeSession);

  const sessions = useQuery({
    queryKey: ["trade-sessions"],
    queryFn: () => listFn(),
    staleTime: 10_000,
  });

  const messages = useQuery({
    queryKey: ["trade-messages", sessionId],
    queryFn: () => (sessionId ? getFn({ data: { sessionId } }) : Promise.resolve({ messages: [], session: null })),
    enabled: !!sessionId,
  });

  const send = useMutation({
    mutationFn: async (text: string) => {
      const res = await sendFn({
        data: {
          sessionId,
          message: text,
          seed: !sessionId && seedOnFirstMessage ? seedOnFirstMessage : null,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      if (!sessionId) {
        setSessionId(res.sessionId);
        onSessionChange?.(res.sessionId);
      }
      qc.invalidateQueries({ queryKey: ["trade-sessions"] });
      qc.invalidateQueries({ queryKey: ["trade-messages", res.sessionId] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { sessionId: id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["trade-sessions"] });
      if (id === sessionId) {
        setSessionId(null);
        onSessionChange?.(null);
      }
    },
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.data?.messages.length, send.isPending]);

  const msgs = messages.data?.messages ?? [];
  const sessList = sessions.data?.sessions ?? [];

  const canSend = input.trim().length > 0 && !send.isPending;

  function submit() {
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    send.mutate(text);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sidebar: previous trade chats */}
      <aside className="rounded-2xl border border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <History className="h-3.5 w-3.5 text-primary" /> Trade-Chats
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setSessionId(null);
              onSessionChange?.(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ScrollArea className="h-[420px]">
          <ul className="space-y-1 p-2">
            {sessList.length === 0 && (
              <li className="px-2 py-4 text-center text-[11px] text-muted-foreground">
                Noch keine Trade-Chats. Frag etwas zu deinem aktuellen Trade.
              </li>
            )}
            {sessList.map((s) => {
              const active = s.id === sessionId;
              return (
                <li key={s.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition",
                      active ? "bg-primary/15 text-foreground" : "hover:bg-accent/50 text-muted-foreground",
                    )}
                  >
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => {
                        setSessionId(s.id);
                        onSessionChange?.(s.id);
                      }}
                    >
                      <div className="truncate font-medium">
                        {s.symbol ? <span className="text-primary">{s.symbol}</span> : null}{" "}
                        {s.title}
                      </div>
                      <div className="text-[10px] opacity-70">
                        {new Date(s.updated_at).toLocaleDateString("de-DE")}
                      </div>
                    </button>
                    <button
                      title="Trade-Chat löschen"
                      className="opacity-0 group-hover:opacity-100 transition hover:text-bear"
                      onClick={() => del.mutate(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </aside>

      {/* Chat thread */}
      <section className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card/40">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-primary" />
          {sessionId ? messages.data?.session?.title ?? "Trade-Chat" : "Neuer Trade-Chat"}
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> isoliert vom Analyse-Agent
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {msgs.length === 0 && !send.isPending && (
            <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2">
              <Microscope className="h-6 w-6 text-primary" />
              <div className="max-w-sm">
                Stell eine Folgefrage zu deinem Trade — z. B. „Warum war das Risiko mittel?", „Was hätte ich besser machen können?" oder „Vergleiche das mit meinem letzten Trade".
              </div>
            </div>
          )}
          {msgs.map((m) => (
            <ChatBubble key={m.id} role={m.role as "user" | "assistant"} content={m.content} />
          ))}
          {send.isPending && (
            <ChatBubble role="assistant" content="" loading />
          )}
          {send.isError && (
            <div className="rounded-md border border-bear/40 bg-bear/10 px-3 py-2 text-xs text-bear">
              Fehler: {(send.error as Error).message}
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Frage zu diesem Trade stellen…"
              rows={2}
              className="min-h-[44px] resize-none"
            />
            <Button onClick={submit} disabled={!canSend} size="icon" className="h-11 w-11 shrink-0">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Enter = senden · Shift+Enter = Zeilenumbruch · Antwortet immer in der 5-Punkt-Struktur.
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatBubble({
  role,
  content,
  loading,
}: {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground",
        )}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> denkt nach…
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-h2:text-sm prose-h2:font-semibold prose-p:my-1.5 prose-li:my-0.5">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
