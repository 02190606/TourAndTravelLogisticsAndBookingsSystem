import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import nodemailer from 'npm:nodemailer@6.9.16'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)

const PRIMARY_RECIPIENT_EMAIL = 'mugir2000@gmail.com'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'mugir2000@gmail.com',
    pass: Deno.env.get('GMAIL_APP_PASSWORD')!,
  },
})

function daysUntil(dateStr: string, today: Date): number {
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function buildEmailHtml(alerts: { label: string; reg: string; status: string; date: string; stage: number }[]): string {
  const rows = alerts.map(a => {
    const isUrgent = a.stage === 2
    const badgeBg = isUrgent ? 'background: #fef2f2; color: #b91c1c;' : 'background: #fffbeb; color: #b45309;'
    return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${a.label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${a.reg}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; ${badgeBg}">${a.status}</span></td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${a.date}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${isUrgent ? '⚠️ URGENT' : 'Reminder'}</td>
      </tr>`
  }).join('')

  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: #0F766E; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">SafariTour Alerts</h1>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #475569;">You have <strong>${alerts.length}</strong> pending alert${alerts.length > 1 ? 's' : ''}:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Item</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Vehicle/Client</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Status</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Date</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Type</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">Log in to SafariTour to acknowledge these alerts.</p>
      </div>
    </div>`
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  if (token !== Deno.env.get('SERVICE_ROLE_KEY')) {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    const { data: caller } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (!caller || caller.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admins only' }), { status: 403 })
    }
  }

  const today = new Date()
  const errors: string[] = []

  const { data: users } = await supabase.from('users').select('id, email, role').eq('is_active', true)
  if (!users || users.length === 0) {
    return new Response(JSON.stringify({ alerts_found: 0, emails_sent: 0, users_found: 0, errors: [] }))
  }

  const { data: vehicles } = await supabase.from('vehicles').select('*')

  const { data: services } = await supabase
    .from('service_records')
    .select('*, vehicles!inner(registration_number)')
    .not('next_service_date', 'is', null)

  const { data: trips } = await supabase
    .from('trips')
    .select('*, vehicles!left(registration_number), drivers!left(full_name)')
    .in('status', ['planned', 'ongoing'])

  const { data: sentAlertsRows } = await supabase.from('sent_alerts').select('*')
  const sentKey = new Set(sentAlertsRows?.map(s => `${s.user_id}:${s.alert_item_id}:${s.stage}`) || [])

  const docChecks: [string, string, string][] = [
    ['permit_expiry_date', 'permit', 'Permit'],
    ['insurance_expiry', 'insurance', 'Insurance'],
    ['pmo_expiry', 'pmo', 'PMO'],
    ['psv_expiry', 'psv', 'PSV'],
  ]

  const emailsToSend: { email: string; alerts: { itemId: string; stage: number; label: string; reg: string; status: string; date: string }[] }[] = []

  for (const user of users) {
    if (user.email === PRIMARY_RECIPIENT_EMAIL) continue

    const userAlerts: { itemId: string; stage: number; label: string; reg: string; status: string; date: string }[] = []

    const isLogistics = user.role === 'admin' || user.role === 'logistics'
    const isTrips = user.role === 'admin' || user.role === 'trips'

    if (isLogistics && vehicles) {
      for (const v of vehicles) {
        if (v.status === 'sold') continue

        for (const [field, type, label] of docChecks) {
          const dateStr = v[field as keyof typeof v] as string | undefined
          if (!dateStr) continue

          const diff = daysUntil(dateStr, today)
          const itemId = `${type}-${v.id}`

          if (diff >= 6 && diff <= 7 && !sentKey.has(`${user.id}:${itemId}:1`)) {
            userAlerts.push({ itemId, stage: 1, label, reg: v.registration_number, status: `Expires in ${diff} days`, date: dateStr })
          }
          if (diff <= 2 && !sentKey.has(`${user.id}:${itemId}:2`)) {
            const urgentLabel = diff <= 0 ? 'EXPIRED' : `Expires in ${diff} day(s)`
            userAlerts.push({ itemId, stage: 2, label, reg: v.registration_number, status: urgentLabel, date: dateStr })
          }
        }
      }
    }

    if (isLogistics && services) {
      for (const s of services) {
        if (!s.next_service_date) continue

        const diff = daysUntil(s.next_service_date, today)
        const itemId = `service-${s.id}`

        if (diff >= 6 && diff <= 7 && !sentKey.has(`${user.id}:${itemId}:1`)) {
          userAlerts.push({ itemId, stage: 1, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} days`, date: s.next_service_date })
        }
        if (diff <= 2 && !sentKey.has(`${user.id}:${itemId}:2`)) {
          const urgentLabel = diff <= 0 ? 'OVERDUE' : `Due in ${diff} day(s)`
          userAlerts.push({ itemId, stage: 2, label: 'Service', reg: s.vehicles.registration_number, status: urgentLabel, date: s.next_service_date })
        }
      }
    }

    if (isTrips && trips) {
      for (const t of trips) {
        if (t.trip_start_date) {
          const diff = daysUntil(t.trip_start_date, today)
          const itemId = `trip_start-${t.id}`

          if (diff >= 6 && diff <= 7 && !sentKey.has(`${user.id}:${itemId}:1`)) {
            userAlerts.push({ itemId, stage: 1, label: 'Trip Start', reg: t.client_name, status: `In ${diff} days`, date: t.trip_start_date })
          }
          if (diff <= 2 && !sentKey.has(`${user.id}:${itemId}:2`)) {
            const urgentLabel = diff <= 0 ? 'Started today' : `Starts in ${diff} day(s)`
            userAlerts.push({ itemId, stage: 2, label: 'Trip Start', reg: t.client_name, status: urgentLabel, date: t.trip_start_date })
          }
        }

        if (t.trip_end_date) {
          const diff = daysUntil(t.trip_end_date, today)
          const itemId = `trip_end-${t.id}`

          if (diff >= 6 && diff <= 7 && !sentKey.has(`${user.id}:${itemId}:1`)) {
            userAlerts.push({ itemId, stage: 1, label: 'Trip End', reg: t.client_name, status: `In ${diff} days`, date: t.trip_end_date })
          }
          if (diff <= 2 && !sentKey.has(`${user.id}:${itemId}:2`)) {
            const urgentLabel = diff <= 0 ? 'Ended today' : `Ends in ${diff} day(s)`
            userAlerts.push({ itemId, stage: 2, label: 'Trip End', reg: t.client_name, status: urgentLabel, date: t.trip_end_date })
          }
        }
      }
    }

    if (userAlerts.length > 0) {
      emailsToSend.push({ email: user.email, alerts: userAlerts })
    }
  }

  const primaryUserId = users?.find(u => u.email === PRIMARY_RECIPIENT_EMAIL)?.id
  const primaryAlerts: { itemId: string; stage: number; label: string; reg: string; status: string; date: string }[] = []

  if (vehicles) {
    for (const v of vehicles) {
      if (v.status === 'sold') continue
      for (const [field, type, label] of docChecks) {
        const dateStr = v[field as keyof typeof v] as string | undefined
        if (!dateStr) continue
        const diff = daysUntil(dateStr, today)
        const itemId = `${type}-${v.id}`
        if (diff >= 6 && diff <= 7 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:1`)) {
          primaryAlerts.push({ itemId, stage: 1, label, reg: v.registration_number, status: `Expires in ${diff} days`, date: dateStr })
        }
        if (diff <= 2 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:2`)) {
          const urgentLabel = diff <= 0 ? 'EXPIRED' : `Expires in ${diff} day(s)`
          primaryAlerts.push({ itemId, stage: 2, label, reg: v.registration_number, status: urgentLabel, date: dateStr })
        }
      }
    }
  }

  if (services) {
    for (const s of services) {
      if (!s.next_service_date) continue
      const diff = daysUntil(s.next_service_date, today)
      const itemId = `service-${s.id}`
      if (diff >= 6 && diff <= 7 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:1`)) {
        primaryAlerts.push({ itemId, stage: 1, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} days`, date: s.next_service_date })
      }
      if (diff <= 2 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:2`)) {
        const urgentLabel = diff <= 0 ? 'OVERDUE' : `Due in ${diff} day(s)`
        primaryAlerts.push({ itemId, stage: 2, label: 'Service', reg: s.vehicles.registration_number, status: urgentLabel, date: s.next_service_date })
      }
    }
  }

  if (trips) {
    for (const t of trips) {
      if (t.trip_start_date) {
        const diff = daysUntil(t.trip_start_date, today)
        const itemId = `trip_start-${t.id}`
        if (diff >= 6 && diff <= 7 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:1`)) {
          primaryAlerts.push({ itemId, stage: 1, label: 'Trip Start', reg: t.client_name, status: `In ${diff} days`, date: t.trip_start_date })
        }
        if (diff <= 2 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:2`)) {
          const urgentLabel = diff <= 0 ? 'Started today' : `Starts in ${diff} day(s)`
          primaryAlerts.push({ itemId, stage: 2, label: 'Trip Start', reg: t.client_name, status: urgentLabel, date: t.trip_start_date })
        }
      }
      if (t.trip_end_date) {
        const diff = daysUntil(t.trip_end_date, today)
        const itemId = `trip_end-${t.id}`
        if (diff >= 6 && diff <= 7 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:1`)) {
          primaryAlerts.push({ itemId, stage: 1, label: 'Trip End', reg: t.client_name, status: `In ${diff} days`, date: t.trip_end_date })
        }
        if (diff <= 2 && !sentKey.has(`${primaryUserId || 'primary'}:${itemId}:2`)) {
          const urgentLabel = diff <= 0 ? 'Ended today' : `Ends in ${diff} day(s)`
          primaryAlerts.push({ itemId, stage: 2, label: 'Trip End', reg: t.client_name, status: urgentLabel, date: t.trip_end_date })
        }
      }
    }
  }

  if (primaryAlerts.length > 0) {
    emailsToSend.unshift({ email: PRIMARY_RECIPIENT_EMAIL, alerts: primaryAlerts })
  }

  let sent = 0
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')
  if (!gmailAppPassword) {
    errors.push('GMAIL_APP_PASSWORD not configured')
  }

  for (const { email, alerts } of emailsToSend) {
    if (!gmailAppPassword) break

    const stage2Count = alerts.filter(a => a.stage === 2).length
    const subject = stage2Count > 0
      ? `SafariTour — ${stage2Count} urgent alert${stage2Count > 1 ? 's' : ''} need attention`
      : `SafariTour — ${alerts.length} upcoming alert${alerts.length > 1 ? 's' : ''}`

    try {
      await transporter.sendMail({
        from: '"SafariTour Alerts" <mugir2000@gmail.com>',
        to: email,
        subject,
        html: buildEmailHtml(alerts),
      })

      sent++
      const rows = alerts.map(a => ({
        user_id: email === PRIMARY_RECIPIENT_EMAIL ? (primaryUserId || '') : (users?.find(u => u.email === email)?.id || ''),
        alert_item_id: a.itemId,
        stage: a.stage,
      })).filter(r => r.user_id)

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('sent_alerts').insert(rows)
        if (insertError) errors.push(`tracking insert: ${insertError.message}`)
      }
    } catch (err) {
      errors.push(`${email}: ${err.message}`)
    }
  }

  return new Response(
    JSON.stringify({
      alerts_found: emailsToSend.reduce((s, e) => s + e.alerts.length, 0),
      emails_sent: sent,
      users_found: users.length,
      vehicles_found: vehicles?.length || 0,
      errors,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
