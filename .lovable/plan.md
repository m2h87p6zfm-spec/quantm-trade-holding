# APEX Track Record — Plan

Öffentliche, datengetriebene Vertrauensseite unter `/track-record`. Alle Zahlen werden live aus zwei neuen Tabellen berechnet, die automatisch befüllt und nachverfolgt werden.

## 1. Datenbank (Migration)

**`apex_analyses`** (öffentlich lesbar, anonym):
- `id uuid pk`, `ticker text`, `name text`, `sector text`, `asset_type text` (`Aktie`/`ETF`)
- `analyzed_at timestamptz`, `verdict text` (`KAUF`/`HALTEN`/`VERKAUFEN`)
- `confidence_score numeric`, `price_at_analysis numeric`
- `indicators jsonb` (RSI, MACD, Z-Score, Bollinger, SMA, Vola, Momentum …)
- **keine `user_id`** — vollständig anonym

**`apex_outcomes`**:
- `id uuid pk`, `analysis_id uuid fk → apex_analyses(id)` unique
- `price_after_30d/60d/90d numeric null`
- `return_30d/60d/90d numeric null`
- `is_correct boolean null` (basiert auf 30d-Richtung vs. Verdict)
- `updated_at timestamptz`

**RLS**: SELECT für `anon` + `authenticated` auf beide Tabellen. INSERT/UPDATE nur über Server-Funktionen mit Service-Role (kein Client-Write).

## 2. Automatisches Speichern

In `src/routes/analyse.tsx` nach erfolgreicher APEX-Analyse: neue ServerFn `recordApexAnalysis` aufrufen (fire-and-forget), die anonymisiert in `apex_analyses` schreibt und einen leeren `apex_outcomes`-Eintrag anlegt.

## 3. Cron-Job für 30/60/90-Tage-Tracking

- Neue Public-Route `src/routes/api/public/hooks/track-outcomes.ts`
- Lädt alle Analysen, deren 30/60/90-Tage-Fenster fällig und Spalte noch null
- Holt aktuelle Kurse via Finnhub, berechnet Rendite, setzt `is_correct` nach 30 Tagen:
  - KAUF korrekt wenn `return_30d > 0`
  - VERKAUFEN korrekt wenn `return_30d < 0`
  - HALTEN korrekt wenn `|return_30d| < 5 %`
- pg_cron läuft täglich um 02:00 UTC (via `supabase--insert`)

## 4. Seite `/track-record` (öffentlich)

Neue Route `src/routes/track-record.tsx` (außerhalb `_authenticated`), dunkles Bloomberg-Terminal-Design.

**Sektionen** (alle live aus DB berechnet, mit Filter-State `useState`):
1. **Hero**: „APEX hat X von Y Analysen korrekt vorhergesagt" + 3 KPI-Karten (Gesamtgenauigkeit mit Donut, Anzahl, Ø Rendite KAUF 90d)
2. **Filter-Leiste**: Zeitraum / Urteil / Sektor / Asset-Typ / Ergebnis
3. **Indikator-Genauigkeit**: pro Indikator wird simuliert, ob sein Einzelsignal stimmig zum Outcome war → Trefferquote als farbige Karten
4. **Performance-Chart**: kumulierte Genauigkeit über Zeit (3 Linien KAUF/HALTEN/VERKAUFEN) — Recharts LineChart mit Tooltip
5. **APEX vs. Markt**: Tabelle mit Ø Rendite KAUF (90d/1y) vs. SPY, URTH, ^GDAXI (live via Finnhub Candles)
6. **Analyse-Tabelle**: sortierbar, suchbar, paginiert (20/Seite), responsive
7. **Sektor-Heatmap**: Rechtecke pro Sektor, Größe = Anzahl, Farbe = Genauigkeit; Klick filtert Tabelle
8. **Beste / Schlechteste Vorhersagen**: Top-5 / Bottom-5 nach `return_30d` (Verdict-konform)
9. **Methodologie-Accordion**: 4 FAQ-Einträge
10. **CTA-Block** mit zwei Buttons → `/login` und `/analyse`

**Datenladung**: eine ServerFn `getTrackRecord()` mit allen Aggregaten + Liste der Analysen+Outcomes, gecached via TanStack Query. Filter werden client-seitig auf dem geladenen Datensatz angewendet (instant, kein Refetch).

**Auth-frei**: Route liegt direkt unter `src/routes/`, kein `_authenticated`-Layout. Sidebar wird auf dieser Seite nicht gezeigt (eigenes Public-Layout mit Header + Logo).

## 5. Navigation

Link „Track Record" in `AppSidebar` für eingeloggte Nutzer + Footer-Link.

## Technische Details
- ServerFns: `src/lib/track-record.functions.ts` (`recordApexAnalysis`, `getTrackRecord`)
- Cron-Endpoint nutzt `supabaseAdmin` + `process.env.FINNHUB_API_KEY` (bereits vorhanden via `finnhub.ts`)
- Indikator-Genauigkeit-Heuristik: pro Analyse wird je Indikator geprüft ob sein Signal (z. B. RSI < 30 = bullish) zum tatsächlichen 30-Tage-Outcome passt
- Charts: Recharts (bereits installiert)
- Dunkles Theme: bestehende `--background`/`--card`-Tokens reichen, aktuelles Theme der App ist bereits dunkel
