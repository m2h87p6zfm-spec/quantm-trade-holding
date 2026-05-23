// Portfolio — LocalStorage als Cache + Supabase-Sync pro Account
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { recordApexAnalysis } from "@/lib/trackRecord.functions";
import { findProduct } from "@/lib/products";

export type Position = {
  id: string;
  symbol: string;
  qty: number;
  entry: number; // Einstandskurs
  side: "LONG" | "SHORT";
  openedAt: number;
  brokerCurrentPrice?: number;
  brokerCurrentValue?: number;
  brokerInvested?: number;
  brokerPnlAbs?: number;
  brokerPnlPct?: number;
  brokerCurrency?: string;
};

const KEY = "apex.portfolio.v1";

function read(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Position[]) : [];
  } catch {
    return [];
  }
}
function write(p: Position[]) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("apex:portfolio"));
}

/* ---------------- Supabase sync helpers ---------------- */

type DbRow = {
  client_id: string;
  symbol: string;
  qty: number | string;
  entry: number | string;
  side: string;
  opened_at: string;
  broker_current_price: number | string | null;
  broker_current_value: number | string | null;
  broker_invested: number | string | null;
  broker_pnl_abs: number | string | null;
  broker_pnl_pct: number | string | null;
  broker_currency: string | null;
};

function rowToPos(r: DbRow): Position {
  const num = (v: number | string | null | undefined) =>
    v == null ? undefined : Number(v);
  return {
    id: r.client_id,
    symbol: r.symbol,
    qty: Number(r.qty),
    entry: Number(r.entry),
    side: r.side === "SHORT" ? "SHORT" : "LONG",
    openedAt: new Date(r.opened_at).getTime(),
    brokerCurrentPrice: num(r.broker_current_price),
    brokerCurrentValue: num(r.broker_current_value),
    brokerInvested: num(r.broker_invested),
    brokerPnlAbs: num(r.broker_pnl_abs),
    brokerPnlPct: num(r.broker_pnl_pct),
    brokerCurrency: r.broker_currency ?? undefined,
  };
}

function posToRow(p: Position, userId: string) {
  return {
    user_id: userId,
    client_id: p.id,
    symbol: p.symbol,
    qty: p.qty,
    entry: p.entry,
    side: p.side,
    opened_at: new Date(p.openedAt).toISOString(),
    broker_current_price: p.brokerCurrentPrice ?? null,
    broker_current_value: p.brokerCurrentValue ?? null,
    broker_invested: p.brokerInvested ?? null,
    broker_pnl_abs: p.brokerPnlAbs ?? null,
    broker_pnl_pct: p.brokerPnlPct ?? null,
    broker_currency: p.brokerCurrency ?? null,
  };
}

async function fetchRemote(userId: string): Promise<Position[]> {
  const { data, error } = await supabase
    .from("user_portfolio_positions")
    .select(
      "client_id, symbol, qty, entry, side, opened_at, broker_current_price, broker_current_value, broker_invested, broker_pnl_abs, broker_pnl_pct, broker_currency",
    )
    .eq("user_id", userId)
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToPos(r as DbRow));
}

async function upsertRemote(userId: string, p: Position) {
  await supabase
    .from("user_portfolio_positions")
    .upsert(posToRow(p, userId), { onConflict: "user_id,client_id" });
}

async function deleteRemote(userId: string, clientId: string) {
  await supabase
    .from("user_portfolio_positions")
    .delete()
    .eq("user_id", userId)
    .eq("client_id", clientId);
}

async function clearRemote(userId: string) {
  await supabase.from("user_portfolio_positions").delete().eq("user_id", userId);
}

/* ---------------- Apex Track Record recording ---------------- */

function recordPositionToTrackRecord(p: Position) {
  const price =
    p.brokerCurrentPrice ?? (p.qty > 0 && p.entry > 0 ? p.entry : 0);
  if (!Number.isFinite(price) || price <= 0) return;
  const verdict: "KAUF" | "VERKAUFEN" = p.side === "SHORT" ? "VERKAUFEN" : "KAUF";
  const product = findProduct(p.symbol);
  recordApexAnalysis({
    data: {
      ticker: p.symbol,
      name: product?.name ?? p.symbol,
      sector: product?.sector ?? null,
      asset_type: "Aktie",
      verdict,
      confidence_score: 70,
      price_at_analysis: price,
      indicators: {
        source: "portfolio",
        side: p.side,
        qty: p.qty,
        entry: p.entry,
      },
    },
  }).catch(() => {});
}

/* ---------------- Hook ---------------- */

export function usePortfolio() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [positions, setPositions] = useState<Position[]>([]);
  const hydratedFor = useRef<string | null>(null);

  // Local listener
  useEffect(() => {
    setPositions(read());
    const h = () => setPositions(read());
    window.addEventListener("apex:portfolio", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("apex:portfolio", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  // Pull from DB on login
  useEffect(() => {
    if (!userId) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === userId) return;
    hydratedFor.current = userId;
    (async () => {
      try {
        const remote = await fetchRemote(userId);
        const local = read();
        // Merge: alle remote-IDs gewinnen; lokale, die noch nicht remote sind, pushen
        const remoteIds = new Set(remote.map((r) => r.id));
        const localOnly = local.filter((l) => !remoteIds.has(l.id));
        if (localOnly.length > 0) {
          await Promise.all(localOnly.map((p) => upsertRemote(userId, p)));
        }
        const merged = [...remote, ...localOnly];
        write(merged);
      } catch (e) {
        console.warn("portfolio sync failed", e);
      }
    })();
  }, [userId]);

  const add = useCallback(
    (p: Omit<Position, "id" | "openedAt">) => {
      const pos: Position = {
        ...p,
        id: crypto.randomUUID(),
        openedAt: Date.now(),
      };
      const next = [...read(), pos];
      write(next);
      if (userId) upsertRemote(userId, pos).catch(() => {});
      // Kaufempfehlung in Apex Track Record speichern
      recordPositionToTrackRecord(pos);
    },
    [userId],
  );

  const remove = useCallback(
    (id: string) => {
      write(read().filter((p) => p.id !== id));
      if (userId) deleteRemote(userId, id).catch(() => {});
    },
    [userId],
  );

  const clear = useCallback(() => {
    write([]);
    if (userId) clearRemote(userId).catch(() => {});
  }, [userId]);

  return { positions, add, remove, clear };
}

export function pnl(pos: Position, price: number) {
  if (
    pos.brokerCurrentValue &&
    (pos.brokerPnlAbs !== undefined || pos.brokerPnlPct !== undefined)
  ) {
    const value = pos.brokerCurrentValue;
    const basis =
      pos.brokerInvested ??
      (pos.brokerPnlAbs !== undefined
        ? value - pos.brokerPnlAbs
        : value / (1 + (pos.brokerPnlPct ?? 0) / 100));
    const abs = pos.brokerPnlAbs ?? value - basis;
    const pct = pos.brokerPnlPct ?? (basis > 0 ? (abs / basis) * 100 : 0);
    return { abs, pct, value };
  }
  if (pos.qty === 1 && pos.entry > 500 && price > 0 && pos.entry / price > 5) {
    return { abs: 0, pct: 0, value: pos.entry };
  }
  const diff = pos.side === "LONG" ? price - pos.entry : pos.entry - price;
  const abs = diff * pos.qty;
  const pct = (diff / pos.entry) * 100;
  return { abs, pct, value: price * pos.qty };
}

export function costBasis(pos: Position) {
  if (
    pos.brokerCurrentValue &&
    (pos.brokerPnlAbs !== undefined || pos.brokerPnlPct !== undefined)
  ) {
    return (
      pos.brokerInvested ??
      (pos.brokerPnlAbs !== undefined
        ? pos.brokerCurrentValue - pos.brokerPnlAbs
        : pos.brokerCurrentValue / (1 + (pos.brokerPnlPct ?? 0) / 100))
    );
  }
  return pos.entry * pos.qty;
}
