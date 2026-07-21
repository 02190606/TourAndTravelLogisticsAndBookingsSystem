-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule send-alerts edge function daily at 12:20 PM
-- Replace YOUR_SERVICE_ROLE_KEY with your service_role key before running
SELECT cron.schedule(
  'send-alerts-daily',
  '20 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://ymjmqubbmeryqzolszvr.supabase.co/functions/v1/send-alerts',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);
