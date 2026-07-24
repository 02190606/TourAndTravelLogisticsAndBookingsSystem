import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import nodemailer from 'npm:nodemailer@6.9.16'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)

const RECIPIENT_EMAILS = ['mugir2000@gmail.com']

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'mugir2000@gmail.com',
    pass: Deno.env.get('GMAIL_APP_PASSWORD')!,
  },
})

interface Alert {
  itemId: string
  stage: number
  label: string
  reg: string
  status: string
  date: string
  type: 'logistics' | 'trip'
  tripStart?: string
  tripEnd?: string
  destination?: string
  permitInfo?: string
}

function daysUntil(dateStr: string, today: Date): number {
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getUrgency(status: string): 'expired' | 'today' | 'upcoming' {
  const lower = status.toLowerCase()
  if (lower.includes('expired') || lower.includes('overdue') || lower.includes('ago')) return 'expired'
  if (lower.includes('today')) return 'today'
  return 'upcoming'
}

function groupByReg(alerts: Alert[]): { reg: string; alerts: Alert[] }[] {
  const map = new Map<string, Alert[]>()
  for (const a of alerts) {
    const existing = map.get(a.reg) || []
    existing.push(a)
    map.set(a.reg, existing)
  }
  return Array.from(map.entries()).map(([reg, alerts]) => ({ reg, alerts }))
}

function urgencyBadge(status: string): string {
  const u = getUrgency(status)
  if (u === 'expired') return 'background: #fef2f2; color: #b91c1c; border-left: 3px solid #ef4444;'
  if (u === 'today') return 'background: #fffbeb; color: #b45309; border-left: 3px solid #f59e0b;'
  return 'background: #eff6ff; color: #1d4ed8; border-left: 3px solid #3b82f6;'
}

function urgencyIcon(status: string): string {
  const u = getUrgency(status)
  if (u === 'expired') return '&#9888;&#65039;'
  if (u === 'today') return '&#128197;'
  return '&#128336;'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function tripDuration(start: string, end: string): number {
  return Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function tripUrgencyScore(a: Alert): number {
  const s = a.status.toLowerCase()
  if (s.includes('ago')) return 0
  if (s === 'starts today') return 1
  if (s === 'ends today') return 2
  if (s === 'trip in progress') return 3
  const m = s.match(/in (\d+) days?/)
  if (m) return 10 + parseInt(m[1])
  return 20
}

function tripBadgeStyle(a: Alert): string {
  const s = a.status.toLowerCase()
  if (s.includes('ago') || s === 'starts today') return 'background: #fef2f2; color: #b91c1c; border-left: 3px solid #ef4444;'
  if (s === 'ends today' || s === 'trip in progress') return 'background: #fff7ed; color: #c2410c; border-left: 3px solid #f97316;'
  return 'background: #eff6ff; color: #1d4ed8; border-left: 3px solid #3b82f6;'
}

function tripBadgeIcon(a: Alert): string {
  const s = a.status.toLowerCase()
  if (s.includes('ago') || s === 'starts today') return '&#128308;'
  if (s === 'ends today' || s === 'trip in progress') return '&#128992;'
  return '&#128309;'
}

function buildEmailHtml(alerts: Alert[]): string {
  const logistics = alerts.filter(a => a.type === 'logistics')
  const trips = alerts.filter(a => a.type === 'trip')
  const grouped = groupByReg(logistics)

  let sections = ''

  if (logistics.length > 0) {
    let logisticsHtml = ''
    for (const group of grouped) {
      const rows = group.alerts.map(a => `
        <tr>
          <td style="padding: 8px 12px; font-weight: 500; color: #334155; width: 120px;">${a.label}</td>
          <td style="padding: 8px 12px;">
            <span style="display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; ${urgencyBadge(a.status)}">${urgencyIcon(a.status)} ${a.status}</span>
          </td>
          <td style="padding: 8px 12px; color: #64748b; font-size: 13px; width: 100px;">${a.date}</td>
        </tr>`).join('')

      logisticsHtml += `
        <tr>
          <td colspan="3" style="padding: 10px 12px 4px 12px; font-weight: 700; color: #0f766e; font-size: 13px; border-bottom: 1px solid #e2e8f0;">
            &#128663; ${group.reg}
          </td>
        </tr>
        ${rows}`
    }

    sections += `
      <tr>
        <td colspan="3" style="padding: 16px 12px 8px 12px; font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #0f766e;">
          &#128663; Logistics Alerts (${logistics.length})
        </td>
      </tr>
      ${logisticsHtml}`
  }

  let tripTable = ''
  if (trips.length > 0) {
    const sorted = [...trips].sort((a, b) => tripUrgencyScore(a) - tripUrgencyScore(b))
    const tripRows = sorted.map(a => {
      const dates = `${formatDate(a.tripStart!)} - ${formatDate(a.tripEnd!)}`
      const dur = tripDuration(a.tripStart!, a.tripEnd!)
      const destHtml = a.destination ? `<div style="color: #64748b; font-size: 11px; margin-top: 2px;">&#128205; ${a.destination}</div>` : ''
      const permitHtml = a.permitInfo ? `<div style="color: #64748b; font-size: 11px; margin-top: 1px;">&#128220; ${a.permitInfo}</div>` : ''
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b; font-size: 13px;">
            ${a.reg}
            ${destHtml}
            ${permitHtml}
          </td>
          <td style="padding: 10px 12px; color: #475569; font-size: 13px;">${dates}</td>
          <td style="padding: 10px 12px; color: #475569; font-size: 13px; text-align: center;">${dur} days</td>
          <td style="padding: 10px 12px;">
            <span style="display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; ${tripBadgeStyle(a)}">${tripBadgeIcon(a)} ${a.status}</span>
          </td>
        </tr>`
    }).join('')

    tripTable = `
      <div style="margin-top: 16px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          <thead>
            <tr>
              <td colspan="4" style="padding: 16px 12px 8px 12px; font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #0f766e;">
                &#129521; Trip Alerts (${trips.length})
              </td>
            </tr>
            <tr style="background: #f0fdfa;">
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #0f766e; letter-spacing: 0.05em; border-bottom: 2px solid #0f766e;">Client / Destination</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #0f766e; letter-spacing: 0.05em; border-bottom: 2px solid #0f766e;">Trip Dates</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #0f766e; letter-spacing: 0.05em; border-bottom: 2px solid #0f766e;">Duration</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #0f766e; letter-spacing: 0.05em; border-bottom: 2px solid #0f766e;">Alert</th>
            </tr>
          </thead>
          <tbody>
            ${tripRows}
          </tbody>
        </table>
      </div>`
  }

  const total = alerts.length

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #0F766E; padding: 24px 28px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">SafariTour Alerts</h1>
        <p style="color: #ccfbf1; margin: 4px 0 0 0; font-size: 13px;">Daily compliance &amp; trip notifications</p>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px 28px 24px 28px; border-radius: 0 0 12px 12px;">
        <p style="color: #475569; margin: 0 0 16px 0; font-size: 14px;">
          You have <strong style="color: #0f766e;">${total}</strong> pending alert${total !== 1 ? 's' : ''}:
        </p>
        ${logistics.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 6px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Item</th>
              <th style="padding: 6px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Status</th>
              <th style="padding: 6px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${sections}
          </tbody>
        </table>
        ` : ''}
        ${tripTable}
        <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0 0;">Log in to SafariTour to acknowledge these alerts.</p>
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
    .select('*, vehicles!left(registration_number, driving_permit, permit_expiry_date), drivers!left(full_name)')
    .in('status', ['planned', 'ongoing'])

  const { data: sentAlertsRows } = await supabase.from('sent_alerts').select('*')
  const sentKey = new Set(sentAlertsRows?.map(s => `${s.user_id}:${s.alert_item_id}:${s.stage}`) || [])

  const docChecks: [string, string, string][] = [
    ['permit_expiry_date', 'permit', 'Permit'],
    ['insurance_expiry', 'insurance', 'Insurance'],
    ['pmo_expiry', 'pmo', 'PMO'],
    ['psv_expiry', 'psv', 'PSV'],
  ]

  const emailsToSend: { email: string; alerts: Alert[] }[] = []

  for (const user of users) {
    if (RECIPIENT_EMAILS.includes(user.email)) continue

    const userAlerts: Alert[] = []

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

          if (diff <= 0 && !sentKey.has(`${user.id}:${itemId}:4`)) {
            userAlerts.push({ itemId, stage: 4, label, reg: v.registration_number, status: diff === 0 ? 'Expires today' : `Expired ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`, date: dateStr, type: 'logistics' })
          } else if (diff <= 3 && diff > 0 && !sentKey.has(`${user.id}:${itemId}:3`)) {
            userAlerts.push({ itemId, stage: 3, label, reg: v.registration_number, status: `Expires in ${diff} day${diff === 1 ? '' : 's'} — urgent`, date: dateStr, type: 'logistics' })
          } else if (diff <= 7 && diff > 3 && !sentKey.has(`${user.id}:${itemId}:2`)) {
            userAlerts.push({ itemId, stage: 2, label, reg: v.registration_number, status: `Expires in ${diff} days — renew soon`, date: dateStr, type: 'logistics' })
          } else if (diff <= 14 && diff > 7 && !sentKey.has(`${user.id}:${itemId}:1`)) {
            userAlerts.push({ itemId, stage: 1, label, reg: v.registration_number, status: `Expires in ${diff} days`, date: dateStr, type: 'logistics' })
          }
        }
        }
      }
    }

    if (isLogistics && services) {
      for (const s of services) {
        if (!s.next_service_date) continue

        const diff = daysUntil(s.next_service_date, today)
        const itemId = `service-${s.id}`

        if (diff <= 0 && !sentKey.has(`${user.id}:${itemId}:4`)) {
          userAlerts.push({ itemId, stage: 4, label: 'Service', reg: s.vehicles.registration_number, status: diff === 0 ? 'Due today' : `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`, date: s.next_service_date, type: 'logistics' })
        } else if (diff <= 3 && diff > 0 && !sentKey.has(`${user.id}:${itemId}:3`)) {
          userAlerts.push({ itemId, stage: 3, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} day${diff === 1 ? '' : 's'} — urgent`, date: s.next_service_date, type: 'logistics' })
        } else if (diff <= 7 && diff > 3 && !sentKey.has(`${user.id}:${itemId}:2`)) {
          userAlerts.push({ itemId, stage: 2, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} days — renew soon`, date: s.next_service_date, type: 'logistics' })
        } else if (diff <= 14 && diff > 7 && !sentKey.has(`${user.id}:${itemId}:1`)) {
          userAlerts.push({ itemId, stage: 1, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} days`, date: s.next_service_date, type: 'logistics' })
        }
      }
    }

    if (isTrips && trips) {
      for (const t of trips) {
        if (!t.trip_start_date || !t.trip_end_date) continue

        const startDiff = daysUntil(t.trip_start_date, today)
        const endDiff = daysUntil(t.trip_end_date, today)

        const tripPermitInfo = t.vehicles?.driving_permit
          ? `${t.vehicles.driving_permit}${t.vehicles.permit_expiry_date ? ` (exp ${t.vehicles.permit_expiry_date})` : ''}`
          : ''

        if (startDiff === 14 && !sentKey.has(`${user.id}:trip_start-${t.id}:1`)) {
          userAlerts.push({ itemId: `trip_start-${t.id}`, stage: 1, label: 'Trip Start', reg: t.client_name, status: 'Starts in 14 days', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (startDiff === 7 && !sentKey.has(`${user.id}:trip_start-${t.id}:1`)) {
          userAlerts.push({ itemId: `trip_start-${t.id}`, stage: 1, label: 'Trip Start', reg: t.client_name, status: 'Starts in 7 days', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (startDiff === 2 && !sentKey.has(`${user.id}:trip_start-${t.id}:2`)) {
          userAlerts.push({ itemId: `trip_start-${t.id}`, stage: 2, label: 'Trip Start', reg: t.client_name, status: 'Starts in 2 days', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (startDiff === 0 && !sentKey.has(`${user.id}:trip_start-${t.id}:3`)) {
          userAlerts.push({ itemId: `trip_start-${t.id}`, stage: 3, label: 'Trip Start', reg: t.client_name, status: 'Starts today', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        }

        if (startDiff < 0 && endDiff > 0 && !sentKey.has(`${user.id}:trip_ongoing-${t.id}:2`)) {
          userAlerts.push({ itemId: `trip_ongoing-${t.id}`, stage: 2, label: 'Trip', reg: t.client_name, status: 'Trip in progress', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        }

        if (endDiff === 2 && !sentKey.has(`${user.id}:trip_end-${t.id}:2`)) {
          userAlerts.push({ itemId: `trip_end-${t.id}`, stage: 2, label: 'Trip End', reg: t.client_name, status: 'Ends in 2 days', date: t.trip_end_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (endDiff === 0 && !sentKey.has(`${user.id}:trip_end-${t.id}:3`)) {
          userAlerts.push({ itemId: `trip_end-${t.id}`, stage: 3, label: 'Trip End', reg: t.client_name, status: 'Ends today', date: t.trip_end_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        }
      }
    }

    if (userAlerts.length > 0) {
      emailsToSend.push({ email: user.email, alerts: userAlerts })
    }
  }

  for (const email of RECIPIENT_EMAILS) {
    const recipientUserId = users?.find(u => u.email === email)?.id || email
    const recipientAlerts: Alert[] = []

    if (vehicles) {
      for (const v of vehicles) {
        if (v.status === 'sold') continue
        for (const [field, type, label] of docChecks) {
          const dateStr = v[field as keyof typeof v] as string | undefined
          if (!dateStr) continue
          const diff = daysUntil(dateStr, today)
          const itemId = `${type}-${v.id}`
          if (diff <= 0 && !sentKey.has(`${recipientUserId}:${itemId}:4`)) {
            recipientAlerts.push({ itemId, stage: 4, label, reg: v.registration_number, status: diff === 0 ? 'Expires today' : `Expired ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`, date: dateStr, type: 'logistics' })
          } else if (diff <= 3 && diff > 0 && !sentKey.has(`${recipientUserId}:${itemId}:3`)) {
            recipientAlerts.push({ itemId, stage: 3, label, reg: v.registration_number, status: `Expires in ${diff} day${diff === 1 ? '' : 's'} — urgent`, date: dateStr, type: 'logistics' })
          } else if (diff <= 7 && diff > 3 && !sentKey.has(`${recipientUserId}:${itemId}:2`)) {
            recipientAlerts.push({ itemId, stage: 2, label, reg: v.registration_number, status: `Expires in ${diff} days — renew soon`, date: dateStr, type: 'logistics' })
          } else if (diff <= 14 && diff > 7 && !sentKey.has(`${recipientUserId}:${itemId}:1`)) {
            recipientAlerts.push({ itemId, stage: 1, label, reg: v.registration_number, status: `Expires in ${diff} days`, date: dateStr, type: 'logistics' })
          }
        }
      }
    }

    if (services) {
      for (const s of services) {
        if (!s.next_service_date) continue
        const diff = daysUntil(s.next_service_date, today)
        const itemId = `service-${s.id}`
        if (diff <= 0 && !sentKey.has(`${recipientUserId}:${itemId}:4`)) {
          recipientAlerts.push({ itemId, stage: 4, label: 'Service', reg: s.vehicles.registration_number, status: diff === 0 ? 'Due today' : `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`, date: s.next_service_date, type: 'logistics' })
        } else if (diff <= 3 && diff > 0 && !sentKey.has(`${recipientUserId}:${itemId}:3`)) {
          recipientAlerts.push({ itemId, stage: 3, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} day${diff === 1 ? '' : 's'} — urgent`, date: s.next_service_date, type: 'logistics' })
        } else if (diff <= 7 && diff > 3 && !sentKey.has(`${recipientUserId}:${itemId}:2`)) {
          recipientAlerts.push({ itemId, stage: 2, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} days — renew soon`, date: s.next_service_date, type: 'logistics' })
        } else if (diff <= 14 && diff > 7 && !sentKey.has(`${recipientUserId}:${itemId}:1`)) {
          recipientAlerts.push({ itemId, stage: 1, label: 'Service', reg: s.vehicles.registration_number, status: `Due in ${diff} days`, date: s.next_service_date, type: 'logistics' })
        }
      }
    }

    if (trips) {
      for (const t of trips) {
        if (!t.trip_start_date || !t.trip_end_date) continue

        const startDiff = daysUntil(t.trip_start_date, today)
        const endDiff = daysUntil(t.trip_end_date, today)

        const tripPermitInfo = t.vehicles?.driving_permit
          ? `${t.vehicles.driving_permit}${t.vehicles.permit_expiry_date ? ` (exp ${t.vehicles.permit_expiry_date})` : ''}`
          : ''

        if (startDiff === 14 && !sentKey.has(`${recipientUserId}:trip_start-${t.id}:1`)) {
          recipientAlerts.push({ itemId: `trip_start-${t.id}`, stage: 1, label: 'Trip Start', reg: t.client_name, status: 'Starts in 14 days', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (startDiff === 7 && !sentKey.has(`${recipientUserId}:trip_start-${t.id}:1`)) {
          recipientAlerts.push({ itemId: `trip_start-${t.id}`, stage: 1, label: 'Trip Start', reg: t.client_name, status: 'Starts in 7 days', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (startDiff === 2 && !sentKey.has(`${recipientUserId}:trip_start-${t.id}:2`)) {
          recipientAlerts.push({ itemId: `trip_start-${t.id}`, stage: 2, label: 'Trip Start', reg: t.client_name, status: 'Starts in 2 days', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (startDiff === 0 && !sentKey.has(`${recipientUserId}:trip_start-${t.id}:3`)) {
          recipientAlerts.push({ itemId: `trip_start-${t.id}`, stage: 3, label: 'Trip Start', reg: t.client_name, status: 'Starts today', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        }

        if (startDiff < 0 && endDiff > 0 && !sentKey.has(`${recipientUserId}:trip_ongoing-${t.id}:2`)) {
          recipientAlerts.push({ itemId: `trip_ongoing-${t.id}`, stage: 2, label: 'Trip', reg: t.client_name, status: 'Trip in progress', date: t.trip_start_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        }

        if (endDiff === 2 && !sentKey.has(`${recipientUserId}:trip_end-${t.id}:2`)) {
          recipientAlerts.push({ itemId: `trip_end-${t.id}`, stage: 2, label: 'Trip End', reg: t.client_name, status: 'Ends in 2 days', date: t.trip_end_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        } else if (endDiff === 0 && !sentKey.has(`${recipientUserId}:trip_end-${t.id}:3`)) {
          recipientAlerts.push({ itemId: `trip_end-${t.id}`, stage: 3, label: 'Trip End', reg: t.client_name, status: 'Ends today', date: t.trip_end_date, type: 'trip', tripStart: t.trip_start_date, tripEnd: t.trip_end_date, destination: t.destination || '', permitInfo: tripPermitInfo })
        }
      }
    }

    if (recipientAlerts.length > 0) {
      emailsToSend.unshift({ email, alerts: recipientAlerts })
    }
  }

  let sent = 0
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')
  if (!gmailAppPassword) {
    errors.push('GMAIL_APP_PASSWORD not configured')
  }

  for (const { email, alerts } of emailsToSend) {
    if (!gmailAppPassword) break

    const userRole = users?.find(u => u.email === email)?.role
    const filteredAlerts = userRole === 'admin' ? alerts
      : userRole === 'logistics' ? alerts.filter(a => a.type === 'logistics')
      : userRole === 'trips' ? alerts.filter(a => a.type === 'trip')
      : alerts
    if (filteredAlerts.length === 0) continue

    const urgentCount = filteredAlerts.filter(a => a.stage >= 2).length
    const subject = urgentCount > 0
      ? `SafariTour - ${urgentCount} urgent alert${urgentCount > 1 ? 's' : ''} need attention`
      : `SafariTour - ${filteredAlerts.length} upcoming alert${filteredAlerts.length > 1 ? 's' : ''}`

    try {
      await transporter.sendMail({
        from: '"SafariTour Alerts" <mugir2000@gmail.com>',
        to: email,
        subject,
        html: buildEmailHtml(filteredAlerts),
      })

      sent++
      const rows = filteredAlerts.map(a => ({
        user_id: users?.find(u => u.email === email)?.id || email,
        alert_item_id: a.itemId,
        stage: a.stage,
      })).filter(r => r.user_id)

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('sent_alerts').insert(rows)
        if (insertError) errors.push(`tracking insert: ${insertError.message}`)
      }

      const ackRows = filteredAlerts.map(a => ({
        user_id: users?.find(u => u.email === email)?.id || email,
        alert_id: a.itemId,
      })).filter(r => r.user_id)

      if (ackRows.length > 0) {
        const { error: ackError } = await supabase
          .from('acknowledged_alerts')
          .upsert(ackRows, { onConflict: 'user_id,alert_id', ignoreDuplicates: true })
        if (ackError) errors.push(`acknowledge insert: ${ackError.message}`)
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