
create table if not exists public.market_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists market_cache_expires_idx on public.market_cache (expires_at);

alter table public.market_cache enable row level security;

-- Kein Policy = kein Client-Zugriff. Nur service_role (supabaseAdmin) liest/schreibt.
