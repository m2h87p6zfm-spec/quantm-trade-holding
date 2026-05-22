import { createFileRoute } from "@tanstack/react-router";

/**
 * Extracts portfolio positions from one or more screenshots / photos
 * (broker app, depot statement, handwritten note, ...).
 *
 * Body: { images: string[] }   // each entry is a data URL (data:image/...;base64,...)
 * Returns: { positions: Extracted[] }
 */

type Extracted = {
  symbol: string;
  name?: string;
  qty: number;
  entry: number;
  side: "LONG" | "SHORT";
  date?: string;          // dd.mm.yyyy
  currency?: string;      // EUR / USD / ...
  confidence: number;     // 0..1
  notes?: string;
};

const SYSTEM = `Du bist ein Vision-Extraktor für Aktien-Portfolios.
Aus jedem hochgeladenen Bild (Broker-App-Screenshot, Depotauszug, Excel, handschriftliche Notiz, etc.)
extrahierst du alle erkennbaren Wertpapier-Positionen.

Regeln:
- Ticker IMMER in Großbuchstaben, ohne Suffix (z. B. "AAPL", "NVDA", "SAP", "ASML"). Wenn nur ein Firmenname zu sehen ist, leite den gängigen Ticker ab (Apple → AAPL, Tesla → TSLA, SAP SE → SAP).
- Menge (qty) als Zahl in Stück.
- Einstandskurs (entry) als Zahl pro Stück. Wenn nur ein Gesamtwert sichtbar ist, teile durch die Menge.
- Side ist "LONG" für gekaufte Aktien, "SHORT" nur wenn das Bild explizit Short-Position / Leerverkauf zeigt.
- Datum (date) im Format dd.mm.yyyy, nur wenn klar erkennbar.
- confidence zwischen 0 und 1 – wie sicher bist du dir? Bei unsicheren Werten lieber < 0.6 setzen.
- Wenn das Bild KEINE Positionen enthält (z. B. Foto einer Katze), gib eine leere Liste zurück.
- Niemals halluzinieren. Im Zweifel weglassen.`;

const EXTRACT_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_positions",
    description: "Gibt die aus dem Bild extrahierten Portfolio-Positionen zurück.",
    parameters: {
      type: "object",
      properties: {
        positions: {
          type: "array",
          description: "Liste der erkannten Positionen. Leer, wenn nichts erkannt wurde.",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string", description: "Ticker-Symbol in Großbuchstaben" },
              name: { type: "string", description: "Optionaler Firmenname" },
              qty: { type: "number", description: "Anzahl Stücke" },
              entry: { type: "number", description: "Einstandskurs pro Stück" },
              side: { type: "string", enum: ["LONG", "SHORT"] },
              date: { type: "string", description: "Kaufdatum dd.mm.yyyy" },
              currency: { type: "string", description: "Währung, z. B. EUR / USD" },
              confidence: { type: "number", description: "0..1" },
              notes: { type: "string" },
            },
            required: ["symbol", "qty", "entry", "side", "confidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["positions"],
      additionalProperties: false,
    },
  },
};

const MAX_IMAGES = 5;
const MAX_BYTES_PER_IMAGE = 6 * 1024 * 1024; // 6 MB after base64 decoding

function approxBase64Bytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  if (i < 0) return 0;
  const b64 = dataUrl.slice(i + 1);
  return Math.floor((b64.length * 3) / 4);
}

export const Route = createFileRoute("/api/public/portfolio-extract")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),

      POST: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });

        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return json({ error: "AI gateway nicht konfiguriert." }, 500);

          const body = (await request.json()) as { images?: string[] };
          const images = Array.isArray(body.images) ? body.images : [];
          if (images.length === 0) return json({ error: "Keine Bilder übergeben." }, 400);
          if (images.length > MAX_IMAGES)
            return json({ error: `Maximal ${MAX_IMAGES} Bilder pro Anfrage.` }, 400);

          for (const img of images) {
            if (typeof img !== "string" || !img.startsWith("data:image/"))
              return json({ error: "Bild muss als data:image/... base64 übergeben werden." }, 400);
            if (approxBase64Bytes(img) > MAX_BYTES_PER_IMAGE)
              return json({ error: "Bild zu groß (max. 6 MB)." }, 413);
          }

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              temperature: 0.1,
              messages: [
                { role: "system", content: SYSTEM },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Extrahiere alle Aktien-Positionen aus den folgenden Bildern." },
                    ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
                  ],
                },
              ],
              tools: [EXTRACT_TOOL],
              tool_choice: { type: "function", function: { name: "extract_positions" } },
            }),
          });

          if (!upstream.ok) {
            const txt = await upstream.text();
            console.error("portfolio-extract gateway error", upstream.status, txt);
            if (upstream.status === 429) return json({ error: "Zu viele Anfragen — kurz warten." }, 429);
            if (upstream.status === 402) return json({ error: "AI-Credits aufgebraucht." }, 402);
            return json({ error: "AI-Dienst nicht erreichbar." }, 502);
          }

          const data = (await upstream.json()) as {
            choices?: Array<{
              message?: {
                tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
                content?: string;
              };
            }>;
          };

          const call = data.choices?.[0]?.message?.tool_calls?.[0];
          if (!call?.function?.arguments) {
            return json({ positions: [] satisfies Extracted[] });
          }

          let parsed: { positions?: unknown } = {};
          try {
            parsed = JSON.parse(call.function.arguments);
          } catch (e) {
            console.error("portfolio-extract: invalid tool args", e);
            return json({ positions: [] satisfies Extracted[] });
          }

          const out: Extracted[] = [];
          if (Array.isArray(parsed.positions)) {
            for (const p of parsed.positions) {
              if (!p || typeof p !== "object") continue;
              const o = p as Record<string, unknown>;
              const symbol = typeof o.symbol === "string" ? o.symbol.toUpperCase().trim() : "";
              const qty = Number(o.qty);
              const entry = Number(o.entry);
              const side = o.side === "SHORT" ? "SHORT" : "LONG";
              const confidence = Math.max(0, Math.min(1, Number(o.confidence) || 0));
              if (!symbol || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(entry) || entry <= 0) continue;
              out.push({
                symbol,
                name: typeof o.name === "string" ? o.name : undefined,
                qty,
                entry,
                side,
                date: typeof o.date === "string" ? o.date : undefined,
                currency: typeof o.currency === "string" ? o.currency : undefined,
                confidence,
                notes: typeof o.notes === "string" ? o.notes : undefined,
              });
            }
          }

          return json({ positions: out });
        } catch (e) {
          console.error("portfolio-extract error", e);
          return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
        }
      },
    },
  },
});
