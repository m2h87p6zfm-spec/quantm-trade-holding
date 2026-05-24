# QUANTM Causal Engine — Implementierungsplan

Ein eigenständiges Modul, das parallel zur bestehenden Analyse läuft. Bestehender Code wird nicht angefasst.

## Wichtige Anpassung gegenüber Spec

Der Prompt fordert **Supabase Edge Functions**. Dieses Projekt nutzt jedoch ausschließlich **TanStack Server Functions / Server Routes** (siehe Projekt-Stack). Edge Functions sind hier explizit verboten. Ich implementiere die gleiche Logik 1:1 als:

- `createServerFn` für client-getriggerte Calls (`fetch-causal-events`, finaler Score)
- Server Route unter `/api/public/hooks/causal-outcomes` für den täglichen Cron Job
- pg_cron ruft diese Route täglich um 02:00 UTC auf

Funktional identisch zur Spec, nur stack-konform.

## Phase 1 — Datenbank

Migration mit allen 4 Tabellen:
- `causal_events` (event log)
- `causal_outcomes` (preis-snapshots & returns, FK auf events)
- `causal_patterns` (aggregierte muster, UNIQUE ticker+event_type)
- `causal_analysis_results` (analyse-snapshots)

RLS:
- `causal_events`, `causal_patterns`, `causal_outcomes`, `causal_analysis_results`: public read (anon+authenticated). Writes nur serverseitig via service role.

Index auf `causal_events(ticker, event_date)`, `causal_outcomes(event_id)`, `causal_patterns(ticker)`.

## Phase 2 — Backend

### `src/lib/causal-engine.server.ts`
Kernlogik (server-only):
- `classifyEvent(text)` → mapped Suchergebnis-Snippet auf einen der 16 erlaubten `event_type` Werte (Keyword-basiert, "unklar" → skip)
- `fetchHistoricalPrice(ticker, date)` → nutzt bestehende Twelve-Data Integration
- `recordEventsForTicker(ticker, companyName)` → Firecrawl-Search × 6 queries, klassifiziert, dedupiziert (gleicher ticker+type ±3d), upsert in `causal_events`, preis-snapshot in `causal_outcomes`
- `backfillOutcomes()` → täglicher Job: lädt pending outcomes, holt 3/7/14/30/90d preise, berechnet returns
- `recalcPatternsFor(ticker)` → aggregiert, berechnet `repeatability_score`, UPSERT in `causal_patterns`
- `computeCausalScore(ticker)` → lädt events der letzten 30d + patterns, berechnet causal_score+verdict, speichert in `causal_analysis_results`

### `src/lib/causal-engine.functions.ts`
- `runCausalAnalysis({ ticker, companyName })` server fn → ruft `recordEventsForTicker` → `recalcPatternsFor` → `computeCausalScore` und gibt komplettes Ergebnis-Objekt für UI zurück.

### `src/routes/api/public/hooks/causal-outcomes.ts`
POST-Route, verifiziert `apikey` Header gegen `SUPABASE_PUBLISHABLE_KEY`, ruft `backfillOutcomes()` auf.

### pg_cron
```sql
select cron.schedule('causal-outcomes-daily', '0 2 * * *',
  $$ select net.http_post(url:='…/api/public/hooks/causal-outcomes',
       headers:='{"Content-Type":"application/json","apikey":"…"}'::jsonb,
       body:='{}'::jsonb) $$);
```

## Phase 3 — Score-Berechnung

Eingebaut in `computeCausalScore` (Spec 1:1).

## Phase 4 — UI

### `src/components/CausalEngineCard.tsx`
Neue Karte mit den 6 Elementen aus der Spec:
1. Header mit Icon + Timestamp + Trennlinie (volle Karten-Breite, `w-full`)
2. Verdict-Badge (große Pille, farbcodiert nach Spec)
3. Zwei Score-Boxen nebeneinander (`grid-cols-2`) mit Score + Progress-Bar (rot/gelb/grün-Schwellen)
4. Aktuell erkannte Ereignisse (Liste mit farbigem Dot je type)
5. Historische Muster (nur types mit ≥3 Occurrences)
6. Disclaimer

Empty-States: bei `KEINE_DATEN` einheitliche Meldung statt leerer Bereiche. Mobile: alles `min-w-0` + `truncate`/`break-words`, getestet bei 375px.

### Integration
In `src/routes/analyse.tsx` nach dem bestehenden `AiSummaryCard` rendern:
- nutzt `useServerFn(runCausalAnalysis)` mit `useQuery`, getriggert wenn ein Ticker erkannt wurde
- Lädt asynchron parallel zur Haupt-Analyse, blockiert nichts
- Loading-Skeleton während fetch

## Phase 5 — QA

Nach Build prüfe ich:
- Migration angewendet, alle 4 Tabellen mit Constraints sichtbar
- Card overflow-frei (`overflow-hidden` + `w-full` auf Trennlinie)
- Mobile 375px responsive
- Cron job in `cron.job` registriert
- Edge Cases: KEINE_DATEN zeigt definierte Meldung
- Bestehende Komponenten unverändert (diff-check)

## Reihenfolge der Tool-Calls

1. `supabase--migration` für die 4 Tabellen (warte auf Approval)
2. Server-Code: `causal-engine.server.ts`, `causal-engine.functions.ts`, hook-route
3. UI: `CausalEngineCard.tsx`
4. Integration in `analyse.tsx`
5. `supabase--insert` für pg_cron schedule
6. QA-Check
