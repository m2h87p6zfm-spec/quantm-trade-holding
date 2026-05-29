
-- Lock down internal_cron_tokens: service_role only.
-- Revoke any table-level grants that anon/authenticated may have inherited.
REVOKE ALL ON public.internal_cron_tokens FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.internal_cron_tokens TO service_role;

ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;

-- Explicit deny policies so the table is never readable/writable by clients
-- even if a future GRANT is added by mistake.
DROP POLICY IF EXISTS "internal_cron_tokens_no_client_select" ON public.internal_cron_tokens;
CREATE POLICY "internal_cron_tokens_no_client_select" ON public.internal_cron_tokens
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "internal_cron_tokens_no_client_insert" ON public.internal_cron_tokens;
CREATE POLICY "internal_cron_tokens_no_client_insert" ON public.internal_cron_tokens
  FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "internal_cron_tokens_no_client_update" ON public.internal_cron_tokens;
CREATE POLICY "internal_cron_tokens_no_client_update" ON public.internal_cron_tokens
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "internal_cron_tokens_no_client_delete" ON public.internal_cron_tokens;
CREATE POLICY "internal_cron_tokens_no_client_delete" ON public.internal_cron_tokens
  FOR DELETE TO anon, authenticated USING (false);
