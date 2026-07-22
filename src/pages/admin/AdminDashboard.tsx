import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, StatCard, CardSkeleton } from '@/components/common'
import { BarChart } from '@/components/charts/BarChart'
import { formatUGX, formatDate, computeTripStatus, isActiveTrip } from '@/utils'
import type { Trip, Vehicle, Complaint, Penalty } from '@/types'

interface ExpiryItem {
  reg: string
  doc: string
  label: string
  variant: 'danger' | 'warning'
}

function computeExpiry(date: string | null | undefined, label: string, reg: string): ExpiryItem | null {
  if (!date) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(date)
  const expiry = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return { reg, doc: label, label: diff === -1 ? 'Expired yesterday' : `Expired ${Math.abs(diff)}d ago`, variant: 'danger' }
  if (diff === 0) return { reg, doc: label, label: 'Expires today', variant: 'danger' }
  if (diff <= 7) return { reg, doc: label, label: `Expires in ${diff}d`, variant: 'warning' }
  return null
}

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [tripsRes, vehiclesRes, driversRes, complaintsRes, penaltiesRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('drivers').select('is_active'),
        supabase.from('complaints').select('*, vehicles!left(registration_number), drivers!left(full_name)').eq('status', 'open').order('date_filed', { ascending: false }).limit(5),
        supabase.from('penalties').select('*, vehicles!left(registration_number), drivers!left(full_name)').eq('status', 'unpaid').order('date_issued', { ascending: false }).limit(5),
      ])

      const trips = (tripsRes.data || []) as Trip[]
      const vehicles = (vehiclesRes.data || []) as Vehicle[]
      const drivers = driversRes.data || []
      const openComplaints = (complaintsRes.data || []) as (Complaint & { vehicles?: { registration_number: string }; drivers?: { full_name: string } })[]
      const openPenalties = (penaltiesRes.data || []) as (Penalty & { vehicles?: { registration_number: string }; drivers?: { full_name: string } })[]

      const planned = trips.filter(t => computeTripStatus(t) === 'planned').length
      const ongoing = trips.filter(t => computeTripStatus(t) === 'ongoing').length
      const endsToday = trips.filter(t => computeTripStatus(t) === 'ends_today').length
      const completed = trips.filter(t => computeTripStatus(t) === 'completed').length
      const cancelled = trips.filter(t => computeTripStatus(t) === 'cancelled').length
      const activeTrips = planned + ongoing + endsToday

      const thisMonth = new Date().getMonth()
      const thisYear = new Date().getFullYear()
      const monthlyRevenue = trips
        .filter(t => isActiveTrip(t) && new Date(t.trip_start_date).getMonth() === thisMonth && new Date(t.trip_start_date).getFullYear() === thisYear)
        .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)
      const yearlyRevenue = trips
        .filter(t => isActiveTrip(t) && new Date(t.trip_start_date).getFullYear() === thisYear)
        .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

      const upcomingTrips = trips
        .filter(t => { const s = computeTripStatus(t); return s === 'planned' || s === 'ongoing' || s === 'ends_today' })
        .sort((a, b) => new Date(a.trip_start_date).getTime() - new Date(b.trip_start_date).getTime())
        .slice(0, 5)

      const available = vehicles.filter(v => v.status === 'available').length
      const onTrip = vehicles.filter(v => v.status === 'on_trip').length
      const inService = vehicles.filter(v => v.status === 'in_service').length
      const totalDrivers = drivers.length

      const expiring: ExpiryItem[] = []
      for (const v of vehicles) {
        const reg = v.registration_number
        const items = [
          computeExpiry(v.permit_expiry_date, 'Permit', reg),
          computeExpiry(v.insurance_expiry, 'Insurance', reg),
          computeExpiry(v.pmo_expiry, 'PMO', reg),
          computeExpiry(v.psv_expiry, 'PSV', reg),
        ]
        for (const item of items) { if (item) expiring.push(item) }
      }

      return {
        trips: { planned, ongoing, endsToday, completed, cancelled, activeTrips, monthlyRevenue, yearlyRevenue, total: trips.length, upcomingTrips },
        fleet: { total: vehicles.length, available, onTrip, inService, totalDrivers, openComplaints, openPenalties, expiring },
      }
    },
  })

  if (isLoading || !stats) return <CardSkeleton count={4} />

  const { trips, fleet } = stats

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Admin Dashboard" subtitle="Fleet, trips, and revenue at a glance" />

      {/* ═══════════════ TRIPS ═══════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-display text-lg sm:text-xl font-bold text-primary">Trips</h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">
          <StatCard title="Active Trips" value={trips.activeTrips} icon={<Icon name="plane" />} color="success" subtitle="Planned + ongoing" />
          <StatCard title="Completed" value={trips.completed} icon={<Icon name="check" />} color="primary" />
          <StatCard title="Cancelled" value={trips.cancelled} icon={<Icon name="x" />} color="danger" />
          <StatCard title="Revenue (Month)" value={formatUGX(trips.monthlyRevenue)} icon={<Icon name="cash" />} color="secondary" />
          <StatCard title="Revenue (Year)" value={formatUGX(trips.yearlyRevenue)} icon={<Icon name="trend" />} color="primary" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200/80 bg-white p-3 sm:p-5 shadow-sm">
            <div className="mb-2 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-950">Trip Status</h3>
              <p className="text-xs text-text-secondary">
                {trips.total > 0 ? 'Distribution across all bookings' : 'No trip data yet — bookings will appear here'}
              </p>
            </div>
            <BarChart
              height={200}
              data={[
                { name: 'Planned', value: trips.planned, color: '#3B82F6' },
                { name: 'Ongoing', value: trips.ongoing, color: '#10B981' },
                { name: 'Ends Today', value: trips.endsToday, color: '#F59E0B' },
                { name: 'Completed', value: trips.completed, color: '#94A3B8' },
                { name: 'Cancelled', value: trips.cancelled, color: '#EF4444' },
              ]}
            />
          </section>

          <section className="rounded-lg border border-slate-200/80 bg-white p-3 sm:p-5 shadow-sm">
            <div className="mb-2 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-950">Upcoming Trips</h3>
              <p className="text-xs text-text-secondary">Next planned or ongoing client movements</p>
            </div>
            {trips.upcomingTrips.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-2 text-sm font-medium text-text-secondary">No upcoming trips</p>
                <p className="text-xs text-text-secondary/70">Create a trip to see it here</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {trips.upcomingTrips.map(trip => (
                  <div key={trip.id} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {trip.client_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-950">{trip.client_name}</p>
                      <p className="text-xs text-text-secondary">
                        {formatDate(trip.trip_start_date)} — {formatDate(trip.trip_end_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ═══════════════ LOGISTICS ════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-display text-lg sm:text-xl font-bold text-primary">Logistics</h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">
          <StatCard title="Fleet Size" value={fleet.total} icon={<Icon name="vehicle" />} color="primary" />
          <StatCard title="Available" value={fleet.available} icon={<Icon name="check" />} color="success" />
          <StatCard title="On Trip" value={fleet.onTrip} icon={<Icon name="route" />} color="warning" />
          <StatCard title="Total Drivers" value={fleet.totalDrivers} icon={<Icon name="user" />} color="info" />
          <StatCard title="Open Issues" value={fleet.openComplaints.length + fleet.openPenalties.length} icon={<Icon name="alert" />} color={fleet.openComplaints.length + fleet.openPenalties.length > 0 ? 'danger' : 'success'} subtitle={`${fleet.openComplaints.length} complaints, ${fleet.openPenalties.length} penalties`} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200/80 bg-white p-3 sm:p-5 shadow-sm">
            <div className="mb-2 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-950">Fleet Status</h3>
              <p className="text-xs text-text-secondary">
                {fleet.total > 0 ? 'Operational mix across the fleet' : 'No vehicle data yet — add vehicles to see fleet status'}
              </p>
            </div>
            <BarChart
              height={200}
              data={[
                { name: 'Available', value: fleet.available, color: '#10B981' },
                { name: 'On Trip', value: fleet.onTrip, color: '#F59E0B' },
                { name: 'In Service', value: fleet.inService, color: '#EF4444' },
              ]}
            />
          </section>

          <section className="rounded-lg border border-slate-200/80 bg-white p-3 sm:p-5 shadow-sm">
            <div className="mb-2 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-950">Expiring Soon</h3>
              <p className="text-xs text-text-secondary">Documents expiring within 7 days or already expired</p>
            </div>
            {fleet.expiring.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-text-secondary">All documents are current</p>
                <p className="text-xs text-text-secondary/70">No expiring permits, insurance, or PSV</p>
              </div>
            ) : (
              <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
                {fleet.expiring.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-950">{item.reg}</p>
                      <p className="text-xs text-text-secondary">{item.doc}</p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${item.variant === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Open Complaints & Penalties ───────────────────────── */}
        <div className="mt-4 sm:mt-5">
          <section className="rounded-lg border border-slate-200/80 bg-white p-3 sm:p-5 shadow-sm">
            <div className="mb-2 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-950">Open Complaints & Penalties</h3>
              <p className="text-xs text-text-secondary">Most recent unresolved issues</p>
            </div>
            {fleet.openComplaints.length === 0 && fleet.openPenalties.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-text-secondary">No open issues</p>
                <p className="text-xs text-text-secondary/70">All complaints and penalties are resolved</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {fleet.openComplaints.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-warning/10 text-xs font-bold text-warning">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 4.9 3.7 16.3A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.7L13.7 4.9a2 2 0 0 0-3.4 0Z" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-950">
                        {c.complaint_items?.length ? c.complaint_items[0] : 'Complaint'}
                        {(c.complaint_items?.length || 0) > 1 && <span className="text-text-secondary"> +{(c.complaint_items?.length || 0) - 1} more</span>}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {c.vehicles?.registration_number || '—'} {c.drivers?.full_name ? `· ${c.drivers.full_name}` : ''} {c.date_filed ? `· ${formatDate(c.date_filed)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
                {fleet.openPenalties.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-danger/10 text-xs font-bold text-danger">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 4.9 3.7 16.3A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.7L13.7 4.9a2 2 0 0 0-3.4 0Z" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-950">{p.reason || 'Penalty'}</p>
                      <p className="text-xs text-text-secondary">
                        {p.vehicles?.registration_number || '—'} {p.drivers?.full_name ? `· ${p.drivers.full_name}` : ''} {p.date_issued ? `· ${formatDate(p.date_issued)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

    </div>
  )
}

function Icon({ name }: { name: 'plane' | 'check' | 'x' | 'cash' | 'trend' | 'vehicle' | 'route' | 'user' | 'alert' }) {
  const paths = {
    plane: 'M10.5 13.5 4 20l-1-3 4.5-5L3 7l1-3 6.5 6.5L19 2l2 2-6.5 8L21 20l-2 2-8.5-8.5Z',
    check: 'm5 13 4 4L19 7',
    x: 'M6 6l12 12M18 6 6 18',
    cash: 'M4 7h16v10H4V7Zm3 3h.01M17 14h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    trend: 'M4 17 9 12l4 4 7-9M15 7h5v5',
    vehicle: 'M5 15h14l-1.4-4.2A2.6 2.6 0 0 0 15.1 9H8.9a2.6 2.6 0 0 0-2.5 1.8L5 15Zm2 0v3m10-3v3M8 18h.01M16 18h.01M7 12h10',
    route: 'M5 19c5-8 9 0 14-8M6 5h.01M18 19h.01',
    user: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 19a7 7 0 0 1 14 0',
    alert: 'M12 9v4m0 4h.01M10.3 4.9 3.7 16.3A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.7L13.7 4.9a2 2 0 0 0-3.4 0Z',
  }

  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[name]} />
    </svg>
  )
}
