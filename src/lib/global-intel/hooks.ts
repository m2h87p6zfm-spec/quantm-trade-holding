import { useMemo } from "react";
import { useLang } from "../i18n";
import type { CountryIntel } from "./types";
import { COUNTRIES, getCountries, getCountry } from "./countries";
import { getGlobalHeadline } from "./summary";

/** All countries, with English overrides applied when the UI language is "en". */
export function useCountries(): CountryIntel[] {
  const lang = useLang();
  return useMemo(() => getCountries(lang), [lang]);
}

/** Single country by name, language-aware. Falls back to the German base. */
export function useCountry(name: string | null | undefined): CountryIntel | undefined {
  const lang = useLang();
  return useMemo(
    () => (name ? getCountry(name, lang) : undefined),
    [name, lang],
  );
}

/** Map view of the lang-aware country list — drop-in replacement for COUNTRIES_BY_NAME. */
export function useCountryMap(): Map<string, CountryIntel> {
  const list = useCountries();
  return useMemo(() => new Map(list.map((c) => [c.name, c])), [list]);
}

/** Language-aware global summary headline. */
export function useGlobalHeadline(): string {
  const lang = useLang();
  return getGlobalHeadline(lang);
}

// Re-exported so callers can stay tree-shake friendly when they only need the constant.
export { COUNTRIES };
