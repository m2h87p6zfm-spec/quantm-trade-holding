# Refactoring-Plan: Kompakter, modularer, KI-freundlicher Code

**Ausgangslage:** ~60.000 Zeilen in `src/`, mehrere Dateien >700 Zeilen, einige Routes über 2.000–3.000 Zeilen (`global-intel.tsx`, `global-intel-data.ts`). Dictionary (`i18n.ts`) ist 1.173 Zeilen in einem File. Mehrere Komponenten mischen Daten-Logik, UI, State und Side Effects.

**Eiserne Regel:** Kein Pixel verändert sich. Keine neuen Features, keine Verhaltensänderungen, keine API-Änderungen. Reines Verschieben, Aufteilen, Entdoppeln.

## Strategie

Reines „Move + Split + De-dupe". Öffentliche Exports (Symbol + Signatur) bleiben erhalten — die alten Pfade werden als Re-Export-Barrels stehen gelassen, damit kein einziger Import in den Routes/Komponenten gebrochen wird.

```text
src/
├── routes/                  (unverändert in Pfaden; Inhalte verkleinert)
├── components/              (UI-Atome; Feature-Komponenten ziehen in features/)
│   └── ui/                  (shadcn — nicht anfassen)
├── features/                NEU — fachliche Module
│   ├── global-intel/        global-intel.tsx wird zerlegt
│   ├── portfolio/           PortfolioCommandCenter, EditPortfolioDialog, etc.
│   ├── onboarding/          OnboardingGate, FirstRunTour
│   ├── picks/               picks-Route + Sub-Komponenten
│   └── analyse/             analyse-Route + Helper
├── lib/                     pure Domain-Logik
│   ├── i18n/                de.ts, en.ts, index.ts (Helper unverändert)
│   ├── global-intel/        data.ts → countries/, events.ts, tensions.ts, feed.ts, extras.ts
│   ├── products/            products.ts + products-extra*.ts werden gemerged & gesplittet
│   └── ...
└── hooks/                   unverändert
```

## Phasen (jede Phase eigenständig auslieferbar)

### Phase 1 — i18n splitten (Quick Win)
- `src/lib/i18n.ts` → `src/lib/i18n/{index.ts, dict.de.ts, dict.en.ts, types.ts, hooks.ts}`
- `index.ts` re-exportiert alles wie bisher (`useT`, `useTr`, `useLang`, etc.) → 0 Import-Bruch
- Ziel: 1.173 Zeilen → 4 Files à ~300 Zeilen

### Phase 2 — global-intel-data splitten
- 2.392 Zeilen aufteilen nach logischen Blöcken: `countries.ts`, `events.ts`, `trade-flows.ts`, `tensions.ts`, `market-feed.ts`, `country-extras.ts`, `global-summary.ts`
- Selektor (`pickLang`) + Typen in `global-intel/types.ts`
- Alter Import `@/lib/global-intel-data` bleibt als Barrel-Re-Export erhalten

### Phase 3 — global-intel.tsx Route zerlegen
- 3.004 Zeilen → Route-Shell (~200 Zeilen) + `features/global-intel/`:
  - `WorldMap.tsx`, `CountryCard.tsx`, `EventsPanel.tsx`, `TensionsPanel.tsx`, `TradeFlowsPanel.tsx`, `MarketFeedPanel.tsx`, `CountryDetail.tsx`
- Pure Helper (Computations) in `lib/global-intel/derive.ts`
- Identische JSX-Ausgabe — nur Komposition wird verschoben

### Phase 4 — Große Komponenten teilen
- `PortfolioCommandCenter.tsx` (1.121) → `features/portfolio/command-center/{Header, Holdings, Chat, FileImport, Summary}.tsx`
- `OnboardingGate.tsx` (932) → `features/onboarding/{Step1..StepN}.tsx` + `state.ts`
- `explain-trade.tsx` (925), `analyse.tsx` (823), `track-record.tsx` (785), `picks.tsx` (730), `MarketMovers.tsx` (750): jeweils Sub-Sektionen extrahieren
- Pattern überall gleich: Route-Datei bleibt am alten Pfad, importiert aus `features/<name>/`

### Phase 5 — Dedupe & Cleanup
- `products.ts` + `products-extra.ts` + `products-extra2.ts` zusammenführen und nach Sektor splitten (`products/{us-stocks, etfs, crypto, fx, commodities}.ts`)
- Tote Imports entfernen (`ts-prune`-Check)
- Doppelte Utility-Funktionen identifizieren (z. B. format-Helper, Date-Helper) und konsolidieren in `lib/utils/*`
- Magische Strings in Komponenten in Konstanten oder i18n-Keys ziehen (nur wo es bereits hardcoded ist — keine neuen Übersetzungen)

## Technisches Vorgehen pro Datei

1. Datei lesen, logische Blöcke identifizieren (oft durch Kommentar-Header markiert).
2. Sub-Dateien anlegen, Blöcke kopieren, Imports korrigieren.
3. Original-Datei wird zum dünnen Barrel: `export * from "./<sub>"`.
4. Build laufen lassen → bei Fehlern reparieren, bevor zur nächsten Datei.
5. Niemals Logik anfassen. Nur Cut/Paste + Imports.

## Sicherheits-Netze

- Nach jeder Phase: TypeScript-Build muss grün sein (passiert automatisch).
- Re-Export-Barrels an alten Pfaden → 0 Import-Bruch in Routes und Komponenten.
- Keine Default-Exports umstellen (Symbol-Identität bleibt).
- Kein Format-Tool über bestehenden Code laufen lassen (würde Diffs aufblähen ohne Mehrwert).

## Auslieferung

Wegen der Größe (~60k LoC, fünf Phasen) liefere ich **Phase für Phase** in separaten Antworten. Du schreibst „weiter" nach jeder Phase. Phase 1 starte ich direkt nach deinem OK.

## Geschätzter Impact

| Datei | Vorher | Nachher (Route/Hauptdatei) |
|-------|-------:|---------------------------:|
| `global-intel.tsx` | 3.004 | ~200 + 7 Sub-Komponenten |
| `global-intel-data.ts` | 2.392 | ~50 Barrel + 7 Sub-Files |
| `i18n.ts` | 1.173 | ~80 Barrel + DE/EN je ~450 |
| `PortfolioCommandCenter.tsx` | 1.121 | ~150 + 5 Sub-Komponenten |
| `OnboardingGate.tsx` | 932 | ~120 + Steps |
| Routes >700 LoC | Σ ~5.000 | ~200 je Route + Features |

**Netto:** gleiche Funktionalität, ca. 10–15 % weniger Code durch Dedupe, deutlich bessere Auffindbarkeit.
