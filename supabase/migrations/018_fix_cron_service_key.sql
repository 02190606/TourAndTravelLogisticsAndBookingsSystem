-- Fix send-alerts cron job: replace placeholder service role key with the real one.
-- 1. Get your service_role key from Supabase Dashboard → Settings → API → service_role key
-- 2. Replace __YOUR_SERVICE_ROLE_KEY__ below with the actual key
-- 3. Run this in Supabase SQL Editor (or apply via supabase migration)

SELECT cron.unschedule('send-alerts-daily');

SELECT cron.schedule(
  'send-alerts-daily',
  '30 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://ymjmqubbmeryqzolszvr.supabase.co/functions/v1/send-alerts',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer __YOUR_SERVICE_ROLE_KEY__'
    )
  ) AS request_id;
  $$
);
