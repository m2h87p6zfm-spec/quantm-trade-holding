
create table if not exists public.user_trading_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  trading_goal text,
  risk_level text,
  usage_frequency text,
  markets jsonb not null default '[]'::jsonb,
  ai_style text,
  region text default 'global',
  confidence_threshold integer not null default 60,
  signal_frequency text default 'medium',
  strategy_mode text default 'balanced',
  notif_realtime boolean not null default true,
  notif_daily boolean not null default true,
  notif_weekly boolean not null default false,
  notif_breakout boolean not null default true,
  notif_silent boolean not null default false,
  ai_tone text default 'professional',
  explanation_depth text default 'brief',
  show_reasoning boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_trading_profile enable row level security;

create policy "utp_select_own" on public.user_trading_profile
  for select to authenticated using (auth.uid() = user_id);
create policy "utp_insert_own" on public.user_trading_profile
  for insert to authenticated with check (auth.uid() = user_id);
create policy "utp_update_own" on public.user_trading_profile
  for update to authenticated using (auth.uid() = user_id);

create trigger utp_set_updated_at
  before update on public.user_trading_profile
  for each row execute function public.set_updated_at();
