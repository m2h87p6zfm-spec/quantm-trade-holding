import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRADE_SYSTEM = `Du bist ein spezialisierter Trading-Erklärungs-Agent für die Funktion "Explain my trade".
Du arbeitest AUSSCHLIESSLICH mit Trading-Kontext — keine allgemeinen Gespräche, keine fremden Themen.

REGELN:
- Antworte immer auf Deutsch, klar, ruhig, strukturiert.
- Nutze die gesamte Chat-History dieses Trade-Chats. Erkenne Muster, frühere Fehler und erfolgreiche Strategien und beziehe sie konkret ein.
- Erkläre JEDEN Fachbegriff sofort kurz in Klammern. Beispiele:
  RSI (zeigt überkaufte/überverkaufte Phasen), MACD (Trend-/Momentum-Indikator),
  Drawdown (zwischenzeitlicher Verlust vom Hoch), Volatilität (Schwankungsbreite).
- KEINE Anlageberatung, keine Kursziele, keine Garantien — Wahrscheinlichkeits-Sprache.

PFLICHT-STRUKTUR jeder Antwort (Markdown-Überschriften ##, exakt in dieser Reihenfolge):
## 1. Trade-Zusammenfassung
Was wurde gemacht — 2–3 Sätze, konkret (Wertpapier, Richtung, Zeitraum).

## 2. Marktanalyse
Warum sah der Markt damals so aus? Makro, Sektor, Sentiment.

## 3. Logik dahinter
Technische und/oder fundamentale Gründe, die diesen Trade plausibel machten — oder nicht.

## 4. Risiko-Einschätzung
Niedrig / Mittel / Hoch + 1–2 Sätze Begründung (Liquidität, Volatilität, Konzentration, Timing).

## 5. Ergebnisbewertung
Nur wenn Ergebnis bekannt: gut / schlecht / neutral + Lernpunkt für künftige Trades.
Wenn noch offen: kurzer Status statt Bewertung.

Antwort kompakt halten (max. ~500 Wörter). Schließe mit einer Zeile:
"Hinweis: Keine Anlageberatung — Bildungszweck."`;

const sendSchema = z.object({
  sessionId: z.string().uuid().nullable(),
  message: z.string().min(1).max(4000),
  // Optional: initial trade context to seed a new session
  seed: z
    .object({
      title: z.string().min(1).max(120),
      symbol: z.string().min(1).max(16),
      summary: z.record(z.string(), z.unknown()).optional(),
      analysisMarkdown: z.string().max(20000).optional(),
    })
    .optional()
    .nullable(),
});

export const sendTradeChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Resolve session (create if needed; optionally seed with initial analysis)
    let sessionId = data.sessionId;
    if (!sessionId) {
      const seedTitle = data.seed?.title ?? "Neuer Trade-Chat";
      const seedSymbol = data.seed?.symbol ?? null;
      const { data: sess, error: sErr } = await supabase
        .from("trade_chat_sessions")
        .insert({
          user_id: userId,
          title: seedTitle.slice(0, 120),
          symbol: seedSymbol,
          trade_summary: data.seed?.summary ?? null,
        })
        .select("id")
        .single();
      if (sErr || !sess) throw new Error(sErr?.message || "Session konnte nicht erstellt werden");
      sessionId = sess.id;

      // Seed initial assistant analysis as the first message
      if (data.seed?.analysisMarkdown) {
        await supabase.from("trade_chat_messages").insert({
          session_id: sessionId,
          user_id: userId,
          role: "assistant",
          content: data.seed.analysisMarkdown,
        });
      }
    }

    // 2. Persist user message
    const { error: uErr } = await supabase.from("trade_chat_messages").insert({
      session_id: sessionId,
      user_id: userId,
      role: "user",
      content: data.message,
    });
    if (uErr) throw new Error(uErr.message);

    // 3. Load full history for this trade-chat (separate context!)
    const { data: hist, error: hErr } = await supabase
      .from("trade_chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(60);
    if (hErr) throw new Error(hErr.message);

    // 4. Get session metadata for context anchoring
    const { data: meta } = await supabase
      .from("trade_chat_sessions")
      .select("title, symbol, trade_summary")
      .eq("id", sessionId)
      .single();

    const contextHeader = meta
      ? `[TRADE-KONTEXT] ${meta.title}${meta.symbol ? ` (${meta.symbol})` : ""}\n` +
        (meta.trade_summary ? `Stammdaten: ${JSON.stringify(meta.trade_summary).slice(0, 1200)}` : "")
      : "";

    // 5. Call Lovable AI
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway nicht konfiguriert");

    const messages = [
      { role: "system", content: TRADE_SYSTEM + (contextHeader ? `\n\n${contextHeader}` : "") },
      ...(hist ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`AI ${r.status}: ${t.slice(0, 160)}`);
    }
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = j.choices?.[0]?.message?.content ?? "";
    if (!reply) throw new Error("Leere AI-Antwort");

    // 6. Persist assistant reply
    const { error: aErr } = await supabase.from("trade_chat_messages").insert({
      session_id: sessionId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });
    if (aErr) throw new Error(aErr.message);

    return { sessionId, reply };
  });

export const listTradeSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("trade_chat_sessions")
      .select("id, title, symbol, updated_at, created_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });

export const getTradeMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("trade_chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: meta } = await supabase
      .from("trade_chat_sessions")
      .select("id, title, symbol, trade_summary, updated_at")
      .eq("id", data.sessionId)
      .single();
    return { messages: rows ?? [], session: meta ?? null };
  });

export const deleteTradeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("trade_chat_sessions")
      .delete()
      .eq("id", data.sessionId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
