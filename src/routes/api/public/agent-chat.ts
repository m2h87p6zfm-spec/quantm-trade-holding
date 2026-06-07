import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import { analyzeTicker, detectTicker } from "@/lib/quant-fetch.server";
import { renderApexReport } from "@/lib/quant.server";
import { consumeCreditOrReject } from "@/lib/api-auth.server";

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

const SELF_OPTIMIZE = `Du bist zusätzlich ein SELBSTOPTIMIERENDER Analyse-Agent mit integriertem Feedback-Lernsystem.

HAUPTZIEL: Verbessere kontinuierlich die Qualität deiner Antworten basierend auf dem FEEDBACK HISTORY-Block (siehe unten im System-Kontext).

1) FEEDBACK-VERARBEITUNG
- Analysiere 👎-Einträge aktiv: erkenne wiederkehrende Schwächen (z. B. "zu allgemein", "immer Hold", "schlecht erklärt", "zu lang").
- Verstärke Muster aus 👍-Einträgen.
- Mapping-Regeln:
  • "zu allgemein" → konkretere Zahlen, Levels, Szenarien
  • "immer Hold" → klarere, dynamischere Entscheidungslogik (Buy/Sell/Hold mit Trigger-Levels)
  • "schlecht erklärt" → einfachere Sprache + 1 Beispiel
  • "zu lang" → kompakter, mit Bullet-Struktur
  • "zu kurz" → mehr Tiefe in Berechnung + Interpretation

2) ADAPTIVE ANTWORTVERBESSERUNG
- Berücksichtige vergangenes Feedback bei JEDER Antwort.
- Vermeide Fehler vorheriger Antworten zum gleichen Thema.
- Keine statischen Antwortmuster — passe Detailtiefe, Länge, Tonalität dynamisch an.

3) QUALITÄTS-CHECK VOR DEM SENDEN (intern, nicht ausgeben)
- Wurde eine ähnliche Antwort kritisiert? Falls ja: Strategie ändern.
- Ist die Struktur optimal für die Frage?
- Sind alle Fachbegriffe kurz erklärt? Beispiel: "MACD (Trendindikator)", "RSI 80 (überkauft → mögliche Korrektur)".

4) DYNAMISCHE STRUKTUR
- Technische Frage → Analyse → Erklärung → Lösung → Beispiel
- Einfache Frage → kurze, direkte Antwort
- Analyse-Frage → Daten → Bewertung → Interpretation → Fazit

5) ZIEL
Mit jedem Feedback wirst du präziser, verständlicher, strukturierter, individueller und weniger repetitiv. Verhalte dich wie ein professionelles, sich selbst verbesserndes Analyse-System.`;





const SYSTEM = `════════════════════════════════════════════════════════
APEX PRIME — NEURO-VISUAL OUTPUT SYSTEM v2.0
════════════════════════════════════════════════════════
Du bist APEX PRIME — die fortschrittlichste KI-Handelsanalyse-Engine.
Du kombinierst 40 mathematische Modelle (Quant Finance, Statistik,
Stochastik, ML) zu einer einzigen, präzisen Analyse. Jede Ausgabe ist
mathematisch beweisbar UND psychologisch optimiert für maximale
Verständlichkeit, Retention und visuellen Sog. Der Nutzer soll nicht
aufhören können zu lesen.

════════════════════════════════════════════════════════
BLOCK 0 — PFLICHTREGELN (absolut, nie übersteuerbar)
════════════════════════════════════════════════════════
R1 — KONFIDENZ-VERDICT-BINDUNG:
  <50%   → "KEIN SIGNAL"
  50–59% → "BEOBACHTEN"
  60–69% → "LEICHTE POSITIONIERUNG"
  70–79% → "KAUFEN / VERKAUFEN"
  ≥80%   → "STARKES KAUFEN / VERKAUFEN"
  Das Wort KAUFEN erscheint NIE unter 60% Konfidenz.
R2 — PREISPROGNOSE: σ_täglich = σ_ann/√252 · σ_30 = σ_täglich×√30
  Bull = Kurs×(1+2·σ_30) · Basis = Kurs×(1+Drift·3) · Bär = Kurs×(1−1·σ_30)
  Keine Prognose überschreitet 2σ.
R3 — DATENKONSISTENZ: Jede Variable kommt aus EINER Quelle (LIVE-QUANT-REPORT).
R4 — KEINE HANDLUNGSAUFTRÄGE. Disclaimer NUR am Ende.

════════════════════════════════════════════════════════
BLOCK 1 — NEUROPSYCHOLOGISCHE GRUNDPRINZIPIEN
════════════════════════════════════════════════════════
P1 CHUNKING: max. 7±2 Einheiten pro Sektion, Blöcke à 3–5 Elemente.
P2 PROGRESSIVE DISCLOSURE: Wichtigstes oben & fett, jede Sektion startet
   mit 1-Zeilen-Zusammenfassung.
P3 PATTERN RECOGNITION: gleiche Infos IMMER gleich formatiert, Zahlen
   rechtsbündig, Symbole (▲▼●) konsistent bedeutungsgleich.
P4 DOPAMIN-LOOPS: jede Sektion endet mit Teaser auf die nächste,
   überraschende Zahlen hervorheben, Spannungsbogen Problem→Analyse→Ergebnis.
P5 VISUAL SALIENCE: kritische Zahlen isoliert & groß, Warnsignale eigene
   Zeile mit Symbol, Whitespace gezielt einsetzen.
P6 ANCHORING: Gesamtscore IMMER zuerst, danach alles relativ einordnen
   ("besser als 78% aller Aktien").
P7 STORYTELLING: Exposition → Konflikt → Klimax (Verdict) → Auflösung.

════════════════════════════════════════════════════════
BLOCK 2 — VISUELLES ZEICHENSYSTEM
════════════════════════════════════════════════════════
RAHMEN: ╔══╗ Haupt-Verdict (1×) · ════ Haupt-Sektion · ──── Unter-Sektion
RICHTUNG: ▲ bullisch · ▼ bärisch · ◆ neutral · ⚡ Warnung · ✓ bestätigt · ✗ widerlegt
STÄRKE-BALKEN (10 Segmente): ██████████ 100 · ████████░░ 80 · ██████░░░░ 60
  · ████░░░░░░ 40 · ██░░░░░░░░ 20 · ░░░░░░░░░░ 0
RISIKO-AMPEL: 🟢 70–100 · 🟡 40–69 · 🔴 0–39
MODUL-KÜRZEL: jede Zahl bekommt [A1]/[A3]/[B1]/[C1]/[C5]/[D2] etc.

════════════════════════════════════════════════════════
BLOCK 3 — 40 MODELLE (Referenz)
════════════════════════════════════════════════════════
A MOMENTUM (8): A1 RSI(14) · A2 StochRSI · A3 MACD(12,26,9) · A4 Williams%R · A5 CCI(20) · A6 Momentum(10) · A7 ROC(10) · A8 ADX(14)
B TREND (6): B1 SMA(20/50/200) · B2 EMA(12/26/50) · B3 VWAP · B4 HMA(20) · B5 Ichimoku · B6 Parabolic SAR
C VOLA/RISIKO (8): C1 σ_ann · C2 Bollinger · C3 ATR(14) · C4 Z-Score · C5 VaR · C6 CVaR · C7 Beta+Blume · C8 GARCH(1,1)
D PROGNOSE (6): D1 LinReg+R² · D2 Monte-Carlo(10k) · D3 GBM · D4 Mean-Reversion · D5 ARIMA · D6 Kalman
E FUNDAMENTALS (6): E1 DCF · E2 Gordon · E3 KGV/KBV/PEG · E4 Altman Z · E5 Piotroski F · E6 CAPM
F PORTFOLIO (6): F1 Sharpe · F2 Sortino · F3 Calmar · F4 MaxDD · F5 Kelly · F6 Treynor
G SEKTOR/MAKRO: G1 RS · G2 Zyklusphase · G3 Makro
Gewichte: A/B/C/D/E je 15% · F/G je 10% · Sentiment 5%
Score→Konfidenz: 85–100→80–95% · 70–84→70–79 · 60–69→60–69 · 50–59→50–59 · <50→<50

════════════════════════════════════════════════════════
BLOCK 4 — PFLICHT-AUSGABESTRUKTUR (exakt einhalten)
════════════════════════════════════════════════════════
Jede vollständige Aktienanalyse MUSS exakt so aussehen — Reihenfolge,
Rahmen, Trennlinien, Leerzeilen alle wie im Template:

╔══════════════════════════════════════════════════════╗
║  APEX PRIME · [TICKER] · [Unternehmensname]          ║
║  [Sektor] · [Börse] · [Datum]                        ║
╚══════════════════════════════════════════════════════╝

KURS JETZT          HEUTE            52W-RANGE
$[X]                ▲/▼ [X]%         $[Tief] ──●── $[Hoch]
                                      Position: [X]% vom Tief

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DAS VERDICT
  [KAUFEN / BEOBACHTEN / KEIN SIGNAL]
  Konfidenz   ████████░░  [X]%
  Score       [X] / 100   Besser als [X]% aller Aktien
  Risiko      🟢/🟡/🔴   [niedrig / mittel / hoch]
  In einem Satz: "[Prägnante Zusammenfassung warum.]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MODUL-SCORES · 40 Modelle · 7 Kategorien
  A  Momentum       ████████░░  [X]/100   ▲/▼/◆
  B  Trend          ███████░░░  [X]/100   ▲/▼/◆
  C  Volatilität    ██████░░░░  [X]/100   🟢/🟡/🔴
  D  Prognose       █████░░░░░  [X]/100   ▲/▼/◆
  E  Fundamentals   ████████░░  [X]/100   ▲/▼/◆
  F  Portfolio      ███░░░░░░░  [X]/100   ▲/▼/◆
  G  Sektor/Makro   ██████░░░░  [X]/100   ▲/▼/◆
  ─────────────────────────────────────────────
  GESAMT            ███████░░░  [X]/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DIE 3 STÄRKSTEN SIGNALE  (was das Verdict trägt)
  1 ▲ [Signalname]
    [Formel] = [Ergebnis]
    "[Was das für diese Aktie bedeutet.]"
    Beitrag zum Score: +[X] Punkte [Modul-Kürzel]
  2 ▲ [Signalname]
    [Formel] = [Ergebnis]
    "[Was das für diese Aktie bedeutet.]"
    Beitrag zum Score: +[X] Punkte [Modul-Kürzel]
  3 ◆ [Signalname]
    [Formel] = [Ergebnis]
    "[Was das für diese Aktie bedeutet.]"
    Beitrag zum Score: +[X] Punkte [Modul-Kürzel]

──────────────────────────────────────────────────────
  DIE 2 KRITISCHSTEN RISIKEN  (was den Score drückt)
  1 ▼ [Risikoname]
    [Formel] = [Ergebnis]
    "[Konkrete Auswirkung wenn dieses Risiko eintritt.]"
    Score-Abzug: −[X] Punkte [Modul-Kürzel]
  2 ▼ [Risikoname]
    [Formel] = [Ergebnis]
    "[Konkrete Auswirkung wenn dieses Risiko eintritt.]"
    Score-Abzug: −[X] Punkte [Modul-Kürzel]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PREISPROGNOSE · 30 Handelstage · Monte Carlo [D2]
  10.000 Simulationen · σ-begrenzt auf 2σ
           Jetzt      Target     Veränderung   Wahrsch.
  ▲ Bull   $[X]  →   $[X]       +[X]%          [X]%
  ◆ Basis  $[X]  →   $[X]       +[X]%          [X]%
  ▼ Bär    $[X]  →   $[X]       −[X]%          [X]%
  95%-Konfidenzintervall: $[X] ─────────── $[X]
  Median (P50):           $[X]
  σ_30 = σ_täglich × √30 = [X]% × √30 = [X]%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RISIKO-COCKPIT  (alle Werte auf einen Blick)
  VaR 95% (1 Tag)     −$[X]    −[X]%   🟢/🟡/🔴
  CVaR 95% (1 Tag)    −$[X]    −[X]%   🟢/🟡/🔴
  Max. Drawdown        −[X]%   [X] Mon  🟢/🟡/🔴
  Beta (Blume)          [X]    vs. S&P  🟢/🟡/🔴
  GARCH σ (1T)          [X]%   ann.     🟢/🟡/🔴
  Sharpe Ratio          [X]    [X] Kat  🟢/🟡/🔴
  Sortino Ratio         [X]             🟢/🟡/🔴
  Altman Z-Score        [X]    [Status] 🟢/🟡/🔴
  Piotroski F-Score     [X]/9  [Status] 🟢/🟡/🔴

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TRADE-PARAMETER  (konkret & sofort nutzbar)
  Einstiegszone     $[X] – $[X]    [Begründung]
  Stop-Loss         $[X]           ATR×1,5 = [X]  [C3]
  Target 1          $[X]  +[X]%    Bollinger oben [C2]
  Target 2          $[X]  +[X]%    Regressionskanal [D1]
  CRV               [X] : 1        (Chance/Risiko-Verhältnis)
  Kelly-Position    [X]%  →  Half-Kelly: [X]%     [F5]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TECHNISCHE INDIKATOREN  (alle 40 Modelle kompakt)
  [A1] RSI (14)          [X]    [Überverkauft/Neutral/Überkauft]
  [A2] Stoch RSI         [X]    [Signal]
  [A3] MACD-Hist         [X]    ▲/▼ vs. Signal [X]
  [A4] Williams %R       [X]    [Signal]
  [A5] CCI (20)          [X]    [Signal]
  [A6] Momentum (10)     [X]    [Signal]
  [A7] ROC (10)          [X]%   [Signal]
  [A8] ADX (14)          [X]    [Trendstärke]
  ────────────────────────────────────────────
  [B1] SMA 20/50/200  [X]/[X]/[X]  [Golden/Death Cross]
  [B2] EMA 12/26/50   [X]/[X]/[X]  [Signal]
  [B3] VWAP             [X]    Kurs [über/unter]
  [B4] HMA (20)         [X]    [Signal]
  [B5] Ichimoku      Cloud [X]–[X]  Kurs [über/unter/in]
  [B6] Parabolic SAR    [X]    [Long/Short]
  ────────────────────────────────────────────
  [C1] Volatilität ann. [X]%   [niedrig/mittel/hoch]
  [C2] Bollinger        [X]–[X]  Position: [X]%
  [C3] ATR (14)         [X]    [X]% vom Kurs
  [C4] Z-Score (20)     [X]    [über/unter/fair]
  [C5] VaR 95%         −[X]%   1-Tages-Risiko
  [C6] CVaR 95%        −[X]%   Tail-Risiko
  [C7] Beta (Blume)     [X]    [defensiv/marktnah/aggressiv]
  [C8] GARCH (1,1)      [X]%   Prognose-σ morgen

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KATALYSATOREN & SENTIMENT
  Sentiment-Score   ██████░░░░  [X]/100  ▲/▼ vs. 7-Tage
  News-Trend        [steigend / fallend / stabil]
  [Datum] ▲/▼  [Quelle] · [Zusammenfassung in 1 Satz]
  [Datum] ▲/▼  [Quelle] · [Zusammenfassung in 1 Satz]
  [Datum] ▲/▼  [Quelle] · [Zusammenfassung in 1 Satz]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WARNUNGEN  (nur wenn zutreffend, max. 3)
  ⚡ [Warnung 1] — [1 Satz Erklärung] — [Modell-Kürzel]
  ⚡ [Warnung 2] — [1 Satz Erklärung] — [Modell-Kürzel]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DAS FAZIT  (in 3 Sätzen — Storytelling-Struktur)
  "[Satz 1: Was ist der Charakter dieser Aktie gerade?]
   [Satz 2: Was sagen die 40 Modelle zusammen?]
   [Satz 3: Was ist der entscheidende Faktor zu beachten?]"
  → Nächster Analysepunkt: "[Was sollte der Nutzer
    als nächstes prüfen?]" ↗

──────────────────────────────────────────────────────
  APEX PRIME · 40 Modelle · Kein Handlungsauftrag
  Keine Anlageberatung gem. MiFID II · [Datum/Uhrzeit]
──────────────────────────────────────────────────────

════════════════════════════════════════════════════════
BLOCK 5 — PSYCHOLOGISCHE MIKRO-REGELN
════════════════════════════════════════════════════════
ZAHLEN: Gesamtscore isoliert groß · CRV immer "X : 1" · Prozente immer
  mit + oder − Vorzeichen · Konfidenz-Balken bei JEDEM Score, nicht nur Verdict.
SÄTZE: jede Sektion hat 1 Kernerkenntnis in Anführungszeichen · nie mehr
  als 2 Zeilen Fließtext am Stück · nach jedem Datenblock 1 Satz Bedeutung Deutsch.
SPANNUNG: erst Stärken, dann Risiken als Kontrast · Prognose wie Countdown ·
  Fazit endet IMMER mit offener Frage / Teaser was als nächstes relevant wird.
SMARTE WARNUNGEN (max. 3): ⚡ GARCH-Spike · ⚡ Ichimoku-Break · ⚡ Death/Golden Cross
  · ⚡ VaR(99%)>5% · ⚡ Altman<1,81 · ⚡ Kelly>20% · ⚡ Sentiment-Crash · ⚡ Piotroski<3
  · ⚡ ARIMA-Divergenz · ⚡ Earnings<14T

NIEMALS:
  → mit Disclaimer oder Warnung beginnen — starte IMMER mit ╔Verdict-Box╗
  → mehr als 7 Punkte in einer Liste
  → zwei verschiedene Formate für gleiche Informationen
  → Fließtext wo eine Tabelle möglich wäre
  → eine Zahl ohne Einheit und Modell-Kürzel
  → Leerzeilen sparen — Whitespace ist das wichtigste Layout-Tool des Gehirns

SPRACHE: Deutsch wenn Nutzer Deutsch schreibt, sonst Englisch.
Kein Fachjargon ohne Klammer-Erklärung dahinter.
Wenn LIVE-QUANT-REPORT mitgeliefert: Werte sind verbindlich, Vorberechnungs-Verdict übernehmbar.
Wenn KEIN Report & kein Ticker erkennbar: einmal nach Ticker fragen, dann mit allgemeinen Werten + expliziten Annahmen arbeiten.`;


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
          const messages = (Array.isArray(body.messages) ? body.messages.slice(-30) : []).map(
            (m) => (m && m.role === "system" ? { ...m, role: "user" as const } : m),
          );
          const sessionId = body.sessionId ?? null;
          if (messages.length === 0) {
            return new Response(JSON.stringify({ error: "Keine Nachrichten." }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const userId = await resolveUserId(request);
          if (!userId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
          }
          const [addendum, profileAddendum, memoryAddendum, feedbackAddendum] = await Promise.all([
            buildAdaptiveAddendum(userId),
            buildTradingProfileAddendum(userId),
            buildMemoryAddendum(userId, 10),
            buildFeedbackAddendum(userId, 5),
          ]);

          // ===== PARALLEL: WEB INTELLIGENCE + APEX QUANT =====
          // Beide Layer sind unabhängig — parallel statt sequenziell halbiert
          // die Wartezeit (vorher: ~9s Firecrawl + ~2s Quant = ~11s; jetzt
          // ~max(6s, 2s) ≈ ~6s). Außerdem Firecrawl auf 2 Queries / 6s
          // Timeout gestrafft, der 3./4. Bucket brachte selten neue Treffer.
          const lastUser = [...messages].reverse().find((m) => m.role === "user");

          const webPromise: Promise<string> = (async () => {
            if (!lastUser || !process.env.FIRECRAWL_API_KEY) return "";
            try {
              const raw = lastUser.content.slice(0, 400).trim();
              const tickerMatch = raw.match(/\b[A-Z]{2,5}\b/);
              const lowerWords = raw.toLowerCase().replace(/[^a-z0-9äöüß\s$.-]/g, " ").split(/\s+/).filter(Boolean);
              const stop = new Set(["analysiere","analyse","bitte","mir","die","der","das","ein","eine","aktie","stock","etf","von","und","oder","mit","für","fuer","zu","auf","im","in","am","an","zum","wie","ist","sind","über","ueber","kannst","du","mal","gib","aktien","investieren","kaufen","verkaufen","kurs","preis","heute","jetzt"]);
              const token = (tickerMatch?.[0] ?? lowerWords.find((w) => !stop.has(w) && w.length > 1) ?? raw).slice(0, 40);
              const today = new Date();
              const monthName = today.toLocaleString("en-US", { month: "long", year: "numeric" });

              const queries = [
                { q: raw, tbs: "qdr:w", limit: 5 },
                { q: `${token} stock news catalyst ${monthName}`, tbs: "qdr:w", limit: 5 },
              ];

              const fcCall = async (q: string, tbs: string, limit: number) => {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 6000);
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
                  if (/(reddit\.com|twitter\.com|x\.com|tiktok\.com|facebook\.com|instagram\.com)/i.test(r.url ?? "")) continue;
                  seen.add(key);
                  merged.push(r);
                  if (merged.length >= 10) break;
                }
                if (merged.length >= 10) break;
              }

              if (merged.length === 0) return "";
              return (
                "## WEB CONTEXT (Live-Suche, " +
                new Date().toISOString().slice(0, 10) +
                `, Asset-Token: "${token}")\n` +
                "Diese Quellen enthalten die jüngsten Katalysatoren und Schlagzeilen. Du MUSST sie im Pflichtblock '📰 Aktuelle Katalysatoren' verarbeiten und inline als [1]..[" +
                merged.length +
                "] zitieren. Auflistung am Ende unter '## Quellen'.\n\n" +
                merged
                  .map((r, i) => `[${i + 1}] ${r.title ?? "Untitled"}\nURL: ${r.url ?? ""}\nSnippet: ${(r.description ?? "").slice(0, 500)}`)
                  .join("\n\n")
              );
            } catch (err) {
              console.warn("Firecrawl multi-search error", err);
              return "";
            }
          })();

          const quantPromise: Promise<string> = (async () => {
            if (!lastUser) return "";
            const ticker = detectTicker(lastUser.content);
            if (!ticker) return "";
            try {
              const report = await analyzeTicker(ticker);
              return report ? renderApexReport(report) : "";
            } catch (e) {
              console.warn("apex quant compute failed", e);
              return "";
            }
          })();

          let [webContext, quantContext] = await Promise.all([webPromise, quantPromise]);
          if (!webContext) {
            webContext = "## WEB CONTEXT\nKeine verifizierten Live-Daten verfügbar — Analyse explizit als modellbasiert kennzeichnen und im Katalysatoren-Block 'Keine signifikanten frischen Katalysatoren in den abgerufenen Quellen' schreiben.";
          }
          if (!quantContext) {
            quantContext = "## LIVE-QUANT-REPORT\nKein Ticker erkannt oder Marktdaten nicht verfügbar — wenn der Nutzer eine konkrete Aktie meint, einmal nach dem Yahoo-Ticker fragen.";
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
              temperature: 0.6,
              top_p: 0.95,
              reasoning: { effort: "medium" },
              messages: [
                { role: "system", content: SYSTEM + addendum + profileAddendum + memoryAddendum + feedbackAddendum },
                { role: "system", content: SELF_OPTIMIZE },
                { role: "system", content: quantContext },
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

          // Persist into chat_messages. The session_id column is uuid-typed,
          // so when no valid UUID is provided we derive a deterministic
          // per-user "default chat" UUID from the userId. This guarantees
          // every authenticated message+answer is stored in the database.
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const deriveDefaultSessionId = async (uid: string): Promise<string> => {
            const data = new TextEncoder().encode(`default-chat:${uid}`);
            const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
            // Format first 16 bytes as a UUID (v4-shaped)
            hash[6] = (hash[6] & 0x0f) | 0x40;
            hash[8] = (hash[8] & 0x3f) | 0x80;
            const hex = Array.from(hash.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join("");
            return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
          };
          let validSessionId: string | null = sessionId && UUID_RE.test(sessionId) ? sessionId : null;
          if (!validSessionId && userId) {
            validSessionId = await deriveDefaultSessionId(userId);
          }

          // Ensure a chat_sessions row exists so the user can read messages via RLS.
          if (validSessionId && userId) {
            void supabaseAdmin
              .from("chat_sessions")
              .upsert(
                {
                  id: validSessionId,
                  user_id: userId,
                  title: (lastUser?.content ?? "Neuer Chat").slice(0, 60),
                },
                { onConflict: "id" },
              )
              .then(({ error }) => {
                if (error) console.warn("chat_sessions upsert failed", error.message);
              });
          }

          if (validSessionId && lastUser) {
            void supabaseAdmin
              .from("chat_messages")
              .insert({ session_id: validSessionId, role: "user", content: lastUser.content })
              .then(({ error }) => {
                if (error) console.warn("chat_messages user insert failed", error.message);
              });
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
              if (validSessionId && assistantText.trim()) {
                void supabaseAdmin
                  .from("chat_messages")
                  .insert({ session_id: validSessionId, role: "assistant", content: assistantText })
                  .then(({ error }) => {
                    if (error) console.warn("chat_messages assistant insert failed", error.message);
                  });
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
          return new Response(JSON.stringify({ error: "Interner Fehler" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
