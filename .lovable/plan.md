
# AI Learning & Evolution System

Ziel: Die AI in Apex Markets wird vom statischen Prediktor zum **lernenden Analysten**. Jede Prediction wird gespeichert, später gegen das echte Marktoutcome geprüft, daraus wird Lern-Evidenz, Accuracy-Statistik und sichtbare Selbstkorrektur abgeleitet — und in der UI transparent gezeigt.

## 1. Datenmodell (neue Tabellen in Lovable Cloud)

```text
ai_predictions
├── id, user_id, created_at
├── symbol, scenario_tag        (z.B. "high_inflation_tech_rally")
├── market_regime               ("bull"|"bear"|"chop"|"high_vol"|"low_vol")
├── verdict (LONG|SHORT|NEUTRAL), confidence (0..1)
├── horizon_days (1|5|20)
├── price_at_prediction
├── reasoning (jsonb: features+gewichte)
└── model_version

ai_outcomes
├── prediction_id  → ai_predictions
├── evaluated_at, price_at_eval
├── realized_return
├── correct (bool), error_magnitude
└── notes

ai_learning_events                (Selbstkorrekturen)
├── id, created_at, scenario_tag, regime
├── pattern_detected (text)
├── weight_adjustment (jsonb)
├── before_belief, after_belief (text)
└── trigger_prediction_ids (uuid[])

ai_user_interactions              (was User mit Signalen macht)
├── user_id, prediction_id, action ("viewed"|"followed"|"ignored"|"dismissed")
└── created_at
```

RLS: `select/insert` nur eigene Zeilen für `user_id`. `ai_predictions` & `ai_outcomes` zusätzlich global-readable (anonymisiert) für aggregierte Metriken.

## 2. Server-Funktionen (`createServerFn`)

- `recordPrediction({symbol, scenario, regime, verdict, confidence, horizon, features})` — beim Erzeugen eines AI-Signals/Analyse.
- `evaluatePendingOutcomes()` — Cron-Worker (täglich): holt Predictions deren `horizon` abgelaufen ist, vergleicht Preis, schreibt `ai_outcomes`, triggert `detectLearningPattern`.
- `detectLearningPattern(scenario, regime)` — wenn letzte N Outcomes in einem Bucket systematisch falsch waren → erzeugt `ai_learning_event` (per Lovable AI / Gemini-Flash, JSON-Tool-Call mit Schema `{pattern, weight_adjustment, before, after}`).
- `getLearningContext({symbol, regime, scenario})` — liefert für jede neue Analyse: letzte ähnliche Predictions, Hit-Rate, jüngste Learning-Events.
- `getPerformanceMetrics({window: 7|30|90})` — Accuracy, Hit-Rate pro Kategorie, Trend, Calibration-Buckets.

Bestehender AI-Call (`/agent`, `/analyse`, Setup-Score) bekommt ein vorgelagertes `getLearningContext` und ein nachgelagertes `recordPrediction`. Der System-Prompt fordert die AI auf, den **AI Learning Progress**-Block strukturiert auszugeben (Tool-Call mit Schema, kein freier Text).

## 3. UI-Komponenten (neu)

- `<LearningProgressBlock prediction={…} context={…} />` — eingebunden unter jeder AI-Analyse. Zeigt: ähnliches Vorszenario, frühere Prediction, tatsächliches Outcome, Pattern, Anpassung, Auswirkung auf aktuelle Prediction.
- `<PerformanceMetricsPanel />` — eigene Route `/ai-learning`:
  - KPI-Karten: Accuracy 7D/30D/90D, Confidence-Calibration-Score, Hit-Rate Gesamt
  - **AccuracyTrendChart** (Recharts Line)
  - **CalibrationChart** (Confidence-Bucket vs realized accuracy, ideal=Diagonale)
  - **RegimeHeatmap** (Sektor × Regime → Hit-Rate, Farbskala)
  - **PredictionVsOutcomeTable** (letzte 20, ✓/✗ + Δ%)
  - **LearningEventsTimeline** (Before → After Belief)
- `<ConfidenceBadgeWithReason />` — Replacement für aktuelle Confidence-Anzeige; Hover zeigt "Warum diese Confidence?" inkl. historischer Stütze.
- Sidebar: neuer Eintrag **„AI Learning"** mit Brain-Icon, prominent in der „Quant Engine"-Gruppe.

## 4. Self-Correction-Flow (sichtbar)

1. Outcome wird ausgewertet → falsch.
2. `detectLearningPattern` schreibt `ai_learning_event` mit `before_belief` / `after_belief`.
3. Nächste Prediction im gleichen `scenario_tag` zieht dieses Event in `getLearningContext`.
4. Im UI erscheint im LearningProgressBlock ein **„Self-Correction Applied"**-Badge, das genau dieses Event verlinkt.

## 5. Scope / Reihenfolge

```text
Schritt 1  DB-Migration (4 Tabellen + RLS + Indexe)
Schritt 2  Server-Funktionen recordPrediction / getLearningContext / getPerformanceMetrics
Schritt 3  Integration in bestehende AI-Pfade (/analyse, /agent, Setup-Score)
Schritt 4  LearningProgressBlock + ConfidenceBadgeWithReason
Schritt 5  Route /ai-learning mit allen Charts (Recharts)
Schritt 6  Cron evaluatePendingOutcomes (server route /api/public/cron-evaluate, durch pg_cron getriggert) + detectLearningPattern via Lovable AI
Schritt 7  Sidebar-Eintrag + Onboarding-Hinweis
```

## Offene Fragen (bitte 1–2 Sätze pro Punkt)

1. **Lerngrundlage**: Sollen Learning-Events **global** über alle User aggregiert werden (mehr Daten, schneller schlauer) oder **pro User** (persönlicher Stil)? Empfehlung: global für Pattern + zusätzlich user-spezifische Calibration.
2. **Horizont**: Standard-Auswertehorizont — 5 Handelstage? Oder pro Signal-Typ unterschiedlich (Day-Trade 1D, Swing 5D, Position 20D)?
3. **Cron**: Auswertung 1×/Tag nach US-Close reicht, oder live (15-Min-Tick)?
4. **Backfill**: Sollen wir die letzten 90 Tage Watchlist-Daten synthetisch nachprediken, damit der User vom ersten Tag an Charts sieht? (Empfehlung: ja, als „Bootstrap-Backtest".)

Sobald die 4 Punkte geklärt sind, baue ich Schritte 1–7 in einem Rutsch.
