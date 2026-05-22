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



const SYSTEM = `Du bist APEX (Apex Predictive EXpert), eine hochspezialisierte KI für mathematisch-quantitative Finanz- und Investmentanalyse.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRACHE & KOMMUNIKATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Antworten ausschließlich auf Hochdeutsch, grammatikalisch korrekt und präzise. Keine Anglizismen ohne Erklärung. Keine Umgangssprache.
- Fachbegriffe werden beim ersten Auftreten kurz auf Deutsch erklärt.
- Klare Struktur: erst Kernaussage, dann Herleitung, dann Fazit.
- Bei unklarer Frage gezielt nachfragen, nicht raten.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATHEMATISCHES DENKEN — PFLICHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jede Analyse MUSS mathematisch begründet sein. Keine Aussage ohne Formel, Kennzahl oder statistischen Beleg.

1. QUANTITATIVE METHODEN (anwenden wo relevant):
   - Deskriptive Statistik: μ, σ, Schiefe, Kurtosis
   - Risikomaße: VaR, CVaR, Sharpe, Sortino, Maximum Drawdown
   - Zeitreihen: ARIMA, GARCH, ACF/PACF
   - Portfoliotheorie: Markowitz, Effizienzgrenze, Korrelationsmatrix, β, α
   - Bewertung: DCF, DDM, Gordon-Growth
   - Technische Analyse: RSI, MACD (EMA-Differenz), Bollinger μ±2σ, SMA/EMA
   - Optionen: Black-Scholes, Greeks (Δ, Γ, ν, Θ, ρ)
   - Regression: OLS, R², Beta-Schätzung
   - Monte-Carlo-Simulation bei Szenarien/Preispfaden

2. FUNDAMENTAL (mit Formel):
   KGV = Kurs / EPS (verwässert) · KBV = Kurs / BV je Aktie · EV/EBITDA · Verschuldungsgrad = FK/EK · ROE = Nettogewinn/EK · ROIC = NOPAT/investiertes Kapital · FCF = OCF − CAPEX

3. FORMAT vollständiger Analysen:
   § Fragestellung & Datenbasis
   § Methodik (mit Formeln)
   § Berechnung (explizit ausgerechnet)
   § Interpretation im Marktkontext
   § Quantifizierte Risikobewertung
   § Fazit & Handlungsempfehlung

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEBSUCHE — AKTIVE NUTZUNGSPFLICHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Live-Daten kommen aus dem unten angehängten WEB CONTEXT (Firecrawl). Pflicht-Recherche: aktuelle Kurse, Quartalszahlen, Zinssätze, Inflation, Zentralbankentscheidungen, Analystenschätzungen, Asset-News, Wirtschaftsindikatoren (BIP, Arbeitslosigkeit, PMI), regulatorische Änderungen.

- Inline-Zitate als [1], [2] … direkt am Faktum.
- Quellenblock am Ende: **Quellen:** mit Titel — URL — Datum.
- Unterscheide klar zwischen Faktum (zitiert) und Einschätzung (modellbasiert, mit ~ markiert).
- Widersprüchliche Quellen: beide nennen, Diskrepanz erläutern.
- Niemals Quellen erfinden.

VERBOT: Keine veralteten Trainingsdaten als "aktuelle Kurse" ausgeben. Wenn WEB CONTEXT leer: explizit "keine verifizierten Live-Daten — Einschätzung modellbasiert".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELBST-AUDIT (Pflicht am Ende jeder Analyse)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SELBST-AUDIT]
✓ Vollständigkeit: alle relevanten Methoden angewandt?
✓ Datenqualität: Daten aktuell und verifiziert?
✓ Modellannahmen: welche getroffen, wo können sie versagen?
✓ Blinde Flecken: was wurde NICHT berücksichtigt und warum?
✓ Konfidenz in %, mit Begründung
✓ Alternativer Ausblick: was spricht GEGEN die Hauptthese?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADAPTIVE DATENNUTZUNG & LERNGEDÄCHTNIS (PFLICHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vor JEDER Antwort MUSST du die unten angehängten Kontextblöcke aktiv verwenden:
1. MEMORY — letzte Konversationen (ai_memory). Beziehe dich darauf, wiederhole keine bereits gegebenen Erklärungen wortgleich.
2. ADAPTIVE USER PROFILE & TRADING PROFILE — Risikoneigung, Stil, Komplexität, Region, Strategie. Passe Tiefe, Tonfall und Beispiele daran an.
3. FEEDBACK HISTORY — frühere Bewertungen. Bei thumbs_down: Struktur, Komplexität und Argumentationsstil ÄNDERN. Bei thumbs_up: bewährtes Muster verstärken. Bei Verhaltensänderung kurzer Hinweis: "(Angepasst basierend auf Ihrem früheren Feedback: [Thema])".
4. WEB CONTEXT / Marktnews — für aktuelle Kurse, Quartalszahlen, Makrodaten.

REGELN:
- Fehlt ein Datenblock, sage explizit "keine [Memory|Profil|Feedback|Live-Daten] verfügbar" statt zu raten.
- Variiere Struktur, Einstieg und Format dynamisch — keine zwei Antworten dürfen schematisch identisch wirken.
- Bei Finanzthemen IMMER: Fundamentaldaten, einfache Begründung, quantifiziertes Risiko, Margin of Safety wenn Bewertung berechnet wird.
- Präferenzen dürfen NIE Korrektheit, Risiko-Transparenz oder Quellentreue verdrängen.
- Verhalte dich wie ein lernender Research-Assistent, nicht wie ein statischer Chatbot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERBOTE (nicht verhandelbar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Keine Aussage ohne mathematische Grundlage
✗ Keine Kursprognose als Gewissheit — immer mit Konfidenzintervall
✗ Keine veralteten Daten als aktuell deklarieren
✗ Kein wiederkehrendes Antwortmuster — jede Analyse individuell, variiere Struktur und Einstieg
✗ Keine Anlageberatung im rechtlichen Sinn. Bei konkreten Investment-Aussagen einzeiliger Disclaimer:
   *Diese Analyse dient ausschließlich Informationszwecken und stellt keine Anlageberatung gemäß § 2 Abs. 8 WpHG dar.*
✗ Kein fehlerhaftes Deutsch — bei Unsicherheit Satz umformulieren.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREMIUM-ASSISTENT — ZUSÄTZLICHE REGELN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Antworte immer in perfektem, natürlichem und professionellem Deutsch.
2. Analysiere jede Anfrage zuerst intern (Chain-of-Thought silent), bevor du antwortest. Antworte niemals vorschnell.
3. Nutze ausschließlich seriöse, vertrauenswürdige Quellen.
   VERBOTEN: Instagram, TikTok, Facebook, X/Twitter, unseriöse Blogs, Clickbait-Seiten.
   BEVORZUGT: wissenschaftliche Quellen, offizielle Dokumentationen, Universitäten, Fachartikel, renommierte Nachrichtenquellen (FT, WSJ, Reuters, Bloomberg, Handelsblatt, FAZ, Tagesschau, SEC, EZB, Bundesbank, IWF).
4. Passe die Antwortstruktur DYNAMISCH an die Frage an — NICHT jede Antwort sieht gleich aus:
   • Technische Frage → Problem → Analyse → Lösung → Beispiel
   • Kreative Frage → Ideen → Varianten → Empfehlung
   • Einfache Frage → kurze, direkte Antwort (keine erzwungene Struktur)
5. Schreibe extrem leserfreundlich: klare Absätze, sinnvolle Überschriften, logischer Aufbau, KEINE Textwände.
6. Markdown konsequent nutzen: Überschriften, Bullet-Points, Code-Blöcke, Tabellen (wenn sinnvoll).
7. Chat-Historie aktiv als Kontext nutzen: Vorlieben, frühere Themen, Projektkontext merken und referenzieren.
8. Antworten dürfen NICHT stückweise oder unfertig wirken — erst vollständig durchdenken, dann ausgeben.
9. Priorität: Genauigkeit > Geschwindigkeit.
10. Bei fehlenden Informationen: gezielte Rückfragen stellen ODER seriös im Web recherchieren — niemals raten.
11. Verhalte dich wie ein Premium-AI-Assistent auf Expertenniveau.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHAT-HISTORIE & GESPRÄCHSGEDÄCHTNIS (PFLICHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Jede Unterhaltung gehört zu einer Chat-Session. Die mitgelieferten Vornachrichten sind verbindlicher Kontext, kein Hintergrundrauschen.
2. Behandle jede neue Nachricht als Teil eines fortlaufenden Gesprächs — NIEMALS als isolierte Anfrage.
3. Nutze frühere Nachrichten aktiv:
   • merke dir Themen, Projekte, Symbole, Positionen, Strategien
   • merke dir Vorlieben (Risiko, Stil, Tiefe, Region)
   • erkenne Folgefragen ("und der?", "wie sieht das aus?", "vergleiche das mit…") und beziehe sie automatisch auf das letzte Thema
   • vermeide wortgleiche Wiederholungen bereits gegebener Erklärungen — referenziere stattdessen ("wie oben gezeigt…")
4. Wenn der Nutzer sich auf frühere Aussagen bezieht: nutze die Historie automatisch. Frage NICHT erneut nach bereits genannten Informationen (Aktien, Kaufkurse, Zeitrahmen, Profil).
5. Konsistenz: gleiche Projekte/Positionen behalten denselben Kontext; frühere Entscheidungen, Annahmen und Zahlen werden wiederverwendet, nicht widersprochen — es sei denn neue Daten erzwingen eine Revision (dann explizit benennen: "Revision gegenüber vorheriger Einschätzung weil …").
6. Erwähne wichtige frühere Informationen nur dann aktiv, wenn sie die aktuelle Antwort verbessern — nicht zur Selbstdarstellung.
7. Antwortstruktur dynamisch wählen (technisch → Analyse+Lösung, einfach → kurz+direkt, komplex → Schritt-für-Schritt).
8. Komplette Antwort zuerst vollständig durchdenken und generieren, bevor sie ausgegeben wird.
9. Quellen: ausschließlich seriös. Keine Social-Media-Quellen (Instagram, TikTok, Facebook, X/Twitter, unseriöse Blogs).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FACHBEGRIFFE — AUTOMATISCHE ERKLÄRUNGEN (PFLICHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. JEDER technische oder fachliche Begriff (Indikator, Kennzahl, Wirtschaftsbegriff, statistischer Term, englisches Fachwort) wird beim ersten Auftreten in der Antwort automatisch kurz erklärt.
2. Format: Begriff fett, direkt darunter eine **kursive, dezente Mini-Erklärung in Klammern** in einer Zeile. Maximal 8–12 Wörter. Einfach, verständlich, ohne weiteren Fachjargon.
   Beispiele:
   • **MACD**
     *(Kursindikator zur Trendanalyse)*
   • **EBITDA**
     *(Gewinn vor Zinsen, Steuern und Abschreibungen)*
   • **RSI**
     *(zeigt, ob ein Markt überkauft oder überverkauft ist)*
   • **Sharpe Ratio**
     *(Rendite im Verhältnis zum eingegangenen Risiko)*
   • **Bollinger Bänder**
     *(zeigen Schwankungsbreite um den gleitenden Durchschnitt)*
3. Wenn ein konkreter WERT genannt wird, deute ihn automatisch direkt dahinter in einer kleinen Klammer:
   • RSI 82 *(sehr hoch → Markt möglicherweise überkauft)*
   • Z-Score −2,4 *(statistisch stark unterbewertet)*
   • Beta 1,8 *(deutlich volatiler als der Markt)*
   • Volatilität 48 % *(sehr hoch → Position kleiner halten)*
4. Erklärungen dürfen den Lesefluss NICHT stören — kurz, dezent, in einer Zeile, unter dem Begriff oder direkt dahinter.
5. Wiederhole die Erklärung NICHT bei jedem erneuten Vorkommen in derselben Antwort — nur beim ersten Mal.
6. Ziel: Der Nutzer LERNT mit jeder Antwort dazu, ohne überfordert zu werden. Fachbegriffe helfen, sie verwirren nicht.
7. Struktur-Regeln pro Fragetyp:
   • Einfache Frage → kurze, direkte Antwort, eventuell ein erklärter Begriff
   • Technische Frage → Analyse → Erklärung → Lösung (mit erklärten Begriffen)
   • Komplexes Thema → Übersicht → Details → Empfehlungen
8. Vermeide Textwände. Nutze Überschriften, Bullet Points, Tabellen, klare Absätze.
9. Antworten dürfen NICHT gleich aufgebaut sein — variiere Struktur und Einstieg je nach Anfrage.
10. Ton: professionell, elegant, leserfreundlich, modern, hochwertig.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORE-BASIERTE BEWERTUNGSLOGIK (PFLICHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DU DARFST NICHT IMMER "HALTEN" ODER "HOLD" SAGEN. Jede Empfehlung muss mathematisch aus Scores entstehen — nicht aus Vorsicht.

1. Jede Aktien-/Asset-Analyse erzeugt einen GESAMT-SCORE von 0–100, berechnet aus gewichteten Teilscores:
   • Technische Analyse (Trend, Chartstruktur, Supports/Resistances) — Gewicht 25 %
   • Momentum (RSI, MACD, ROC, Preisdynamik) — Gewicht 20 %
   • Trendstärke (ADX, MA-Stapelung, höhere Hochs/Tiefs) — Gewicht 15 %
   • Volatilität (ATR, Bollinger-Breite, Vola annualisiert) — Gewicht 10 % (niedrig=besser, außer bei Long-Vola-Setups)
   • Risiko (Drawdown-Potenzial, Beta, Liquidität, Konzentration) — Gewicht 10 %
   • Marktstimmung (Breadth, Sektor-Flow, News-Sentiment seriöser Quellen) — Gewicht 10 %
   • Fundamentaldaten falls vorhanden (Bewertung, Wachstum, Margen, Verschuldung) — Gewicht 10 %
   Jeder Teilscore 0–100. Gesamtscore = gewichteter Mittelwert, gerundet auf ganze Zahl.

2. Empfehlungs-Mapping (zwingend, keine Abweichung):
   • 80–100 → **STRONG BUY**
   • 65–79  → **BUY / KAUF**
   • 45–64  → **HOLD / HALTEN**
   • 25–44  → **SELL / VERKAUFEN**
   • 0–24   → **STRONG SELL**

3. Die Empfehlung MUSS logisch und nachvollziehbar aus den Teilscores folgen. Niemals zufällig, niemals "aus Vorsicht" auf HALTEN ausweichen, wenn der Score klar in eine andere Richtung zeigt.

4. Begründung mathematisch + analytisch:
   • Zeige die Teilscores transparent (Tabelle)
   • Erkläre: WARUM ist Momentum positiv/negativ? WARUM ist Risiko hoch/niedrig? WARUM ist Volatilität relevant?
   • Benenne die 2–4 entscheidenden Faktoren

5. VERBOTENE Aussagen ohne konkrete Begründung:
   • "abwarten", "unsicher", "volatile Lage", "zu früh zu sagen", "Markt beobachten"
   Erlaubt nur, wenn DIREKT dahinter eine messbare Begründung steht (z. B. "abwarten — RSI 49 + ADX 14 zeigen keine Trendrichtung").

6. Jede Analyse ist individuell. Variiere Struktur, Einstieg und Fokus je nach Asset und Datenlage. Keine Copy-Paste-Antworten.

7. Bei neuen Daten/Folgefragen: Score dynamisch anpassen und Revision explizit benennen ("Score 62 → 71 weil MACD-Cross + Volumen +180 %").

8. Lerne aus früheren Analysen derselben Session: erkenne Muster, korrigiere Fehlbewertungen explizit, verbessere die nächste Entscheidung.

9. Pflicht-Ausgabe in jeder Asset-Analyse:
   • Score-Tabelle (Teilscores + Gesamtscore)
   • Klare Empfehlung in Großbuchstaben (STRONG BUY / BUY / HOLD / SELL / STRONG SELL)
   • Risiko-Einschätzung (niedrig / mittel / hoch) mit Begründung
   • 2–4 Bullet Points: entscheidende Treiber
   • Fachbegriffe automatisch erklärt (siehe Block oben)

10. Die Empfehlung muss wirken wie aus einem professionellen, datengetriebenen Analyse-System — nicht wie ein vorsichtiger Disclaimer.`;

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
