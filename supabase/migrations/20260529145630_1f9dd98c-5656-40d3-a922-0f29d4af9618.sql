DO $$
DECLARE
  job_name text;
BEGIN
  FOR job_name IN
    SELECT jobname
    FROM cron.job
    WHERE jobname ILIKE '%picks-scan%'
       OR command ILIKE '%/api/public/hooks/picks-scan%'
  LOOP
    PERFORM cron.unschedule(job_name);
  END LOOP;
END $$;

SELECT cron.schedule(
  'picks-scan-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e-dev.lovable.app/api/public/hooks/picks-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT token FROM public.internal_cron_tokens WHERE name = 'picks_scan_cron')
    ),
    body := '{"scopes":[{"universe":"top","sector":"Alle","region":"Alle"},{"universe":"extended","sector":"Alle","region":"Alle"},{"universe":"all","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  ) AS request_id;
  $$
);