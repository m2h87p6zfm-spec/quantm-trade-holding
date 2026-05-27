
SELECT cron.unschedule('prebake-picks-hourly');
SELECT cron.unschedule('quantm-picks-hourly-scan');
SELECT cron.unschedule('picks-scan-hourly');

SELECT cron.schedule(
  'picks-scan-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e-dev.lovable.app/api/public/hooks/picks-scan',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5bXB6cGRmaGFyaW9oZGthbWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTExNDcsImV4cCI6MjA5NDk2NzE0N30.5_o977dQodLw5kK6DxnlV6UmUthOcz8osKOr0KJtHyE"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 280000
  );
  $$
);

SELECT net.http_post(
  url := 'https://project--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e-dev.lovable.app/api/public/hooks/picks-scan',
  headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5bXB6cGRmaGFyaW9oZGthbWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTExNDcsImV4cCI6MjA5NDk2NzE0N30.5_o977dQodLw5kK6DxnlV6UmUthOcz8osKOr0KJtHyE"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 280000
);
