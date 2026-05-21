// Portfolio im LocalStorage — keine Backend-Abhängigkeit
import { useEffect, useState, useCallback } from "react";

export type Position = {
  id: string;
  symbol: string;
  qty: number;
  entry: number; // Einstandskurs
  side: "LONG" | "SHORT";
  openedAt: number;
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
  const diff = pos.side === "LONG" ? price - pos.entry : pos.entry - price;
  const abs = diff * pos.qty;
  const pct = (diff / pos.entry) * 100;
  return { abs, pct, value: price * pos.qty };
}
