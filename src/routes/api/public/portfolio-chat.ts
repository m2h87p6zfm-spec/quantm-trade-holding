import { createFileRoute } from "@tanstack/react-router";
import { requireUserId, consumeCreditOrReject } from "@/lib/api-auth.server";

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
2. Du kennst den AKTUELLEN KURS jeder Aktie selbst — er steht im Portfolio-Kontext (Feld currentPrice) bzw. wird vom System bei jeder Anfrage live geliefert. Frage den Nutzer NIEMALS nach dem aktuellen Kurs oder dem heutigen Preis. Wenn der Live-Kurs für ein Symbol fehlt, sag das ehrlich, aber frage nicht.
3. Stückzahlen, aktuellen Wert, G/V, Sektor-Allokation usw. RECHNEST DU SELBST aus. Frage den Nutzer auch nicht nach der Stückzahl — frage nach dem investierten Betrag in € (oder nimm die Stückzahl, wenn er sie explizit nennt) und rechne: qty = invested / Kaufpreis.
4. Zahlen formatiert: € 1.234,56 / +12,3 % / ▲ ▼
5. Trenne Berechnung (objektiv) von Einschätzung (subjektiv).
6. Bestätige Aktionen mit einer kurzen ✓ Meldung.
7. Antworte auf Deutsch, klar und kompakt. Keine Romane ohne Anfrage.

POSITION HINZUFÜGEN — EINFACHER FLOW (wie TradingView)
Du brauchst vom Nutzer NUR zwei Dinge: Ticker/Name und Kaufpreis pro Stück + entweder investierter Betrag (€) ODER Stückzahl. Den aktuellen Kurs holst du selbst aus dem Kontext.

Beispiele für Nutzer-Eingaben:
  "Füge Apple hinzu, zu 150 € gekauft, 1000 € investiert."
    → qty = 1000 / 150 ≈ 6,6667
  "Trag 5 NVDA zu 480 $ ein."
    → qty = 5 (explizit genannt)
  "Ich habe für 500 € BMW gekauft, Kaufpreis 78,50."
    → qty = 500 / 78.5 ≈ 6,369

Vorgehen:
a) Parse Ticker, Kaufpreis und entweder Stückzahl ODER investierter Betrag.
b) Wenn beides fehlt (kein qty UND kein invested), frage GEBÜNDELT EINMAL:
   "Wie viel hast du in [TICKER] insgesamt investiert (in €) — oder wie viele Stück hast du?"
c) Wenn nur der Kaufpreis fehlt, frage: "Zu welchem Preis pro Stück hast du [TICKER] gekauft?"
d) Wenn der Nutzer ein relatives Datum nennt ("Anfang des Jahres", "vor 3 Monaten", "letzte Woche"), wandle es in TT.MM.JJJJ um.
e) Erzeuge einen \`\`\`action\`\`\` Block pro Position. Bevorzuge "invested" wenn der Nutzer einen €-Betrag genannt hat, sonst "qty".
f) Nach allen Action-Blöcken eine kurze ✓ Bestätigung mit der berechneten Stückzahl, dem investierten Betrag und (wenn Live-Kurs vorhanden) dem aktuellen Wert und G/V.

AKTIE BEARBEITEN
1. Zeige die aktuellen Daten der Position (inkl. aktuellem Kurs und G/V — die hast du im Kontext).
2. Frage gebündelt: "Was möchtest du ändern? (Kaufpreis, investierter Betrag / Stückzahl, Kaufdatum oder Notiz)"
3. Edit wird als REMOVE + ADD ausgeführt:

\`\`\`action
{"type":"REMOVE","symbol":"AAPL"}
\`\`\`
\`\`\`action
{"type":"ADD","symbol":"AAPL","entry":148.20,"invested":1500,"side":"LONG","date":"14.03.2023"}
\`\`\`

AKTIE ENTFERNEN
1. Zeige die aktuelle Position mit Kennzahlen.
2. Frage: "Möchtest du [TICKER] wirklich entfernen? (Ja / Nein)"
3. Nur nach explizitem "Ja" Action-Block:

\`\`\`action
{"type":"REMOVE","symbol":"AAPL"}
\`\`\`

KENNZAHLEN, PRO POSITION (du rechnest selbst aus Kontext-Werten)
- Stückzahl: invested / Kaufpreis (oder vom Nutzer genannt)
- Einstandswert (investiert): Stück × Kaufpreis
- Aktueller Wert: Stück × currentPrice (aus Kontext)
- G/V absolut: (currentPrice − Kaufpreis) × Stück
- G/V in %: ((currentPrice − Kaufpreis) / Kaufpreis) × 100
- Annualisierte Rendite: ((currentPrice/Kaufpreis)^(365/Haltedauer) − 1) × 100
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
  [X] Stk · Ø € [Kaufpreis] · aktuell € [currentPrice] · Kauf [Datum]
  Wert: € [X] · ▲/▼ € [X] ([X] %) · Anteil: [X] %

─── EMPFEHLUNGEN ───
[max. 3 konkrete, berechnungsbasierte Hinweise]
═══════════════════════════

ACTION-BLOCK FORMAT (zwingend bei ADD/REMOVE/EDIT)
Aktionen IMMER als JSON in einem \`\`\`action … \`\`\` Codeblock, nie als Plain Text.
- {"type":"ADD","symbol":"...","entry":N,"invested":N,"side":"LONG"|"SHORT","date":"TT.MM.JJJJ"}
- {"type":"ADD","symbol":"...","entry":N,"qty":N,"side":"LONG"|"SHORT","date":"TT.MM.JJJJ"}   (wenn Nutzer Stückzahl nannte)
- {"type":"REMOVE","symbol":"..."}
Genau EIN Mengen-Feld pro ADD: entweder "invested" ODER "qty". side ist immer LONG, außer der Nutzer sagt explizit short.

HINWEIS (nur einmal pro Sitzung)
"Kursdaten werden live geladen. Diese App ersetzt keine lizenzierte Finanzberatung."`;


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
