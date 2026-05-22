# Overhaul: Onboarding, Subscription Gating, News Engine

A focused plan across 5 areas. Reuses existing infrastructure (`useSubscription`, `useSettings`, `SymbolSearch`, `ManageWatchlistDialog`, `news-sentiment`, `AgencyLogo`, `BreakingNewsTicker`) — no DB migrations, all preferences extend the existing `ta_settings` localStorage shape.

## 1. Subscription Tier Limits

Add a single helper `getPortfolioLimit()` in `src/lib/portfolio.ts`:
- Free: 10 symbols
- Pro (`pro_*`): 20 symbols
- Elite/Ultimate (`elite_*`, `ultimate_*`): `Infinity`

Reads from existing `useSubscription` hook. Used by onboarding, `SymbolSearch`, and the Edit Portfolio dialog.

## 2. Tiered Onboarding (`src/routes/welcome.tsx`)

Extend the existing welcome flow with two new steps inserted before final submit:
- **Step: Build Your Portfolio** — embedded `SymbolSearch` + chip list. Live counter `X / LIMIT`. Blocks "Next" if zero. Tickers validated via existing `/api/public/search` + `/api/public/quote` round-trip (already wired in `SymbolSearch`).
- **Step: Source Selection** — 5 toggle cards (Reuters/Bloomberg/CNBC/FT/Yahoo) writing to `settings.newsSources`.

On finish, seed `watchlists[0].symbols` with the picked portfolio (replaces default seed) and mark `portfolioOnboarded: true` in settings so we know which symbols are "Holdings" vs Market Watch.

## 3. Portfolio-vs-Watch Split + Edit Portfolio

Extend `src/lib/settings.ts`:
- Add `portfolioSymbols: string[]` (the user's holdings from onboarding) — separate from the general watchlist.
- Add `costBasis: Record<string, number>` (placeholder, optional per-symbol).
- New helpers: `setPortfolio(syms)`, `reorderPortfolio(syms)`, `addToPortfolio(sym)`, `removeFromPortfolio(sym)`.

`src/routes/index.tsx` watchlist section becomes two stacked tables:
- **My Portfolio** (top) — rows show `HOLDING` badge, Cost Basis col, Total G/L col (computed from current quote vs cost basis, placeholder $0 if not set). Drag-and-drop via existing `@dnd-kit` setup.
- **Market Watch** (below) — remaining `watchlist` symbols not in portfolio, plus defaults (SPY, QQQ, DIA, IWM) if missing.

New `EditPortfolioDialog` (clone of `ManageWatchlistDialog`, operates on `portfolioSymbols`) wired to a prominent "Portfolio bearbeiten" button at the top of the My Portfolio table. Enforces tier limit; surfaces Upgrade modal on overflow.

## 4. AI "Alpha" News Summaries

Server: extend `src/routes/api/public/news-sentiment.ts` to optionally call Lovable AI (`google/gemini-3-flash-preview`) with the headline + ticker, returning a 1-sentence `aiSummary` per item. Gated by request flag `withSummary: true` and capped to top 20 items to control cost. Failures fall back to no summary (non-blocking).

Client (`src/routes/news.tsx`):
- New "Personalisiert" (For You) tab uses portfolio symbols only and requests `withSummary: true`.
- News card renders the summary line below the headline in a subtle accent box: *"Warum das für deine TSLA-Position zählt: …"*.

## 5. Breaking-News Toasts for Holdings

`src/components/BreakingNewsTicker.tsx` already polls and toasts. Tighten the filter: only toast if at least one ticker in the item overlaps `portfolioSymbols` AND item is `breaking`. Use `sonner` `toast.error`/`toast.success` based on `sentiment`, with the agency logo and a "Chart öffnen" action linking to `/produkte/$symbol`.

## 6. Upsell Modal

New `src/components/UpgradeModal.tsx` (shadcn Dialog):
- Triggered when adding an 11th symbol on Free / 21st on Pro.
- Headline: "Erweitere dein Portfolio", list of benefits (more symbols, more sources, alpha summaries), CTA → `/preise`.

Exposed via a tiny context/hook `useUpgradePrompt()` so `SymbolSearch`, onboarding, and `EditPortfolioDialog` can all call `promptUpgrade("portfolio_limit")`.

## Technical Details

**Files created:**
- `src/components/EditPortfolioDialog.tsx`
- `src/components/UpgradeModal.tsx`
- `src/hooks/use-upgrade-prompt.tsx`

**Files edited:**
- `src/lib/settings.ts` — add `portfolioSymbols`, `costBasis`, `portfolioOnboarded`; new mutators.
- `src/lib/portfolio.ts` — `getPortfolioLimit(tier)` + tier resolver.
- `src/routes/welcome.tsx` — add 2 new steps, seed portfolio on finish.
- `src/routes/index.tsx` — split watchlist into Portfolio (drag-reorder, Cost Basis, G/L) + Market Watch; "Portfolio bearbeiten" button.
- `src/components/SymbolSearch.tsx` — accept `limit`/`current` props; call upgrade prompt on overflow.
- `src/routes/news.tsx` — Personalisiert tab, AI summary rendering.
- `src/routes/api/public/news-sentiment.ts` — optional `withSummary` via Lovable AI Gateway.
- `src/components/BreakingNewsTicker.tsx` — portfolio overlap filter + sentiment-colored toasts.
- `src/routes/__root.tsx` — mount `<UpgradeModal />` provider.

**No DB migrations.** All portfolio/cost-basis state lives in `ta_settings` localStorage to keep this scope tight; we can promote to Supabase in a follow-up.

**No new dependencies.** Reuses `@dnd-kit/*`, `sonner`, shadcn Dialog, Lovable AI Gateway (existing `LOVABLE_API_KEY`).
