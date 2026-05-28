DO $$
DECLARE
  url text := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app/api/public/hooks/picks-scan';
  hdr text := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5bXB6cGRmaGFyaW9oZGthbWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTExNDcsImV4cCI6MjA5NDk2NzE0N30.5_o977dQodLw5kK6DxnlV6UmUthOcz8osKOr0KJtHyE","x-cron-secret":"92804c95296942694f8409d53ab7be04134c1dfa7acec8980f8e03594f23cac3"}';
BEGIN
  PERFORM cron.unschedule('picks-scan-top-hourly');
  PERFORM cron.unschedule('picks-scan-extended-hourly');
  PERFORM cron.unschedule('picks-scan-all-hourly');

  PERFORM cron.schedule(
    'picks-scan-top-hourly',
    '5 * * * *',
    format($f$SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:='{"scopes":[{"universe":"top","sector":"Alle","region":"Alle"}]}'::jsonb)$f$, url, hdr)
  );

  PERFORM cron.schedule(
    'picks-scan-extended-hourly',
    '20 * * * *',
    format($f$SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:='{"scopes":[{"universe":"extended","sector":"Alle","region":"Alle"}]}'::jsonb)$f$, url, hdr)
  );

  PERFORM cron.schedule(
    'picks-scan-all-hourly',
    '35 * * * *',
    format($f$SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:='{"scopes":[{"universe":"all","sector":"Alle","region":"Alle"}]}'::jsonb)$f$, url, hdr)
  );
END $$;