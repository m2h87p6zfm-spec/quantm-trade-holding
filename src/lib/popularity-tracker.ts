// Lightweight client-side popularity tracker.
// Counts views with time-decayed scoring stored in localStorage.
// Used for "Most Viewed Stocks" and "Most Tracked Countries" widgets.

import { useEffect, useState } from "react";

type Bucket = "stock" | "country";
type Entry = { key: string; count: number; last: number };
type Store = Record<string, Entry>;

const STORAGE_PREFIX = "qmt:popularity:v1:";
const MAX_ENTRIES = 200; // hard cap to avoid unbounded growth
const HALF_LIFE_DAYS = 14;

function storageKey(bucket: Bucket) {
  return STORAGE_PREFIX + bucket;
}

function read(bucket: Bucket): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(bucket));
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(bucket: Bucket, data: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(bucket), JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(`popularity:${bucket}`));
  } catch {
    // quota or disabled storage — silently ignore
  }
}

function prune(store: Store): Store {
  const entries = Object.values(store);
  if (entries.length <= MAX_ENTRIES) return store;
  // keep top N by score
  const ranked = entries
    .map((e) => ({ e, s: decayed(e) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_ENTRIES);
  const next: Store = {};
  ranked.forEach(({ e }) => (next[e.key] = e));
  return next;
}

function decayed(e: Entry): number {
  const ageDays = (Date.now() - e.last) / (1000 * 60 * 60 * 24);
  const factor = Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE_DAYS);
  return e.count * factor;
}

export function trackView(bucket: Bucket, key: string) {
  if (!key) return;
  const store = read(bucket);
  const existing = store[key];
  store[key] = {
    key,
    count: (existing?.count ?? 0) + 1,
    last: Date.now(),
  };
  write(bucket, prune(store));
}

export type RankedItem = { key: string; score: number; count: number; last: number };

export function getTop(bucket: Bucket, limit = 5): RankedItem[] {
  const store = read(bucket);
  return Object.values(store)
    .map((e) => ({ key: e.key, score: decayed(e), count: e.count, last: e.last }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** React hook — re-renders when items in `bucket` change (same-tab and cross-tab). */
export function useTopTracked(bucket: Bucket, limit = 5): RankedItem[] {
  const [items, setItems] = useState<RankedItem[]>(() => getTop(bucket, limit));
  useEffect(() => {
    const update = () => setItems(getTop(bucket, limit));
    update();
    const onCustom = () => update();
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(bucket)) update();
    };
    window.addEventListener(`popularity:${bucket}`, onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(`popularity:${bucket}`, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [bucket, limit]);
  return items;
}
