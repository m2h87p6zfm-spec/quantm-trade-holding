// Smart Alerts — LocalStorage + Toast bei Schwellen-Trigger
import { useEffect, useState, useCallback } from "react";

export type AlertRule = {
  id: string;
  symbol: string;
  kind: "price_above" | "price_below" | "score_above" | "score_below";
  threshold: number;
  createdAt: number;
  triggeredAt?: number;
  note?: string;
};

const KEY = "apex.alerts.v1";

function read(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(a: AlertRule[]) {
  localStorage.setItem(KEY, JSON.stringify(a));
  window.dispatchEvent(new CustomEvent("apex:alerts"));
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  useEffect(() => {
    setAlerts(read());
    const h = () => setAlerts(read());
    window.addEventListener("apex:alerts", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("apex:alerts", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const add = useCallback((a: Omit<AlertRule, "id" | "createdAt">) => {
    write([...read(), { ...a, id: crypto.randomUUID(), createdAt: Date.now() }]);
  }, []);
  const remove = useCallback((id: string) => {
    write(read().filter((a) => a.id !== id));
  }, []);
  const markTriggered = useCallback((id: string) => {
    write(read().map((a) => (a.id === id ? { ...a, triggeredAt: Date.now() } : a)));
  }, []);

  return { alerts, add, remove, markTriggered };
}

export function evaluate(rule: AlertRule, ctx: { price?: number; score?: number }): boolean {
  if ((rule.kind === "price_above" || rule.kind === "price_below") && ctx.price == null) return false;
  if ((rule.kind === "score_above" || rule.kind === "score_below") && ctx.score == null) return false;
  switch (rule.kind) {
    case "price_above": return ctx.price! >= rule.threshold;
    case "price_below": return ctx.price! <= rule.threshold;
    case "score_above": return ctx.score! >= rule.threshold;
    case "score_below": return ctx.score! <= rule.threshold;
  }
}
