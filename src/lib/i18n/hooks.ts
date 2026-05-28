// Runtime hooks + selectors. The dictionary is intentionally imported here
// so callers only need `@/lib/i18n`.
import { useSettings } from "../settings";
import type { Bi, Lang } from "./types";
import { DE } from "./dict.de";
import { EN } from "./dict.en";

const DICT = { de: DE, en: EN } as const;

const reported = new Set<string>();
const isDev = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV;

/** Turn "nav.global_intel" / "navGlobalIntel" into "Nav Global Intel". */
function humanizeKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  return last
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function reportMissing(key: string, lang: Lang) {
  if (reported.has(key)) return;
  reported.add(key);
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] missing key "${key}" (lang=${lang})`);
  }
  if (typeof window !== "undefined") {
    const bag = ((window as any).__missingI18nKeys ??= new Set<string>());
    bag.add(key);
  }
}

export function useT() {
  const { settings } = useSettings();
  const lang = (settings.language as Lang) in DICT ? (settings.language as Lang) : "en";
  return (key: string, vars?: Record<string, string | number>): string => {
    const hit = DICT[lang]?.[key] ?? DICT.en[key];
    const raw = hit ?? humanizeKey(key);
    if (hit == null) reportMissing(key, lang);
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
  };
}


export function useLang(): Lang {
  const { settings } = useSettings();
  const lang = settings.language as Lang;
  return lang in DICT ? lang : "en";
}

/** Inline translation helper for one-off JSX strings without a dictionary key. */
export function useTr() {
  const lang = useLang();
  return (de: string, en: string): string => (lang === "en" ? en : de);
}

/** Select the right side of a bilingual string. */
export const pickBi = (b: Bi | string | undefined, lang: Lang): string => {
  if (b == null) return "";
  if (typeof b === "string") return b;
  return b[lang] ?? b.de ?? b.en ?? "";
};
