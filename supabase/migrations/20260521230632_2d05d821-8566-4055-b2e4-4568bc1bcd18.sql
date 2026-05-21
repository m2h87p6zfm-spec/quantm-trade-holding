
-- =============== 1. Predictions ===============
create table public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  symbol text not null,
  scenario_tag text not null,
  market_regime text not null,
  verdict text not null check (verdict in ('LONG','SHORT','NEUTRAL')),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  horizon_days integer not null default 5,
  price_at_prediction numeric not null,
  reasoning jsonb not null default '{}'::jsonb,
  model_version text not null default 'v1'
);
create index ai_predictions_user_idx on public.ai_predictions(user_id, created_at desc);
create index ai_predictions_scenario_idx on public.ai_predictions(scenario_tag, market_regime, created_at desc);
create index ai_predictions_symbol_idx on public.ai_predictions(symbol, created_at desc);
alter table public.ai_predictions enable row level security;

create policy "ai_predictions_select_own_or_anon"
  on public.ai_predictions for select
  to authenticated
  using (user_id = auth.uid() or user_id is null);

create policy "ai_predictions_select_all_for_aggregates"
  on public.ai_predictions for select
  to authenticated
  using (true);

create policy "ai_predictions_insert_own"
  on public.ai_predictions for insert
  to authenticated
  with check (user_id = auth.uid() or user_id is null);

-- =============== 2. Outcomes ===============
create table public.ai_outcomes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.ai_predictions(id) on delete cascade,
  evaluated_at timestamptz not null default now(),
  price_at_eval numeric not null,
  realized_return numeric not null,
  correct boolean not null,
  error_magnitude numeric not null default 0,
  notes text
);
create unique index ai_outcomes_prediction_uidx on public.ai_outcomes(prediction_id);
create index ai_outcomes_evaluated_idx on public.ai_outcomes(evaluated_at desc);
alter table public.ai_outcomes enable row level security;

create policy "ai_outcomes_select_all"
  on public.ai_outcomes for select
  to authenticated
  using (true);

-- =============== 3. Learning Events ===============
create table public.ai_learning_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scenario_tag text not null,
  market_regime text not null,
  pattern_detected text not null,
  weight_adjustment jsonb not null default '{}'::jsonb,
  before_belief text not null,
  after_belief text not null,
  trigger_prediction_ids uuid[] not null default '{}'::uuid[],
  sample_size integer not null default 0,
  prior_accuracy numeric
);
create index ai_learning_events_scenario_idx on public.ai_learning_events(scenario_tag, market_regime, created_at desc);
create index ai_learning_events_recent_idx on public.ai_learning_events(created_at desc);
alter table public.ai_learning_events enable row level security;

create policy "ai_learning_events_select_all"
  on public.ai_learning_events for select
  to authenticated
  using (true);

-- =============== 4. User Interactions ===============
create table public.ai_user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prediction_id uuid not null references public.ai_predictions(id) on delete cascade,
  action text not null check (action in ('viewed','followed','ignored','dismissed')),
  created_at timestamptz not null default now()
);
create index ai_user_interactions_user_idx on public.ai_user_interactions(user_id, created_at desc);
alter table public.ai_user_interactions enable row level security;

create policy "ai_user_interactions_select_own"
  on public.ai_user_interactions for select
  to authenticated
  using (user_id = auth.uid());

create policy "ai_user_interactions_insert_own"
  on public.ai_user_interactions for insert
  to authenticated
  with check (user_id = auth.uid());

-- =============== 5. Cron: täglich nach US-Close Outcomes auswerten ===============
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'ai-evaluate-outcomes-daily',
  '30 22 * * *',
  $$
  select net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app/api/public/cron-evaluate',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5bXB6cGRmaGFyaW9oZGthbWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTExNDcsImV4cCI6MjA5NDk2NzE0N30.5_o977dQodLw5kK6DxnlV6UmUthOcz8osKOr0KJtHyE'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
