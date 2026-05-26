-- App role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- self_healing_logs table
CREATE TABLE IF NOT EXISTS public.self_healing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  check_name text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warn','error','critical')),
  status text NOT NULL CHECK (status IN ('detected','healed','failed','escalated','ok')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_healed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.self_healing_logs TO authenticated;
GRANT ALL ON public.self_healing_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_self_healing_logs_created_at
  ON public.self_healing_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_healing_logs_severity_status
  ON public.self_healing_logs (severity, status);
CREATE INDEX IF NOT EXISTS idx_self_healing_logs_user
  ON public.self_healing_logs (user_id, created_at DESC);

ALTER TABLE public.self_healing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shl_select_own_or_admin" ON public.self_healing_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "shl_insert_own" ON public.self_healing_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
