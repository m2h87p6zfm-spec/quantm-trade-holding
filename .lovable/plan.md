## Was du willst (zusammengefasst)

1. **Sprache:** Überall konsistent Deutsch — keine englischen Resttexte mehr.
2. **Live-Portfolio:** Kurse & Positionswerte tickern wie bei Trade Republic, nicht alle paar Minuten ein harter Refresh.
3. **Echte Quant-Engine:** Bei sehr hoher Konfidenz darf die Engine eine Aktie mehrfach kaufen und eine Position über Zeit aufbauen (Position-Scaling / Pyramiding) — statt jedem Pick fix 5.000 €.
4. **Bessere Pick-Auswahl:** Engine soll nicht reflexartig „stark gefallen = kaufen" empfehlen, sondern alle Indikatoren ehrlich durchrechnen (Trend, Momentum, Fundamentals, Volatility, Volume) bevor ein BUY rausgeht.

---

## Wie ich das umsetze

### 1. Deutsch-Sprachaudit (alle Routen + Komponenten)
- Mit `rg` durch `src/` nach typischen englischen Resten suchen: „Buy/Sell/Hold", „Today/Yesterday", „Loading", „Confidence", „Score", „Updated", „Watchlist actions", „Performance", „Holdings" usw. (sofern sie als UI-Text auftauchen und nicht als Schlüssel).
- Treffer einer nach dem anderen in deutsche Pendants übersetzen, Fachbegriffe (RSI, MACD, Bollinger, Quant) bleiben.
- Datums-/Zahlenformate auf `de-DE` prüfen (`toLocaleString('de-DE')`).

### 2. Live-Ticker fürs Portfolio
- Im Portfolio-Hook (vermutlich `src/hooks/usePortfolio*` + `PortfolioCommandCenter`) einen leichten Poller einbauen: alle 10–15 s die aktuellen Kurse für die gehaltenen Symbole nachladen und Positionswerte/PnL clientseitig neu berechnen.
- Visuelles Feedback: Kurszelle blinkt kurz grün/rot bei Änderung (wie TR).
- Beim Tab-Wechsel (`document.visibilitychange`) Pausieren, damit wir keine API-Quota verbrennen.

### 3. Position-Scaling in der Quant-Engine
- Konfidenz-Buckets bekommen Multi-Tranche-Logik:
  - 70–79 % → 1 Tranche (3.000 €)
  - 80–89 % → bis zu 2 Tranchen (insg. 5.000 €), zweite nur wenn Signal mind. 5 Tage stabil bleibt
  - 90 %+ → bis zu 3 Tranchen (insg. 8.000 €), gestaffelt über mehrere Signaltage
- Track-Record & Audit-Log zeigen jede Tranche einzeln mit Datum und Konfidenz zum Kaufzeitpunkt.
- Neue Spalte „Tranchen / Ø-Einstand" im Portfolio.

### 4. Strengere Pick-Logik (kein Dip-Reflex mehr)
In `src/lib/quant.ts` / `composite-engine.ts`:
- Ein BUY darf nur rausgehen wenn **mehrere** Indikator-Familien gleichzeitig grün sind:
  - Trend (SMA50 > SMA200 oder klar drehend)
  - Momentum (RSI 40–65, MACD-Histogram drehend positiv) — **nicht** RSI < 30 alleine
  - Volume-Bestätigung (Volumen über 20-Tage-Schnitt)
  - Volatility-Filter (ATR nicht extrem)
  - Fundamentals-Check soweit verfügbar (Gewinnrevisionen, kein massiver Sektor-Downgrade)
- „Aktie ist stark gefallen" alleine ergibt höchstens noch ein WATCH, kein BUY.
- Konfidenz-Score nach den schon eingebauten strengen Statistik-Penalties (t-Stat, Alignment) — Picks mit Konfidenz < 70 werden in der UI als SKIP markiert.

---

## Reihenfolge der Auslieferung

Ich baue das in zwei Pässen, damit du nach dem ersten Pass schon was Brauchbares siehst:

**Pass A (jetzt):** Sprachaudit + Live-Ticker fürs Portfolio.
**Pass B (direkt danach):** Position-Scaling + strengere Pick-Logik in der Engine, inkl. neuer Spalten im Track-Record.

---

## Eine Rückfrage bevor ich loslege

Beim Position-Scaling: soll eine **bestehende** Position auch nachgekauft werden, wenn die Aktie inzwischen gestiegen ist und das Signal weiter stark bleibt (klassisches Pyramiding wie bei Trendfolgern), oder nur nachkaufen, wenn der Einstand günstiger wird (Averaging Down)? Pyramiding ist statistisch der Quant-Standard, Averaging Down fühlt sich für Privatanleger oft natürlicher an.
