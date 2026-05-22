import { useEffect, useState, useCallback } from "react";
import type { RiskProfile } from "./analysis";

export type Watchlist = { id: string; name: string; symbols: string[] };

type StoredSettings = {
  risk: RiskProfile;
  theme: "dark" | "light";
  minConfidence: number;
  // Internal multi-watchlist storage
  watchlists: Watchlist[];
  activeWatchlistId: string;
  // Deprecated single-list field, kept only for migration
  watchlist?: string[];
  lastSelected?: string;
  currency: "USD" | "EUR" | "CHF";
  density: "comfortable" | "compact";
  soundOnAlert: boolean;
  defaultTakeProfit: number;
  defaultStopLoss: number;
  language: "de" | "en" | "fr" | "es" | "ar";
  hideLowConfidence: boolean;
};

// What components see — `watchlist` is a computed view of the active list
export type Settings = Omit<StoredSettings, "watchlist"> & { watchlist: string[] };

const DEFAULT_LIST: Watchlist = {
  id: "default",
  name: "Hauptliste",
  symbols: ["AAPL", "NVDA", "TSLA", "MSFT", "SPY"],
};

const DEFAULT: StoredSettings = {
  risk: "ausgewogen",
  theme: "dark",
  minConfidence: 60,
  watchlists: [DEFAULT_LIST],
  activeWatchlistId: DEFAULT_LIST.id,
  lastSelected: undefined,
  currency: "USD",
  density: "comfortable",
  soundOnAlert: true,
  defaultTakeProfit: 8,
  defaultStopLoss: 4,
  language: "de",
  hideLowConfidence: true,
};

function migrate(raw: any): StoredSettings {
  const merged: StoredSettings = { ...DEFAULT, ...raw };
  // Migrate legacy single watchlist into the multi-watchlist structure
  if (!Array.isArray(merged.watchlists) || merged.watchlists.length === 0) {
    const legacy = Array.isArray(raw?.watchlist) ? raw.watchlist : DEFAULT_LIST.symbols;
    merged.watchlists = [{ id: "default", name: "Hauptliste", symbols: legacy }];
    merged.activeWatchlistId = "default";
  }
  if (!merged.watchlists.find((w) => w.id === merged.activeWatchlistId)) {
    merged.activeWatchlistId = merged.watchlists[0].id;
  }
  delete (merged as any).watchlist;
  return merged;
}

function project(s: StoredSettings): Settings {
  const active = s.watchlists.find((w) => w.id === s.activeWatchlistId) ?? s.watchlists[0];
  return { ...s, watchlist: active?.symbols ?? [] };
}

function read(): StoredSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem("ta_settings");
    if (!raw) return DEFAULT;
    return migrate(JSON.parse(raw));
  } catch { return DEFAULT; }
}

function write(s: StoredSettings) {
  localStorage.setItem("ta_settings", JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("ta_settings_change"));
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export function useSettings() {
  const [stored, setStored] = useState<StoredSettings>(DEFAULT);
  useEffect(() => {
    setStored(read());
    const h = () => setStored(read());
    window.addEventListener("ta_settings_change", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("ta_settings_change", h); window.removeEventListener("storage", h); };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (stored.theme === "light") { root.classList.add("light"); root.classList.remove("dark"); }
    else { root.classList.remove("light"); root.classList.add("dark"); }
  }, [stored.theme]);

  const s = project(stored);

  const update = useCallback((patch: Partial<Settings>) => {
    setStored((prev) => {
      // Reject `watchlist` direct writes — must go through list-aware helpers
      const { watchlist: _ignore, ...rest } = patch as any;
      const next: StoredSettings = { ...prev, ...rest };
      write(next);
      return next;
    });
  }, []);

  const mutateActive = useCallback((mut: (syms: string[]) => string[]) => {
    setStored((prev) => {
      const next: StoredSettings = {
        ...prev,
        watchlists: prev.watchlists.map((w) =>
          w.id === prev.activeWatchlistId ? { ...w, symbols: mut(w.symbols) } : w
        ),
      };
      write(next);
      return next;
    });
  }, []);

  const toggleWatch = useCallback((sym: string) => {
    const SYM = sym.trim().toUpperCase();
    if (!SYM) return;
    mutateActive((syms) => (syms.includes(SYM) ? syms.filter((x) => x !== SYM) : [...syms, SYM]));
  }, [mutateActive]);

  const addSymbols = useCallback((syms: string[]) => {
    const clean = Array.from(new Set(syms.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    if (clean.length === 0) return;
    mutateActive((cur) => Array.from(new Set([...cur, ...clean])));
  }, [mutateActive]);

  const removeSymbol = useCallback((sym: string) => {
    const SYM = sym.trim().toUpperCase();
    mutateActive((syms) => syms.filter((x) => x !== SYM));
  }, [mutateActive]);

  const createWatchlist = useCallback((name: string): string => {
    const id = uid();
    setStored((prev) => {
      const next: StoredSettings = {
        ...prev,
        watchlists: [...prev.watchlists, { id, name: name.trim() || "Neue Liste", symbols: [] }],
        activeWatchlistId: id,
      };
      write(next);
      return next;
    });
    return id;
  }, []);

  const renameWatchlist = useCallback((id: string, name: string) => {
    setStored((prev) => {
      const next: StoredSettings = {
        ...prev,
        watchlists: prev.watchlists.map((w) => (w.id === id ? { ...w, name } : w)),
      };
      write(next);
      return next;
    });
  }, []);

  const deleteWatchlist = useCallback((id: string) => {
    setStored((prev) => {
      if (prev.watchlists.length <= 1) return prev; // never delete the last one
      const remaining = prev.watchlists.filter((w) => w.id !== id);
      const nextActive = prev.activeWatchlistId === id ? remaining[0].id : prev.activeWatchlistId;
      const next: StoredSettings = { ...prev, watchlists: remaining, activeWatchlistId: nextActive };
      write(next);
      return next;
    });
  }, []);

  const setActiveWatchlist = useCallback((id: string) => {
    setStored((prev) => {
      if (!prev.watchlists.find((w) => w.id === id)) return prev;
      const next: StoredSettings = { ...prev, activeWatchlistId: id };
      write(next);
      return next;
    });
  }, []);

  return {
    settings: s,
    update,
    toggleWatch,
    addSymbols,
    removeSymbol,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    setActiveWatchlist,
  };
}
