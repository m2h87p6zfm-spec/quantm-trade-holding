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
  current_price?: number;
  current_value?: number;
  invested?: number;
  pnl_abs?: number;
  pnl_pct?: number;
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

Regeln zur Ableitung — IN DIESER REIHENFOLGE versuchen (höchste Genauigkeit zuerst). WICHTIG: Lieber eine Position mit niedriger Confidence zurückgeben als gar nichts.
  1. qty:
     a) "Stück" / "Anteile" / "Shares" / "Qty" direkt sichtbar → übernehmen (auch dezimal).
     b) sonst current_value UND current_price sichtbar → qty = current_value / current_price.
     c) sonst invested UND entry sichtbar → qty = invested / entry.
     d) sonst NUR current_value sichtbar (kein Kurs/Stück) → qty = 1 setzen, entry = current_value, notes = "qty unbekannt, als Platzhalter 1 Stück".
  2. entry (Einstandskurs pro Stück) — bevorzuge € vor %, weil % gerundet ist:
     a) "Ø-Kurs" / "Einstand" / "Avg Price" / "Cost basis" direkt sichtbar → übernehmen.
     b) sonst invested UND qty bekannt → entry = invested / qty.
     c) sonst current_value, pnl_abs UND qty bekannt → entry = (current_value − pnl_abs) / qty.
     d) sonst current_price UND pnl_pct bekannt → entry = current_price / (1 + pnl_pct/100). Confidence dann ≤ 0.6.
     e) sonst (nur aktueller Kurs/Wert sichtbar) → entry = current_price ODER current_value/qty als Näherung, Confidence ≤ 0.4, notes = "kein Einstand sichtbar, aktueller Kurs übernommen".
  3. Werte > 0 prüfen. Bei Division durch 0 oder unmöglichen Werten → die jeweilige Näherung d/e verwenden.
  4. KEINE harte Rundung — gib entry mit voller Präzision aus.

WÄHRUNG
- Wenn nur € sichtbar → currency "EUR". US-Broker-Werte in $ → "USD". Beträge NICHT umrechnen.

CONFIDENCE (gib IMMER einen Wert, niemals weglassen)
- direkt sichtbarer Einstandskurs: 0.9–1.0
- entry aus invested/qty oder (current_value−pnl_abs)/qty: 0.75–0.9
- entry aus current_price und pnl_pct: 0.45–0.6
- entry = aktueller Kurs als Näherung: 0.2–0.4
- unscharfe / verdeckte Zahlen: < 0.3

WICHTIG
- Side ist immer "LONG", außer das Bild zeigt explizit "Short" / "Leerverkauf".
- Datum nur setzen, wenn ein konkretes Kaufdatum sichtbar ist.
- Erkenne IMMER mindestens jede Position, deren Ticker/Logo/Name eindeutig sichtbar ist. Lieber Platzhalter-Zahlen mit niedriger Confidence, damit der Nutzer korrigieren kann.
- Notes: kurz festhalten, woher entry stammt (z. B. "entry = invested/qty", "entry aus Performance %", "kein Einstand sichtbar").`;

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
              invested: { type: "number", description: "Falls sichtbar: eingesetztes Kapital (qty × Einstandskurs)" },
              pnl_abs: { type: "number", description: "Falls sichtbar: Gewinn/Verlust in Währung (z. B. €)" },
              pnl_pct: { type: "number", description: "Falls sichtbar: Performance in % seit Einstand (oft gerundet)" },
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
              finish_reason?: string;
            }>;
          };

          const choice = data.choices?.[0];
          const call = choice?.message?.tool_calls?.[0];
          const rawContent = choice?.message?.content?.slice(0, 400);
          console.log("portfolio-extract: finish=", choice?.finish_reason, "tool=", !!call, "content=", rawContent);

          if (!call?.function?.arguments) {
            return json({
              positions: [] satisfies Extracted[],
              hint:
                "Die KI konnte im Bild keine Wertpapier-Positionen erkennen. Bitte einen Screenshot der Depot-Übersicht (Tabellen-/Listenansicht mit Tickern und Werten) verwenden — nicht das Sparplan- oder Chart-Fenster.",
            });
          }

          let parsed: { positions?: unknown } = {};
          try {
            parsed = JSON.parse(call.function.arguments);
          } catch (e) {
            console.error("portfolio-extract: invalid tool args", e);
            return json({ positions: [] satisfies Extracted[], hint: "KI-Antwort war unvollständig. Bitte erneut versuchen." });
          }

          const rawArr = Array.isArray(parsed.positions) ? parsed.positions : [];
          const out: Extracted[] = [];
          let dropped = 0;
          for (const p of rawArr) {
            if (!p || typeof p !== "object") { dropped++; continue; }
            const o = p as Record<string, unknown>;
            const symbol = typeof o.symbol === "string" ? o.symbol.toUpperCase().trim() : "";
            const qty = Number(o.qty);
            const entry = Number(o.entry);
            const side = o.side === "SHORT" ? "SHORT" : "LONG";
            const confidence = Math.max(0, Math.min(1, Number(o.confidence) || 0));
            if (!symbol || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(entry) || entry <= 0) {
              console.warn("portfolio-extract: dropped position", { symbol, qty, entry });
              dropped++;
              continue;
            }
            const optNum = (k: string): number | undefined => {
              const v = Number(o[k]);
              return Number.isFinite(v) && v > 0 ? v : undefined;
            };
            const pnlPct = Number(o.pnl_pct);
            const pnlAbs = Number(o.pnl_abs);
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
              current_price: optNum("current_price"),
              current_value: optNum("current_value"),
              invested: optNum("invested"),
              pnl_abs: Number.isFinite(pnlAbs) ? pnlAbs : undefined,
              pnl_pct: Number.isFinite(pnlPct) ? pnlPct : undefined,
            });
          }

          console.log("portfolio-extract: raw=", rawArr.length, "kept=", out.length, "dropped=", dropped);

          if (out.length === 0) {
            const hint =
              rawArr.length > 0
                ? `Die KI hat ${rawArr.length} Position(en) erkannt, aber Stückzahl oder Einstandskurs waren nicht lesbar/ableitbar. Bitte einen schärferen Screenshot oder eine Ansicht mit Stück, Wert und Performance verwenden.`
                : "Im Bild war keine Wertpapier-Position erkennbar. Bitte einen Screenshot der Depot-Übersicht mit Tickern, Stück und Wert hochladen.";
            return json({ positions: [], hint });
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
