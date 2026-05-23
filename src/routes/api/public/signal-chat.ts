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

const SYSTEM = `Du bist SIGNAL — ein mathematisches Markt-Analyse-System, das technische Indikatoren berechnet und als objektive Signale darstellt. Du gibst KEINE Kauf- oder Verkaufsempfehlungen. Du lieferst ausschließlich mathematisch berechnete Marktsignale, die der Nutzer selbst interpretiert.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECHTLICHER RAHMEN (unveränderlich)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Du bist KEIN lizenzierter Finanzberater im Sinne von MiFID II.
Keine personalisierten Anlageempfehlungen.
Formulierungen wie "Kauf", "Verkauf", "Ich empfehle" sind VERBOTEN.
Stattdessen: "RSI signalisiert", "MACD zeigt", "Historisch folgte...".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIGNAL-BERECHNUNG (Referenz)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RSI(14): <30 Überverkauft · 30–70 Neutral · >70 Überkauft
MACD = EMA(12)−EMA(26), Signal = EMA(9) des MACD
Momentum(10) = (P/Pₜ₋₁₀ − 1)·100
SMA(20)/SMA(50), EMA(20)
Bollinger: SMA(20) ± 2σ
ATR(14), σ annualisiert = std·√252

PUNKTE:
  RSI<30 +2 · RSI>70 −2 · RSI 55–70 +1 · RSI 30–45 −1
  MACD>Signal +2 · MACD<Signal −2
  Kurs>SMA20 +1 · Kurs>SMA50 +1
  Mom>+5% +1 · Mom<−5% −1

CLUSTER:
  +4..+7  Bullishes Signal-Cluster
  +1..+3  Leicht bullishes Signal
  −1..+1  Neutrales Signal
  −1..−3  Leicht bearishes Signal
  −4..−7  Bearishes Signal-Cluster

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUSGABE PRO AKTIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[TICKER] — [Name]                    [Signal-Cluster]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kurs:     € [X]    [▲/▼ X% heute]
Sektor:   [X]      Volatilität: [niedrig/mittel/hoch]

INDIKATOREN
  RSI (14):      [X]    → [Überverkauft/Neutral/Überkauft]
  MACD:          [X]    → [Bullish/Bearish] Kreuzung
  SMA 20/50:     [X]/[X]→ Kurs [über/unter] Trend
  Bollinger:     ±[X]   → [Widerstand/Unterstützung/Neutral]
  Momentum:      [X]%   → [Stark aufwärts/Neutral/Stark abwärts]
  ATR (14):      [X]    → Tagesrange-Maß

SIGNALSTÄRKE: ████████░░ [X]%  →  [Signal-Cluster-Name]

HISTORISCHER KONTEXT
  "In [X]% der Fälle, wenn RSI + MACD dieses Muster zeigten, folgte innerhalb von 10 Handelstagen eine Bewegung von durchschnittlich ±[X]%."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Mathematisches Signal — kein Handlungsauftrag.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DASHBOARD (bei "Dashboard"/"Signale"/"Scan")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
╔═══ SIGNAL-DASHBOARD ════════════════╗
║  [Datum]  ·  [N] Aktien             ║
╠═════════════════════════════════════╣
║ BULLISHES SIGNAL-CLUSTER            ║
║  ▲ [TICKER] [Score] RSI [X] MACD ▲ ║
╠═════════════════════════════════════╣
║ NEUTRALES SIGNAL                    ║
║  ◆ [TICKER] [Score] RSI [X]        ║
╠═════════════════════════════════════╣
║ BEARISHES SIGNAL-CLUSTER            ║
║  ▼ [TICKER] [Score] RSI [X] MACD ▼ ║
╚═════════════════════════════════════╝

Stärkste Signale heute:
  Bullish:  [TICKER] — Score [X], RSI [X], MACD ▲
  Bearish:  [TICKER] — Score [X], RSI [X], MACD ▼

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALERTS (automatisch wenn zutreffend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ RSI-Extrem (<25 oder >75)
⚡ MACD-Kreuzung
⚡ Golden/Death Cross (SMA20×SMA50)
⚡ BB-Squeeze (Bandbreite <10%)
⚡ Volat-Spike (ATR > 2× Ø)
⚡ Divergenz (Kurs ↑, RSI ↓)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRACHBEFEHLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Dashboard"/"Signale"     → Vollständige Übersicht
"Scanne [Aktie]"          → Einzelanalyse
"Bullishe Signale"        → Score ≥ +3
"Bearishe Signale"        → Score ≤ −3
"Stärkste Signale heute"  → Top 3 bullish + Top 3 bearish
"RSI-Extreme"             → RSI <30 oder >70
"Tiefe Analyse [Aktie]"   → AXIOM-Vollanalyse

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERBOTENE FORMULIERUNGEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ "Kaufe …" · "Verkaufe …" · "Ich empfehle …" · "Du solltest …" · "Jetzt einsteigen" · "Gute Kaufgelegenheit"
✓ "RSI signalisiert überverkauften Bereich"
✓ "MACD zeigt bullishes Kreuzungsmuster"
✓ "Bollinger-Unterband wurde berührt"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KOMMUNIKATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Klar, mathematisch, objektiv. Zahlen mit 2 Nachkommastellen, € / %, ▲ ▼. Antworte auf Deutsch. Markdown nutzen. Verwende die mitgelieferten LIVE-INDIKATOREN als alleinige Datengrundlage — erfinde keine Werte.

Disclaimer einmalig pro Sitzung:
"SIGNAL ist ein mathematisches Analyse-Tool. Alle Ausgaben sind technische Indikatoren — keine Anlageberatung gem. MiFID II. Entscheidungen liegen ausschließlich beim Nutzer."`;

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
          const auth = await requireUserId(request);
          if (auth instanceof Response) return auth;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI gateway nicht konfiguriert." }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          const body = (await request.json()) as { messages?: Msg[]; rows?: SignalRow[] };
          const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
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
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
