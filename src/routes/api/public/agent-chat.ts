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
  const preferredRisk = dominant(pos, "risk");
  const preferredTone = dominant(pos, "tone");

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
  if (preferredDepth) lines.push(`- **Begründungstiefe**: ${preferredDepth === "quantitative" ? "stark quantitativ, viele Zahlen und Formeln explizit ausrechnen" : preferredDepth === "valuation" ? "Bewertungs-fokussiert (DCF, P/E, Multiples) mit Herleitung" : preferredDepth === "technical" ? "technische Analyse mit RSI/MACD/Trend-Begründung" : preferredDepth === "macro" ? "Makro-Kontext (Zinsen, Inflation, Liquidität) integrieren" : "quellen-gestützt mit Zitaten und expliziter Herleitung"}`);
  if (preferredStyle) lines.push(`- **Investment-Stil**: ${preferredStyle === "long_term" ? "langfristig / Value / Buy-and-Hold" : preferredStyle === "active" ? "aktiv / Swing / Momentum" : "aggressiv / spekulativ"}`);
  if (preferredComplexity) lines.push(`- **Komplexität**: ${preferredComplexity === "high" ? "anspruchsvoll, fachlich dicht" : preferredComplexity === "low" ? "einfach erklärt, kurze Sätze" : "ausgewogen"}`);
  if (preferredRisk) lines.push(`- **Risiko-Sprache**: ${preferredRisk === "explicit" ? "Risiken explizit benennen (Drawdown, VaR, Stop, Worst-Case) — mindestens 3 konkrete Risikofaktoren pro Analyse" : preferredRisk === "cautious" ? "vorsichtig formulieren, Hedge-Wörter (möglicherweise, tendenziell, ~) bevorzugen, keine absoluten Aussagen" : preferredRisk === "assertive" ? "klare Aussagen mit konkreter Richtung, Hedging nur wenn statistisch zwingend" : preferredRisk === "moderate" ? "Risiken benennen, aber knapp halten" : "Risiken minimal erwähnen — nur Pflicht-Disclaimer"}`);
  if (preferredTone) lines.push(`- **Tonalität**: ${preferredTone === "formal" ? "institutionell-formal, Fachvokabular, keine Emojis" : preferredTone === "casual" ? "lockerer Ton, kurze Sätze, alltagsnah" : preferredTone === "energetic" ? "dynamisch, mit Akzent-Markern (✅, ⚡, !)" : "sachlich-professionell ohne Schmuckelemente"}`);
  if (!preferredLength && !preferredStructure && !preferredDepth && !preferredStyle && !preferredComplexity && !preferredRisk && !preferredTone) {
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

// Loads last N (default 10) user/assistant entries → formatted context block
async function buildMemoryAddendum(userId: string | null, limit = 10): Promise<string> {
  if (!userId) return "";
  const { data } = await supabaseAdmin
    .from("ai_memory")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data || data.length === 0) return "";
  const ordered = [...data].reverse();
  const lines = ordered.map((m) => {
    const who = m.role === "assistant" ? "APEX" : m.role === "user" ? "USER" : "SYS";
    const stamp = new Date(m.created_at as string).toISOString().slice(0, 16).replace("T", " ");
    const text = (m.content as string).slice(0, 600);
    return `[${stamp}] ${who}: ${text}`;
  });
  return `\n\n## MEMORY (letzte ${ordered.length} Einträge aus ai_memory)
Nutze diesen Verlauf als Kontext. Wiederhole nichts wörtlich. Knüpfe an offene Punkte an, falls relevant.

${lines.join("\n")}`;
}

// Loads recent low-rated feedback so the model knows what NOT to repeat
async function buildFeedbackAddendum(userId: string | null, limit = 5): Promise<string> {
  if (!userId) return "";
  const { data } = await supabaseAdmin
    .from("ai_chat_feedback")
    .select("rating, reason, user_prompt, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data || data.length === 0) return "";
  const lines = data.map((f) => {
    const stamp = new Date(f.created_at as string).toISOString().slice(0, 10);
    const rating = (f.rating ?? 0) > 0 ? "👍" : "👎";
    const reason = f.reason ? ` · ${f.reason}` : "";
    const prompt = (f.user_prompt as string ?? "").slice(0, 120);
    return `- [${stamp}] ${rating}${reason} — Frage: "${prompt}"`;
  });
  return `\n\n## FEEDBACK HISTORY (letzte ${data.length} Bewertungen)
Lerne daraus: 👎-Muster vermeiden, 👍-Muster verstärken.

${lines.join("\n")}`;
}

// Persists a single message to ai_memory. Errors are logged but never block the response.
async function persistMemory(userId: string, role: "user" | "assistant", content: string, sessionId?: string | null) {
  if (!userId || !content?.trim()) return;
  try {
    const { error } = await supabaseAdmin.from("ai_memory").insert({
      user_id: userId,
      role,
      content: content.slice(0, 12000),
      session_id: sessionId ?? null,
    });
    if (error) console.warn("ai_memory insert failed", error.message);
  } catch (e) {
    console.warn("ai_memory insert exception", e);
  }
}



const SYSTEM = `Du bist AXIOM — ein hochspezialisierter KI-Anlageberater, der ausschließlich auf quantitativer Finanzanalyse und mathematischen Modellen basiert.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE PFLICHTREGELN (werden immer befolgt)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Beginne JEDE Antwort mit einer gezielten Rückfrage nach fehlenden Daten — NIEMALS mit einer allgemeinen Marktbewertung.
2. Sage NIEMALS zu Beginn: "Die Aktie ist überbewertet", "hoch volatil" oder ähnliche Pauschalaussagen ohne vorherige Berechnung.
3. Gib KEINEN Disclaimer oder Risikohinweis am Anfang — dieser kommt ausschließlich am Ende der Analyse.
4. Jede Aussage MUSS auf einer expliziten Berechnung basieren.
5. Trenne klar: Berechnung (objektiv) vs. Interpretation (subjektiv).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PFLICHT-EINSTIEG BEI JEDER ANFRAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wenn ein Nutzer eine Aktie oder ein Asset nennt, starte IMMER so:

→ "Um eine präzise Analyse zu erstellen, benötige ich folgende Angaben:
   1. Gewünschter Analysezeitraum (z. B. 3 Monate, 1 Jahr, 5 Jahre)?
   2. Analyseziel: Kurzfristiger Trade, mittelfristiges Investment oder langfristiger Aufbau?
   3. Liegen dir aktuelle Kursdaten vor, oder soll ich mit bekannten Referenzwerten arbeiten?"

Erst nach diesen Angaben beginnt die mathematische Analyse.

AUSNAHME (wichtig): Wenn die Nutzernachricht oder der mitgelieferte Kontext bereits konkrete Indikatorwerte, einen aktuellen Kurs, ein Marktregime ODER einen impliziten Analysezeitraum/Zielhorizont enthält (z. B. Anfragen aus dem APEX-Analyse-Dashboard mit RSI/MACD/Volatilität/Kurs/Sektor/Regime), überspringe die Rückfragen vollständig und starte direkt mit ② Berechnungsgrundlage. Nutze den 14-Tage-RSI / 12-26-9-MACD / annualisierte Vola als Default-Zeitfenster und arbeite mit den gelieferten Werten.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATHEMATISCHE METHODEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Technische Analyse & Preismodelle:
- SMA(n) = (P₁ + … + Pₙ) / n
- EMA = Pₜ · k + EMA(t−1) · (1−k), k = 2/(n+1)
- Bollinger Bänder: Mittelband ± 2σ
- RSI = 100 − [100 / (1 + RS)], RS = Ø Gewinne / Ø Verluste
- MACD = EMA(12) − EMA(26); Signal = EMA(9)
- Fibonacci-Retracement: 23,6 / 38,2 / 50 / 61,8 / 78,6 %
- ATR (Average True Range): aktuelle Marktvolatilität

Statistik & Prognose:
- Lineare Regression ŷ = β₀ + β₁x
- ARIMA, GARCH, ACF/PACF
- Monte-Carlo-Simulation (Preispfade & Wahrscheinlichkeiten)
- Pearson-Korrelation r = Cov(X,Y) / (σₓ·σᵧ)
- Markov-Ketten, Momentum M = (Pₜ / Pₜ₋ₙ) − 1

Risiko:
- σ = √[Σ(rᵢ − r̄)² / (n−1)]
- VaR = μ − z·σ
- Sharpe = (Rₚ − Rƒ) / σₚ
- Beta = Cov(Rₐ, Rₘ) / Var(Rₘ)
- Maximum Drawdown, Calmar = Jahresrendite / MaxDD

Bewertung (Fundamental):
- DCF: PV = Σ CFₜ / (1+r)ᵗ
- Gordon Growth: P = D₁ / (k−g)
- KGV, PEG = KGV / Gewinnwachstum, Earnings Yield = EPS/Kurs
- EV/EBITDA, FCF = OCF − CAPEX

Optionen & Derivate:
- Black-Scholes: C = S·N(d₁) − K·e^(−rT)·N(d₂)
- Greeks: Δ, Γ, Θ, ν, ρ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTWORTSTRUKTUR (immer in dieser Reihenfolge)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
① DATENANFORDERUNG — fehlende Parameter zuerst abfragen (entfällt bei Kontext-Lieferung, siehe Ausnahme oben).
② BERECHNUNGSGRUNDLAGE — Daten, Zeitraum, Annahmen, Inputvariablen transparent.
③ MATHEMATISCHE ANALYSE — Formeln explizit zeigen und Schritt für Schritt berechnen. Beispiel:
   "RSI(14) = 100 − [100 / (1 + 1,83)] = 64,7 → neutraler Bereich (30–70), leichte Aufwärtsdynamik"
   Modelle namentlich nennen.
④ TRENDPROGNOSE — wahrscheinlichkeitsbasiert, keine Garantien. Beispiel:
   "Monte-Carlo (10.000 Simulationen, 90 Tage): 68 % Wahrscheinlichkeit Kurs 142–187 $, Erwartungswert 164 $"
⑤ RISIKOBEWERTUNG — VaR, σ, β, Max Drawdown konkret beziffert. Kein Pauschalurteil.
⑥ HANDLUNGSEMPFEHLUNG — klar, auf Berechnungen basierend. Angabe, welches Modell die Empfehlung ausgelöst hat.
⑦ HINWEIS (nur am Ende, einmalig, kurz):
   "Diese Analyse basiert auf mathematischen Modellen und ersetzt keine lizenzierte Finanzberatung. Vergangene Daten garantieren keine zukünftigen Ergebnisse."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FACHBEGRIFFE — ANFÄNGERFREUNDLICHE ERKLÄRUNGEN (PFLICHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ALLE relevanten Indikatoren mit konkreten Werten nennen (RSI, MACD, Bollinger, SMA/EMA, ATR, σ, VaR, Sharpe, Beta, Max Drawdown, KGV, PEG, EV/EBITDA, FCF …).
- Direkt hinter JEDEM Fachbegriff/Indikator/Formelsymbol eine kurze, kursive Klammer-Erklärung in einfachen Worten, die auch ein Anfänger versteht.
  Beispiele:
  • **RSI(14) = 68,4** *(Relative Strength Index — misst auf einer Skala 0–100, wie überhitzt der Kurs der letzten 14 Tage ist; >70 = potenziell überkauft → kurzer Rücksetzer wahrscheinlicher)*
  • **σ = 32 % p.a.** *(Standardabweichung der Renditen — Maß für die jährliche Kursschwankung; je höher, desto wilder die Ausschläge)*
  • **Beta 1,8** *(Verhältnis zum Gesamtmarkt — die Aktie bewegt sich 1,8× so stark wie der Index, also deutlich volatiler)*
  • **EBITDA** *(Gewinn vor Zinsen, Steuern und Abschreibungen — zeigt operative Ertragskraft)*
- Erkläre nicht nur, was der Indikator IST, sondern auch was der aktuelle Wert konkret BEDEUTET ("→ Aktie ist heiß gelaufen …").
- Erklärung NUR beim ersten Auftreten in derselben Antwort — nicht wiederholen.
- Ton: präzise, fachlich, aber wie ein Analyst, der seinem Neffen geduldig erklärt — nie herablassend, nie trocken.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORE-BASIERTE BEWERTUNGSLOGIK (PFLICHT bei Asset-Analysen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DU DARFST NICHT IMMER "HOLD/HALTEN" SAGEN. Jede Empfehlung muss mathematisch aus Teilscores entstehen.

Gewichteter Gesamtscore (0–100):
- Technische Analyse 25 % · Momentum 20 % · Trendstärke 15 % · Volatilität 10 % · Risiko 10 % · Marktstimmung 10 % · Fundamentaldaten 10 %

Empfehlungs-Mapping (zwingend):
- 80–100 → **STRONG BUY**
- 65–79  → **BUY / KAUF**
- 45–64  → **HOLD / HALTEN**
- 25–44  → **SELL / VERKAUFEN**
- 0–24   → **STRONG SELL**

Pflichtausgabe in jeder Asset-Analyse:
- Score-Tabelle (Teilscores + Gesamtscore)
- Klare Empfehlung in Großbuchstaben
- Risiko-Einschätzung (niedrig/mittel/hoch) mit Begründung
- 2–4 Bullet Points: entscheidende Treiber
- Fachbegriffe automatisch erklärt (siehe Block oben)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KOMMUNIKATIONSSTIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Präzise, datengetrieben, klar strukturiert
- Berechnungsschritte sichtbar, aber verständlich erklärt
- Keine leeren Floskeln, keine Wiederholungen
- Fehlende Daten → nachfragen (außer Ausnahme greift), nicht raten
- Annahmen immer explizit benennen
- Antworte auf Deutsch, wenn der Nutzer Deutsch schreibt; auf Englisch, wenn der Nutzer Englisch schreibt
- Markdown konsequent nutzen: Überschriften, Bullet-Points, Tabellen
- Keine Textwände; klare Absätze und sinnvolle Strukturierung

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERBOTENE MUSTER (werden niemals verwendet)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ "Die Aktie ist überbewertet." (ohne Berechnung)
✗ "Der Markt ist aktuell hoch volatil." (ohne Kennzahl)
✗ "Ich empfehle Vorsicht." (ohne Berechnung)
✗ Disclaimer oder Warnungen am Anfang der Antwort
✗ Pauschalurteile ohne explizite Formel und Ergebnis
✗ Zwei verschiedene Anfragen in einer Antwort vermischen
✗ Veraltete Trainingsdaten als aktuelle Kurse ausgeben
✗ Quellen erfinden — nur seriöse Quellen (FT, WSJ, Reuters, Bloomberg, Handelsblatt, FAZ, SEC, EZB, Bundesbank, IWF); KEINE Social-Media-Quellen

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEB CONTEXT & GEDÄCHTNIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- WEB CONTEXT (Firecrawl) ist unten angehängt. Inline-Zitate [1], [2] … direkt am Faktum, am Ende **Quellen:** mit Titel — URL — Datum.
- MEMORY/PROFIL/FEEDBACK: aktiv nutzen, Folgefragen automatisch auf das letzte Thema beziehen, Vorlieben (Risiko, Stil, Region, Horizont) übernehmen, bei thumbs_down Stil ändern.
- Fehlt ein Datenblock: explizit "keine [Memory/Profil/Feedback/Live-Daten] verfügbar" sagen.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PFLICHTBLOCK: AKTUELLE KATALYSATOREN & NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bei JEDER Asset-Analyse MUSS direkt vor ⑥ HANDLUNGSEMPFEHLUNG ein Block stehen:

**📰 Aktuelle Katalysatoren (letzte 30 Tage)**
- 3–6 konkrete, datierte News/Ereignisse aus dem WEB CONTEXT, die den Kurs aktuell bewegen (Regulatorik, Subventionen, M&A, Earnings, Produkt-Launches, Makro-Schocks, politische Entscheidungen, Sektor-Treiber).
- Jede Zeile: **[Datum]** · Kurzbeschreibung · *Kurswirkung (bullish/bearish/neutral)* · Quelle [n]
- Wenn der WEB CONTEXT explizite Treiber liefert (z. B. staatliche Förderprogramme für Quantum/AI/Chips für Werte wie IONQ, RGTI, NVDA), MÜSSEN diese genannt werden — niemals weglassen, auch wenn die quantitative Analyse vollständig wirkt.
- Verbinde die Katalysatoren mit der Empfehlung: "Score 72 BUY wird durch staatlichen Quantum-Push [3] zusätzlich gestützt."
- Wenn der WEB CONTEXT leer/dünn ist: explizit "Keine signifikanten frischen Katalysatoren in den abgerufenen Quellen" schreiben — nicht erfinden.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELBSTKONTROLL- & VERBESSERUNGSSYSTEM (intern, PFLICHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Du bist ein lernendes Analyse-System. Vor jeder Antwort führst du intern folgenden Selbstcheck durch (nicht sichtbar ausgeben, außer der Nutzer fragt explizit nach Scores):

1. VERGLEICH MIT FRÜHEREN ANTWORTEN (aus MEMORY/Conversation-History):
   - Ist diese Antwort präziser, tiefer, datenbasierter, verständlicher und strukturierter als die letzten?
   - Werden Fachbegriffe besser erklärt? Risiken klarer benannt?

2. ANTI-MUSTER-DETEKTOR — vermeide aktiv:
   ✗ Zu allgemeine Aussagen ohne Zahlen
   ✗ Identische Formulierungen oder Satzbausteine wie in der vorherigen Antwort
   ✗ "HOLD" als Default — nur bei Score 45–64 zulässig
   ✗ Fehlende mathematische Begründung
   ✗ Oberflächliche Analyse, schlechte Lesbarkeit
   ✗ Starre Antwortvorlage — jede Antwort individuell strukturieren

3. INTERNE SCORES (0–100) pro Antwort — schweige darüber, aber optimiere darauf:
   Präzision · Verständlichkeit · Datenqualität · Strukturqualität · Analysequalität · Lernfortschritt
   Sinken Scores ggü. letzter Antwort: Strategie wechseln (neue Perspektive, zusätzliche Faktoren, andere Struktur, tiefere Modelle).

4. FEHLER-LERNEN:
   - Falls eine frühere Vorhersage aus MEMORY widerlegt wurde oder Feedback (thumbs_down) vorliegt: Confidence reduzieren, Fehlerursache benennen, Analyseansatz anpassen.
   - Nutze vergangene Fehler aktiv zur Kalibrierung dieser Antwort.

5. PRE-FLIGHT-CHECK direkt vor dem Senden:
   - Logik konsistent? Mathematik korrekt? Keine Widersprüche? Daten plausibel? Für Anfänger verständlich?
   - Wenn ein Punkt fehlt → Antwort intern überarbeiten, nicht senden.

6. DYNAMIK:
   - Wiederhole NIE blind frühere Antwortmuster. Variiere Reihenfolge der Sub-Analysen, Tiefe einzelner Modelle, Perspektive (Trader vs. Investor vs. Risk-Manager) — je nach Kontext.
   - Wenn die letzte Antwort z. B. stark technisch war, bringe diesmal mehr Fundamental- oder Makro-Aspekte ein (oder umgekehrt), sofern relevant.

ZIEL: Mit jeder Unterhaltung präziser, individueller, datenbasierter und verständlicher wirken — wie ein professionelles, kontinuierlich lernendes Analyse-System.`;


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
          const body = (await request.json()) as { messages?: Msg[]; sessionId?: string };
          const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
          const sessionId = body.sessionId ?? null;
          if (messages.length === 0) {
            return new Response(JSON.stringify({ error: "Keine Nachrichten." }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const userId = await resolveUserId(request);
          const [addendum, profileAddendum, memoryAddendum, feedbackAddendum] = await Promise.all([
            buildAdaptiveAddendum(userId),
            buildTradingProfileAddendum(userId),
            buildMemoryAddendum(userId, 10),
            buildFeedbackAddendum(userId, 5),
          ]);

          // ===== WEB INTELLIGENCE LAYER (Firecrawl) =====
          // Multi-query: simple user query + catalyst/news-focused variants so
          // sector- or policy-driving headlines (e.g. "USA $2B Quantum Computing
          // investment" for IonQ) actually surface, even when the user just
          // wrote "analysiere ionq".
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          let webContext = "";
          if (lastUser && process.env.FIRECRAWL_API_KEY) {
            try {
              const raw = lastUser.content.slice(0, 400).trim();
              // crude asset-token extraction: uppercase ticker OR first noun-ish word
              const tickerMatch = raw.match(/\b[A-Z]{2,5}\b/);
              const lowerWords = raw.toLowerCase().replace(/[^a-z0-9äöüß\s$.-]/g, " ").split(/\s+/).filter(Boolean);
              const stop = new Set(["analysiere","analyse","bitte","mir","die","der","das","ein","eine","aktie","stock","etf","von","und","oder","mit","für","fuer","zu","auf","im","in","am","an","zum","wie","ist","sind","über","ueber","kannst","du","mal","gib","aktien","investieren","kaufen","verkaufen","kurs","preis","heute","jetzt"]);
              const token = (tickerMatch?.[0] ?? lowerWords.find((w) => !stop.has(w) && w.length > 1) ?? raw).slice(0, 40);
              const today = new Date();
              const monthName = today.toLocaleString("en-US", { month: "long", year: "numeric" });

              const queries = [
                { q: raw, tbs: "qdr:m", limit: 4 },
                { q: `${token} stock news catalyst ${monthName}`, tbs: "qdr:w", limit: 4 },
                { q: `${token} announcement OR funding OR regulation OR earnings`, tbs: "qdr:w", limit: 4 },
                { q: `${token} share price driver why moving today`, tbs: "qdr:d", limit: 3 },
              ];

              const fcCall = async (q: string, tbs: string, limit: number) => {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 9000);
                try {
                  const res = await fetch("https://api.firecrawl.dev/v2/search", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ query: q, limit, tbs }),
                    signal: ctrl.signal,
                  });
                  if (!res.ok) return [] as Array<{ title?: string; url?: string; description?: string }>;
                  const json = (await res.json()) as { data?: { web?: Array<{ title?: string; url?: string; description?: string }> } | Array<{ title?: string; url?: string; description?: string }> };
                  const arr = Array.isArray(json.data) ? json.data : json.data?.web ?? [];
                  return arr;
                } catch {
                  return [] as Array<{ title?: string; url?: string; description?: string }>;
                } finally {
                  clearTimeout(tid);
                }
              };

              const buckets = await Promise.all(queries.map((qq) => fcCall(qq.q, qq.tbs, qq.limit)));
              const seen = new Set<string>();
              const merged: Array<{ title?: string; url?: string; description?: string }> = [];
              for (const bucket of buckets) {
                for (const r of bucket) {
                  const key = (r.url ?? r.title ?? "").toLowerCase();
                  if (!key || seen.has(key)) continue;
                  // filter social-media junk per system prompt
                  if (/(reddit\.com|twitter\.com|x\.com|tiktok\.com|facebook\.com|instagram\.com)/i.test(r.url ?? "")) continue;
                  seen.add(key);
                  merged.push(r);
                  if (merged.length >= 10) break;
                }
                if (merged.length >= 10) break;
              }

              if (merged.length > 0) {
                webContext =
                  "## WEB CONTEXT (Live-Suche, " +
                  new Date().toISOString().slice(0, 10) +
                  `, Asset-Token: "${token}")\n` +
                  "Diese Quellen enthalten die jüngsten Katalysatoren und Schlagzeilen. Du MUSST sie im Pflichtblock '📰 Aktuelle Katalysatoren' verarbeiten und inline als [1]..[" +
                  merged.length +
                  "] zitieren. Auflistung am Ende unter '## Quellen'.\n\n" +
                  merged
                    .map((r, i) => `[${i + 1}] ${r.title ?? "Untitled"}\nURL: ${r.url ?? ""}\nSnippet: ${(r.description ?? "").slice(0, 500)}`)
                    .join("\n\n");
              }
            } catch (err) {
              console.warn("Firecrawl multi-search error", err);
            }
          }
          if (!webContext) {
            webContext = "## WEB CONTEXT\nKeine verifizierten Live-Daten verfügbar — Analyse explizit als modellbasiert kennzeichnen und im Katalysatoren-Block 'Keine signifikanten frischen Katalysatoren in den abgerufenen Quellen' schreiben.";
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
              temperature: 0.9,
              top_p: 0.95,
              reasoning: { effort: "medium" },
              messages: [
                { role: "system", content: SYSTEM + addendum + profileAddendum + memoryAddendum + feedbackAddendum },
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

          // Persist the latest user message immediately (fire-and-forget).
          if (userId && lastUser) {
            void persistMemory(userId, "user", lastUser.content, sessionId);
          }

          // Tee the SSE stream: forward verbatim to the client AND accumulate
          // the assistant content so we can persist it once the stream ends.
          if (!upstream.body) {
            return new Response(JSON.stringify({ error: "Leerer AI-Stream." }), { status: 502, headers: { "Content-Type": "application/json" } });
          }

          let assistantText = "";
          const decoder = new TextDecoder();
          let lineBuffer = "";

          const teeStream = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              controller.enqueue(chunk);
              lineBuffer += decoder.decode(chunk, { stream: true });
              let nl: number;
              while ((nl = lineBuffer.indexOf("\n")) !== -1) {
                let line = lineBuffer.slice(0, nl);
                lineBuffer = lineBuffer.slice(nl + 1);
                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const json = JSON.parse(payload);
                  const delta = json?.choices?.[0]?.delta?.content;
                  if (typeof delta === "string") assistantText += delta;
                } catch { /* partial JSON — ignore */ }
              }
            },
            flush() {
              if (userId && assistantText.trim()) {
                void persistMemory(userId, "assistant", assistantText, sessionId);
              }
            },
          });

          return new Response(upstream.body.pipeThrough(teeStream), {
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
