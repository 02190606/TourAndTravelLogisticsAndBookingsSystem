-- Move send-alerts cron to 12:00 PM EAT (09:00 UTC) daily

SELECT cron.unschedule('send-alerts-daily');

SELECT cron.schedule(
  'send-alerts-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://ymjmqubbmeryqzolszvr.supabase.co/functions/v1/send-alerts',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltam1xdWJibWVyeXF6b2xzenZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM4NTc3MCwiZXhwIjoyMDk3OTYxNzcwfQ.18uxZKglZuVSoZQYtVQ2HEwWLyXjvogBiVgbIF3kX-8'
    )
  ) AS request_id;
  $$
);
