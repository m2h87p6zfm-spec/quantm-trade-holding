
create table if not exists public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id text,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_memory_user_created_idx
  on public.ai_memory (user_id, created_at desc);

alter table public.ai_memory enable row level security;

create policy "ai_memory_select_own"
  on public.ai_memory for select to authenticated
  using (user_id = auth.uid());

create policy "ai_memory_insert_own"
  on public.ai_memory for insert to authenticated
  with check (user_id = auth.uid());
