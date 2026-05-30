## Problem

Wenn der Agent z. B. „Analyze NVIDIA" beantwortet, kommt eine lange, flache Markdown-Wand. Im Chat-Fenster (640 px hoch, Bubble max. 88 % Breite) sieht man nur einen kleinen Ausschnitt — der Nutzer muss minutenlang scrollen, ohne Überblick zu bekommen, was wichtig ist.

## Ziel

Die Antwort des Aktienanalyse-Agenten soll auf einen Blick lesbar sein: oben die Kernaussage, darunter strukturierte Module statt Fließtext, und die Details aufklappbar — so dass der erste Bildschirm bereits 80 % der Entscheidung liefert.

## Vorgehen

### 1. Antwortformat strukturieren (Quelle: Prompt + Parser)
Statt freier Markdown-Wand gibt der Agent ein klar strukturiertes Format zurück, das das Frontend in Module rendert:

- **Verdict-Header**: Ticker, Preis, Tages-%, ein einzelnes Signal (Bullish / Neutral / Bearish) mit Confidence-Score
- **TL;DR (2–3 Zeilen)**: was zählt jetzt
- **Indikatoren-Grid**: RSI, MACD, SMA20/50, Bollinger, Momentum, ATR — als kompakte Karten mit Wert + Farbcode statt Tabelle
- **Trade-Setup**: Entry, Stop, Target (falls vom Agent geliefert)
- **Risiken & Kontext**: kurze Bulletpoints
- **Volle Begründung**: zugeklappt (Details-Akkordeon)

Umsetzung: Der Agent (`signal-chat.ts` / `agent-chat.ts`) bekommt einen Prompt, der ein leichtes Markdown-Schema mit Section-Headings vorgibt (`## Verdict`, `## TL;DR`, `## Indikatoren`, `## Setup`, `## Risiken`, `## Details`). Das Frontend parst die Sections und rendert sie als Karten.

### 2. Chat-Layout aufwerten
- Assistant-Bubble darf bei strukturierten Antworten **die volle Chatbreite** nutzen (nicht 88 %), User-Bubble bleibt schmal — so wirken die Antwortkarten wie ein Report, nicht wie ein Sprechblasen-Block.
- Chat-Fenster-Höhe von 640 px auf `min(80vh, 820px)` bei strukturierten Antworten, damit mehr ohne Scrollen sichtbar ist.
- Sticky-Verdict-Header innerhalb der Bubble: Beim Scrollen innerhalb einer langen Antwort bleibt Ticker + Signal oben sichtbar.

### 3. Indikator-Karten statt Tabelle
Jeder Indikator als kleine Karte mit:
- Name (RSI)
- Wert (28,4) — groß, tabular-nums
- Mini-Statusbalken (oversold / neutral / overbought) mit semantischer Farbe (`--bull`, `--bear`, `--muted`)
- Ein Wort Interpretation („überverkauft")

Im Grid: 2 Spalten Mobile, 3–4 Spalten Desktop. Dadurch passen alle Kerndaten auf einen Screen.

### 4. Details kollabierbar
Die ausführliche Erklärung (oft 60–70 % der Token) wird per `<details>` zugeklappt geliefert. Wer tiefer will, klickt auf — wer entscheidet, scrollt nicht.

### 5. Quick-Actions kontextuell
Nach einer Analyse erscheinen unter der Antwort drei kontextuelle Folgeaktionen statt der generischen QUICK-Liste:
- „Zur Watchlist hinzufügen"
- „Vergleiche mit [Sektor-Peer]"
- „Setze Preis-Alert"

## Technische Umsetzung

**Files:**
- `src/routes/api/public/signal-chat.ts` — System-Prompt erweitern: Schema vorgeben, Beispielausgabe einbetten, klare Section-Marker fordern.
- `src/components/SignalChat.tsx` — Markdown-Parser splittet Antwort an `## `-Headings, rendert pro Section die passende Komponente.
- `src/components/signal/AnalysisReport.tsx` (neu) — Verdict-Header, Indicator-Grid, Setup-Box, Details-Accordion.
- `src/components/signal/IndicatorCard.tsx` (neu) — einzelne Indikator-Kachel.
- `src/components/signal/QuickFollowups.tsx` (neu) — kontextuelle Folgeaktionen, abgeleitet aus dem analysierten Ticker.

**Design-Tokens**: alles über `--bull`, `--bear`, `--muted`, `--primary`, `--card` — keine Hex-Werte direkt.

**Fallback**: Antworten ohne Schema-Marker (z. B. Smalltalk, „Was ist RSI?") rendern weiter als normale Markdown-Bubble. Nur Antworten, die das Verdict-Heading enthalten, werden als Report dargestellt.

## Was du als Ergebnis siehst

Eine Analyse-Antwort, die auf dem ersten Bildschirm alles Wesentliche zeigt: das Urteil, den Preis, die sechs Indikatoren als Kacheln, das vorgeschlagene Setup. Details und Begründung sind einen Klick entfernt. Kein Scrollen für die Entscheidung.
