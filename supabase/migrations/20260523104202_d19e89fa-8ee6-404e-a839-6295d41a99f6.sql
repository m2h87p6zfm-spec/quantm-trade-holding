-- Separate trading-explanation chat (isolated from analyse-agent history)
create table public.trade_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Neuer Trade-Chat',
  symbol text,
  trade_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trade_chat_sessions_user_updated_idx on public.trade_chat_sessions(user_id, updated_at desc);

alter table public.trade_chat_sessions enable row level security;
create policy "trade_sess_select_own" on public.trade_chat_sessions for select to authenticated using (user_id = auth.uid());
create policy "trade_sess_insert_own" on public.trade_chat_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "trade_sess_update_own" on public.trade_chat_sessions for update to authenticated using (user_id = auth.uid());
create policy "trade_sess_delete_own" on public.trade_chat_sessions for delete to authenticated using (user_id = auth.uid());

create trigger trade_sess_updated_at before update on public.trade_chat_sessions
  for each row execute function public.set_updated_at();

create table public.trade_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trade_chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index trade_chat_messages_session_idx on public.trade_chat_messages(session_id, created_at);

alter table public.trade_chat_messages enable row level security;
create policy "trade_msg_select_own" on public.trade_chat_messages for select to authenticated using (user_id = auth.uid());
create policy "trade_msg_insert_own" on public.trade_chat_messages for insert to authenticated with check (user_id = auth.uid());
create policy "trade_msg_delete_own" on public.trade_chat_messages for delete to authenticated using (user_id = auth.uid());

create trigger trade_msg_touch_session after insert on public.trade_chat_messages
  for each row execute function public.update_chat_timestamp();