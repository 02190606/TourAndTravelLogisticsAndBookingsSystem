import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, StatCard, Button, CardSkeleton } from '@/components/common'
import { DonutChart } from '@/components/charts/DonutChart'
import { formatUGX, computeTripStatus, isActiveTrip } from '@/utils'
import type { Trip } from '@/types'

export function AdminDashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [tripsRes, vehiclesRes, driversRes, complaintsRes, penaltiesRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('vehicles').select('status'),
        supabase.from('drivers').select('is_active'),
        supabase.from('complaints').select('status'),
        supabase.from('penalties').select('status'),
      ])

      const trips = (tripsRes.data || []) as Trip[]
      const vehicles = vehiclesRes.data || []
      const drivers = driversRes.data || []
      const complaints = complaintsRes.data || []
      const penalties = penaltiesRes.data || []

      const planned = trips.filter(t => computeTripStatus(t) === 'planned').length
      const ongoing = trips.filter(t => computeTripStatus(t) === 'ongoing').length
      const endsToday = trips.filter(t => computeTripStatus(t) === 'ends_today').length
      const completed = trips.filter(t => computeTripStatus(t) === 'completed').length
      const cancelled = trips.filter(t => computeTripStatus(t) === 'cancelled').length

      const activeTrips = planned + ongoing + endsToday

      const totalRevenue = trips
        .filter(t => isActiveTrip(t))
        .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

      const available = vehicles.filter(v => v.status === 'available').length
      const onTrip = vehicles.filter(v => v.status === 'on_trip').length
      const inService = vehicles.filter(v => v.status === 'in_service').length

      const totalDrivers = drivers.length
      const activeDrivers = drivers.filter(d => d.is_active).length
      const openComplaints = complaints.filter(c => c.status === 'open').length
      const openPenalties = penalties.filter(p => p.status === 'unpaid').length

      return {
        trips: { planned, ongoing, endsToday, completed, cancelled, activeTrips, totalRevenue, total: trips.length },
        fleet: {
          total: vehicles.length, available, onTrip, inService,
          totalDrivers, activeDrivers, openComplaints, openPenalties,
        },
      }
    },
  })

  if (isLoading || !stats) return <CardSkeleton count={4} />

  const { trips, fleet } = stats
  const hasTripData = trips.total > 0
  const hasFleetData = fleet.total > 0

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader title="Admin Dashboard" subtitle="Fleet, trips, and revenue at a glance" />

      {/* ── Hero summary ─────────────────────────────────────────── */}
      <section className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="grid gap-3 sm:gap-4 sm:items-center lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Operations overview</p>
            <h2 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-950">
              {hasTripData || hasFleetData
                ? 'Your fleet and bookings performance in one place'
                : 'Welcome to SafariTour — here\'s what\'s happening'}
            </h2>
            <p className="mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm text-text-secondary">
              {hasTripData || hasFleetData
                ? 'Monitor trip delivery, fleet readiness, and revenue across the business.'
                : 'Data will appear here as you add vehicles, drivers, and create trips.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <MiniMetric label="Active trips" value={trips.activeTrips} empty={!hasTripData} />
            <MiniMetric label="Revenue" value={formatUGX(trips.totalRevenue)} empty={!hasTripData} />
            <MiniMetric label="Fleet ready" value={fleet.total > 0 ? `${Math.round((fleet.available / fleet.total) * 100)}%` : '—'} empty={!hasFleetData} />
          </div>
        </div>
      </section>

      {/* ═══════════════ TRIPS SECTION ═══════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display text-lg sm:text-xl font-bold text-primary">Trips</h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard
            title="Active Trips"
            value={trips.activeTrips}
            icon={<Icon name="plane" />}
            color="success"
            subtitle="Planned, ongoing, ending today"
          />
          <StatCard
            title="Completed Trips"
            value={trips.completed}
            icon={<Icon name="check" />}
            color="primary"
          />
          <StatCard
            title="Total Revenue"
            value={formatUGX(trips.totalRevenue)}
            icon={<Icon name="cash" />}
            color="secondary"
            subtitle="All non-cancelled trips"
          />
        </div>

        <div className="mt-4 sm:mt-6">
          <section className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-3 sm:mb-5">
              <h3 className="text-base sm:text-lg font-bold text-slate-950">Trip Status</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                {hasTripData ? 'Current distribution across all bookings' : 'No trip data yet — bookings will appear here'}
              </p>
            </div>
            <DonutChart
              data={[
                { name: 'Planned', value: trips.planned, color: '#3B82F6' },
                { name: 'Ongoing', value: trips.ongoing, color: '#10B981' },
                { name: 'Ends Today', value: trips.endsToday, color: '#F59E0B' },
                { name: 'Completed', value: trips.completed, color: '#94A3B8' },
                { name: 'Cancelled', value: trips.cancelled, color: '#EF4444' },
              ]}
            />
          </section>
        </div>
      </div>

      {/* ═══════════════ LOGISTICS SECTION ═══════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display text-lg sm:text-xl font-bold text-primary">Logistics</h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            title="Fleet Size"
            value={fleet.total}
            icon={<Icon name="vehicle" />}
            color="primary"
          />
          <StatCard
            title="Available"
            value={fleet.available}
            icon={<Icon name="check" />}
            color="success"
          />
          <StatCard
            title="Active Drivers"
            value={fleet.activeDrivers}
            icon={<Icon name="user" />}
            color="info"
          />
          <StatCard
            title="Open Issues"
            value={fleet.openComplaints + fleet.openPenalties}
            icon={<Icon name="alert" />}
            color={fleet.openComplaints + fleet.openPenalties > 0 ? 'warning' : 'success'}
            subtitle={`${fleet.openComplaints} complaints, ${fleet.openPenalties} penalties`}
          />
        </div>

        <div className="mt-4 sm:mt-6">
          <section className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-3 sm:mb-5">
              <h3 className="text-base sm:text-lg font-bold text-slate-950">Fleet Status</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                {hasFleetData ? 'Operational mix across the fleet' : 'No vehicle data yet — add vehicles to see fleet status'}
              </p>
            </div>
            <DonutChart
              data={[
                { name: 'Available', value: fleet.available, color: '#10B981' },
                { name: 'On Trip', value: fleet.onTrip, color: '#F59E0B' },
                { name: 'In Service', value: fleet.inService, color: '#EF4444' },
              ]}
            />
          </section>
        </div>
      </div>

      {/* ═══════════════ QUICK ACTIONS ═══════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Button onClick={() => navigate('/logistics/vehicles')}>Add Vehicle</Button>
        <Button onClick={() => navigate('/logistics/drivers')}>Add Driver</Button>
        <Button onClick={() => navigate('/trips/manage')}>Create Trip</Button>
        <Button onClick={() => navigate('/admin/users')}>Add User</Button>
      </div>
    </div>
  )
}

function MiniMetric({ label, value, empty }: { label: string; value: string | number; empty?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-3 sm:px-3 sm:py-4">
      <p className={`truncate text-base sm:text-xl font-bold ${empty ? 'text-slate-400' : 'text-slate-950'}`}>
        {empty ? '—' : value}
      </p>
      <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-medium text-text-secondary">{label}</p>
    </div>
  )
}

function Icon({ name }: { name: 'plane' | 'check' | 'cash' | 'vehicle' | 'user' | 'alert' }) {
  const paths = {
    plane: 'M10.5 13.5 4 20l-1-3 4.5-5L3 7l1-3 6.5 6.5L19 2l2 2-6.5 8L21 20l-2 2-8.5-8.5Z',
    check: 'm5 13 4 4L19 7',
    cash: 'M4 7h16v10H4V7Zm3 3h.01M17 14h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    vehicle: 'M5 15h14l-1.4-4.2A2.6 2.6 0 0 0 15.1 9H8.9a2.6 2.6 0 0 0-2.5 1.8L5 15Zm2 0v3m10-3v3M8 18h.01M16 18h.01M7 12h10',
    user: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 19a7 7 0 0 1 14 0',
    alert: 'M12 9v4m0 4h.01M10.3 4.9 3.7 16.3A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.7L13.7 4.9a2 2 0 0 0-3.4 0Z',
  }

  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[name]} />
    </svg>
  )
}
