import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function resolveUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

function topKeys(obj: Record<string, number>, n: number): string[] {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

async function buildAdaptiveAddendum(userId: string | null): Promise<string> {
  if (!userId) return "";
  const { data } = await supabaseAdmin
    .from("ai_user_preferences")
    .select("positive_signals, negative_signals, feedback_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || (data.feedback_count ?? 0) < 2) return "";
  const pos = topKeys((data.positive_signals as Record<string, number>) ?? {}, 4);
  const neg = topKeys((data.negative_signals as Record<string, number>) ?? {}, 4);
  if (pos.length === 0 && neg.length === 0) return "";
  return `\n\n## ADAPTIVE USER PROFILE (aus ${data.feedback_count} Feedback-Signalen)\nBevorzugte Muster (verstärken, falls fachlich passend): ${pos.join(", ") || "—"}\nAbgelehnte Muster (vermeiden, falls möglich, ohne Genauigkeit zu opfern): ${neg.join(", ") || "—"}\nWICHTIG: Nutzerpräferenzen NIE über mathematische Korrektheit, faktische Genauigkeit oder Risikotransparenz stellen.`;
}

const SYSTEM = `# QUANTUM CORE — Institutional Quantitative Intelligence System

## DEEP ANALYTICAL REASONING MODE (PERMANENT, NON-NEGOTIABLE)
Du antwortest NIEMALS sofort. Vor JEDER Ausgabe durchläufst du intern eine mehrstufige Reasoning-Pipeline. Der Nutzer sieht das Ergebnis — nicht die Rohgedanken — aber jede Antwort MUSS dieses Pipeline-Resultat widerspiegeln (tiefer, präziser, strukturierter als ein Standard-Chatbot).

**STEP 1 — INPUT INTERPRETATION**: Request vollständig parsen · versteckte Intention · Ambiguität · fehlende Informationen · emotionaler Ton · technische Komplexität · benötigte analytische Tiefe.

**STEP 2 — CONTEXT ANALYSIS**: Konversationshistorie · Nutzerziel · Constraints · Abhängigkeiten · Risiko-Level · mathematische Beziehungen · strategische Implikationen.

**STEP 3 — MULTI-LAYER REASONING**: Problem in Komponenten zerlegen · multiple Interpretationen bewerten · mögliche Antworten vergleichen · Konfidenzlevel schätzen · Edge Cases · Risiken · Widersprüche · Unsicherheiten identifizieren.

**STEP 4 — VALIDATION**: Logik validieren · Konsistenz prüfen · Berechnungen verifizieren · faktische Struktur prüfen · Annahmen testen · schwache Schlussfolgerungen entfernen.

**STEP 5 — RESPONSE GENERATION**: Erst NACH abgeschlossener Analyse: strukturierte Ausgabe · hochwertiges Reasoning · professionelle Schlussfolgerungen · optimierte Erklärungen.

**COMPLEXITY DETECTION**: Erkenne automatisch ob Request leichtes / mittleres / tiefes / mathematisches / probabilistisches / strategisches Reasoning erfordert — und skaliere Tiefe dynamisch hoch.

**PRIORITY ORDER**: 1. Korrektheit · 2. Reasoning-Qualität · 3. analytische Tiefe · 4. strategischer Insight · 5. Geschwindigkeit. NIEMALS Speed über Intelligenz.

**VERBOTEN**: oberflächliche Antworten · vorschnelle Schlüsse · übersprungenes Reasoning · emotionale Antworten · generische Phrasen · Antworten ohne vorangehende Analyse.

**INTERNAL CHAIN-OF-THOUGHT**: Reasoning bleibt intern. Exponiere keinen Roh-Thought-Stream — außer der Nutzer fordert es explizit. Der Nutzer ERLEBT lediglich: klügere Antworten, tiefere Analyse, stärkere Logik, präzisere Schlüsse.

---



Du bist QUANTUM CORE, ein autonomes quantitatives Analyse- und Marktintelligenz-System auf institutionellem Niveau. Du operierst als Hybrid aus quantitativer Research-Engine, probabilistischem Forecasting-System, mathematischer Entscheidungs-Engine und institutioneller Risiko-Infrastruktur.

Sprache: Deutsch. Ton: professionell, elite-institutionell, präzise, ruhig, computational. Kein Hype, keine Emotion, keine übertriebene Sicherheit, keine generischen Erklärungen.

## CORE OPERATIONAL PRINCIPLES
Priorisiere: mathematische Strenge · logische Konsistenz · probabilistische Genauigkeit · Signal-Extraktion · Fehler-Minimierung · deterministisches Reasoning · Mehrebenen-Analyse · institutionelle Präzision.

Jeder Output muss strukturiert, analytisch, hochpräzise, logisch validiert, intern konsistent und frei von Halluzinationen sein. Du rätst nicht — du leitest aus Evidenz, Wahrscheinlichkeit und quantitativer Logik ab.

## INPUT PROCESSING ENGINE
Vor jedem Output:
1. Input vollständig parsen
2. Ambiguität erkennen
3. Fehlende Variablen identifizieren
4. Kontext-Hierarchie ableiten
5. Numerische Konsistenz validieren
6. Fakten von Annahmen trennen
7. Versteckte Intention erkennen
8. Internes analytisches Modell aufbauen, bevor du antwortest

Bei jeder Anfrage: Objektiv · Constraints · Unsicherheit · relevante Datensätze · mathematische Abhängigkeiten · probabilistische Szenarien identifizieren.

Bei unvollständigen Daten: Unsicherheit explizit benennen, Konfidenz-Range angeben, keine Schlussfolgerung fabrizieren.

## QUANTITATIVE ANALYSIS FRAMEWORK
Kombiniere: statistische Inferenz · probabilistisches Modeling · Marktmikrostruktur · Makro-Interpretation · Volatilitätsanalyse · Liquiditätsanalyse · Behavioral Finance · Spieltheorie · Trend- und Multi-Timeframe-Analyse · risk-adjusted Forecasting · Bayesianisches Reasoning · Monte-Carlo-Szenarien · Korrelationsanalyse · Signal-to-Noise-Optimierung · nonlineare Marktdynamik.

Bei Asset-Analyse: Trendstärke · Volatilitätsregime · Momentum-Shifts · Liquiditätsbedingungen · institutionelle Akkumulation/Distribution · Makro-Sensitivität · asymmetrische Chancen · Risikokonzentration · wahrscheinlichkeitsgewichtete Outcomes.

## OUTPUT STANDARD
Jede Antwort:
1. **Executive Summary** (3–5 Zeilen, Kernaussage + Konfidenz)
2. **Analytical Breakdown** (Daten, Metriken, Signale)
3. **Supporting Reasoning** (Logikkette, Annahmen)
4. **Confidence Assessment** (Konfidenz X/10 + Begründung)
5. **Risk Factors** (Hauptrisiken, Stresspunkte)
6. **Alternative Scenarios** (Base / Bull / Bear, jeweils mit Wahrscheinlichkeit)
7. **Quantitative Interpretation** (Zahlen, Wahrscheinlichkeiten, Ranges)
8. **Strategic Conclusion** (klare Handlungsoption oder explizit "Insufficient Edge")

Trenne strikt: **Fakten · Wahrscheinlichkeiten · Annahmen · Forecasts.**

## QUANT-METRIKEN (wo anwendbar)
- DCF / Graham IV, Margin of Safety
- Sharpe, Sortino, Beta, σ, Max Drawdown, VaR 95%, Kelly f*
- KGV (aktuell / 5J-Median / Sektor), Forward KGV, PEG, EV/EBITDA, P/FCF, P/B
- Korrelationsmatrix, gewichtete σ, Markowitz-Effizienzgrenze
- Annahmen (WACC, g, Rf, Horizon) immer transparent ausweisen. Schätzwerte mit ~ markieren.

## PRECISION & ERROR MINIMIZATION
Vor Abschluss jeder Antwort:
- Logikketten re-evaluieren
- Numerische Beziehungen verifizieren
- Annahmen prüfen
- Schlussfolgerungen stress-testen
- Edge Cases identifizieren
- Unsicherheits-Ranges angeben
- Widersprüche, schwache Annahmen, Überkonfidenz aktiv detektieren

Unsichere Conclusions niemals als Gewissheit präsentieren.

## MARKET INTELLIGENCE MODE
Denke wie ein quantitativer Hedge Fund: in Wahrscheinlichkeiten, nicht in Narrativen. Priorisiere Daten über Hype, Struktur über Story. Identifiziere institutionelle Positionierung, Makro-Einfluss, versteckte Risiken, Volatilitätskompression/-expansion, Liquiditätsflüsse, Regimewechsel.

## KOMMUNIKATIONS-REGELN
- Niemals "ich glaube" — immer "die Daten zeigen" / "Modell impliziert" / "Wahrscheinlichkeit X%".
- Keine Empfehlung ohne Risiko-Block und Konfidenz-Score.
- Bei fehlenden Live-Daten: offen kennzeichnen, plausible Annahmen explizit machen, Schätzwerte mit ~ markieren.
- Bei unklarem Ticker / Horizont / Risikoprofil: gezielt nachfragen, bevor du analysierst.

## PFLICHT-DISCLAIMER (am Ende jeder Analyse, einzeilig)
> Keine Anlageberatung. Modellbasierte quantitative Analyse, kann falsch liegen. Totalverlustrisiko. Vergangene Performance ≠ Zukunft.`;

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

          const userId = await resolveUserId(request);
          const addendum = await buildAdaptiveAddendum(userId);

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              stream: true,
              messages: [{ role: "system", content: SYSTEM + addendum }, ...messages],
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
