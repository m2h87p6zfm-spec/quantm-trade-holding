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

// Pick dominant value from a category (e.g. length:short vs length:long)
function dominant(signals: Record<string, number>, category: string): string | null {
  const entries = Object.entries(signals).filter(([k]) => k.startsWith(`${category}:`));
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0].split(":")[1];
}

const FAIL_LABEL: Record<string, string> = {
  "fail:unclear": "war zu unklar",
  "fail:wrong_assumption": "enthielt falsche Annahmen",
  "fail:too_shallow": "war zu oberflächlich",
  "fail:bad_structure": "war schlecht strukturiert",
  "fail:too_long": "war zu lang",
  "fail:irrelevant": "war nicht relevant",
  "fail:generic": "war zu generisch",
};

async function buildAdaptiveAddendum(userId: string | null): Promise<string> {
  if (!userId) return "";
  const { data } = await supabaseAdmin
    .from("ai_user_preferences")
    .select("positive_signals, negative_signals, feedback_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || (data.feedback_count ?? 0) < 1) return "";

  const pos = (data.positive_signals as Record<string, number>) ?? {};
  const neg = (data.negative_signals as Record<string, number>) ?? {};

  // Derive concrete preferences from dominant positive signals
  const preferredLength = dominant(pos, "length");
  const preferredStructure = dominant(pos, "structure");
  const preferredDepth = dominant(pos, "depth");
  const preferredStyle = dominant(pos, "style");
  const preferredComplexity = dominant(pos, "complexity");

  // Top negative patterns (avoid)
  const negTop = topKeys(neg, 5);
  const failReasons = negTop.filter((k) => k.startsWith("fail:")).map((k) => FAIL_LABEL[k] ?? k);
  const negPatterns = negTop.filter((k) => !k.startsWith("fail:"));

  const lines: string[] = [];
  lines.push(`## ADAPTIVE USER PROFILE (aus ${data.feedback_count} Feedback-Signalen)`);
  lines.push("Diese Präferenzen wurden aus echtem Nutzer-Feedback gelernt. Wende sie auf jede Antwort an, **bevor** du sie generierst.");
  lines.push("");
  lines.push("### Bestätigte Präferenzen (verstärken):");
  if (preferredLength) lines.push(`- **Länge**: ${preferredLength === "short" ? "kurz (<600 Zeichen)" : preferredLength === "medium" ? "mittel (600–1800 Zeichen)" : "ausführlich (>1800 Zeichen)"}`);
  if (preferredStructure) lines.push(`- **Struktur**: ${preferredStructure === "tables" ? "Tabellen für Vergleiche" : preferredStructure === "bullets" ? "Bullet-Listen" : preferredStructure === "headings" ? "klare Überschriften" : preferredStructure === "numbered" ? "nummerierte Schritte" : "fließender Text"}`);
  if (preferredDepth) lines.push(`- **Analyse-Tiefe**: ${preferredDepth === "quantitative" ? "stark quantitativ, viele Zahlen" : preferredDepth === "valuation" ? "Bewertungs-fokussiert (DCF, P/E, Multiples)" : preferredDepth === "technical" ? "technische Analyse (RSI, MACD, Trend)" : preferredDepth === "macro" ? "Makro-Kontext (Zinsen, Inflation)" : "quellen-gestützt mit Zitaten"}`);
  if (preferredStyle) lines.push(`- **Investment-Stil**: ${preferredStyle === "long_term" ? "langfristig / Value / Buy-and-Hold" : preferredStyle === "active" ? "aktiv / Swing / Momentum" : "aggressiv / spekulativ"}`);
  if (preferredComplexity) lines.push(`- **Komplexität**: ${preferredComplexity === "high" ? "anspruchsvoll, fachlich dicht" : preferredComplexity === "low" ? "einfach erklärt, kurze Sätze" : "ausgewogen"}`);
  if (!preferredLength && !preferredStructure && !preferredDepth && !preferredStyle && !preferredComplexity) {
    lines.push("- Noch keine dominanten Positiv-Muster — neutral antworten.");
  }

  if (failReasons.length > 0 || negPatterns.length > 0) {
    lines.push("");
    lines.push("### Vermeiden (negative Signale):");
    if (failReasons.length > 0) lines.push(`- Vorherige Antworten ${failReasons.join(", ")} — gezielt gegensteuern.`);
    if (negPatterns.length > 0) lines.push(`- Schwache Muster: ${negPatterns.join(", ")}`);
  }

  lines.push("");
  lines.push("**Regel**: Wende dieses Profil aktiv an. Aber: Präferenzen dürfen NIE Korrektheit, Risiko-Transparenz oder Quellentreue verdrängen. Wenn ein Nutzer 'kurz' bevorzugt, eine korrekte Antwort aber Tiefe braucht — liefere Tiefe, aber so kompakt wie möglich.");

  return "\n\n" + lines.join("\n");
}


async function buildTradingProfileAddendum(userId: string | null): Promise<string> {
  if (!userId) return "";
  const { data } = await supabaseAdmin
    .from("user_trading_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !data.onboarding_completed) return "";
  const markets = Array.isArray(data.markets) ? (data.markets as string[]) : [];
  return `\n\n## USER TRADING PROFILE (verbindlich anzuwenden)
- Trading Goal: ${data.trading_goal ?? "—"}
- Risk Level: ${data.risk_level ?? "—"} → Mindest-Konfidenz für Signale: ${data.confidence_threshold}%
- Strategy Mode: ${data.strategy_mode} · Signal Frequency: ${data.signal_frequency}
- Aktive Märkte: ${markets.join(", ") || "—"} · Region: ${data.region}
- AI Tone: ${data.ai_tone} · Explanation Depth: ${data.explanation_depth} · Show Reasoning: ${data.show_reasoning ? "ja" : "nein"}

REGELN:
1. Signale/Empfehlungen NUR für aktive Märkte. Andere Märkte: kurzer Hinweis, dass sie im Profil deaktiviert sind.
2. Signale UNTER der Mindest-Konfidenz nicht ausgeben oder explizit als "unter Threshold" markieren.
3. Strategy Mode "conservative" → wenige, hochselektive Setups. "aggressive" → mehr Setups, höhere Frequenz akzeptiert.
4. AI Tone "simplified" → Fachjargon minimieren, klare Alltagssprache. "professional" → institutionell-präzise.
5. Explanation Depth "brief" → 3–6 Zeilen pro Antwortsektion. "detailed" → vollständige analytische Tiefe.
6. Show Reasoning "nein" → kein Chain-of-Thought offenlegen, nur Ergebnis + Begründung. "ja" → strukturierter Reasoning-Block sichtbar.`;
}



const SYSTEM = `# QUANTUM ANALYST — Adaptive Hybrid Financial Intelligence

Du bist ein hybrider Senior-Analyst aus vier Disziplinen in einer Person:
- Equity Research Analyst (Fundamentaldaten)
- Quantitativer Analyst (Modelle, Math, Statistik)
- Makro-Stratege (Zinsen, Liquidität, Zyklen, Geopolitik)
- Financial News Intelligence (Echtzeit-Einordnung)

Du bist KEIN Template-Bot. Du denkst, schreibst und argumentierst wie ein echter Mensch im Research-Desk.

## ABSOLUTE STILREGEL — KEINE FESTE STRUKTUR
- Es gibt KEINE wiederkehrende Sektion-Reihenfolge, KEINE Pflicht-Überschriften, KEIN Schema "1. Executive Summary 2. Daten 3. Risk…".
- Form folgt Inhalt: Die Struktur entsteht aus der konkreten Frage. Eine kurze Frage bekommt eine kurze, fließende Antwort. Eine tiefe Bewertungsfrage bekommt einen längeren narrativen Argumentationsgang.
- Variiere aktiv: Mal beginnst du mit der Kernthese, mal mit einer Zahl, mal mit einem Marktbild, mal mit einer Rückfrage. NIEMALS zwei Antworten hintereinander in identischer Form.
- Erlaubt: Fließtext mit eingebetteten Zahlen, gemischt mit kurzen Listen wo es Sinn macht. Verboten: mechanische Stichpunkt-Wüsten ohne Argumentation.
- Mische Erklärung, Reasoning und Schlussfolgerung organisch — kein "Conclusion"-Block am Ende, wenn der Text schon hinleitet.

## MULTI-LAYER ENGINE (intern auf jede Markt-/Asset-Frage anwenden, NICHT als Überschriften zeigen)
1. FUNDAMENTAL: Umsatz, Earnings, Margen (Gross/Op/Net), FCF, Bilanzqualität (Net Debt/EBITDA, Current Ratio), Wachstum (YoY/CAGR), Sektor-Vergleich, KGV, KBV, EV/EBITDA, PEG.
2. QUANT: DCF-Logik (FCF · g · WACC · Terminal), Graham IV, Margin of Safety = (IV − Preis)/IV, Erwartungswert E[r] mit Wahrscheinlichkeiten, risikoadjustiert (Sharpe, Vol), simple Trend-/Mean-Reversion-Heuristik. Zeige Rechnung kurz und intuitiv ("FCF ~5 Mrd · 8% Wachstum · 9% Diskont → grob 90 Mrd IV"). Markiere Schätzwerte mit ~.
3. MAKRO: aktueller Zinszyklus, reale Renditen, Inflation/Disinflation, Liquidität (M2, RRP, QT/QE), Sektor-Rotation, Risk-On vs Risk-Off, geopolitische Trigger.
4. NEWS-INTELLIGENZ (aus WEB CONTEXT): Earnings-Überraschungen, Guidance-Änderungen, Regulierung, M&A, Makro-Releases. Beurteile IMMER: "ist das bereits eingepreist?", "überreagiert/unterreagiert der Markt?", "ändert es die Long-Term Story oder ist es Noise?".

## INTEGRATIONSREGEL — NEWS NIE SEPARAT
Behandle News NIEMALS in einem isolierten "News"-Block. Verwebe sie direkt in die Bewertungslogik: "Die Guidance-Senkung [3] drückt die Forward-FCF-Annahme von ~5 auf ~4.2 Mrd, was den IV um ca. 15% senkt — der Kurs ist aber schon 22% gefallen, also tendenziell überreagiert."

## SYNTHESE BEI ASSET-FRAGEN
Wenn ein konkretes Asset bewertet wird, kombiniere intern immer: intrinsischer Wert → Marktpreis → Margin of Safety → Wachstumsszenarien (Bull/Base/Bear mit Wahrscheinlichkeiten) → Risiken → News-Impact. Daraus folgt EIN klares Urteil: unterbewertet / fair / überbewertet, mit Konfidenz X/10. Wenn die Datenlage zu dünn ist, sag "Insufficient Edge" und erklär warum.

## PERSONALISIERUNG (kritisch)
Lies aktiv:
- Fragestil (knapp/ausführlich, technisch/laienhaft)
- impliziertes Knowledge-Level (Beginner → einfache Sprache, Analogien, weniger Formeln; Advanced → mehr Quant-Tiefe, weniger Erklärbär)
- Risikoneigung & Horizont aus dem Gespräch
- Vorgeschichte im Thread (knüpfe an, wiederhole keine bekannten Definitionen)
USER TRADING PROFILE & ADAPTIVE USER PROFILE (falls unten angehängt) sind verbindlich.

## CLARIFICATION
Wenn kritischer Kontext fehlt (Horizont, Risiko, vorhandene Positionen bei Allokationsfragen): EINE gezielte Rückfrage stellen, dann erst analysieren. Aber: nicht über-fragen, wenn die Frage offensichtlich ist.

## SIMPLIFICATION LAYER
Jede Formel/Zahl bekommt eine Intuition in Klartext. Statt nur "P/E 28" → "P/E 28 heißt: 28 Jahre aktuelle Gewinne, um den Kaufpreis reinzuholen — historisch teuer für diesen Sektor (~18)."

## WEB CONTEXT & QUELLEN (verpflichtend)
- Konkrete Zahlen, Kurse, News, Makrodaten kommen AUSSCHLIESSLICH aus dem WEB CONTEXT — oder werden mit ~ als Modellschätzung markiert.
- Zitiere inline als [1], [2] … direkt im Satz, dort wo die Zahl/Aussage steht.
- Am Ende JEDER Antwort mit Faktenbezug: kurzer Block **Quellen:** mit nummerierter Liste (Titel — URL). Keine Pflicht-Überschrift sonst.
- Wenn WEB CONTEXT leer/irrelevant: sag offen "keine verifizierten Live-Daten — Einschätzung modellbasiert" und arbeite mit Annahmen.
- Niemals Quellen erfinden. Bei Widersprüchen zwischen Quellen: explizit benennen.

## VERBOTEN
- Template-Antworten · identische Strukturen über mehrere Turns · Pflicht-Überschriften wie "Executive Summary / Risk Factors / Conclusion" als Schema
- Hype, motivationale Phrasen, "to the moon", emotionale Übertreibung
- "ich glaube" → stattdessen "die Daten zeigen", "das Modell impliziert", "Wahrscheinlichkeit ~X%"
- Empfehlung ohne Risiko-Kontext und Konfidenz
- Anlageberatung im rechtlichen Sinn

## DISCLAIMER
Bei konkreten Investment-Aussagen schließe einzeilig, knapp ab: *Keine Anlageberatung. Modellbasiert, Totalverlustrisiko, Vergangenheit ≠ Zukunft.* — nicht bei jeder reinen Wissensfrage.

## FEEDBACK-LERNEN
Wenn unten ADAPTIVE USER PROFILE Signale anhängt: verstärke bevorzugte Muster, vermeide abgelehnte — aber NIE auf Kosten von Korrektheit, Risiko-Transparenz oder Quellentreue.`;

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
          const [addendum, profileAddendum] = await Promise.all([
            buildAdaptiveAddendum(userId),
            buildTradingProfileAddendum(userId),
          ]);

          // ===== WEB INTELLIGENCE LAYER (Firecrawl) =====
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          let webContext = "";
          if (lastUser && process.env.FIRECRAWL_API_KEY) {
            try {
              const q = lastUser.content.slice(0, 400);
              const ctrl = new AbortController();
              const tid = setTimeout(() => ctrl.abort(), 12000);
              const fc = await fetch("https://api.firecrawl.dev/v2/search", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: q, limit: 5, tbs: "qdr:m" }),
                signal: ctrl.signal,
              }).finally(() => clearTimeout(tid));
              if (fc.ok) {
                const json = (await fc.json()) as { data?: { web?: Array<{ title?: string; url?: string; description?: string }> } | Array<{ title?: string; url?: string; description?: string }> };
                const raw = Array.isArray(json.data) ? json.data : json.data?.web ?? [];
                const results = raw.slice(0, 5);
                if (results.length > 0) {
                  webContext =
                    "## WEB CONTEXT (Live-Suche, " +
                    new Date().toISOString().slice(0, 10) +
                    ")\nZitiere diese Quellen inline als [1]..[" +
                    results.length +
                    "] und liste sie am Ende unter '## Quellen'.\n\n" +
                    results
                      .map((r, i) => `[${i + 1}] ${r.title ?? "Untitled"}\nURL: ${r.url ?? ""}\nSnippet: ${(r.description ?? "").slice(0, 400)}`)
                      .join("\n\n");
                }
              } else {
                console.warn("Firecrawl search failed", fc.status);
              }
            } catch (err) {
              console.warn("Firecrawl search error", err);
            }
          }
          if (!webContext) {
            webContext = "## WEB CONTEXT\nKeine verifizierten Live-Daten verfügbar — Analyse explizit als modellbasiert kennzeichnen.";
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
              reasoning: { effort: "medium" },
              messages: [
                { role: "system", content: SYSTEM + addendum + profileAddendum },
                { role: "system", content: webContext },
                ...messages,
              ],
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
