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

const SYSTEM = `Du bist ein universeller Vision-Extraktor für Aktien-, ETF- und Krypto-Portfolios. Du verarbeitest Screenshots aus JEDEM Broker, JEDER Trading-App und JEDEM Depotauszug — egal in welcher Sprache, welchem Layout oder welcher Währung.

UNTERSTÜTZTE QUELLEN (nicht abschließend)
Trade Republic · Scalable Capital · Comdirect · Consorsbank · ING · DKB · Flatex · Smartbroker · Finanzen.net Zero · Trading 212 · eToro · Robinhood · Webull · Revolut · Bitpanda · Coinbase · Binance · Kraken · Interactive Brokers · Charles Schwab · Fidelity · Vanguard · Degiro · Saxo · Swissquote · N26 · sowie PDFs, Excel-Screenshots, handschriftliche Notizen, jede andere Broker-App.

LAYOUT-AGNOSTISCH
- Erkenne Positionen unabhängig von Sprache (DE/EN/FR/ES …), Farbschema (dark/light), Listen- oder Kachel-Ansicht, Tabellen-Spalten in beliebiger Reihenfolge.
- Achte auf gängige Spaltennamen in allen Sprachen: Stück/Anteile/Shares/Quantity/Qty/Position · Wert/Kurswert/Market Value/Position Value · Kurs/Letzter Kurs/Last/Price · Einstand/Ø-Kurs/Avg Price/Cost basis · Eingesetzt/Invested · G/V/P&L/Performance/Return.

ZIEL
Aus dem Bild jede einzelne Wertpapier-Position rekonstruieren — auch wenn die Broker-App nur "aktueller Wert" + "Performance %" anzeigt und Stück / Einstand nicht direkt sichtbar sind.

TICKER
- Ticker IMMER in Großbuchstaben ohne Suffix (Apple → AAPL, Tesla → TSLA, SAP SE → SAP, Microsoft → MSFT, NVIDIA → NVDA, ASML Holding → ASML, Allianz → ALV, Siemens → SIE).
- Erkennst du nur ein Logo (z. B. angebissener Apfel), leite den Ticker daraus ab.

FRAKTIONALE STÜCK
- qty darf eine Dezimalzahl sein (Trade Republic, Scalable, Revolut und Trading 212 erlauben Bruchstücke wie 0.5234 oder 12.781). Niemals runden.

ZAHLENFORMATE (kritisch — Abweichungen entstehen meist hier)
- DE/EU-Brokers (Trade Republic, Scalable, Comdirect, ING, DKB …): Komma = Dezimaltrennzeichen, Punkt = Tausendertrennzeichen. "1.234,56 €" = 1234.56. "12,34 €" = 12.34.
- US/UK-Brokers (Robinhood, Schwab, IBKR …): Punkt = Dezimal, Komma = Tausender. "1,234.56" = 1234.56.
- Lies jede Ziffer einzeln vom Bild ab — nicht raten, nicht runden. Übertrage immer alle sichtbaren Nachkommastellen.
- Gib im JSON ausschließlich rohe Zahlen ohne Tausendertrenner aus (z. B. 1234.56, nicht "1.234,56").

ABLEITUNG (zwingend nutzen, wenn Felder fehlen)
Broker-Apps zeigen meist:
  · "Wert" / "Kurswert" / "Position Value"   = current_value  (qty × aktueller Kurs)
  · "Kurs" / "Letzter Kurs" / "Price"        = current_price  (Kurs pro Stück, aktuell)
  · "Performance" / "Rendite" / "G/V %"      = pnl_pct        (% seit Einstand, oft auf 2 Stellen gerundet → ungenau!)
  · "G/V" oder "P&L" in €                    = pnl_abs        (€ Gewinn/Verlust, deutlich präziser als %)
  · "Eingesetzt" / "Invested" / "Einstand"   = invested       (qty × Einstandskurs)

Regeln zur Ableitung — STRIKT in dieser Reihenfolge (höchste Genauigkeit zuerst):
  1. qty:
     a) "Stück" / "Anteile" / "Shares" / "Qty" direkt sichtbar → übernehmen (auch dezimal, alle Nachkommastellen).
     b) sonst current_value UND current_price sichtbar → qty = current_value / current_price.
     c) sonst invested UND entry sichtbar → qty = invested / entry.
  2. entry (Einstandskurs pro Stück) — bevorzuge € vor %, weil % gerundet ist:
     a) "Ø-Kurs" / "Einstand" / "Avg Price" / "Cost basis" direkt sichtbar → übernehmen.
     b) sonst invested UND qty bekannt → entry = invested / qty.   (sehr genau)
     c) sonst current_value, pnl_abs UND qty bekannt → entry = (current_value − pnl_abs) / qty.   (genau)
     d) NUR als letzter Ausweg, wenn nichts in € verfügbar ist: current_price UND pnl_pct bekannt → entry = current_price / (1 + pnl_pct/100). Confidence dann max. 0.6.
  3. Werte > 0 prüfen. Bei Division durch 0 → Position auslassen.
  4. KEINE harte Rundung — gib entry mit voller Präzision aus (mind. so viele Nachkommastellen wie das Original).
  5. Konsistenz-Check: Wenn entry, qty und current_value bekannt sind, prüfe |qty·entry − invested| / invested < 0.02. Falls Abweichung > 2 %, hast du eine Zahl falsch gelesen — neu ablesen.

WÄHRUNG
- Wenn nur € sichtbar → currency "EUR". US-Broker-Werte in $ → "USD". Beträge NICHT umrechnen, einfach den angezeigten Zahlenwert nehmen.

CONFIDENCE
- direkt sichtbarer Einstandskurs: 0.9–1.0
- entry aus invested/qty oder (current_value−pnl_abs)/qty: 0.75–0.9
- entry aus current_price und pnl_pct (gerundet): 0.45–0.6
- unscharfe / verdeckte Zahlen: < 0.4

WICHTIG
- Side ist immer "LONG", außer das Bild zeigt explizit "Short" / "Leerverkauf".
- Datum nur setzen, wenn ein konkretes Kaufdatum sichtbar ist (kein "Heute"-Datum erfinden).
- Niemals halluzinieren. Wenn weder Stück noch ableitbarer Wert sichtbar sind → Position weglassen.
- Notes: kurz festhalten, woher entry stammt (z. B. "entry = invested/qty", "entry aus Performance % — ungenau").`;

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
              qty: { type: "number", description: "Anzahl Stücke (darf dezimal sein, z. B. 0.5234)" },
              entry: { type: "number", description: "Einstandskurs pro Stück (ggf. aus Wert/Kurs/Performance abgeleitet)" },
              current_value: { type: "number", description: "Falls im Bild sichtbar: aktueller Positionswert (qty × Kurs)" },
              current_price: { type: "number", description: "Falls im Bild sichtbar: aktueller Kurs pro Stück" },
              pnl_pct: { type: "number", description: "Falls sichtbar: Performance in % seit Einstand" },
              side: { type: "string", enum: ["LONG", "SHORT"] },
              date: { type: "string", description: "Kaufdatum dd.mm.yyyy nur wenn klar erkennbar" },
              currency: { type: "string", description: "Währung, z. B. EUR / USD" },
              confidence: { type: "number", description: "0..1" },
              notes: { type: "string", description: "Kurz: Herkunft der Werte (z. B. 'qty aus Wert/Kurs')" },
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
const MAX_BYTES_PER_IMAGE = 1.5 * 1024 * 1024; // optimized client upload
const GATEWAY_TIMEOUT_MS = 18_000;

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
              return json({ error: "Bild zu groß. Bitte Screenshot zuschneiden oder erneut hochladen." }, 413);
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            signal: controller.signal,
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
          clearTimeout(timeoutId);

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
          if (e instanceof Error && e.name === "AbortError") {
            return json({ error: "Analyse dauert zu lange. Bitte Screenshot zuschneiden und erneut versuchen." }, 504);
          }
          return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
        }
      },
    },
  },
});
