import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/api-auth.server";
import { getQuotesBatch } from "@/lib/twelvedata.server";

// ============================================================
// Stündlicher Cron: hält die Broker-Snapshots aller User-Depots
// (user_portfolio_positions) mit aktuellen Marktpreisen frisch —
// auch wenn niemand die App offen hat.
//
// Live-Kurse im Frontend werden weiterhin von useLiveQuotes
// überlagert; dieser Job sorgt nur für eine bekannte, frische
// Baseline für Alerts, Cockpit-Werte beim ersten Render und
// Dashboards.
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-cron-secret",
} as const;
const JSON_HEADERS = { "Content-Type": "application/json", ...CORS } as const;

type PositionRow = {
  id: string;
  user_id: string;
  symbol: string;
  qty: number | string;
  entry: number | string;
  side: string;
  broker_currency: string | null;
};

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export const Route = createFileRoute("/api/public/hooks/refresh-portfolios")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const authErr = requireCronSecret(request);
        if (authErr) return authErr;

        const t0 = Date.now();

        // 1) Alle Positionen aller User laden
        const { data: rows, error } = await supabaseAdmin
          .from("user_portfolio_positions")
          .select("id, user_id, symbol, qty, entry, side, broker_currency");

        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: JSON_HEADERS },
          );
        }
        const positions = (rows ?? []) as PositionRow[];
        if (positions.length === 0) {
          return new Response(
            JSON.stringify({ ok: true, positions: 0, symbols: 0, updated: 0 }),
            { headers: JSON_HEADERS },
          );
        }

        // 2) Distinct Symbole → in Batches (TD-Batch max 120) Quotes holen
        const symbols = Array.from(
          new Set(positions.map((p) => p.symbol).filter(Boolean)),
        );
        const quotes: Record<string, { c: number; currency?: string }> = {};
        for (const batch of chunk(symbols, 100)) {
          try {
            const res = await getQuotesBatch(batch);
            for (const [sym, q] of Object.entries(res)) {
              if (q && Number.isFinite(q.c)) {
                quotes[sym.toUpperCase()] = { c: q.c, currency: q.currency };
              }
            }
          } catch {
            /* einzelne Batch-Fehler verschlucken – andere Symbole sollen trotzdem updaten */
          }
        }

        // 3) Pro Position: neuen Snapshot in user_portfolio_positions schreiben
        let updated = 0;
        let skipped = 0;
        const nowIso = new Date().toISOString();
        for (const p of positions) {
          const q = quotes[p.symbol.toUpperCase()];
          if (!q) {
            skipped++;
            continue;
          }
          const qty = Number(p.qty);
          const entry = Number(p.entry);
          const price = q.c;
          if (!Number.isFinite(qty) || !Number.isFinite(entry) || !Number.isFinite(price)) {
            skipped++;
            continue;
          }
          const isShort = p.side === "SHORT";
          const value = qty * price;
          const invested = qty * entry;
          const pnlAbs = isShort ? invested - value : value - invested;
          const pnlPct = invested > 0 ? (pnlAbs / invested) * 100 : 0;

          const { error: upErr } = await supabaseAdmin
            .from("user_portfolio_positions")
            .update({
              broker_current_price: price,
              broker_current_value: value,
              broker_invested: invested,
              broker_pnl_abs: pnlAbs,
              broker_pnl_pct: pnlPct,
              broker_currency: p.broker_currency ?? q.currency ?? null,
              updated_at: nowIso,
            })
            .eq("id", p.id);
          if (upErr) skipped++;
          else updated++;
        }

        return new Response(
          JSON.stringify({
            ok: true,
            positions: positions.length,
            symbols: symbols.length,
            quoted: Object.keys(quotes).length,
            updated,
            skipped,
            duration_ms: Date.now() - t0,
          }),
          { headers: JSON_HEADERS },
        );
      },
    },
  },
});
