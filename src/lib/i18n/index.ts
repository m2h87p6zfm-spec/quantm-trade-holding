// Public barrel — keeps the legacy @/lib/i18n import path stable.
// DE strings live in dict.de.ts, EN strings in dict.en.ts, runtime in hooks.ts.
export type { Lang, Dict, Bi } from "./types";
export { LANGUAGES } from "./types";
export { useT, useLang, useTr, pickBi } from "./hooks";
