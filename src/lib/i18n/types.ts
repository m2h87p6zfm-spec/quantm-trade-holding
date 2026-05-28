// Shared i18n types — kept tiny so feature code can import without pulling dictionaries.
export type Lang = "de" | "en";
export type Dict = Record<string, string>;
/** Bilingual string used by data files (e.g. global-intel-data). */
export type Bi = { de: string; en: string };

export const LANGUAGES: { code: Lang; label: string; native: string; dir: "ltr" | "rtl" }[] = [
  { code: "de", label: "German", native: "Deutsch", dir: "ltr" },
  { code: "en", label: "English", native: "English", dir: "ltr" },
];
