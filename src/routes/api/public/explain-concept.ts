import { createFileRoute } from "@tanstack/react-router";
import { requireUserId } from "@/lib/api-auth.server";

const SYSTEM = `Du bist ein freundlicher Finanz-Tutor für absolute Anfänger.
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
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "AI gateway nicht konfiguriert." }, { status: 500 });
          }
          const body = (await request.json()) as { topic?: string; context?: string };
          const topic = (body.topic || "").toString().slice(0, 200);
          const context = (body.context || "").toString().slice(0, 800);
          if (!topic) {
            return Response.json({ error: "Kein Thema angegeben." }, { status: 400 });
          }

          const userMsg = context
            ? `Erkläre für einen Anfänger: "${topic}".\n\nAktueller Kontext: ${context}`
            : `Erkläre für einen Anfänger: "${topic}".`;

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEM },
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
          return Response.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
        }
      },
    },
  },
});
