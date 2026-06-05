# QuantmTrade Redesign — Beginner-first, Trust-focused

Brand (Quantm Trade logo, dark theme primary, silver wordmark) stays. Only the **frontend presentation** changes. All backend logic, auth, data fetching, Stripe trial, cron outcomes — untouched.

## Scope
4 pages get a ground-up presentation rewrite plus a slimmer nav. All copy in German, plain-language, mobile-first cards, tooltips on every technical term, advanced data in collapsibles.

---

## 1. Global building blocks (new components)

- `src/components/beginner/MetricCard.tsx` — big number → label → 1-line plain explanation → ℹ tooltip. Used everywhere we display a number.
- `src/components/beginner/InfoTooltip.tsx` — wraps shadcn Tooltip, ℹ icon, 12-year-old-friendly copy.
- `src/components/beginner/AdvancedCollapsible.tsx` — "Technische Details (für Fortgeschrittene)" Collapsible wrapper. Used to hide Sharpe/Drawdown/Vol/Greeks/Monte-Carlo CIs from default view.
- `src/components/beginner/PickCard.tsx` — card layout for one pick (logo+name+ticker, plain-German reason, "Signalstärke" bar, KAUFEN/BEOBACHTEN badge, Kursziel, date, "Was bedeutet das?" modal, advanced collapsible).
- `src/components/beginner/TrustPillars.tsx` — 3 columns: echte Daten · dokumentiert · zeigen auch Verluste.
- `src/components/beginner/ThresholdGate.tsx` — minimum-days gate (renders progress bar + explanation when below 30/90/180-day thresholds).

## 2. Navigation

- `src/components/AppSidebar.tsx` (or active nav component) trimmed for unauthenticated marketing context to exactly 4 items: **Picks · Track Record · Wie es funktioniert · Login/Account**.
- Mobile: hamburger → full-screen overlay (already partly in `MobileBottomNav`; reuse and slim).
- Internal product nav (dashboard, analyse, screener, etc.) stays for logged-in power users behind `/_authenticated`, but the marketing surface uses the 4-item shell.

## 3. Page 1 — Landing (`/`, unauth)

Replace `src/components/MarketingLanding.tsx`:
- **Hero**: H1 "Die richtigen Aktien. Ohne den ganzen Aufwand." · sub-headline as briefed · primary CTA "Jetzt Empfehlungen sehen" → `/picks` · secondary link "Wie funktioniert das?" → `/wie-es-funktioniert`. No jargon, no numbers except "Über 200 analysierte Aktien pro Woche".
- **3-Step "So funktioniert's"** with lucide icons (Brain · Bell · UserCheck).
- **Trust bar** (text badges, no fake logos).
- **Picks teaser**: 3 latest open picks via existing trackrecord function, blurred for unauth.
- **Track-record teaser**: ONE big number (Trefferquote) gated by 30-day minimum.
- Keep final CTA → 7-Tage-Trial.

## 4. Page 2 — Quantum Picks (`/picks`)

Rewrite `src/routes/picks.tsx` presentation:
- Card grid (1 col mobile, 2 col md, 3 col xl) of `PickCard`.
- Reason sentence derived from existing indicators — short German template ("Starkes Momentum, technisch überverkauft.") generated client-side from existing data.
- Signalstärke = colored progress bar from confidence score, no raw %.
- Action badge: confidence ≥ threshold → "KAUFEN" (bull green) else "BEOBACHTEN" (amber).
- Filters slimmed to: Sektor · Signalstärke (Alle/Stark/Mittel) · Status (Offen/Geschlossen). Remove all advanced filters from default view.
- "Was bedeutet das?" → shadcn Dialog with beginner explanation.
- Advanced data per card inside collapsible.
- Empty state copy as briefed.

## 5. Page 3 — Track Record (`/track-record`)

Rewrite `src/routes/track-record.tsx` presentation; keep `src/lib/trackrecord.functions.ts` data shape.
- Compute `daysOfData` from earliest evaluated outcome.
- `<30 days`: ThresholdGate full-page (progress bar + copy).
- `≥30 days`: 4 MetricCards — Trefferquote · Ø Rendite · Bester Trade · Ausgewertete Empfehlungen.
- `≥90 days`: Benchmark chart (Quantm vs S&P 500 vs DAX) with 3M/6M/1Y/Gesamt filters showing only periods with data. Auto-summary sentence under chart. Reuse existing benchmark data if available; otherwise show "Benchmark-Vergleich in Vorbereitung" placeholder card to avoid faking numbers.
- Picks history list: Company · Datum · Einstieg · Ausstieg · Rendite % · Status, with green/red return, sort newest first, filters Alle/Gewinner/Verlierer/Offen, search by name. Drop jargon columns.
- TrustPillars section.
- AdvancedCollapsible: Sharpe, Max Drawdown, Volatility, W/L Ratio, Avg holding period — each with InfoTooltip. Values computed from existing outcome data if present.
- Remove the 7-day-only views from default (move into Advanced).

## 6. Page 4 — Wie es funktioniert (`/wie-es-funktioniert`, new route)

New `src/routes/wie-es-funktioniert.tsx`:
- 5 sections max, each ≤3 sentences, with metaphors ("Wie ein erfahrener Analyst, der nie schläft").
- Visual algorithm flow (icons only, no formulas).
- 6-question FAQ (Accordion).
- CTA back to `/picks` and trial.

## 7. Cleanup / Hide

- In default views: hide Sharpe/Drawdown/Alpha/Beta/Volatility labels (only inside AdvancedCollapsible).
- Remove "7-Tage-Performance" cards from default Track Record, Picks, Dashboard surface.
- Ensure no number is shown without a German label + 1-line explanation.

## Technical notes

- All copy lives directly in the new components (German); no i18n keys to add.
- Tooltips via existing `@/components/ui/tooltip`, collapsibles via existing `@/components/ui/collapsible`, dialogs via `@/components/ui/dialog`, accordion via `@/components/ui/accordion`. No new deps.
- Use existing design tokens (`bg-background`, `text-foreground`, `text-bull`, `text-bear`, `text-primary`). For the lighter "private-bank" feel inside cards, lean on `bg-card/40` + `border-border/60` already in styles.css — no new color tokens.
- Route file `src/routes/wie-es-funktioniert.tsx` will register via TanStack file-based routing; `createFileRoute("/wie-es-funktioniert")`.
- No backend or DB migrations. No changes to Stripe, cron, RLS, server functions.

## Out of scope (explicitly)

- Logged-in power-user dashboard internals (`/dashboard`, `/agent`, `/screener` etc.) — untouched except for nav trim on the marketing shell.
- Pricing page — already has the trial wired; no redesign requested.
- Backend logic, schema, auth.

---

If you approve, I'll execute in this order: shared components → Landing → Picks → Track Record → Wie es funktioniert → nav trim → preview check.
