-- Move send-alerts cron from 2:00 PM EAT (11:00 AM UTC) to 12:00 PM EAT (09:00 AM UTC)
-- Move trip-status sync from 1:55 PM EAT (10:55 AM UTC) to 11:55 AM EAT (08:55 AM UTC)
-- Both stay 5 minutes apart as before

SELECT cron.unschedule('sync-trip-statuses-daily');
SELECT cron.unschedule('send-alerts-daily');

SELECT cron.schedule(
  'sync-trip-statuses-daily',
  '55 8 * * *',
  $$
  UPDATE trips
  SET status = CASE
    WHEN CURRENT_DATE < trip_start_date THEN 'planned'
    WHEN CURRENT_DATE > trip_end_date  THEN 'completed'
    ELSE 'ongoing'
  END
  WHERE status != 'cancelled'
    AND status != (
      CASE
        WHEN CURRENT_DATE < trip_start_date THEN 'planned'
        WHEN CURRENT_DATE > trip_end_date  THEN 'completed'
        ELSE 'ongoing'
      END
    );
  $$
);

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
