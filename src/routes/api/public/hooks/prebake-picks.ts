// Prebake-Cron: warmt den Shared-Cache mit den Tageskerzen der Top-Symbole,
// damit Picks-Scans und Asset-Details für 12 h cache-only laufen.
//
// Ablauf:
//   1. Nimm die ersten N PRODUCTS (Default 250 = "extended"-Universum).
//   2. Fetche pro Symbol Daily-Candles mit 12 h TTL — beim ersten Lauf zahlt
//      die Cron einmal die TD-Credits, danach sind alle User-Scans gratis.
//   3. Throttle auf ~5 req/s, um TD-Rate-Limit nicht zu sprengen.
//
// Schedule (siehe SQL): stündlich. Bei geschlossenem US-Markt sind 99 %
// der Requests sofort Cache-Hits — kostet faktisch nichts.

import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/products";
import { fetchYahooChartCached } from "@/lib/yahoo-cache.server";
import { adaptiveCandleTtl } from "@/lib/twelvedata.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-cron-secret",
} as const;

const DEFAULT_LIMIT = 250;
const BATCH_SIZE = 5; // 5 parallele TD-Calls
const BATCH_DELAY_MS = 1100; // → ~5 req/s, gut unter TD-Free-Rate-Limit

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function warmOne(symbol: string, ttl: number): Promise<"hit" | "miss" | "error"> {
  try {
    const res = await fetchYahooChartCached(symbol, "1d", "1y", ttl);
    if (!res.value) return "error";
    // `stale: false` heißt entweder Cache-Hit oder frisch geholt — beides ok.
    return res.lastUpdated > Date.now() - 5_000 ? "miss" : "hit";
  } catch {
    return "error";
  }
}

export const Route = createFileRoute("/api/public/hooks/prebake-picks")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        // Optionaler Schutz: wenn CRON_SECRET gesetzt, erwarte Header.
        // Lockerer Default, weil /api/public/* eh nicht öffentlich beworben wird.
        const secret = process.env.CRON_SECRET;
        if (secret) {
          const provided = request.headers.get("x-cron-secret");
          if (provided !== secret) {
            return new Response(JSON.stringify({ error: "unauthorized" }), {
              status: 401, headers: { "Content-Type": "application/json", ...CORS },
            });
          }
        }

        const url = new URL(request.url);
        const limit = Math.min(
          PRODUCTS.length,
          Math.max(10, Number(url.searchParams.get("limit") || DEFAULT_LIMIT)),
        );

        const symbols = PRODUCTS.slice(0, limit).map((p) => p.symbol);
        // Benchmarks immer mit pre-warmen (werden vom APEX-Engine genutzt).
        const benches = ["SPY", "QQQ", "IWM", "DIA"];
        for (const b of benches) if (!symbols.includes(b)) symbols.push(b);

        const ttl = adaptiveCandleTtl(60 * 60);
        let hits = 0, misses = 0, errors = 0;
        const t0 = Date.now();

        for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
          const batch = symbols.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map((s) => warmOne(s, ttl)));
          for (const r of results) {
            if (r === "hit") hits++;
            else if (r === "miss") misses++;
            else errors++;
          }
          if (i + BATCH_SIZE < symbols.length) await sleep(BATCH_DELAY_MS);
        }

        const elapsedMs = Date.now() - t0;
        return new Response(
          JSON.stringify({
            ok: true,
            total: symbols.length,
            hits,
            misses,
            errors,
            elapsedMs,
            ttlSec: ttl,
            note:
              hits / Math.max(1, symbols.length) > 0.8
                ? "Cache war bereits warm — minimaler Credit-Verbrauch."
                : "Cache wurde neu befüllt — nächster Lauf wird >80 % Hits zeigen.",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
        );
      },
    },
  },
});
