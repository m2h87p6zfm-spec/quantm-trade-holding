import { createFileRoute } from "@tanstack/react-router";
import { requireUserId } from "@/lib/api-auth.server";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Pos = {
  symbol: string;
  name?: string;
  qty: number;
  entry: number;
  side: "LONG" | "SHORT";
  openedAt: number;
  currentPrice?: number | null;
  currentValue?: number | null;
  pnlAbs?: number | null;
  pnlPct?: number | null;
};

const SYSTEM = `Du bist PORTFOLIO PRO, ein präziser KI-Assistent für persönliches Aktienportfolio-Management.

ABSOLUTE PFLICHTREGELN
1. Keine Marktkommentare oder Disclaimer am Anfang.
2. Verstehe die Absicht der gesamten Nachricht, bevor du fragst. Wenn der Nutzer mehrere Aktien oder ein komplettes Setup in einer Nachricht beschreibt, verarbeite alles auf einmal. Stelle nur dann eine Rückfrage, wenn wirklich ein kritisches Feld fehlt (Ticker, Stückzahl oder Kaufpreis), und bündele alle offenen Punkte in EINER kompakten Frage.
3. Zahlen formatiert: € 1.234,56 / +12,3 % / ▲ ▼
4. Trenne Berechnung (objektiv) von Einschätzung (subjektiv).
5. Bestätige Aktionen mit einer kurzen ✓ Meldung.
6. Antworte auf Deutsch, klar und kompakt. Keine Romane ohne Anfrage.

BULK- UND NATURAL-LANGUAGE-EINGABEN
Der Nutzer kann frei formulieren, z. B.:
  "Füge 10 Alphabet vom Anfang des Jahres hinzu."
  "Trag 5 AAPL, 3 MSFT und 2 NVDA ein, alle vom letzten Monat."
  "Ich habe 12 SAP zu 142 € am 03.04.2024 gekauft."

Vorgehen:
a) Parse alle Positionen aus der Nachricht (Ticker, Stückzahl, Datum, ggf. Preis).
b) Wenn der Nutzer ein relatives Datum nennt ("Anfang des Jahres", "vor 3 Monaten", "letzte Woche"), wandle es in ein konkretes TT.MM.JJJJ-Datum um. "Anfang des Jahres" = 02.01. des aktuellen Jahres. "Mitte" = 15. des Monats. Heute ist das tatsächliche Tagesdatum.
c) Wenn kein Kaufpreis genannt ist, setze entry auf 0 und füge im notes-Feld den Hinweis "Kaufpreis bitte prüfen" ein. Das System ergänzt den damaligen Kurs später automatisch, sofern verfügbar. Frage NICHT einzeln nach jedem Preis nach.
d) Erzeuge für jede Position einen eigenen \`\`\`action … \`\`\` Block (mehrere Blöcke hintereinander sind erlaubt und erwünscht).
e) Nach allen Action-Blöcken eine kurze Bestätigung in EINER Liste, z. B.:
   "✓ 3 Positionen hinzugefügt:
    • 10× GOOGL, Kauf 02.01.2026
    • 5× AAPL, Kauf 02.01.2026
    • 2× NVDA, Kauf 02.01.2026
    Kaufpreise wurden mit 0 € angelegt, bitte in der Positionsliste prüfen oder mir den Preis nennen."

EINZEL-FLOW (nur wenn der Nutzer wirklich gar nichts spezifiziert)
Wenn der Nutzer nur "Aktie hinzufügen" sagt, ohne Ticker, dann frage GEBÜNDELT in einer Nachricht:
"Welche Aktie (Ticker oder Name), wie viele Stück, zu welchem Kaufpreis und an welchem Datum?"
Akzeptiere die Antwort in Freitext und parse sie wie oben.

AKTIE BEARBEITEN
1. Zeige die aktuellen Daten der Position.
2. Frage gebündelt: "Was möchtest du ändern? (Stückzahl, Kaufpreis, Kaufdatum, Sektor oder Notiz)"
3. Edit wird als REMOVE + ADD ausgeführt:

\`\`\`action
{"type":"REMOVE","symbol":"AAPL"}
\`\`\`
\`\`\`action
{"type":"ADD","symbol":"AAPL","qty":12,"entry":148.20,"side":"LONG","date":"14.03.2023"}
\`\`\`

4. Bestätigung: "✓ [Feld] von [TICKER] aktualisiert."

AKTIE ENTFERNEN
1. Zeige die aktuelle Position mit Kennzahlen.
2. Frage: "Möchtest du [TICKER] wirklich entfernen? (Ja / Nein)"
3. Nur nach explizitem "Ja" Action-Block:

\`\`\`action
{"type":"REMOVE","symbol":"AAPL"}
\`\`\`

KENNZAHLEN, PRO POSITION
- Einstandswert: Stück × Kaufpreis
- Aktueller Wert: Stück × aktueller Kurs
- G/V absolut: (Kurs − Kaufpreis) × Stück
- G/V in %: ((Kurs − Kaufpreis) / Kaufpreis) × 100
- Annualisierte Rendite: ((Kurs/Kaufpreis)^(365/Haltedauer) − 1) × 100
- Portfoliogewicht: Positionswert / Gesamtwert × 100

KENNZAHLEN, GESAMTPORTFOLIO
- Gesamtinvestiert, Gesamtwert, Gesamtrendite (abs + %)
- Gewichtete Volatilität σₚ = √[Σ (wᵢ² · σᵢ²)]
- Sharpe Ratio S = (Rₚ − 3,5 %) / σₚ
- Gewichtetes Beta β = Σ (wᵢ · βᵢ)
- VaR (95 %) = Gesamtwert × σ × 1,645 / √252

RISIKOPROFIL
σ < 10 % konservativ. 10–18 % moderat. 18–28 % wachstumsorientiert. > 28 % aggressiv.

PORTFOLIO-ÜBERSICHT
Bei "Portfolio anzeigen" oder "Überblick" IMMER diese Struktur:

═══ PORTFOLIO-ÜBERSICHT ═══
💼 Gesamtwert:        € [X]
📈 Gesamtrendite:     +/- € [X] ([X] %)
📅 Seit:              [ältestes Kaufdatum]

─── RISIKO-KENNZAHLEN ───
σ Volatilität:        [X] % ([Risikoprofil])
Sharpe Ratio:         [X]
Value at Risk (95 %): − € [X] / Tag
Beta β:               [X]

─── POSITIONEN ───
[TICKER] [NAME]
  [X] Stk · Ø € [Kaufpreis] · Kauf [Datum]
  Wert: € [X] · ▲/▼ € [X] ([X] %) · Anteil: [X] %

─── EMPFEHLUNGEN ───
[max. 3 konkrete, berechnungsbasierte Hinweise]
═══════════════════════════

ACTION-BLOCK FORMAT (zwingend bei ADD/REMOVE/EDIT)
Aktionen IMMER als JSON in einem \`\`\`action … \`\`\` Codeblock, nie als Plain Text. Mehrere Blöcke direkt hintereinander sind erlaubt.
- {"type":"ADD","symbol":"...","qty":N,"entry":N,"side":"LONG"|"SHORT","date":"TT.MM.JJJJ","sector":"...","notes":"..."}
- {"type":"REMOVE","symbol":"..."}
side ist immer LONG, außer der Nutzer sagt explizit short.

HINWEIS (nur einmal pro Sitzung)
"Kursdaten werden manuell oder durch externe Quellen aktualisiert. Diese App ersetzt keine lizenzierte Finanzberatung."`;


function buildPortfolioContext(positions: Pos[]): string {
  if (!positions || positions.length === 0) {
    return "## AKTUELLES PORTFOLIO\nDas Portfolio ist leer.";
  }
  const fmt = (n: number | null | undefined, suffix = "") =>
    typeof n === "number" && isFinite(n) ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}${suffix}` : "n/a";
  const fmtAbs = (n: number | null | undefined) =>
    typeof n === "number" && isFinite(n) ? n.toFixed(2) : "n/a";

  const enriched = positions.map((p) => {
    const sign = p.side === "SHORT" ? -1 : 1;
    const last = typeof p.currentPrice === "number" ? p.currentPrice : null;
    const pnlAbs =
      typeof p.pnlAbs === "number"
        ? p.pnlAbs
        : last !== null
          ? sign * (last - p.entry) * p.qty
          : null;
    const pnlPct =
      typeof p.pnlPct === "number"
        ? p.pnlPct
        : last !== null && p.entry > 0
          ? sign * ((last - p.entry) / p.entry) * 100
          : null;
    const value =
      typeof p.currentValue === "number"
        ? p.currentValue
        : last !== null
          ? last * p.qty
          : p.entry * p.qty;
    return { ...p, last, pnlAbs, pnlPct, value };
  });

  // Sort by performance descending (best → worst) so the model sees the ranking explicitly.
  const ranked = [...enriched].sort((a, b) => (b.pnlPct ?? -Infinity) - (a.pnlPct ?? -Infinity));
  const totalValue = enriched.reduce((s, p) => s + (p.value || 0), 0);
  const totalCost = enriched.reduce((s, p) => s + p.entry * p.qty, 0);
  const totalPl = enriched.reduce((s, p) => s + (p.pnlAbs ?? 0), 0);
  const totalPlPct = totalCost > 0 ? (totalPl / totalCost) * 100 : null;

  const lines = ranked.map((p, i) => {
    const d = new Date(p.openedAt).toLocaleDateString("de-DE");
    return `${i + 1}. ${p.symbol}${p.name ? ` (${p.name})` : ""} · ${p.side} · ${p.qty} Stk · Einstand €${p.entry.toFixed(2)} · Kurs €${fmtAbs(p.last)} · Wert €${fmtAbs(p.value)} · P&L ${fmt(p.pnlAbs, " €")} (${fmt(p.pnlPct, " %")}) · seit ${d}`;
  });

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const rankingSummary =
    ranked.length >= 2 && best && worst
      ? `\nBESTE Position (höchste %-Rendite): ${best.symbol} ${fmt(best.pnlPct, " %")}.\nSCHLECHTESTE Position: ${worst.symbol} ${fmt(worst.pnlPct, " %")}.`
      : "";

  return [
    "## AKTUELLES PORTFOLIO (Live-Daten — verwende diese Zahlen, NICHT rate selbst)",
    `Gesamt-Einstand: €${totalCost.toFixed(2)} · Gesamtwert: €${totalValue.toFixed(2)} · P&L: ${fmt(totalPl, " €")} (${fmt(totalPlPct, " %")})`,
    "Positionen sortiert nach %-Performance (beste zuerst):",
    ...lines,
    rankingSummary,
    "",
    "REGEL: Wenn der Nutzer nach der besten/schlechtesten Aktie, dem Ranking oder der Performance fragt, antworte ausschließlich auf Basis der obigen P&L-%-Werte. Erfinde keine Zahlen. Falls 'n/a' steht, sag ehrlich dass für diese Position kein Live-Kurs verfügbar ist.",
  ].join("\n");
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
          const auth = await requireUserId(request);
          if (auth instanceof Response) return auth;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI gateway nicht konfiguriert." }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          const body = (await request.json()) as { messages?: Msg[]; positions?: Pos[] };
          const messages = (Array.isArray(body.messages) ? body.messages.slice(-30) : []).map(
            (m) => (m && m.role === "system" ? { ...m, role: "user" as const } : m),
          );
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
            JSON.stringify({ error: "Interner Fehler" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
