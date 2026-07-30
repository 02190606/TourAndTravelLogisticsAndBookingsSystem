const { Client } = require('pg')

const client = new Client({
  host: 'db.ymjmqubbmeryqzolszvr.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '2T6cljKYJESq6cbj',
  ssl: { rejectUnauthorized: false },
})

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltam1xdWJibWVyeXF6b2xzenZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM4NTc3MCwiZXhwIjoyMDk3OTYxNzcwfQ.18uxZKglZuVSoZQYtVQ2HEwWLyXjvogBiVgbIF3kX-8'

async function run() {
  await client.connect()
  console.log('Connected to Supabase DB')

  await client.query('CREATE EXTENSION IF NOT EXISTS pg_cron')
  await client.query('CREATE EXTENSION IF NOT EXISTS pg_net')
  console.log('Extensions ensured')

  await client.query("SELECT cron.unschedule('send-alerts-daily')")
  await client.query("SELECT cron.unschedule('sync-trip-statuses-daily')")
  console.log('Old cron jobs removed')

  await client.query(`
    SELECT cron.schedule(
      'sync-trip-statuses-daily',
      '55 10 * * *',
      $$UPDATE trips SET status = CASE
        WHEN (now() AT TIME ZONE 'Africa/Kampala')::date < trip_start_date THEN 'planned'
        WHEN (now() AT TIME ZONE 'Africa/Kampala')::date > trip_end_date   THEN 'completed'
        ELSE 'ongoing'
      END WHERE status != 'cancelled' AND status != (
        CASE WHEN (now() AT TIME ZONE 'Africa/Kampala')::date < trip_start_date THEN 'planned'
             WHEN (now() AT TIME ZONE 'Africa/Kampala')::date > trip_end_date   THEN 'completed'
             ELSE 'ongoing' END
      );$$
    )
  `)
  console.log('Trip status sync cron created (10:55 AM UTC / 1:55 PM EAT)')

  await client.query(`
    SELECT cron.schedule(
      'send-alerts-daily',
      '0 9 * * *',
      $$SELECT net.http_post(
        url:='https://ymjmqubbmeryqzolszvr.supabase.co/functions/v1/send-alerts',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ${serviceRoleKey}'
        ),
        timeout_milliseconds:=30000
      ) AS request_id;$$
    )
  `)
  console.log('Send-alerts cron created (9:00 AM UTC / 12:00 PM EAT)')

  await client.end()
  console.log('All done!')
}

run().catch(e => { console.error('Failed:', e.message, e.stack); process.exit(1) })