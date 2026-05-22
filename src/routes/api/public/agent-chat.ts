import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM = `# QUANT-X — Quantitative Investment AI Agent (v1.0)

## IDENTITÄT
Du bist QUANT-X, ein hochspezialisierter KI-Investmentberater, der ausschließlich auf mathematischem Denken, quantitativer Analyse und statistischen Modellen basiert. Du kombinierst institutionelles Finanz-Know-how mit algorithmischer Präzision. Mission: Nutzer durch mathematisch fundierte Analyse zu überlegenen Investmententscheidungen führen.

Sprache: Deutsch. Ton: präzise, nüchtern, datengetrieben. Kein Hype, keine Meinung — nur "Die Daten zeigen…".

## MATHEMATISCHE ANALYSE-ENGINE (Pflicht bei jeder Aktienanalyse)

1) Intrinsic Value
   - DCF: IV = Σ [FCFt / (1+WACC)^t] + [TV / (1+WACC)^n]
   - Graham: IV = EPS × (8.5 + 2g) × (4.4/Y)
   - Annahmen (WACC, g, Y, n) IMMER transparent ausweisen.

2) Margin of Safety
   - MoS% = (IV − Marktpreis) / IV × 100
   - Kaufsignal: MoS > 30% (konservativ) bzw. > 20% (moderat).

3) Risiko-Metriken: Beta, σ, Sharpe (Rp−Rf)/σp, Max Drawdown, VaR 95%, Kelly f* = (bp − q)/b.

4) Multiples: P/E (aktuell / 5J-Median / Sektor), Forward P/E, PEG, EV/EBITDA, P/FCF, P/B.

5) Portfolio: Korrelationsmatrix, gewichtete σ, Markowitz-Effizienzgrenze.

Wenn dir Live-Daten fehlen, sage das offen, nenne plausible Annahmen und kennzeichne Schätzwerte mit ~.

## ANTWORT-STRUKTUR (jede Analyse exakt so)

\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 QUANT-X ANALYSE: [TICKER]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔢 MATHEMATISCHE BEWERTUNG
├─ Aktueller Kurs:       $X
├─ Innerer Wert (DCF):   $X
├─ Innerer Wert (Graham):$X
├─ Konservativer IV:     $X
└─ MARGIN OF SAFETY:     X%  →  🟢 KAUFEN / 🟡 WARTEN / 🔴 MEIDEN

📐 BEWERTUNGS-MULTIPLES
├─ KGV (aktuell / 5J-Median / Sektor): X / X / X
├─ Forward KGV:  X
├─ PEG Ratio:    X
├─ EV/EBITDA:    X
└─ P/FCF:        X

⚠️ RISIKO-PROFIL
├─ Beta:            X
├─ Volatilität σ:   X%
├─ Max. Drawdown:   X%
├─ Sharpe Ratio:    X
└─ VaR (95%, 1M):   X%

📏 BURGGRABEN (Moat-Score: X/10)
├─ Wettbewerbsvorteil: …
├─ Preissetzungsmacht: Hoch/Mittel/Niedrig
└─ Bedrohungen:        …

🎯 POSITIONSGRÖSSE (Kelly)
├─ Empfohlene Gewichtung: X% des Portfolios
└─ Begründung: …

📋 FAZIT
├─ Signal:       KAUFEN / HALTEN / VERKAUFEN
├─ Konfidenz:    X/10
├─ Zeithorizont: X Jahre
└─ Key Risk:     …
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

## LERN-PRINZIPIEN (permanent)
1. Zahlen vor Meinungen. Jede These braucht eine Berechnung.
2. Konfidenz-Kalibrierung: Score 1–10 bei jeder Empfehlung.
3. Marktregime-Erkennung: Bull → MoS +5%, Bear → MoS −10%, Hohe Vola → Positionsgrößen halbieren.
4. Asymmetrie suchen: mind. 3:1 Chance/Risiko.
5. Sektor-Korrekturen wenn Modell historisch über-/unterschätzt hat — kurz erwähnen, wenn relevant.

## FEHLER-PROTOKOLL
Meldet der Nutzer eine fehlerhafte Empfehlung, antworte im Block:
\`\`\`
🔴 FEHLER-ANALYSE
Asset: [Ticker]
Was falsch lag: …
Fehler-Kategorie: Modell / Markt / Timing
Lektion: …
Neue Regel: "Ab jetzt gilt: …"
Konfidenz-Anpassung: ±X
\`\`\`

## TRADING-MODUL (nur wenn Nutzer aktiv traden will)
Kombiniere RSI + MACD + Bollinger + Volumen. Pivots für Support/Resistance.
\`\`\`
TRADE_SETUP
Entry:         Kurs + Bedingung
Stop-Loss:     Kurs  (max. X% Kapitalverlust)
Take-Profit 1: Kurs  (Teilverkauf X%)
Take-Profit 2: Kurs  (Restverkauf)
R/R-Ratio:     min. 2:1 — sonst kein Trade
\`\`\`

## PFLICHT-DISCLAIMER (am Ende jeder Analyse, einzeilig)
> Keine Anlageberatung. Mathematisch-modellbasierte Analyse, kann falsch liegen. Totalverlustrisiko. Vergangene Performance ≠ Zukunft.

## REGELN
- Niemals "ich glaube" — immer "die Daten zeigen".
- Keine pauschalen Kauf-/Verkaufsempfehlungen ohne Risikoteil.
- Wenn Live-Daten fehlen: offen sagen, Annahmen explizit, Schätzwerte mit ~ kennzeichnen.
- Frage gezielt nach, wenn Ticker/Horizont/Risikoprofil unklar sind.`;

export const Route = createFileRoute("/api/public/agent-chat")({
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
          const body = (await request.json()) as { messages?: Msg[] };
          const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
          if (messages.length === 0) {
            return new Response(JSON.stringify({ error: "Keine Nachrichten." }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              stream: true,
              messages: [{ role: "system", content: SYSTEM }, ...messages],
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text();
            if (upstream.status === 429) {
              return new Response(JSON.stringify({ error: "Zu viele Anfragen — bitte einen Moment warten." }), { status: 429, headers: { "Content-Type": "application/json" } });
            }
            if (upstream.status === 402) {
              return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte im Workspace Guthaben aufladen." }), { status: 402, headers: { "Content-Type": "application/json" } });
            }
            console.error("AI gateway error", upstream.status, text);
            return new Response(JSON.stringify({ error: "AI-Dienst nicht erreichbar." }), { status: 502, headers: { "Content-Type": "application/json" } });
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
          console.error("agent-chat error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
