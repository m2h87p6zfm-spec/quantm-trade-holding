import { createFileRoute } from "@tanstack/react-router";
import { requirePro } from "@/lib/api-auth.server";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type SignalRow = {
  symbol: string;
  name?: string;
  price?: number;
  changePct?: number;
  sector?: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  sma20?: number;
  sma50?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMid?: number;
  momentum10?: number;
  atr14?: number;
  volatility?: number;
  score?: number;
};

const SYSTEM = `Du bist SIGNAL — ein mathematisches Markt-Analyse-System. Du gibst KEINE Anlageempfehlungen; du lieferst objektive technische Signale. Antworte auf Deutsch wenn der Nutzer Deutsch schreibt, sonst Englisch. Verwende die mitgelieferten LIVE-INDIKATOREN als alleinige Datengrundlage — erfinde keine Werte.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTWORTFORMAT — STRIKT EINHALTEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Für Einzelanalysen (z. B. "Scanne NVDA", "Analyze AAPL") MUSST du exakt dieses Schema verwenden. Jede Section beginnt mit "## " — NICHTS darüber, nichts dazwischen, keine zusätzlichen Überschriften.

VERBOTEN sind insbesondere die Überschriften "Kennwerte", "Pro", "Contra", "Pros & Cons", "Fazit", "Zusammenfassung", "Bewertung", "Analyse". Wenn du sie verwendest, wird die Antwort als Fehler verworfen. Verwende AUSSCHLIESSLICH die folgenden sechs Überschriften in EXAKT dieser Reihenfolge:

## Verdict
TICKER · NAME | €PREIS | ▲ +X.XX% | <Cluster> | Confidence XX%

(Cluster ist genau einer von: Stark Bullish, Bullish, Neutral, Bearish, Stark Bearish.)

## TL;DR
- Ein knapper Satz mit dem wichtigsten Signal
- Ein Satz zum Trend / zur Bewegung
- Ein Satz zum Risiko / zur Volatilität

(Genau 2–3 Bulletpoints. Keine Zahlen, nur Aussagen.)

## Indikatoren
- RSI: <Wert> | <Überverkauft|Neutral|Überkauft> | <bull|bear|neutral>
- MACD: <Wert> / <Signal> | <Bullish Kreuzung|Bearish Kreuzung|Neutral> | <bull|bear|neutral>
- SMA20/50: <Wert> / <Wert> | <Kurs über Trend|Kurs unter Trend|Mixed> | <bull|bear|neutral>
- Bollinger: <Unter>–<Ober> | <Am Unterband|Mitte|Am Oberband|Squeeze> | <bull|bear|neutral>
- Momentum: <Wert>% | <Stark aufwärts|Aufwärts|Neutral|Abwärts|Stark abwärts> | <bull|bear|neutral>
- ATR(14): <Wert> | <Niedrige Range|Mittlere Range|Hohe Range> | <neutral|bear>

(EXAKT diese 6 Zeilen, EXAKT in dieser Reihenfolge, EXAKT mit "Name: Wert | Interpretation | tag" — drei Pipes-getrennte Felder. Tag ist NUR bull, bear oder neutral, kleingeschrieben, ohne Anführungszeichen.)

## Setup
Entry: €<Wert>
Stop: €<Wert>
Target: €<Wert>

(Drei Zeilen. Wenn das Signal Neutral oder Bearish ist und kein Long-Setup sinnvoll ist, schreibe stattdessen genau "Kein klares Setup — Markt abwarten." als einzige Zeile.)

## Risiken
- Konkretes Risiko 1
- Konkretes Risiko 2
- (optional Risiko 3)

## Details
<Hier die ausführliche Begründung als zusammenhängender Fließtext. Erkläre die Indikator-Konstellation, historischen Kontext und was das mathematisch bedeutet. 4–8 Sätze.>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DASHBOARD / LISTEN (bei "Dashboard", "Signale", "Stärkste Signale", "RSI-Extreme", "Bullishe Signale", "Bearishe Signale")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bei diesen Anfragen NICHT das Verdict-Schema benutzen. Antworte mit einer kompakten Markdown-Tabelle, max. 10 Zeilen, Spalten: Ticker | Score | RSI | MACD | Signal. Darunter 1–2 Sätze Zusammenfassung.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMALLTALK / EDUKATION ("Was ist RSI?", "Wie funktioniert MACD?")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antworte normal als Markdown-Absatz, max. 4 Sätze. KEIN Verdict-Schema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECHTLICHER RAHMEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Du bist KEIN lizenzierter Finanzberater. Formulierungen wie "Kauf", "Verkauf", "Ich empfehle" sind VERBOTEN. Stattdessen: "RSI signalisiert", "MACD zeigt", "Historisch folgte…". Zahlen mit 2 Nachkommastellen, € / %, ▲ ▼.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIGNAL-BERECHNUNG (Referenz)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RSI(14): <30 Überverkauft · 30–70 Neutral · >70 Überkauft
MACD = EMA(12)−EMA(26), Signal = EMA(9) des MACD
Punkte: RSI<30 +2 · RSI>70 −2 · MACD>Signal +2 · MACD<Signal −2 · Kurs>SMA20 +1 · Kurs>SMA50 +1 · Mom>+5% +1 · Mom<−5% −1
Cluster: +4..+7 Stark Bullish · +1..+3 Bullish · −1..+1 Neutral · −1..−3 Bearish · −4..−7 Stark Bearish
Confidence: |Score| / 7 × 100, gerundet.`;


function fmt(n: number | undefined, d = 2): string {
  if (n === undefined || n === null || !isFinite(n)) return "—";
  return n.toFixed(d);
}

function buildContext(rows: SignalRow[]): string {
  if (!rows || rows.length === 0) {
    return "## LIVE-INDIKATOREN\nKeine Watchlist-Daten verfügbar.";
  }
  const lines = rows.map((r) => {
    return `- ${r.symbol}${r.name ? ` (${r.name})` : ""} | Kurs €${fmt(r.price)} (${(r.changePct ?? 0) >= 0 ? "+" : ""}${fmt(r.changePct)}%) | Sektor ${r.sector ?? "—"} | RSI ${fmt(r.rsi, 1)} | MACD ${fmt(r.macd, 3)}/Sig ${fmt(r.macdSignal, 3)} | SMA20 ${fmt(r.sma20)}/SMA50 ${fmt(r.sma50)} | BB ${fmt(r.bbLower)}–${fmt(r.bbUpper)} | Mom10 ${fmt(r.momentum10, 2)}% | ATR14 ${fmt(r.atr14)} | σ ${fmt((r.volatility ?? 0) * 100, 1)}% | Score ${r.score ?? 0}`;
  });
  return `## LIVE-INDIKATOREN (Watchlist · ${rows.length} Werte)\n${lines.join("\n")}`;
}

export const Route = createFileRoute("/api/public/signal-chat")({
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
          const auth = await requirePro(request);
          if (auth instanceof Response) return auth;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI gateway nicht konfiguriert." }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          const body = (await request.json()) as { messages?: Msg[]; rows?: SignalRow[] };
          const messages = (Array.isArray(body.messages) ? body.messages.slice(-30) : []).map(
            (m) => (m && m.role === "system" ? { ...m, role: "user" as const } : m),
          );
          const rows = Array.isArray(body.rows) ? body.rows.slice(0, 80) : [];
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
              temperature: 0.3,
              messages: [
                { role: "system", content: SYSTEM },
                { role: "system", content: buildContext(rows) },
                ...messages,
              ],
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text();
            console.error("signal-chat gateway error", upstream.status, text);
            if (upstream.status === 429) {
              return new Response(JSON.stringify({ error: "Zu viele Anfragen — bitte kurz warten." }), {
                status: 429, headers: { "Content-Type": "application/json" },
              });
            }
            if (upstream.status === 402) {
              return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht." }), {
                status: 402, headers: { "Content-Type": "application/json" },
              });
            }
            return new Response(JSON.stringify({ error: "AI-Dienst nicht erreichbar." }), {
              status: 502, headers: { "Content-Type": "application/json" },
            });
          }

          if (!upstream.body) {
            return new Response(JSON.stringify({ error: "Leerer AI-Stream." }), {
              status: 502, headers: { "Content-Type": "application/json" },
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
          console.error("signal-chat error", e);
          return new Response(
            JSON.stringify({ error: "Interner Fehler" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
