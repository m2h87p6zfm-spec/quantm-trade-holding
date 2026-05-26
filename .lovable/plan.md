# Bugfix-Sammlung

## 1. Pricing: brutto = 9,99 € / 19,99 €
Neue Stripe-Preise mit **Netto-Beträgen** anlegen, damit nach 19 % MwSt. brutto exakt das herauskommt, was auf der Karte steht:

| Plan | Netto/Monat | Netto/Jahr (−20 %) | Brutto-Anzeige |
|---|---|---|---|
| Pro | 8,40 € (840 ct) | 80,64 € (8064 ct) | 9,99 € / 95,88 € |
| Elite | 16,80 € (1680 ct) | 161,28 € (16128 ct) | 19,99 € / 191,88 € |

- Neue Price-IDs: `apex_pro_monthly_v2`, `apex_pro_yearly_v2`, `apex_elite_monthly_v2`, `apex_elite_yearly_v2` (alte bleiben für Bestandskunden via Stripe-Lookup intakt).
- `src/routes/preise.tsx`: IDs umschalten + kleiner Hinweis „inkl. 19 % MwSt." unter dem Preis.
- Sicherstellen, dass `automatic_tax: { enabled: true }` aktiv ist (sonst rechnet Stripe nichts drauf und der Kunde zahlt nur 8,40).

## 2. Quantm Picks: 74 / 80 + Tab-Switch resettet alles
**Diagnose nötig** in `src/routes/picks.tsx` / zugehörigem Loader. Wahrscheinliche Ursachen:
- 74/80: einzelne Ticker liefern bei Yahoo `null`/Fehler → werden stillschweigend gefiltert. Fix: failed Symbols separat zählen und nachladen oder als „n/a" anzeigen, damit immer 80 sichtbar sind.
- Tab-Switch-Reset: Analyse läuft im React-State, kein Caching → bei Re-Mount läuft alles neu. Fix: Ergebnis in **TanStack Query** mit langem `staleTime` cachen (z. B. 15 min) + `queryKey` stabil halten, sodass beim Zurückkommen das Ergebnis sofort da ist.

## 3. Marktradar vs. Heatmap klar differenzieren
- `src/routes/heatmap.tsx`: Untertitel/Hero anpassen → „Sektor- & Branchenperformance heute (Tile-Map)".
- `src/routes/markt-radar.tsx`: Untertitel/Hero anpassen → „Live-Signal-Scanner: Breakouts, Volumen-Spikes & Momentum-Shifts in Echtzeit".
- Sidebar-Beschreibung (`AppSidebar.tsx`) für beide Einträge mit kurzem Tooltip/Subtitle ergänzen.

## 4. Global Intelligence Map mobil verzogen
`src/routes/global-intel.tsx` (+ ggf. `global-intel-data.ts`/Komponente):
- Map-Container bekommt `aspect-ratio` statt fixe Höhe, `overflow-hidden`, responsive `max-w-full`.
- SVG / Map-Library auf `preserveAspectRatio="xMidYMid meet"` + `viewBox` prüfen.
- Bei Viewport < 640 px: Legende unter die Karte statt daneben, Pin-Tooltips touch-optimiert.

## 5. Global Macro generell buggy
Schnell-Audit der Seite `global-intel.tsx`:
- Grid-Layouts auf `grid-cols-1 md:grid-cols-2` zurückstellen wo nötig.
- Lange Strings mit `truncate` / `break-words`.
- Karten-Höhen vereinheitlichen, damit nichts überlappt.

---

## Reihenfolge
1. Pricing (klein, deterministisch) → erst Plan-Approval, dann Stripe-Tool.
2. Marktradar/Heatmap-Texte (klein).
3. Global-Macro Mobile-Layout (mittel).
4. Quantm Picks Caching + 74/80 (größter Eingriff).

Wenn ein Punkt unerwartet groß wird, melde ich mich, bevor ich weiterbaue.