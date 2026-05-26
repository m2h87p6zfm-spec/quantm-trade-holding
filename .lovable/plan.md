## Self-Monitoring & Self-Healing System

Ein zentrales Konsistenz- und Selbstheilungssystem, das im Hintergrund läuft, Inkonsistenzen erkennt, automatisch behebt und protokolliert.

### 1. Datenbank (Migration)

Neue Tabelle `self_healing_logs`:
- `id`, `user_id` (nullable), `check_name`, `severity` (info/warn/error/critical), `status` (detected/healed/failed/escalated), `details` (jsonb), `auto_healed` (bool), `created_at`
- RLS: User sieht nur eigene Einträge; Admin sieht alle
- Index auf `(created_at desc)` und `(severity, status)`

Neue Tabelle `app_admins` (für hidden Admin-Dashboard):
- `user_id` (PK, FK auf auth.users), `created_at`
- `has_role(uid, 'admin')` Funktion via separates `user_roles`-Pattern (wir nutzen bestehende Conventions: enum + user_roles + has_role security definer)

### 2. Core: `ConsistencyEngine` (`src/lib/consistency-engine.ts`)

Pure-TS Modul mit registrierbaren Checks:
```ts
type Check = {
  name: string;
  category: 'watchlist' | 'alerts' | 'apex' | 'realtime' | 'causal' | 'onboarding' | 'filter';
  run: (ctx) => Promise<CheckResult>;
  heal?: (ctx, result) => Promise<HealResult>;
};
```

Eingebaute Checks:
- **watchlist-sentiment-consistency**: Vergleicht Counts aus Marktstimmung mit Watchlist-Cards (nutzt selben `stabilizeDecision`-Pipeline). Bei Mismatch → cache invalidate.
- **price-data-freshness**: Prüft ob Candle-Daten der Watchlist ≤ X Minuten alt sind. Heal: refetch.
- **alerts-integrity**: Prüft ob aktive Preisalarme auf existierende Symbole zeigen.
- **apex-signal-consistency**: Prüft ob APEX-Verdict und Decision-Card-Verdict übereinstimmen.
- **realtime-connection**: Prüft Supabase Realtime Channel Status.
- **causal-engine-health**: Pingt Causal Engine Endpoint, prüft Latenz.
- **onboarding-flow**: Prüft ob Profile vorhanden ist, wenn user authed.
- **portfolio-pnl-recompute**: Berechnet G/V aus Rohdaten neu und vergleicht mit angezeigtem Wert.

Jede Heal-Action invalidiert relevante Query Keys via globalem `queryClient`.

### 3. Hintergrund-Runner: `SelfHealingService` (`src/lib/self-healing-service.ts`)

- Singleton, gestartet im `__root.tsx` via `useEffect`
- Intervall: alle 10 Min (configurable)
- Zusätzlich Trigger bei Route-Wechsel auf kritische Seiten (Watchlist, Portfolio, APEX)
- Throttling: pro Check max 1x/2min
- Bei Heal-Success → silent log; bei Fail nach 3 Versuchen → escalate (severity=critical)
- Logs werden batched via server function `logHealingActions` in DB geschrieben

### 4. Server-Side

`src/lib/self-healing.functions.ts`:
- `logHealingActions(actions[])` — batch insert in `self_healing_logs`
- `getHealingLogs({limit, severity?})` — admin-only via `requireSupabaseAuth` + `has_role(uid,'admin')` check
- `getHealingStats()` — aggregate counts last 24h/7d

### 5. Hidden Admin Dashboard

Neue Route `/admin/self-healing` (unter `_authenticated`):
- Server-side Guard: redirected non-admins zu `/`
- Tabelle aller Logs mit Filter (severity, category, time range)
- Stats-Kacheln: Total Checks 24h, Auto-Healed %, Open Escalations
- Live-Refresh alle 30s

Kein Link in der Sidebar — nur direkt per URL erreichbar.

### 6. User-facing (dezent)

- Bei `severity=critical` und Premium-User: kleiner Toast (max 1x/Session) "Daten aktualisiert"
- Keine Popups, keine Banner — alles passiert silent

### 7. Performance / Resource Hygiene

- Alle Checks share dieselben React-Query Caches (kein doppelter API-Call)
- Failed checks haben Exponential Backoff
- Pausiert wenn `document.hidden` (Tab inaktiv)
- Pausiert während aktiver User-Interaction (input focus)

### Dateiliste

**Neu:**
- `supabase/migrations/<ts>_self_healing.sql`
- `src/lib/consistency-engine.ts`
- `src/lib/self-healing-service.ts`
- `src/lib/self-healing.functions.ts`
- `src/lib/checks/` (ein File pro Check)
- `src/routes/_authenticated/admin.self-healing.tsx`

**Geändert:**
- `src/routes/__root.tsx` (Service-Start im useEffect)
- `src/integrations/supabase/types.ts` (auto-generated nach Migration)

### Hinweis zur Stack-Konvention

Cron-Jobs auf diesem Stack laufen als TanStack Server Routes unter `/api/public/hooks/*`, nicht als Supabase Edge Functions. Die Haupt-Loop läuft client-seitig (das ist konsistent mit dem bestehenden Code, der ebenfalls auf Client-Polling setzt). Falls server-seitige Checks gewünscht sind, kommt zusätzlich `src/routes/api/public/hooks/self-healing.ts` + pg_cron dazu.
