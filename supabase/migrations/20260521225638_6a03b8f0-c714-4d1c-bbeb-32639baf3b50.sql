
-- pin search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- revoke EXECUTE from anon/authenticated for internal definer fns
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.has_active_subscription(uuid, text) from anon, authenticated, public;
