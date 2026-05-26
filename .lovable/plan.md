# Kompletter Sprachumbau DE ↔ EN

Ziel: Wenn der User „English" wählt, sieht er **ausschließlich** englischen Text — und umgekehrt. Inklusive Rechtstexte. Inhalts-Datenfiles werden auf eine bilinguale `{de, en}`-Struktur umgestellt.

## Realistischer Umfang

Betroffen sind ≈ 30 Dateien mit ~1.000+ deutschen Strings, davon allein **2.349 Zeilen** in `src/lib/global-intel-data.ts`. Das passt nicht in eine einzige Antwort. Ich liefere das in **fünf aufeinanderfolgenden Sprints**, jeder einzeln lauffähig & in sich abgeschlossen. Nach Sprint 1 startest du einfach „weiter" und ich mache den nächsten Sprint — bis alles fertig ist.

## Sprint 1 — Fundament + aktuelle Seite (jetzt sofort)

1. **Helper `useTr(de, en)`** zu `src/lib/i18n.ts` hinzufügen — erlaubt Inline-Übersetzung in JSX ohne neuen Dictionary-Key.
2. **`global-intel-data.ts`** auf bilinguale Struktur umstellen:
   - Alle übersetzbaren String-Felder (`summary`, `pivotalEvent.*`, `geopolitics.tensions`, `impact.*`, `positives[]`, `negatives[]`, `GLOBAL_SUMMARY.headline`, `EVENTS[].*`, `TRADE_FLOWS[].*`, `TENSIONS[].*`, `MARKET_FEED[].*`, `COUNTRY_EXTRAS.*`) → `{ de: string; en: string }`.
   - Selektor-Helper `pickLang(field, lang)` exportieren.
   - `RISK_LABEL` bilingual.
3. **`global-intel.tsx`** + **`country-derived.ts`** + **`MostTrackedCountries.tsx`** auf den Selektor umstellen. Alle hardcoded deutschen Strings in JSX → `useTr(...)`.

## Sprint 2 — Hauptrouten

`picks.tsx`, `analyse.tsx`, `produkte.$symbol.tsx`, `explain-trade.tsx`, `track-record.tsx`, `ai-learning.tsx`, `sectors.tsx`, `correlations.tsx`, `alerts.tsx`, `methodology.tsx`, `about.tsx`, `index.tsx` — hardcoded deutsche Strings via `useTr` oder neue i18n-Keys übersetzen.

## Sprint 3 — Komponenten

`BrokerAssessment`, `IndicatorBreakdown`, `Disclaimer`, `OnboardingGate`, `ApexDashboard`, `PortfolioCommandCenter`, `FirstRunTour`, `PortfolioAnalytics`, `LearningProgressBlock`, `CausalEngineCard`, `FeaturePreviewPopover` (Mocks).

## Sprint 4 — Rechtstexte

`agb.tsx`, `datenschutz.tsx`, `impressum.tsx` — vollständige englische Übersetzung mit dem üblichen Hinweis „German version is legally binding".

## Sprint 5 — Cleanup & Audit

`rg`-Sweep nach restlichen `[äöüß]` außerhalb von Strings/Kommentaren. Letzte UI-Komponenten (Banners, Tooltips, Toasts) abräumen. Tests gegen beide Sprachen prüfen.

## Technische Details

- **Bilinguale Felder**: `type Bi = { de: string; en: string }`. Wo Arrays existieren (`positives`, `negatives`, `newsKeywords`), wird jedes Element zu `Bi`.
- **Selektor**: `export const pick = (b: Bi, lang: Lang) => b[lang]` — in Komponenten via `const lang = useLang(); pick(country.summary, lang)`.
- **`useTr`-Helper**: `export function useTr() { const lang = useLang(); return (de: string, en: string) => lang === "en" ? en : de; }` — für JSX-only Strings ohne Dictionary-Overhead.
- Keine Änderung an bestehenden Dictionary-Keys (DE+EN sind bereits symmetrisch mit 521 Keys).
- Übersetzungen werden professionell formuliert, nicht wörtlich — passend zum Finanz-/Trading-Kontext.
