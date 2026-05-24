import { createFileRoute } from "@tanstack/react-router";
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";
import { requirePro } from "@/lib/api-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

type Candles = { c: number[]; t: number[] };

function transform(j: any): Candles | null {
  const r = j?.chart?.result?.[0];
  if (!r) return null;
  const ts: number[] = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const c: number[] = []; const t: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close == null || !Number.isFinite(Number(close))) continue;
    c.push(Number(close));
    t.push(Number(ts[i]));
  }
  return c.length ? { c, t } : null;
}

function pickRange(daysSince: number): string {
  if (daysSince < 25) return "1mo";
  if (daysSince < 80) return "3mo";
  if (daysSince < 170) return "6mo";
  if (daysSince < 350) return "1y";
  if (daysSince < 700) return "2y";
  if (daysSince < 1800) return "5y";
  if (daysSince < 3600) return "10y";
  return "max";
}

async function loadCandles(symbol: string, range: string): Promise<Candles | null> {
  try {
    const cached = await fetchYahooChartCached(symbol, "1d", range, 3600);
    return cached.value ? transform(cached.value) : null;
  } catch {
    return null;
  }
}

function findEntryIdx(t: number[], targetMillis: number): number {
  const targetSec = Math.floor(targetMillis / 1000);
  for (let i = 0; i < t.length; i++) {
    if (t[i] >= targetSec) return i;
  }
  return -1;
}

function fmtPct(x: number): string {
  const s = x >= 0 ? "+" : "";
  return `${s}${(x * 100).toFixed(2)}%`;
}

// ---------------- Web search via Firecrawl ----------------

type WebHit = { title: string; url: string; description: string; source: string };

async function firecrawlSearch(query: string, limit = 4): Promise<WebHit[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return [];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, tbs: "qdr:y" }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return [];
    const j: any = await r.json();
    const items: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.web) ? j.data.web : [];
    return items.slice(0, limit).map((it) => {
      let host = "";
      try { host = new URL(it.url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
      return {
        title: String(it.title || "").slice(0, 200),
        url: String(it.url || ""),
        description: String(it.description || it.snippet || "").slice(0, 400),
        source: host,
      };
    }).filter((h) => h.url);
  } catch {
    return [];
  }
}

function monthYearDe(d: Date): string {
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

async function gatherNews(opts: {
  name: string; symbol: string; sector?: string;
  buyDateISO: string; sellDateISO?: string | null;
}): Promise<{ buyEra: WebHit[]; recent: WebHit[]; sector: WebHit[]; policy: WebHit[] }> {
  const buyDate = new Date(opts.buyDateISO);
  const buyEra = `${opts.name} ${opts.symbol} news ${monthYearDe(buyDate)}`;
  const recent = `${opts.name} ${opts.symbol} latest news ${new Date().getFullYear()}`;
  const sectorPart = opts.sector || `${opts.name} industry`;
  const sectorQ = `${sectorPart} market news ${buyDate.getFullYear()}`;
  const policyQ = `government policy ${sectorPart} investment ${new Date().getFullYear()}`;

  const [a, b, c, d] = await Promise.all([
    firecrawlSearch(buyEra, 4),
    firecrawlSearch(recent, 4),
    firecrawlSearch(sectorQ, 4),
    firecrawlSearch(policyQ, 5),
  ]);
  return { buyEra: a, recent: b, sector: c, policy: d };
}

function renderHits(label: string, hits: WebHit[]): string {
  if (!hits.length) return `### ${label}\n(keine Treffer)\n`;
  return `### ${label}\n` + hits.map((h, i) =>
    `${i + 1}. [${h.source}] ${h.title}\n   ${h.description}\n   Quelle: ${h.url}`
  ).join("\n") + "\n";
}

// ---------------- AI ----------------

const SYSTEM = `Du bist ein erfahrener, ehrlicher Finanz-Analyst und sprichst mit dem Nutzer auf Deutsch.
Du erklärst einen vergangenen Kauf (und ggf. Verkauf) einer Aktie/ETF in EINFACHER Sprache, aber mit echtem analytischem Tiefgang.

Du erhältst zusätzlich kuratierte WEB-SUCH-ERGEBNISSE (News, Programme, Gesetze) — du MUSST diese aktiv auswerten und konkret zitieren (mit Quelle in Klammern, z. B. "(Reuters, Jan 2025)").

REGELN:
- Klare, ruhige Sprache. Kein Fachjargon ohne sofortige Erklärung.
- Strukturiere die Antwort GENAU mit diesen Markdown-Überschriften (##), in dieser Reihenfolge:
  ## Zusammenfassung des Trades
  ## Was damals passierte
  ## Politische & wirtschaftliche Rückenwind-Faktoren
  ## Katalysatoren für die Kursbewegung
  ## Bewertung des Trades
  ## Was du vielleicht noch nicht weißt
  ## Ausblick
- "Zusammenfassung des Trades": 2–4 Sätze. Bei verkaufter Position: realisierter Gewinn/Verlust + Hinweis auf verpasste/vermiedene Entwicklung seit Verkauf.
- "Was damals passierte": 3–5 Sätze zum Marktumfeld und Unternehmen/ETF-Thema rund um das Kaufdatum.
- "Politische & wirtschaftliche Rückenwind-Faktoren": PFLICHT — niemals leer. Nenne konkrete staatliche Programme, Subventionen, Gesetze, Regierungsinitiativen, die diese Aktie oder Branche betreffen — mit Zahlen, Datum, Quelle. Wenn die Suchergebnisse hier dünn sind, leite plausibel aus Sektor-Trends ab und kennzeichne als "branchenüblich".
- "Katalysatoren für die Kursbewegung": 3–6 Bulletpoints, jeder mit konkretem Ereignis + Datum + Quelle in Klammern (Earnings, Partnerschaften, Makro, Zinsen, Geopolitik).
- "Bewertung des Trades": ehrliche, ausgewogene Einschätzung. Beziehe Benchmark-Vergleich ein. Bei verkaufter Position: war der Verkaufszeitpunkt rückblickend gut/schlecht?
- "Was du vielleicht noch nicht weißt": 2–3 überraschende oder weniger bekannte Fakten zur Aktie oder Branche.
- "Ausblick": neutral, Chancen UND Risiken. Keine Kursziele, keine Empfehlung.
- Verwende Wahrscheinlichkeits-Sprache, keine Garantien.
- INTERNER QUALITÄTSCHECK vor Ausgabe: mind. 3 konkrete externe Ereignisse mit Datum+Quelle, mind. ein Hinweis auf staatliche/institutionelle Programme falls relevant, jede zentrale Behauptung mit Quelle oder Datum. Wenn etwas fehlt, ergänze BEVOR du antwortest.
- Maximal 700 Wörter Gesamtlänge.
- Schließe mit: "Hinweis: Keine Anlageberatung — nur eine Einordnung zur Bildung."`;

async function callAi(prompt: string, apiKey: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`AI ${r.status}: ${text.slice(0, 120)}`);
  }
  const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content ?? "";
}

// Heuristic quality check: ≥3 lines containing a year (date) AND ≥3 lines mentioning a source.
function passesQuality(md: string): boolean {
  if (!md) return false;
  const yearMatches = md.match(/\b(19|20)\d{2}\b/g) || [];
  const sourceMatches = md.match(/\b(Reuters|Bloomberg|CNBC|FT|Financial Times|WSJ|Wall Street|Handelsblatt|Manager Magazin|SEC|EU|US|Quelle|laut|gemäß|http)/gi) || [];
  const hasPolicySection = /Politische\s*&?\s*wirtschaftliche\s*Rückenwind/i.test(md);
  return yearMatches.length >= 3 && sourceMatches.length >= 3 && hasPolicySection;
}

export const Route = createFileRoute("/api/public/explain-trade")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const auth = await requirePro(request);
          if (auth instanceof Response) return auth;
          const body = (await request.json()) as {
            symbol?: string; buyDate?: string; shares?: number; name?: string;
            sellDate?: string | null; sector?: string;
          };
          const symbol = (body.symbol || "").toString().trim().toUpperCase();
          const buyDate = (body.buyDate || "").toString();
          const sellDateInput = body.sellDate ? body.sellDate.toString() : null;
          const shares = Number(body.shares);
          const name = (body.name || "").toString().slice(0, 120);
          const sector = (body.sector || "").toString().slice(0, 60);

          if (!symbol || !/^[A-Z0-9.\-^]+$/i.test(symbol) || symbol.length > 16) {
            return Response.json({ error: "Ungültiges Symbol" }, { status: 400, headers: CORS });
          }
          const buyMs = Date.parse(buyDate);
          if (!Number.isFinite(buyMs)) {
            return Response.json({ error: "Ungültiges Kaufdatum" }, { status: 400, headers: CORS });
          }
          if (!Number.isFinite(shares) || shares <= 0 || shares > 1_000_000) {
            return Response.json({ error: "Ungültige Anzahl" }, { status: 400, headers: CORS });
          }
          const now = Date.now();
          if (buyMs > now) {
            return Response.json({ error: "Kaufdatum liegt in der Zukunft" }, { status: 400, headers: CORS });
          }
          let sellMs: number | null = null;
          if (sellDateInput) {
            const s = Date.parse(sellDateInput);
            if (!Number.isFinite(s)) return Response.json({ error: "Ungültiges Verkaufsdatum" }, { status: 400, headers: CORS });
            if (s < buyMs) return Response.json({ error: "Verkaufsdatum liegt vor dem Kaufdatum" }, { status: 400, headers: CORS });
            if (s > now) return Response.json({ error: "Verkaufsdatum liegt in der Zukunft" }, { status: 400, headers: CORS });
            sellMs = s;
          }

          const daysSince = Math.max(7, Math.round((now - buyMs) / 86400000));
          const range = pickRange(daysSince);

          const [main, spy, dax, world] = await Promise.all([
            loadCandles(symbol, range),
            loadCandles("SPY", range),
            loadCandles("^GDAXI", range),
            loadCandles("URTH", range),
          ]);

          if (!main || main.c.length < 2) {
            return Response.json({ error: `Keine Kursdaten für ${symbol} verfügbar.` }, { status: 404, headers: CORS });
          }

          const entryIdx = findEntryIdx(main.t, buyMs);
          if (entryIdx < 0 || entryIdx >= main.c.length - 1) {
            return Response.json({ error: "Kaufdatum liegt außerhalb des verfügbaren Kursverlaufs." }, { status: 400, headers: CORS });
          }
          const entryClose = main.c[entryIdx];
          const currentClose = main.c[main.c.length - 1];
          const actualEntryMs = main.t[entryIdx] * 1000;
          const actualEntryISO = new Date(actualEntryMs).toISOString().slice(0, 10);
          const adjusted = Math.abs(actualEntryMs - buyMs) > 36 * 3600 * 1000;

          // Sell-side
          let sellClose: number | null = null;
          let actualSellISO: string | null = null;
          let sellAdjusted = false;
          let realizedPnlAbs: number | null = null;
          let realizedPnlPct: number | null = null;
          let postSellPct: number | null = null;
          let valueIfHeld: number | null = null;
          if (sellMs != null) {
            const si = findEntryIdx(main.t, sellMs);
            if (si >= 0) {
              sellClose = main.c[si];
              const actualSellMs = main.t[si] * 1000;
              actualSellISO = new Date(actualSellMs).toISOString().slice(0, 10);
              sellAdjusted = Math.abs(actualSellMs - sellMs) > 36 * 3600 * 1000;
              realizedPnlAbs = (sellClose - entryClose) * shares;
              realizedPnlPct = (sellClose - entryClose) / entryClose;
              postSellPct = (currentClose - sellClose) / sellClose;
              valueIfHeld = currentClose * shares;
            }
          }

          // Reference value: sold => realized, else => current
          const referenceClose = sellClose ?? currentClose;
          const totalCost = entryClose * shares;
          const currentValue = referenceClose * shares;
          const pnlAbs = currentValue - totalCost;
          const pnlPct = (referenceClose - entryClose) / entryClose;

          const endMs = sellMs ?? now;
          const heldDays = Math.max(0, Math.round((endMs - actualEntryMs) / 86400000));
          const heldMonths = Math.floor(heldDays / 30.44);
          const heldYears = Math.floor(heldDays / 365.25);

          function bench(c: Candles | null): number | null {
            if (!c || c.c.length < 2) return null;
            const i = findEntryIdx(c.t, buyMs);
            if (i < 0) return null;
            const endIdx = sellMs != null ? findEntryIdx(c.t, sellMs) : c.c.length - 1;
            const ei = endIdx < 0 ? c.c.length - 1 : endIdx;
            if (ei <= i) return null;
            return (c.c[ei] - c.c[i]) / c.c[i];
          }
          const benchmarks = { sp500: bench(spy), dax: bench(dax), msciWorld: bench(world) };

          // Web search
          const news = await gatherNews({
            name: name || symbol,
            symbol,
            sector,
            buyDateISO: actualEntryISO,
            sellDateISO: actualSellISO,
          });

          const newsBlock = [
            renderHits(`News rund um Kaufdatum (${actualEntryISO})`, news.buyEra),
            renderHits("Aktuelle News zum Unternehmen", news.recent),
            renderHits("Branchen-News", news.sector),
            renderHits("Politik / staatliche Programme", news.policy),
          ].join("\n");

          const displayName = name || symbol;
          const tradeBlock = [
            `Wertpapier: ${displayName} (${symbol})${sector ? ` · Sektor: ${sector}` : ""}`,
            `Kaufdatum: ${buyDate}${adjusted ? ` (nächster Handelstag: ${actualEntryISO})` : ""}`,
            `Kaufpreis: ${entryClose.toFixed(2)} · Anzahl: ${shares} · Kaufwert: ${totalCost.toFixed(2)}`,
            sellMs != null
              ? `STATUS: VERKAUFT am ${sellDateInput}${sellAdjusted ? ` (nächster Handelstag: ${actualSellISO})` : ""}
- Verkaufspreis: ${sellClose?.toFixed(2)}
- Realisierter Gewinn/Verlust: ${realizedPnlAbs != null ? (realizedPnlAbs >= 0 ? "+" : "") + realizedPnlAbs.toFixed(2) : "n/a"} (${realizedPnlPct != null ? fmtPct(realizedPnlPct) : "n/a"})
- Aktueller Kurs heute: ${currentClose.toFixed(2)}
- Entwicklung seit Verkauf: ${postSellPct != null ? fmtPct(postSellPct) : "n/a"}
- Wäre noch gehalten worden, aktueller Wert: ${valueIfHeld?.toFixed(2)}`
              : `STATUS: NOCH GEHALTEN
- Aktueller Kurs: ${currentClose.toFixed(2)}
- Aktueller Gesamtwert: ${currentValue.toFixed(2)}
- Unrealisierter Gewinn/Verlust: ${pnlAbs >= 0 ? "+" : ""}${pnlAbs.toFixed(2)} (${fmtPct(pnlPct)})`,
            `Haltedauer (relevanter Zeitraum): ${heldDays} Tage`,
            ``,
            `Benchmark-Vergleich im selben Zeitraum:`,
            `- S&P 500: ${benchmarks.sp500 != null ? fmtPct(benchmarks.sp500) : "n/a"}`,
            `- DAX: ${benchmarks.dax != null ? fmtPct(benchmarks.dax) : "n/a"}`,
            `- MSCI World: ${benchmarks.msciWorld != null ? fmtPct(benchmarks.msciWorld) : "n/a"}`,
          ].join("\n");

          const basePrompt = `${tradeBlock}\n\n--- WEB-SUCH-ERGEBNISSE ---\n${newsBlock}\n\nBitte erstelle die Analyse exakt im vorgegebenen Format. Zitiere die Quellen aktiv (Name in Klammern + ggf. Datum). Der Abschnitt "Politische & wirtschaftliche Rückenwind-Faktoren" darf NIEMALS leer sein.`;

          const apiKey = process.env.LOVABLE_API_KEY;
          let analysis = "";
          let aiError: string | null = null;
          if (!apiKey) {
            aiError = "AI gateway nicht konfiguriert.";
          } else {
            try {
              analysis = await callAi(basePrompt, apiKey);
              if (!passesQuality(analysis)) {
                // One retry with stricter instruction
                const retry = await callAi(
                  basePrompt + `\n\nWICHTIG: Deine vorherige Antwort war zu allgemein. Du MUSST mindestens 3 konkrete Ereignisse mit Datum und Quelle nennen und den Abschnitt "Politische & wirtschaftliche Rückenwind-Faktoren" mit konkreten Programmen füllen. Nutze die obigen Web-Such-Ergebnisse intensiver.`,
                  apiKey,
                );
                if (retry) analysis = retry;
              }
            } catch (e) {
              console.error("explain-trade AI error", e);
              aiError = "AI-Fehler";
            }
          }

          const allSources = [...news.buyEra, ...news.recent, ...news.sector, ...news.policy]
            .filter((h, i, arr) => arr.findIndex((x) => x.url === h.url) === i)
            .slice(0, 12);

          return Response.json(
            {
              symbol,
              name: displayName,
              requestedDate: buyDate,
              resolvedDate: actualEntryISO,
              adjusted,
              shares,
              entryClose,
              currentClose,
              totalCost,
              currentValue,
              pnlAbs,
              pnlPct,
              heldDays,
              heldMonths,
              heldYears,
              benchmarks,
              analysis,
              aiError,
              // Sell-side
              sold: sellMs != null,
              sellRequestedDate: sellDateInput,
              sellResolvedDate: actualSellISO,
              sellAdjusted,
              sellClose,
              realizedPnlAbs,
              realizedPnlPct,
              postSellPct,
              valueIfHeld,
              // Sources
              sources: allSources,
            },
            { headers: CORS },
          );
        } catch (e) {
          console.error("explain-trade error", e);
          return Response.json(
            { error: "Interner Fehler" },
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});
