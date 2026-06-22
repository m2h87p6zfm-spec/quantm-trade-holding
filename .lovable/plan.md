
# QuantumTrack Record V2 — Transparency & Trust System

Heutiges Track-Record-Modell speichert nur den Einstiegspreis und prüft den Kurs nach 30/60/90 Tagen. Es gibt keine echten Verkaufssignale, keine Portfolio-Sicht, keinen Audit-Log und keine Charts pro Pick. Dieser Plan baut das in 4 Stufen aus.

---

## Stufe 1 — Datenmodell (Migration)

Neue Tabellen im `public` Schema (anon read, service_role write):

```text
apex_signals
  id, analysis_id (FK apex_analyses), signal_type ('BUY'|'SELL'),
  signal_at, price, reason (text), confidence, target_price, stop_loss,
  horizon_days, risk_level ('low'|'medium'|'high'),
  bullish_factors jsonb, bearish_factors jsonb
  -- ein BUY pro Analyse, optional ein SELL

apex_positions  (virtuelles 1-Aktie-Portfolio = "Modellportfolio")
  id, analysis_id, ticker, name, sector,
  status ('open'|'closed'),
  entry_at, entry_price,
  exit_at, exit_price, exit_reason,
  current_price, current_price_at,
  return_abs, return_pct, holding_days,
  weight_pct (Allokation im Modellportfolio)

apex_equity_curve
  date (pk), equity_value, cash, invested,
  realized_pnl, unrealized_pnl, num_open, num_closed

apex_audit_log
  id, entity_table, entity_id, action ('insert'|'update'|'close'|'price_update'),
  actor ('cron'|'service'|'admin'), before jsonb, after jsonb, created_at
```

Regeln:
- `apex_analyses` bleibt unverändert (Source of Truth für die Empfehlung)
- Update- und Delete-Policies bleiben `false` für anon/authenticated; alle Schreibwege laufen über service_role (cron / server functions)
- Trigger `apex_*_audit` schreibt automatisch in `apex_audit_log` bei jedem UPDATE/DELETE → manipulationssicher
- GRANTs: `SELECT TO anon, authenticated`, `ALL TO service_role`

## Stufe 2 — Signal- & Portfolio-Engine

`src/lib/track-record.server.ts` wird erweitert:

1. **Buy-Signal-Erzeugung** — beim Picks-Scan, sobald `verdict='KAUF'` & `confidence ≥ Schwelle`: in `apex_signals` einen `BUY`-Eintrag schreiben und in `apex_positions` eine offene Position mit `entry_*` und Begründung anlegen.
2. **Sell-Trigger** — täglicher Cron prüft jede offene Position:
   - Kursziel erreicht → SELL (Grund: "Kursziel erreicht")
   - Stop-Loss unterschritten → SELL (Grund: "Stop-Loss")
   - 90 Tage erreicht → SELL (Grund: "Zeit-Exit")
   - Neuer `VERKAUFEN`-Verdict für gleichen Ticker → SELL (Grund: "Verdict gewechselt")
3. **Preis- & Kennzahlen-Refresh** — `current_price`, `return_pct`, `holding_days` für alle offenen Positionen werden täglich nachgezogen.
4. **Equity Curve** — Tagessnapshot in `apex_equity_curve` (gleichgewichtetes Modellportfolio, Start 100 000 €).
5. **Audit** — jede Mutation läuft über eine `recordChange()`-Helper, die in `apex_audit_log` schreibt.

Aufrufweg: `/api/public/hooks/picks-scan` (existiert) ruft am Ende `runPositionManagement()` auf. Neuer Hook `/api/public/hooks/track-record-refresh` für reines Kurs-Update (15 min Cron).

## Stufe 3 — UI

`src/routes/track-record.tsx` wird in Tab-Layout umgebaut (4 Tabs):

1. **Übersicht** — Transparency-Dashboard
   - KPI-Grid: Total Trades, Wins, Losses, Win-Rate, Ø Rendite, Bester / Schlechtester Trade, Offen / Geschlossen
   - Equity-Kurve (Recharts LineChart) seit Tag 0
   - Win/Loss-Verteilung (Histogramm)
   - Monatliche Performance (BarChart)
   - Hinweis "Kein Trade kann manuell ausgeblendet werden" + Link zum Audit-Log

2. **Portfolio**
   - Metriken: Portfoliowert, Total-Return %/€, Win-Rate, # offen/geschlossen, Ø Gewinn, Ø Verlust, Ø Haltedauer
   - Allokations-Donut (Recharts PieChart) über offene Positionen
   - Holdings-Tabelle: Aktie · Anteile · Entry · Aktuell · Größe · P/L € & % · Allokation %

3. **Empfehlungen** (Ersetzt die heutige `PicksHistory`-Tabelle)
   - Filter Offen/Geschlossen/Alle, Sektor, Cap, Suche
   - Karte je Pick mit Ticker · Buy-Datum · Buy-Preis · Aktueller/Exit-Preis · Kursziel · Confidence · Return · Status-Badge · Risk-Level · Horizon
   - Klick öffnet **Pick-Detail-Drawer** (siehe unten)

4. **Audit-Log**
   - Chronologische Liste aller Änderungen, lesbar formatiert ("Position TSLA geschlossen — Grund: Kursziel erreicht — 22.06.2026 14:32")
   - Tab nur sichtbar für angemeldete Nutzer (öffentliche Verifikation über Read-only-API möglich)

Neue Komponente `src/components/track-record/PickDetailDrawer.tsx`:
- Preis-Chart (Recharts) mit grünem Buy-Marker und rotem Sell-Marker
- Begründung Buy / Begründung Sell
- Bullish Factors ✅ / Bearish Factors ⚠️ als Chip-Listen
- Performance-Block (Return abs/pct, Haltedauer, vs. S&P 500)

## Stufe 4 — Empfehlungsqualität (`src/lib/composite-engine.ts`)

- Schwelle `MIN_CONFIDENCE_FOR_BUY` von 60 auf 70 anheben
- Verlangt zusätzlich MTF-Confirmation = `confirmed` **und** OBV- oder CMF-Score > 0.1
- Output pro Pick neu: `riskLevel`, `horizonDays`, `bullishFactors[]`, `bearishFactors[]`, `targetPrice`, `stopLoss`
- Diese Felder werden vom Picks-Scan zusammen mit dem `BUY`-Signal in `apex_signals` persistiert und in den Pick-Karten auf Picks-Seite + Track-Record sichtbar gemacht.

---

## Technische Details

- Backend ausschließlich über `createServerFn` (`src/lib/trackrecord.functions.ts` wird erweitert um `getPortfolio`, `getEquityCurve`, `getPickDetail`, `getAuditLog`) und Cron-Hooks unter `src/routes/api/public/hooks/`.
- Charts mit bereits installiertem `recharts`.
- Tabs mit shadcn `Tabs`.
- Mutations laufen ausschließlich über service_role im Cron — anon/authenticated haben nur `SELECT`.
- Audit-Trigger ist `SECURITY DEFINER`, schreibt `before`/`after` jsonb-Snapshots → keine stille Manipulation möglich.
- Equity-Start, Buy-Confidence-Schwelle, Stop-Loss-% in `src/lib/track-record-config.ts` zentral.

## Reihenfolge der Umsetzung

1. Migration (Tabellen + Trigger + GRANTs + Audit)
2. Server-Engine (Signale, Positionen, Equity, Audit-Helper)
3. Cron-Hook `track-record-refresh` + Integration in `picks-scan`
4. Server-Funktionen für Portfolio / Equity / Detail / Audit
5. UI-Refactor `track-record.tsx` + neuer `PickDetailDrawer`
6. Composite-Engine Quality-Filter + neue Pick-Felder
7. Backfill-Migration: für bestehende `apex_analyses` mit Verdict=KAUF rückwirkend `apex_signals(BUY)` und offene `apex_positions` anlegen, damit die Historie nicht leer wirkt

## Außerhalb des Scope (separat ansprechen)

- Echtes Nutzer-Portfolio (jeder User hat eigene Positionen) — heute & im Plan: ein gemeinsames Modellportfolio, das alle sehen. Wenn pro-User gewünscht, ist das ein eigener Aufsatz auf `user_portfolio_positions`.
- Steuer-/Gebühren-Modell.
- Backtest-Vergleich vor Tag 0 (Plan dokumentiert nur Live-Empfehlungen — Selbstauflage).
