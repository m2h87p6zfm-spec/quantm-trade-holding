// Portfolio im LocalStorage — keine Backend-Abhängigkeit
import { useEffect, useState, useCallback } from "react";

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

export function usePortfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
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

  const add = useCallback((p: Omit<Position, "id" | "openedAt">) => {
    const next = [...read(), { ...p, id: crypto.randomUUID(), openedAt: Date.now() }];
    write(next);
  }, []);
  const remove = useCallback((id: string) => {
    write(read().filter((p) => p.id !== id));
  }, []);
  const clear = useCallback(() => write([]), []);

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
