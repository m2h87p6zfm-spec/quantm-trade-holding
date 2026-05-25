## Entscheidungen vorweg

Da du die Klarfragen übersprungen hast, treffe ich folgende technische Entscheidungen — pragmatisch, ressourcenschonend, ohne Cloudflare-Durable-Objects-Risiko:

**1. „WebSocket-Feel" ohne echten TD-WS-Bridge.**
Cloudflare Workers (auf dem deine App läuft) können keine geteilte, dauerhafte TD-WebSocket-Verbindung halten, ohne Durable Objects einzuführen (großer Umbau, Migration, Test-Risiko). Statt dessen:
- **Premium (Pro/Elite):** Bestehender SSE-Stream tickt während der US-Handelszeit alle **2 Sekunden** (statt 10s), außerhalb 5 min. Fühlt sich für den Nutzer wie Live an, nutzt **0 TD-WebSocket-Credits**, nur normale Batch-Quote-API.
- **Free:** SSE wird serverseitig abgewiesen → Client fällt automatisch auf Polling alle **30 s** zurück.
- **Echter TD-WS via Durable Objects** bleibt als optionaler Folge-Schritt dokumentiert, sobald die Premium-Userbasis das rechtfertigt.

**2. Push-Reichweite: voll (Web Push mit VAPID).**
Damit Alerts auch bei geschlossenem Tab/Hintergrund auf iPhone/iPad feuern können, brauchen wir Service Worker + VAPID + Push-Subscriptions-Tabelle + serverseitigen Cron-Evaluator. iOS verlangt PWA-Installation auf dem Homescreen — wird im UI klar kommuniziert.

## Was gebaut wird

### A. Tier-Gate für Echtzeit-Stream
- `src/lib/api-auth.server.ts`: bestehende `requireUserId` um `requirePro` ergänzen (existiert ggf. schon — wiederverwenden).
- `src/routes/api/public/stream.ts`: bei nicht-Premium-User mit `402 Payment Required` antworten. Premium-Tick = 2 s während US-Markt offen, 5 min sonst.
- `src/hooks/useLiveQuotes.ts`: bei `402` automatisch in Polling-Modus (30 s, via `/api/public/quotes-batch`).
- Symbol-Limit serverseitig: max. 10 Symbole pro SSE-Verbindung (verhindert versehentliches Abonnieren ganzer Watchlists).

### B. UI: LIVE-Badge & Free-Hinweis
- Neue Komponente `<RealtimeStatusBadge />`: grüner Pulse + „LIVE" für Premium, grauer Punkt + „Verzögert · Upgrade" für Free (Link auf `/preise`).
- Eingebaut in `produkte.$symbol.tsx` (Header neben Preis) und `WatchlistSignalsPanel`.
- Bestehendes Design/Layout bleibt unverändert — nur Badge eingefügt.

### C. Alerts: LocalStorage → Supabase
- Neue Tabelle `price_alerts` (id, user_id, symbol, kind, threshold, note, active, triggered_at, created_at) + RLS „own only".
- `src/lib/alerts.ts` ersetzt: liest/schreibt über Supabase (mit LocalStorage-Migration für bestehende Alerts beim ersten Login).
- `src/routes/alerts.tsx`: UI unverändert, nur Datenquelle.

### D. Web Push Infrastruktur
1. **VAPID-Keys generieren** (lokal via `bun add web-push` Script) → `VITE_VAPID_PUBLIC_KEY` als Code-Konstante, `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` als Secrets. **→ ich frage dich nach Bestätigung, bevor die Secrets gesetzt werden.**
2. **Service Worker** `public/sw.js`: empfängt `push` events, zeigt Notification, öffnet Asset-Seite bei Klick.
3. **Registrierung-Hook** `src/hooks/usePushSubscription.ts`: bei Premium + erstem Alert → Permission-Prompt → Subscription speichern.
4. **Tabelle** `push_subscriptions` (id, user_id, endpoint, p256dh, auth, user_agent, created_at) + RLS.
5. **Server-Endpoint** `src/routes/api/public/push-subscribe.ts` (POST mit `requirePro`).
6. **Cron-Evaluator** `src/routes/api/public/hooks/evaluate-alerts.ts`: läuft jede Minute, lädt aktive Alerts, batched Quotes von TD, prüft Trigger, sendet Push via Web-Push-Bibliothek, markiert `triggered_at`. Mit `requireCronSecret` geschützt.
7. **pg_cron-Schedule** (per `supabase--insert`, nicht migration): jede Minute während Marktzeiten.

### E. Symbol-Scope-Management
- Premium-Stream abonniert nur Symbole der aktiven Seite (Detail = 1, Watchlist = max. 8, Chart = 1).
- Bei Navigation alter SSE schließt automatisch (bestehende Cleanup-Logik in `useLiveQuotes`).
- Alert-Symbole laufen **nicht** über den SSE, sondern über den 60-s-Cron-Evaluator → schont WS-Quota, funktioniert auch wenn User offline ist.

## Technische Details

**Auth-Gating-Pattern:**
```ts
// stream.ts
const auth = await requirePro(request); // statt requireUserId
if (auth instanceof Response) {
  return new Response(JSON.stringify({ tier: "free", upgrade: true }),
    { status: 402, headers: { ... } });
}
```

**Tick-Adapter:**
```ts
const TICK_PREMIUM_OPEN_MS = 2_000;
const TICK_PREMIUM_CLOSED_MS = 300_000;
```

**Web Push Send (Cron):**
- `web-push` npm-Paket ist Node-only → ich nutze **direkt die VAPID-JWT-Signatur via `jose` + `crypto.subtle`**, das läuft auf Cloudflare Workers (workerd).

**Schema:**
```sql
create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null check (length(symbol) between 1 and 20),
  kind text not null check (kind in ('price_above','price_below')),
  threshold numeric not null,
  note text,
  active boolean not null default true,
  triggered_at timestamptz,
  last_checked_price numeric,
  created_at timestamptz not null default now()
);
create index price_alerts_active_symbol_idx on price_alerts(active, symbol) where active = true;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
```

Beide Tabellen: RLS aktiv, Policy `user_id = auth.uid()` für select/insert/update/delete.

## Was bewusst NICHT gemacht wird

- **Echter TD-WebSocket-Bridge** (Durable Objects). Begründung oben.
- **Indikator-/Score-Alerts**: bleiben wie bisher in LocalStorage (Out of Scope dieser Runde).
- **Android-spezifische Push-Optimierungen** (Channels) — Web Push-Standard ausreichend.
- **iOS-Notifikation ohne PWA-Install**: technisch nicht möglich, Apple-Limitation.

## Reihenfolge der Ausführung

1. DB-Migration (`price_alerts`, `push_subscriptions`)
2. Tier-Gate in `/api/public/stream` + `useLiveQuotes`-Fallback
3. `<RealtimeStatusBadge />` + Einbau
4. `alerts.ts` Refactor auf Supabase + Migration aus LocalStorage
5. Stop und **dich nach VAPID-Generierung fragen** (du gibst mir Go, ich generiere und setze Secrets)
6. Service Worker, Push-Subscribe-Endpoint, usePushSubscription-Hook
7. Cron-Evaluator + pg_cron-Schedule
8. Smoke-Test: invoke-server-function gegen /stream (free vs pro), gegen Cron-Endpoint

## Risiken

- **TD-Batch-Quote-Credits**: 2-s-Tick × N Premium-Connections × M Symbole. Bei 10 Premium-Usern, 5 Symbolen, 6.5h US-Markt → ~58k Calls/Tag. Bleibt im üblichen TD-Pro-Plan-Budget. Falls Userbasis wächst: Window verlängern oder Caching pro Symbol auf 5 s anheben.
- **iOS Web Push**: Funktioniert nur als installierte PWA. UI muss das klar sagen, sonst Support-Anfragen.
- **VAPID-Key-Rotation**: Wenn der private Key später ausgetauscht wird, müssen alle Subscriptions neu registriert werden. Akzeptabel.