## Plan: Enhanced Onboarding + Professional News Hub

This is a large, multi-area change. Before implementing, I want to confirm scope and surface a couple of decisions so we don't waste cycles.

### 1. Enhanced Onboarding (`src/routes/welcome.tsx` + `user_trading_profile`)

Add three new steps to the existing onboarding wizard:

- **Portfolio Setup** — reuse `SymbolSearch` component; validate each ticker via the existing `/api/public/quote` endpoint before allowing "Next". Seed the user's default watchlist with these tickers (via `useSettings().addSymbols`).
- **Base Currency** — USD / EUR / GBP / CHF selection cards → writes to `settings.currency`.
- **Experience Level** — Beginner / Intermediate / Pro → stored on `user_trading_profile` (new column `experience_level`) and injected into the ARIA system prompt to tailor signal complexity.
- **Notification Preferences** — toggle desktop toasts for Breaking News (uses existing `notif_breakout`, `notif_realtime` columns + new `notif_breaking_news` boolean).

DB migration: add `experience_level text`, `base_currency text`, `notif_breaking_news boolean`, `news_sources jsonb` to `user_trading_profile`.

### 2. Professional News Hub (`src/routes/news.tsx`)

- Rewrite `src/routes/api/public/news-sentiment.ts` (or add a new `/api/public/news-feed.ts`) to fetch from Yahoo Finance RSS and filter publisher to the Tier-1 whitelist: **Reuters, Bloomberg, Yahoo Finance, CNBC, Financial Times**.
- **Source toggles panel** on the news page — reads/writes `news_sources` from settings.
- **"For You" section** — sorts/filters articles whose mentioned tickers intersect the user's active watchlist, scored by recency × match count. No extra AI call needed (matching is deterministic; cheap & fast).
- Each card: agency logo (small inline SVG/emoji map), headline, timestamp, **clickable ticker chips** → `Link to="/produkte/$symbol"`.

### 3. Breaking News Live Ticker + Toasts

- New component `src/components/BreakingNewsTicker.tsx` mounted in `__root.tsx` — horizontally scrolling marquee at the top, polls `/api/public/news-feed?breaking=1` every 60s.
- When a new "breaking" item arrives (priority publishers + keyword heuristic: "breaking", "halts", "surges", "plunges", "downgrades", earnings beats), fire a `sonner` toast with the headline + ticker chip. Gated by the user's `notif_breaking_news` setting.

### 4. Portfolio-Centric Watchlist Table

- Widen watchlist rows in `src/routes/index.tsx`: add **Market Cap**, **Volume**, **Day Range (L–H)** columns. Volume + 52W already exist on the Quote type from the previous round; Market Cap requires extending `/api/public/quote.ts` to pull `marketCap` from Yahoo `quoteSummary`.
- **Drag-and-drop reorder** in the "Manage Watchlist" modal — use lightweight `@dnd-kit/core` + `@dnd-kit/sortable` (already a common, small dep). Persist new order via `setWatchlistSymbols(id, ordered)` (new helper in `settings.ts`).

### Files to create
- `src/routes/api/public/news-feed.ts` — Yahoo RSS proxy with publisher whitelist + ticker extraction
- `src/components/BreakingNewsTicker.tsx`
- `src/components/AgencyLogo.tsx` — small mapping of publisher → inline mark
- `src/components/NewsCard.tsx`
- `src/components/SortableWatchlist.tsx` — dnd-kit wrapper

### Files to edit
- `supabase/migrations/*` — new columns on `user_trading_profile`
- `src/routes/welcome.tsx` — add three new steps
- `src/routes/news.tsx` — full rewrite to Professional Newsroom
- `src/routes/index.tsx` — add Market Cap / Volume / Day Range columns
- `src/lib/settings.ts` — add `reorderActive(ids)` + `news_sources` field
- `src/routes/api/public/quote.ts` — add `marketCap`
- `src/lib/finnhub.ts` — extend `Quote` type
- `src/routes/__root.tsx` — mount `<BreakingNewsTicker />`
- `src/routes/api/public/agent-chat.ts` — inject experience level into ARIA prompt

### Open questions before I start

1. **News data source** — Yahoo Finance doesn't expose a clean public news API with publisher filtering. The realistic options:
   - **(a)** Yahoo RSS per ticker (`finance.yahoo.com/rss/headline?s=AAPL`) — free, reliable, but publisher attribution is messy.
   - **(b)** Use **Firecrawl** (already connected) to search the Tier-1 publisher domains directly — much cleaner attribution, costs Firecrawl credits per refresh.
   - **(c)** Add a dedicated news API key (Marketaux / NewsAPI / Benzinga) — best quality, requires a new secret.

2. **Drag-and-drop dependency** — OK to add `@dnd-kit/core` + `@dnd-kit/sortable` (~25KB gz, the de-facto standard)?

3. **Breaking News toasts** — should these be **session-only** (only fire while the tab is open) or do we need real **Web Push** notifications (requires service worker + VAPID keys + user permission flow)? Most "Bloomberg-style" implementations are session-only.

Confirm answers to those three and I'll ship it in one pass.