const { Client } = require('pg')
const dns = require('dns')

const resolver = new dns.Resolver()
resolver.setServers(['1.1.1.1', '8.8.8.8'])

const client = new Client({
  host: 'db.ymjmqubbmeryqzolszvr.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '2T6cljKYJESq6cbj',
  ssl: { rejectUnauthorized: false },
  lookup: (hostname, opts, cb) => {
    resolver.resolve6(hostname, (err, addrs) => {
      if (err || !addrs || addrs.length === 0) {
        resolver.resolve4(hostname, (err2, addrs4) => {
          if (err2 || !addrs4 || addrs4.length === 0) return cb(err || err2 || new Error('DNS failed'))
          cb(null, addrs4[0], 4)
        })
      } else {
        cb(null, addrs[0], 6)
      }
    })
  },
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
        WHEN CURRENT_DATE < trip_start_date THEN 'planned'
        WHEN CURRENT_DATE > trip_end_date  THEN 'completed'
        ELSE 'ongoing'
      END WHERE status != 'cancelled' AND status != (
        CASE WHEN CURRENT_DATE < trip_start_date THEN 'planned'
             WHEN CURRENT_DATE > trip_end_date  THEN 'completed'
             ELSE 'ongoing' END
      );$$
    )
  `)
  console.log('Trip status sync cron created (10:55 AM)')

  await client.query(`
    SELECT cron.schedule(
      'send-alerts-daily',
      '20 12 * * *',
      $$SELECT net.http_post(
        url:='https://ymjmqubbmeryqzolszvr.supabase.co/functions/v1/send-alerts',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ${serviceRoleKey}'
        )
      ) AS request_id;$$
    )
  `)
  console.log('Send-alerts cron created (12:00 PM)')

  await client.end()
  console.log('All done!')
}

run().catch(e => { console.error('Failed:', e.message, e.stack); process.exit(1) })
