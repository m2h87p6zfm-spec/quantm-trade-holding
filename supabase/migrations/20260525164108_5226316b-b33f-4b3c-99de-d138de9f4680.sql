
create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null check (length(symbol) between 1 and 20),
  kind text not null check (kind in ('price_above','price_below','score_above','score_below')),
  threshold numeric not null,
  note text,
  active boolean not null default true,
  triggered_at timestamptz,
  last_checked_price numeric,
  created_at timestamptz not null default now()
);

create index price_alerts_user_idx on public.price_alerts(user_id);
create index price_alerts_active_symbol_idx on public.price_alerts(symbol) where active = true and triggered_at is null;

alter table public.price_alerts enable row level security;

create policy "price_alerts_select_own" on public.price_alerts
  for select to authenticated using (user_id = auth.uid());
create policy "price_alerts_insert_own" on public.price_alerts
  for insert to authenticated with check (user_id = auth.uid());
create policy "price_alerts_update_own" on public.price_alerts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "price_alerts_delete_own" on public.price_alerts
  for delete to authenticated using (user_id = auth.uid());

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subs_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push_subs_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
