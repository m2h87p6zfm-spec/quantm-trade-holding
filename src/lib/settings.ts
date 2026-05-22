import { useEffect, useState } from "react";
import type { RiskProfile } from "./analysis";

type Settings = {
  risk: RiskProfile;
  theme: "dark" | "light";
  minConfidence: number;
  watchlist: string[];
  lastSelected?: string;
  currency: "USD" | "EUR" | "CHF";
  density: "comfortable" | "compact";
  soundOnAlert: boolean;
  defaultTakeProfit: number;
  defaultStopLoss: number;
  language: "de" | "en" | "fr" | "es" | "ar";
  hideLowConfidence: boolean;
};

const DEFAULT: Settings = {
  risk: "ausgewogen",
  theme: "dark",
  minConfidence: 60,
  watchlist: ["AAPL", "NVDA", "TSLA", "MSFT", "SPY"],
  lastSelected: undefined,
  currency: "USD",
  density: "comfortable",
  soundOnAlert: true,
  defaultTakeProfit: 8,
  defaultStopLoss: 4,
  language: "de",
  hideLowConfidence: true,
};

function read(): Settings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem("ta_settings");
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}

function write(s: Settings) {
  localStorage.setItem("ta_settings", JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("ta_settings_change"));
}

export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULT);
  useEffect(() => {
    setS(read());
    const h = () => setS(read());
    window.addEventListener("ta_settings_change", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("ta_settings_change", h); window.removeEventListener("storage", h); };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (s.theme === "light") { root.classList.add("light"); root.classList.remove("dark"); }
    else { root.classList.remove("light"); root.classList.add("dark"); }
  }, [s.theme]);
  const update = (patch: Partial<Settings>) => { const next = { ...s, ...patch }; setS(next); write(next); };
  const toggleWatch = (sym: string) => {
    const exists = s.watchlist.includes(sym);
    update({ watchlist: exists ? s.watchlist.filter((x) => x !== sym) : [...s.watchlist, sym] });
  };
  return { settings: s, update, toggleWatch };
}
