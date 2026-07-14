-- Daily sweep: update stored trip statuses so send-alerts Edge Function
-- (and any SQL queries) stay accurate. Runs at 10:55 AM, 5 min before send-alerts.
-- Only touches non-cancelled trips (cancelled is manual-only, never overridden).

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

SELECT cron.schedule(
  'sync-trip-statuses-daily',
  '55 10 * * *',
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
