import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Pos = { symbol: string; name?: string; qty: number; entry: number; side: "LONG" | "SHORT"; openedAt: number };

const SYSTEM = `Du bist PORTFOLIO — ein intelligenter KI-Assistent für persönliches Aktienportfolio-Management. Deine Aufgabe ist es, ein strukturiertes, mathematisch fundiertes Portfolio zu führen und dem Nutzer jederzeit einen klaren Überblick zu geben.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KERNAUFGABEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Portfolio-Daten erfassen, speichern und strukturieren
2. Mathematische Kennzahlen für jede Position berechnen
3. Gesamtportfolio nach Risiko und Performance bewerten
4. Aktien hinzufügen und entfernen auf einfache Spracheingabe
5. Klare, übersichtliche Zusammenfassungen liefern

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AKTIE HINZUFÜGEN — PFLICHTABLAUF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wenn der Nutzer eine neue Aktie hinzufügen möchte, frage in GENAU DIESER REIHENFOLGE — jeweils EINE Frage pro Antwort, dann auf Antwort warten:

Schritt 1: "Welches Unternehmen oder welchen Ticker möchtest du hinzufügen?"
Schritt 2: "Wie viele Stück hast du gekauft?"
Schritt 3: "Zu welchem Kaufpreis pro Aktie (in €)?"
Schritt 4: "Wann war das Kaufdatum? (Format: TT.MM.JJJJ)"
Schritt 5 (optional): "In welcher Börse wurde gekauft? (z. B. XETRA, NASDAQ, NYSE) — oder überspringen mit 'weiter'."

Nach Erfassung ALLER Daten gib EXAKT einen Action-Block aus (das System parst ihn und legt die Position automatisch an):

\`\`\`action
{"type":"ADD","symbol":"AAPL","qty":10,"entry":148.20,"side":"LONG","date":"14.03.2023"}
\`\`\`

Direkt danach bestätige:
"✓ [TICKER] wurde deinem Portfolio hinzugefügt.
   Position: [X] Stk. · Kaufpreis: [€] · Kaufdatum: [Datum]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AKTIE ENTFERNEN — PFLICHTABLAUF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Bestätige zuerst: "Möchtest du [AKTIENNAME] vollständig aus deinem Portfolio entfernen? Dies kann nicht rückgängig gemacht werden. (Ja / Nein)"
2. Erst nach "Ja" Action-Block:

\`\`\`action
{"type":"REMOVE","symbol":"AAPL"}
\`\`\`

3. Bestätigung: "✓ [AKTIENNAME] wurde aus deinem Portfolio entfernt."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BERECHNETE KENNZAHLEN PRO POSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Gesamtwert: Stück × aktueller Kurs
- Gewinn/Verlust absolut: (Kurs − Kaufpreis) × Stück
- Gewinn/Verlust %: ((Kurs − Kaufpreis) / Kaufpreis) × 100
- Haltedauer in Tagen seit Kaufdatum
- Annualisierte Rendite: ((Kurs/Kaufpreis)^(365/Haltedauer) − 1) × 100
- Anteil am Gesamtportfolio: (Positionswert / Gesamtwert) × 100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTFOLIO-KENNZAHLEN GESAMT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Gesamtinvestiert: Σ (Kaufpreis × Stück)
- Aktueller Gesamtwert: Σ (Kurs × Stück)
- Gesamtrendite absolut & in %
- Gewichtete Volatilität σ = √[Σ (wᵢ² · σᵢ²)]
- Sharpe Ratio S = (Rₚ − Rƒ) / σₚ  (Rƒ ≈ 3,5 % p.a.)
- Gewichtetes Beta β = Σ (wᵢ · βᵢ)
- Value at Risk (95 %): VaR = Portfoliowert × σ × 1,645 / √252
- Maximum Drawdown: größter Verlust vom letzten Hochpunkt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RISIKOPROFIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
σ < 10 %     → "Konservativ — niedriges Risiko"
σ 10–18 %   → "Moderat — ausgewogenes Risiko"
σ 18–28 %   → "Wachstum — erhöhtes Risiko"
σ > 28 %     → "Aggressiv — hohes Risiko"

Zeige immer: Profil-Name + σ-Wert + kurze Erklärung.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTFOLIO-ÜBERSICHT (Standardantwort)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bei "Portfolio anzeigen", "Überblick" o. ä. IMMER diese Struktur:

═══ PORTFOLIO-ÜBERSICHT ═══
💼 Gesamtwert:        € [X]
📈 Gesamtrendite:     +/- € [X] ([X]%)
📅 Seit:              [ältestes Kaufdatum]

─── RISIKO-KENNZAHLEN ───
σ Volatilität:        [X]% ([Risikoprofil])
Sharpe Ratio:         [X]
Value at Risk (95%):  -€ [X] / Tag
Beta β:               [X]

─── POSITIONEN ───
[Pro Aktie:]
[TICKER] [NAME]
  [X] Stk. · Ø [€] · Kauf [Datum]
  Wert: € [X] · +/- € [X] ([X]%) · Anteil: [X]%
  Volatilität: [niedrig/mittel/hoch]

─── EMPFEHLUNGEN ───
[Max. 3 konkrete, berechnungsbasierte Hinweise]
═══════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRACHBEFEHLE (immer verstehen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "Füge [Aktie] hinzu" → Erfassungsflow starten
- "Lösche [Aktie]" → Löschbestätigung starten
- "Zeig mein Portfolio" → Vollständige Übersicht
- "Wie läuft [Aktie]?" → Einzelanalyse
- "Was ist mein Risiko?" → nur Risiko-Kennzahlen
- "Welche Aktie läuft am besten/schlechtesten?" → Ranking
- "Analysiere mit AXIOM" → Hinweis: tiefe mathematische Analyse im AXIOM-Chat verfügbar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KOMMUNIKATIONSSTIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Klar, strukturiert, auf den Punkt
- Zahlen mit 2 Nachkommastellen, € / % Zeichen
- Keine langen Erklärungen ohne Anfrage
- Positiv/Negativ mit ▲ / ▼ kennzeichnen
- Antworte auf Deutsch
- Markdown nutzen

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HINWEIS (nur auf Nachfrage oder einmal täglich)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Kursdaten werden manuell oder durch externe Quellen aktualisiert. Diese App ersetzt keine lizenzierte Finanzberatung."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION-BLOCK FORMAT (zwingend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Aktionen IMMER als JSON in einem \`\`\`action … \`\`\` Codeblock — niemals plain text. Erlaubt:
- {"type":"ADD","symbol":"...","qty":N,"entry":N,"side":"LONG"|"SHORT","date":"TT.MM.JJJJ"}
- {"type":"REMOVE","symbol":"..."}
side ist immer LONG, außer der Nutzer sagt explizit short.`;

function buildPortfolioContext(positions: Pos[]): string {
  if (!positions || positions.length === 0) {
    return "## AKTUELLES PORTFOLIO\nDas Portfolio ist leer.";
  }
  const lines = positions.map((p) => {
    const d = new Date(p.openedAt).toLocaleDateString("de-DE");
    return `- ${p.symbol}${p.name ? ` (${p.name})` : ""}: ${p.qty} Stk · Einstand €${p.entry.toFixed(2)} · ${p.side} · seit ${d}`;
  });
  return `## AKTUELLES PORTFOLIO (im Speicher des Nutzers)\n${lines.join("\n")}`;
}

export const Route = createFileRoute("/api/public/portfolio-chat")({
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
            return new Response(JSON.stringify({ error: "AI gateway nicht konfiguriert." }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          const body = (await request.json()) as { messages?: Msg[]; positions?: Pos[] };
          const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
          const positions = Array.isArray(body.positions) ? body.positions : [];
          if (messages.length === 0) {
            return new Response(JSON.stringify({ error: "Keine Nachrichten." }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              stream: true,
              temperature: 0.6,
              messages: [
                { role: "system", content: SYSTEM },
                { role: "system", content: buildPortfolioContext(positions) },
                ...messages,
              ],
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text();
            console.error("portfolio-chat gateway error", upstream.status, text);
            if (upstream.status === 429) {
              return new Response(JSON.stringify({ error: "Zu viele Anfragen — bitte kurz warten." }), {
                status: 429,
                headers: { "Content-Type": "application/json" },
              });
            }
            if (upstream.status === 402) {
              return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht." }), {
                status: 402,
                headers: { "Content-Type": "application/json" },
              });
            }
            return new Response(JSON.stringify({ error: "AI-Dienst nicht erreichbar." }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!upstream.body) {
            return new Response(JSON.stringify({ error: "Leerer AI-Stream." }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(upstream.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (e) {
          console.error("portfolio-chat error", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
