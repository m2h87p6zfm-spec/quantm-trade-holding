-- 1) Reschedule picks-scan cron jobs to use x-cron-secret instead of anon apikey.
DO $$
BEGIN
  PERFORM cron.unschedule('picks-scan-top-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('picks-scan-extended-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('picks-scan-all-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'picks-scan-top-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app/api/public/hooks/picks-scan',
    headers := '{"Content-Type":"application/json","x-cron-secret":"92804c95296942694f8409d53ab7be04134c1dfa7acec8980f8e03594f23cac3"}'::jsonb,
    body := '{"scopes":[{"universe":"top","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  );
  $$
);

SELECT cron.schedule(
  'picks-scan-extended-hourly',
  '20 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app/api/public/hooks/picks-scan',
    headers := '{"Content-Type":"application/json","x-cron-secret":"92804c95296942694f8409d53ab7be04134c1dfa7acec8980f8e03594f23cac3"}'::jsonb,
    body := '{"scopes":[{"universe":"extended","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  );
  $$
);

SELECT cron.schedule(
  'picks-scan-all-hourly',
  '35 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app/api/public/hooks/picks-scan',
    headers := '{"Content-Type":"application/json","x-cron-secret":"92804c95296942694f8409d53ab7be04134c1dfa7acec8980f8e03594f23cac3"}'::jsonb,
    body := '{"scopes":[{"universe":"all","sector":"Alle","region":"Alle"}]}'::jsonb,
    timeout_milliseconds := 280000
  );
  $$
);

-- 2) Tighten realtime.messages policies: require the auth.uid() to appear
-- between colon delimiters, matching the canonical app channel formats
-- `sub:<uid>:...` and `price_alerts_self:<uid>:...`. UUIDs never contain
-- colons, so this prevents any substring overlap between user ids.
DROP POLICY IF EXISTS realtime_authenticated_own_topic_select ON realtime.messages;
DROP POLICY IF EXISTS realtime_authenticated_own_topic_insert ON realtime.messages;

CREATE POLICY realtime_authenticated_own_topic_select
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() LIKE ('%:' || auth.uid()::text || ':%'));

CREATE POLICY realtime_authenticated_own_topic_insert
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() LIKE ('%:' || auth.uid()::text || ':%'));
