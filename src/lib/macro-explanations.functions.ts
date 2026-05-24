import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Generates fresh, trader-grade explanations for each tile shown in the
 * "Global Snapshot" + "Core Market Drivers" sections of /global-intel.
 *
 * Pulls today's macro headlines via Firecrawl, then asks Lovable AI to
 * justify the current state of each metric in 2–3 sentences using those
 * headlines. Returns one record keyed by metric id.
 *
 * Output is cached on the client (React Query staleTime ~6h) so it only
 * re-runs a couple of times per day.
 */

export type MacroMetricKey =
  // Global Snapshot pills
  | "globalRisk"
  | "marketTrend"
  | "liquidity"
  | "usd"
  | "vol"
  // Core Market Drivers
  | "positioning"
  | "liquidityCB"
  | "currency"
  | "growth";

export type MetricInput = {
  key: MacroMetricKey;
  label: string;
  /** Current human-readable status, e.g. "Mixed", "Strong", "Medium". */
  status: string;
};

export type MacroExplanation = {
  why: string;       // 2–3 sentences, trader-grade
  impact: string;    // 1 short sentence on what it means for positioning
  citations: string[]; // headline titles used as evidence
};

export type MacroExplanationsResult = {
  asOf: string;
  explanations: Record<string, MacroExplanation>;
  error: string | null;
};

const METRIC_PROMPT_HINT: Record<MacroMetricKey, string> = {
  globalRisk:   "overall risk-on / risk-off appetite across cross-asset flows",
  marketTrend:  "directional bias of major equity indices (bullish / bearish / uncertain)",
  liquidity:    "global liquidity & financial conditions (expanding / stable / tight)",
  usd:          "USD strength vs the broad basket (DXY direction)",
  vol:          "realised + implied volatility regime (VIX, MOVE)",
  positioning:  "how investors are actually positioned (CTA, systematic, options skew)",
  liquidityCB:  "central-bank policy stance and net liquidity injection / drain",
  currency:     "USD pressure on commodities, EM FX and US exporters",
  growth:       "global growth outlook across US, Europe, China, EM",
};

async function fetchHeadlines(apiKey: string): Promise<Array<{ title: string; url: string }>> {
  const queries = [
    "global markets today S&P 500 Fed dollar",
    "central bank rate decision inflation today",
    "geopolitics oil markets today",
  ];
  type FCRes = {
    data?:
      | { web?: Array<{ url?: string; title?: string }>; news?: Array<{ url?: string; title?: string }> }
      | Array<{ url?: string; title?: string }>;
  };
  const out: Array<{ title: string; url: string }> = [];
  await Promise.all(
    queries.map(async (q) => {
      try {
        const r = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ query: q, limit: 6, tbs: "qdr:d", sources: ["web", "news"] }),
        });
        if (!r.ok) return;
        const j = (await r.json()) as FCRes;
        const pushFrom = (arr?: Array<{ url?: string; title?: string }>) =>
          (arr ?? []).forEach((x) => {
            if (x.url && x.title) out.push({ title: x.title, url: x.url });
          });
        if (Array.isArray(j.data)) pushFrom(j.data);
        else if (j.data) {
          pushFrom(j.data.web);
          pushFrom(j.data.news);
        }
      } catch {
        /* ignore individual query failures */
      }
    }),
  );
  // De-dupe + cap.
  const seen = new Set<string>();
  return out
    .filter((h) => {
      if (seen.has(h.url)) return false;
      seen.add(h.url);
      return true;
    })
    .slice(0, 18);
}

export const getMacroExplanations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { metrics: MetricInput[] }) => {
    if (!input || !Array.isArray(input.metrics) || input.metrics.length === 0) {
      throw new Error("metrics[] required");
    }
    return { metrics: input.metrics.slice(0, 12) };
  })
  .handler(async ({ data }): Promise<MacroExplanationsResult> => {
    const aiKey = process.env.LOVABLE_API_KEY;
    const fcKey = process.env.FIRECRAWL_API_KEY;
    const asOf = new Date().toISOString();

    if (!aiKey) {
      return { asOf, explanations: {}, error: "AI gateway not configured." };
    }

    // 1. Pull today's headlines for grounding (best-effort).
    const headlines = fcKey ? await fetchHeadlines(fcKey) : [];

    // 2. Build prompt — ask the model to JUSTIFY each current state.
    const metricLines = data.metrics
      .map(
        (m) =>
          `- key: "${m.key}" | metric: ${m.label} (${METRIC_PROMPT_HINT[m.key] ?? "macro metric"}) | currentState: "${m.status}"`,
      )
      .join("\n");

    const headlineBlock = headlines.length
      ? headlines.map((h, i) => `[${i + 1}] ${h.title}`).join("\n")
      : "(no fresh headlines available — reason from general macro knowledge)";

    const system =
      "You are a senior macro strategist briefing a professional trader. Your job is to explain WHY each macro metric is currently in the state shown, grounded in today's news. Be concrete, use proper tickers and instruments (DXY, VIX, MOVE, SPX, 10y, Brent, gold, USD/JPY, etc.), avoid platitudes. Respond ONLY with valid JSON.";

    const user = `Today's macro headlines for context:
${headlineBlock}

Explain why each of the following macro metrics is currently in the stated state. For each, output:
  - "why":   2–3 sentences, trader-grade, referencing concrete drivers (rates, central banks, geopolitics, flows). Use today's headlines when relevant.
  - "impact": 1 short sentence on what this means for positioning right now.
  - "citations": array of up to 2 headline numbers from the list above that you used (e.g. [1, 4]). Empty array if none used.

Metrics:
${metricLines}

Respond with strict JSON:
{
  "explanations": {
    "<key>": { "why": "...", "impact": "...", "citations": [1,2] },
    ...
  }
}`;

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.error("Macro explanations AI error", r.status, t.slice(0, 200));
        return { asOf, explanations: {}, error: `AI service error (${r.status})` };
      }
      const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = j.choices?.[0]?.message?.content ?? "{}";

      let parsed: { explanations?: Record<string, { why?: string; impact?: string; citations?: number[] }> } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            parsed = JSON.parse(m[0]);
          } catch {
            /* leave empty */
          }
        }
      }

      const explanations: Record<string, MacroExplanation> = {};
      for (const metric of data.metrics) {
        const ex = parsed.explanations?.[metric.key];
        if (!ex) continue;
        const cites = Array.isArray(ex.citations)
          ? ex.citations
              .map((n) => headlines[n - 1]?.title)
              .filter((x): x is string => typeof x === "string")
              .slice(0, 2)
          : [];
        explanations[metric.key] = {
          why: String(ex.why ?? "").slice(0, 600),
          impact: String(ex.impact ?? "").slice(0, 240),
          citations: cites,
        };
      }

      return { asOf, explanations, error: null };
    } catch (err) {
      console.error("getMacroExplanations failed", err);
      return { asOf, explanations: {}, error: "Live explanation service is unavailable." };
    }
  });
