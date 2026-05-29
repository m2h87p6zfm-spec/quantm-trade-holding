CREATE TABLE IF NOT EXISTS public.internal_cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internal_cron_tokens TO service_role;

ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_cron_tokens (name, token, updated_at)
VALUES (
  'picks_scan_cron',
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  now()
)
ON CONFLICT (name) DO UPDATE
SET token = EXCLUDED.token,
    updated_at = now();

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('picks-scan-top-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('picks-scan-extended-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('picks-scan-all-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('picks-scan-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('quantm-picks-hourly-scan'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('prebake-picks-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('picks-scan-half-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

SELECT cron.schedule(
  'picks-scan-half-hourly',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app/api/public/hooks/picks-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT token FROM public.internal_cron_tokens WHERE name = 'picks_scan_cron')
    ),
    body := '{"scopes":[{"universe":"top","sector":"Alle","region":"Alle"},{"universe":"extended","sector":"Alle","region":"Alle"},{"universe":"all","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  ) AS request_id;
  $$
);