import { createFileRoute } from "@tanstack/react-router";
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

// Find first index with t[i] * 1000 >= targetMillis
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

function fmtMoney(x: number, currency = "USD"): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency, maximumFractionDigits: 2 }).format(x);
}

const SYSTEM = `Du bist ein erfahrener, ehrlicher Finanz-Analyst und sprichst mit dem Nutzer auf Deutsch.
Du erklärst einen vergangenen Kauf einer Aktie/ETF in EINFACHER Sprache, aber mit echtem analytischem Tiefgang.

Regeln:
- Klare, ruhige Sprache. Kein Fachjargon ohne sofortige Erklärung.
- Strukturiere die Antwort GENAU mit diesen Markdown-Überschriften (##), in dieser Reihenfolge:
  ## Zusammenfassung des Trades
  ## Was damals passierte
  ## Warum sich der Kurs seitdem so entwickelt hat
  ## Bewertung des Trades
  ## Ausblick
- "Zusammenfassung des Trades": 2–4 Sätze, was wurde wann gekauft, zu welchem Preis, wie hat es sich entwickelt — in einfacher Sprache.
- "Was damals passierte": 3–5 Sätze zum Marktumfeld und zu Unternehmen/ETF-Thema rund um das Kaufdatum.
- "Warum sich der Kurs seitdem so entwickelt hat": konkrete Treiber (Earnings, Branchen-Trends, Makro, Zinsen, geopolitische Lage).
- "Bewertung des Trades": ehrliche, ausgewogene Einschätzung. War der Einstieg gut/schlecht/durchschnittlich? Beziehe den Benchmark-Vergleich ein.
- "Ausblick": neutral, Chancen UND Risiken. Keine Kursziele, keine Empfehlung.
- Verwende Wahrscheinlichkeits-Sprache, keine Garantien.
- Maximal 450 Wörter Gesamtlänge.
- Schließe mit einem Satz: "Hinweis: Keine Anlageberatung — nur eine Einordnung zur Bildung."`;

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

export const Route = createFileRoute("/api/public/explain-trade")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { symbol?: string; buyDate?: string; shares?: number; name?: string };
          const symbol = (body.symbol || "").toString().trim().toUpperCase();
          const buyDate = (body.buyDate || "").toString();
          const shares = Number(body.shares);
          const name = (body.name || "").toString().slice(0, 120);

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
          const daysSince = Math.max(7, Math.round((now - buyMs) / 86400000));
          const range = pickRange(daysSince);

          // Parallel: symbol + 3 benchmarks
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
          const adjusted = Math.abs(actualEntryMs - buyMs) > 36 * 3600 * 1000; // >1.5 days off

          const totalCost = entryClose * shares;
          const currentValue = currentClose * shares;
          const pnlAbs = currentValue - totalCost;
          const pnlPct = (currentClose - entryClose) / entryClose;
          const heldDays = Math.max(0, Math.round((now - actualEntryMs) / 86400000));
          const heldMonths = Math.floor(heldDays / 30.44);
          const heldYears = Math.floor(heldDays / 365.25);

          function bench(c: Candles | null): { name: string; pct: number | null } {
            if (!c || c.c.length < 2) return { name: "", pct: null };
            const i = findEntryIdx(c.t, buyMs);
            if (i < 0 || i >= c.c.length - 1) return { name: "", pct: null };
            return { name: "", pct: (c.c[c.c.length - 1] - c.c[i]) / c.c[i] };
          }
          const bSpy = bench(spy);
          const bDax = bench(dax);
          const bWorld = bench(world);

          const benchmarks = {
            sp500: bSpy.pct,
            dax: bDax.pct,
            msciWorld: bWorld.pct,
          };

          // Build AI prompt
          const displayName = name || symbol;
          const prompt = [
            `Der Nutzer hat folgenden Trade getätigt und möchte ihn verstehen:`,
            ``,
            `- Wertpapier: ${displayName} (${symbol})`,
            `- Kaufdatum (angefragt): ${buyDate}${adjusted ? ` — angepasst auf nächsten Handelstag: ${actualEntryISO}` : ""}`,
            `- Anzahl Anteile: ${shares}`,
            `- Kaufpreis (Schlusskurs an dem Tag): ${entryClose.toFixed(2)}`,
            `- Gesamter Kaufwert: ${totalCost.toFixed(2)}`,
            `- Aktueller Kurs (jüngster Schlusskurs): ${currentClose.toFixed(2)}`,
            `- Aktueller Gesamtwert: ${currentValue.toFixed(2)}`,
            `- Gewinn/Verlust: ${pnlAbs >= 0 ? "+" : ""}${pnlAbs.toFixed(2)} (${fmtPct(pnlPct)})`,
            `- Haltedauer: ${heldDays} Tage (${heldYears > 0 ? `${heldYears} Jahre, ` : ""}${heldMonths} Monate)`,
            ``,
            `Performance-Vergleich seit Kaufdatum:`,
            `- ${displayName}: ${fmtPct(pnlPct)}`,
            `- S&P 500: ${benchmarks.sp500 != null ? fmtPct(benchmarks.sp500) : "n/a"}`,
            `- DAX: ${benchmarks.dax != null ? fmtPct(benchmarks.dax) : "n/a"}`,
            `- MSCI World: ${benchmarks.msciWorld != null ? fmtPct(benchmarks.msciWorld) : "n/a"}`,
            ``,
            `Bitte erstelle die Analyse exakt im vorgegebenen Format. Bezieh dich konkret auf das Unternehmen / den ETF-Schwerpunkt, das damalige Marktumfeld zum Kaufdatum und die Treiber der Entwicklung seitdem. Nutze in "Bewertung des Trades" den Vergleich mit den Benchmarks.`,
          ].join("\n");

          const apiKey = process.env.LOVABLE_API_KEY;
          let analysis = "";
          let aiError: string | null = null;
          if (!apiKey) {
            aiError = "AI gateway nicht konfiguriert.";
          } else {
            try {
              analysis = await callAi(prompt, apiKey);
            } catch (e) {
              aiError = e instanceof Error ? e.message : "AI-Fehler";
            }
          }

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
            },
            { headers: CORS },
          );
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Unbekannter Fehler" },
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});
