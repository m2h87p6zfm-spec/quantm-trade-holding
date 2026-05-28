// Runtime hooks + selectors. The dictionary is intentionally imported here
// so callers only need `@/lib/i18n`.
import { useSettings } from "../settings";
import type { Bi, Lang } from "./types";
import { DE } from "./dict.de";
import { EN } from "./dict.en";

const DICT = { de: DE, en: EN } as const;

export function useT() {
  const { settings } = useSettings();
  const lang = (settings.language as Lang) in DICT ? (settings.language as Lang) : "en";
  return (key: string, vars?: Record<string, string | number>): string => {
    const raw = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
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
