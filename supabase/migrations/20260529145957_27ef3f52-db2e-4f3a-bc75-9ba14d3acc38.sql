
-- Cron health/alert log for the Quantum Picks scan job.
-- Records HTTP failures (403/5xx/timeout) emitted by pg_cron via net.http_post,
-- and slow-scan warnings reported by the route handler itself.
CREATE TABLE IF NOT EXISTS public.cron_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  alert_type text NOT NULL,            -- 'http_error' | 'timeout' | 'slow_scan' | 'stale'
  severity text NOT NULL DEFAULT 'error', -- 'warning' | 'error'
  status_code integer,
  duration_ms integer,
  message text NOT NULL,
  details jsonb,
  dedupe_key text UNIQUE,              -- prevents duplicate inserts for same incident window
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_alerts_created_at ON public.cron_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_alerts_job ON public.cron_alerts (job_name, created_at DESC);

GRANT SELECT ON public.cron_alerts TO authenticated;
GRANT ALL ON public.cron_alerts TO service_role;

ALTER TABLE public.cron_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can read; writes happen via service_role (route + monitor function).
CREATE POLICY "cron_alerts_admin_read" ON public.cron_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cron_alerts_no_client_insert" ON public.cron_alerts
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "cron_alerts_no_client_update" ON public.cron_alerts
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "cron_alerts_no_client_delete" ON public.cron_alerts
  FOR DELETE TO authenticated USING (false);

-- Monitor function: scans recent net._http_response rows for the picks-scan
-- endpoint and logs 403/5xx/timeouts. Also detects "stale" state (no scan
-- in scan_history for > 35 minutes). Dedupes per response id / per stale window.
CREATE OR REPLACE FUNCTION public.monitor_picks_scan_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  r record;
  last_scan timestamptz;
  stale_minutes int;
  stale_key text;
BEGIN
  -- 1) HTTP errors from recent picks-scan dispatches (last 15 minutes)
  FOR r IN
    SELECT resp.id, resp.status_code, resp.timed_out, resp.error_msg, resp.created, q.url
    FROM net._http_response resp
    JOIN net.http_request_queue q ON q.id = resp.id
    WHERE resp.created > now() - interval '15 minutes'
      AND q.url LIKE '%picks-scan%'
      AND (resp.timed_out = true OR resp.status_code = 403 OR resp.status_code >= 500)
  LOOP
    INSERT INTO public.cron_alerts (job_name, alert_type, severity, status_code, message, details, dedupe_key)
    VALUES (
      'picks-scan',
      CASE WHEN r.timed_out THEN 'timeout' ELSE 'http_error' END,
      'error',
      r.status_code,
      CASE WHEN r.timed_out THEN 'Picks-Scan HTTP-Request timed out'
           ELSE 'Picks-Scan antwortete mit HTTP ' || COALESCE(r.status_code::text, '?') END,
      jsonb_build_object('url', r.url, 'error_msg', r.error_msg, 'created', r.created),
      'http:' || r.id::text
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END LOOP;

  -- 2) Stale-scan alert if last successful scan_history entry is older than 35 min
  SELECT max(scanned_at) INTO last_scan FROM public.scan_history;
  IF last_scan IS NULL OR last_scan < now() - interval '35 minutes' THEN
    stale_minutes := COALESCE(EXTRACT(EPOCH FROM (now() - last_scan))::int / 60, 9999);
    stale_key := 'stale:' || to_char(date_trunc('hour', now()), 'YYYYMMDDHH24');
    INSERT INTO public.cron_alerts (job_name, alert_type, severity, message, details, dedupe_key)
    VALUES (
      'picks-scan',
      'stale',
      'error',
      'Kein erfolgreicher Picks-Scan seit ' || stale_minutes || ' Minuten',
      jsonb_build_object('last_scan', last_scan, 'minutes_since', stale_minutes),
      stale_key
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.monitor_picks_scan_health() TO service_role, postgres;

-- Schedule monitor every 5 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('picks-scan-health-monitor');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'picks-scan-health-monitor',
  '*/5 * * * *',
  $$ SELECT public.monitor_picks_scan_health(); $$
);
