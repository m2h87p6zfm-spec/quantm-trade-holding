-- Split picks-scan into 3 staggered jobs so each scope gets its own Worker invocation
-- (the combined call timed out before reaching "all"). Each run also refreshes the
-- combined merge from the latest caches.

SELECT cron.unschedule('picks-scan-hourly');

SELECT cron.schedule(
  'picks-scan-top',
  '5,35 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e-dev.lovable.app/api/public/hooks/picks-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT token FROM public.internal_cron_tokens WHERE name = 'picks_scan_cron')
    ),
    body := '{"scopes":[{"universe":"top","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'picks-scan-extended',
  '15,45 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e-dev.lovable.app/api/public/hooks/picks-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT token FROM public.internal_cron_tokens WHERE name = 'picks_scan_cron')
    ),
    body := '{"scopes":[{"universe":"extended","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'picks-scan-all',
  '25,55 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e-dev.lovable.app/api/public/hooks/picks-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT token FROM public.internal_cron_tokens WHERE name = 'picks_scan_cron')
    ),
    body := '{"scopes":[{"universe":"all","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  ) AS request_id;
  $$
);