import { createFileRoute } from "@tanstack/react-router";
import { requireUserId, consumeCreditOrReject } from "@/lib/api-auth.server";

const SYSTEM_DE = `Du bist ein freundlicher Finanz-Tutor für absolute Anfänger.
Erkläre Trading-/Analyse-Konzepte in EINFACHER, klarer deutscher Sprache.

Regeln:
- Kein Fachjargon ohne sofortige Übersetzung
- Kurze Sätze, freundlicher Ton
- Strukturiere die Antwort GENAU in diesen Abschnitten (Markdown-Überschriften ##):
  ## Was ist das?
  ## Warum ist das wichtig?
  ## Wie nutzen Trader es?
  ## Bullisch vs. Bärisch
  ## Risiken & Grenzen
- Verwende Wahrscheinlichkeits-Sprache ("eher", "tendiert", "Wahrscheinlichkeit"), KEINE Gewinn-Garantien
- Erkläre IMMER beide Seiten (bullisch UND bärisch)
- Maximal 250 Wörter Gesamtlänge
- Ende mit einem Satz Hinweis: "Keine Anlageberatung — nur Bildung."`;

const SYSTEM_EN = `You are a friendly finance tutor for absolute beginners.
Explain trading / analysis concepts in SIMPLE, clear English.

Rules:
- No jargon without an immediate plain-language translation
- Short sentences, friendly tone
- Structure the answer EXACTLY in these sections (Markdown ## headings):
  ## What is it?
  ## Why does it matter?
  ## How do traders use it?
  ## Bullish vs. Bearish
  ## Risks & Limits
- Use probability language ("tends to", "likely", "probability"), NEVER profit guarantees
- ALWAYS explain BOTH sides (bullish AND bearish)
- Maximum 250 words total
- End with one note: "Not investment advice — for education only."`;

export const Route = createFileRoute("/api/public/explain-concept")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        try {
          const auth = await requireUserId(request);
          if (auth instanceof Response) return auth;
          const creditReject = await consumeCreditOrReject(auth, "EXPLAIN");
          if (creditReject) return creditReject;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "AI gateway nicht konfiguriert." }, { status: 500 });
          }
          const body = (await request.json()) as { topic?: string; context?: string; lang?: string };
          const topic = (body.topic || "").toString().slice(0, 200);
          const context = (body.context || "").toString().slice(0, 800);
          const lang = body.lang === "en" ? "en" : "de";
          if (!topic) {
            return Response.json({ error: lang === "en" ? "No topic provided." : "Kein Thema angegeben." }, { status: 400 });
          }

          const userMsg = lang === "en"
            ? (context
                ? `Explain for a beginner: "${topic}".\n\nCurrent context: ${context}`
                : `Explain for a beginner: "${topic}".`)
            : (context
                ? `Erkläre für einen Anfänger: "${topic}".\n\nAktueller Kontext: ${context}`
                : `Erkläre für einen Anfänger: "${topic}".`);

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: lang === "en" ? SYSTEM_EN : SYSTEM_DE },
                { role: "user", content: userMsg },
              ],
            }),
          });

          if (!upstream.ok) {
            if (upstream.status === 429) return Response.json({ error: "Zu viele Anfragen — bitte kurz warten." }, { status: 429 });
            if (upstream.status === 402) return Response.json({ error: "AI-Credits aufgebraucht." }, { status: 402 });
            return Response.json({ error: "AI-Dienst nicht erreichbar." }, { status: 502 });
          }
          const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const content = data.choices?.[0]?.message?.content ?? "";
          return Response.json({ content });
        } catch (e) {
          console.error("explain-concept error", e);
          return Response.json({ error: "Interner Fehler" }, { status: 500 });
        }
      },
    },
  },
});
