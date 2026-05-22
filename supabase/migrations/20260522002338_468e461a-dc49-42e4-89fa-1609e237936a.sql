create table public.analysis_credit_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  used_at timestamptz not null default now()
);
create index analysis_credit_usage_user_month_idx
  on public.analysis_credit_usage (user_id, used_at desc);
alter table public.analysis_credit_usage enable row level security;
create policy "analysis_credit_usage_select_own"
  on public.analysis_credit_usage for select to authenticated
  using (user_id = auth.uid());
create policy "analysis_credit_usage_insert_own"
  on public.analysis_credit_usage for insert to authenticated
  with check (user_id = auth.uid());