import { useEffect, useState, useCallback } from "react";
import type { RiskProfile } from "./analysis";

export type Watchlist = { id: string; name: string; symbols: string[] };
export type ExperienceLevel = "beginner" | "intermediate" | "pro";
export type BaseCurrency = "USD" | "EUR" | "GBP" | "CHF" | "AUD" | "CAD" | "JPY";

/** Tier-1 news publishers. Keys MUST stay stable — used as storage keys. */
export const NEWS_SOURCES = [
  // Tier-1 global wires & financial press
  "reuters", "bloomberg", "wsj", "ft", "economist", "nytimes", "washingtonpost", "guardian", "barrons",
  // US business & markets
  "cnbc", "marketwatch", "yahoo", "investing", "forbes", "fortune", "businessinsider", "axios",
  "seekingalpha", "benzinga", "motleyfool", "thestreet", "zerohedge",
  // Tech & enterprise
  "theinformation", "techcrunch", "theverge", "wired",
  // Crypto
  "coindesk", "cointelegraph", "theblock", "decrypt",
  // Asia
  "nikkei", "scmp", "reutersasia", "bloombergasia",
  // Europe / DACH / FR
  "handelsblatt", "manager", "faz", "boerse", "lesechos",
  // Macro / policy
  "politico", "semafor",
] as const;
export type NewsSource = (typeof NEWS_SOURCES)[number];

type StoredSettings = {
  risk: RiskProfile;
  theme: "dark" | "light";
  minConfidence: number;
  watchlists: Watchlist[];
  activeWatchlistId: string;
  watchlist?: string[]; // legacy
  lastSelected?: string;
  currency: BaseCurrency;
  density: "comfortable" | "compact";
  soundOnAlert: boolean;
  defaultTakeProfit: number;
  defaultStopLoss: number;
  language: "en" | "zh" | "hi" | "es" | "fr" | "ar" | "bn" | "pt" | "ru" | "ur" | "id" | "de" | "ja" | "tr" | "ko";
  hideLowConfidence: boolean;
  experienceLevel: ExperienceLevel;
  notifBreakingNews: boolean;
  newsSources: Record<NewsSource, boolean>;
  /** User's actual holdings (set during onboarding). Shown at top of watchlist. */
  portfolioSymbols: string[];
  /** Optional cost basis per symbol (USD) — placeholder until full trade tracking. */
  costBasis: Record<string, number>;
  /** Flipped to true once user completes the portfolio step. */
  portfolioOnboarded: boolean;
};

export type Settings = Omit<StoredSettings, "watchlist"> & { watchlist: string[] };

const DEFAULT_LIST: Watchlist = {
  id: "default",
  name: "Hauptliste",
  symbols: ["AAPL", "NVDA", "TSLA", "MSFT", "SPY"],
};

const DEFAULT_SOURCES: Record<NewsSource, boolean> = Object.fromEntries(
  NEWS_SOURCES.map((k) => [
    k,
    ["reuters", "bloomberg", "wsj", "ft", "cnbc", "yahoo", "nytimes", "barrons", "marketwatch", "economist"].includes(k),
  ]),
) as Record<NewsSource, boolean>;

/** Market Watch defaults — appended below the user's portfolio. */
export const MARKET_WATCH_DEFAULTS = ["SPY", "QQQ", "DIA", "IWM"] as const;

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
  experienceLevel: "intermediate",
  notifBreakingNews: true,
  newsSources: { ...DEFAULT_SOURCES },
  portfolioSymbols: [],
  costBasis: {},
  portfolioOnboarded: false,
};

function migrate(raw: any): StoredSettings {
  const merged: StoredSettings = { ...DEFAULT, ...raw };
  if (!Array.isArray(merged.watchlists) || merged.watchlists.length === 0) {
    const legacy = Array.isArray(raw?.watchlist) ? raw.watchlist : DEFAULT_LIST.symbols;
    merged.watchlists = [{ id: "default", name: "Hauptliste", symbols: legacy }];
    merged.activeWatchlistId = "default";
  }
  if (!merged.watchlists.find((w) => w.id === merged.activeWatchlistId)) {
    merged.activeWatchlistId = merged.watchlists[0].id;
  }
  merged.newsSources = { ...DEFAULT_SOURCES, ...(merged.newsSources || {}) };
  if (!Array.isArray(merged.portfolioSymbols)) merged.portfolioSymbols = [];
  if (!merged.costBasis || typeof merged.costBasis !== "object") merged.costBasis = {};
  if (typeof merged.portfolioOnboarded !== "boolean") merged.portfolioOnboarded = false;
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

  /** Replace the active watchlist's full ordered symbol list (used by drag-and-drop). */
  const reorderActive = useCallback((orderedSymbols: string[]) => {
    const clean = Array.from(new Set(orderedSymbols.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    mutateActive(() => clean);
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

  /** Create a new watchlist pre-populated with symbols. Used by onboarding starter packs. */
  const createWatchlistWithSymbols = useCallback((name: string, symbols: string[]): string => {
    const id = uid();
    const clean = Array.from(new Set(symbols.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    setStored((prev) => {
      const next: StoredSettings = {
        ...prev,
        watchlists: [...prev.watchlists, { id, name: name.trim() || "Neue Liste", symbols: clean }],
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
      if (prev.watchlists.length <= 1) return prev;
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

  const setPortfolio = useCallback((syms: string[]) => {
    const clean = Array.from(new Set(syms.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    setStored((prev) => {
      const next: StoredSettings = { ...prev, portfolioSymbols: clean, portfolioOnboarded: true };
      write(next);
      return next;
    });
  }, []);

  const reorderPortfolio = useCallback((syms: string[]) => {
    const clean = Array.from(new Set(syms.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    setStored((prev) => {
      const next: StoredSettings = { ...prev, portfolioSymbols: clean };
      write(next);
      return next;
    });
  }, []);

  const addToPortfolio = useCallback((sym: string) => {
    const SYM = sym.trim().toUpperCase();
    if (!SYM) return;
    setStored((prev) => {
      if (prev.portfolioSymbols.includes(SYM)) return prev;
      const next: StoredSettings = { ...prev, portfolioSymbols: [...prev.portfolioSymbols, SYM] };
      write(next);
      return next;
    });
  }, []);

  const removeFromPortfolio = useCallback((sym: string) => {
    const SYM = sym.trim().toUpperCase();
    setStored((prev) => {
      const next: StoredSettings = {
        ...prev,
        portfolioSymbols: prev.portfolioSymbols.filter((x) => x !== SYM),
      };
      write(next);
      return next;
    });
  }, []);

  const setCostBasis = useCallback((sym: string, value: number | undefined) => {
    const SYM = sym.trim().toUpperCase();
    setStored((prev) => {
      const next: StoredSettings = { ...prev, costBasis: { ...prev.costBasis } };
      if (value == null || !Number.isFinite(value) || value <= 0) delete next.costBasis[SYM];
      else next.costBasis[SYM] = value;
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
    reorderActive,
    createWatchlist,
    createWatchlistWithSymbols,
    renameWatchlist,
    deleteWatchlist,
    setActiveWatchlist,
    setPortfolio,
    reorderPortfolio,
    addToPortfolio,
    removeFromPortfolio,
    setCostBasis,
  };
}
