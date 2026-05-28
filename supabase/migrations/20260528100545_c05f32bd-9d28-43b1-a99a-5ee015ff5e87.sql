CREATE TABLE public.login_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text,
  provider text,
  event text NOT NULL DEFAULT 'SIGNED_IN'
);

CREATE INDEX idx_login_events_user_created ON public.login_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_events_insert_own"
ON public.login_events
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "login_events_select_own"
ON public.login_events
FOR SELECT TO authenticated
USING (user_id = auth.uid());