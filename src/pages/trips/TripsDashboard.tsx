import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, StatCard, StatusBadge, CardSkeleton } from '@/components/common'
import { DonutChart } from '@/components/charts/DonutChart'
import { LineChart } from '@/components/charts/LineChart'
import { formatUGX, formatDate, computeTripStatus } from '@/utils'
import type { Trip } from '@/types'
import { startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns'

export function TripsDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['trips-dashboard'],
    queryFn: async () => {
      const { data: trips } = await supabase.from('trips').select('*')
      const t = (trips || []) as Trip[]

      const planned = t.filter(t => computeTripStatus(t) === 'planned').length
      const ongoing = t.filter(t => computeTripStatus(t) === 'ongoing').length
      const completed = t.filter(t => computeTripStatus(t) === 'completed').length
      const cancelled = t.filter(t => computeTripStatus(t) === 'cancelled').length

      const thisMonth = new Date().getMonth()
      const thisYear = new Date().getFullYear()
      const monthlyRevenue = t
        .filter(t => computeTripStatus(t) === 'completed' && new Date(t.created_at).getMonth() === thisMonth && new Date(t.created_at).getFullYear() === thisYear)
        .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

      const yearlyRevenue = t
        .filter(t => computeTripStatus(t) === 'completed' && new Date(t.created_at).getFullYear() === thisYear)
        .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const upcomingThisWeek = t.filter(t => {
        const start = parseISO(t.trip_start_date)
        return isWithinInterval(start, { start: weekStart, end: weekEnd }) && computeTripStatus(t) !== 'cancelled'
      })

      const upcomingTrips = t
        .filter(t => {
          const s = computeTripStatus(t)
          return s === 'planned' || s === 'ongoing'
        })
        .sort((a, b) => new Date(a.trip_start_date).getTime() - new Date(b.trip_start_date).getTime())
        .slice(0, 5)

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const revenueByMonth = months.map((name, i) => ({
        name,
        value: t
          .filter(t => new Date(t.trip_start_date).getMonth() === i && new Date(t.trip_start_date).getFullYear() === thisYear)
          .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0),
      }))

      return { planned, ongoing, completed, cancelled, monthlyRevenue, yearlyRevenue, upcomingThisWeek: upcomingThisWeek.length, upcomingTrips, revenueByMonth, total: t.length }
    },
  })

  if (isLoading || !stats) return <CardSkeleton count={4} />

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Trips Dashboard" subtitle="Trip flow, revenue, and near-term scheduling" />

      <section className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Bookings performance</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Track demand, delivery, and revenue momentum</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Keep planned tours, active trips, and completed revenue visible for the operations team.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniMetric label="Completion" value={`${completionRate}%`} />
            <MiniMetric label="This week" value={stats.upcomingThisWeek} />
            <MiniMetric label="This month" value={formatUGX(stats.monthlyRevenue)} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Trips" value={stats.total} icon={<Icon name="plane" />} color="primary" />
        <StatCard title="Planned" value={stats.planned} icon={<Icon name="clipboard" />} color="info" />
        <StatCard title="Ongoing" value={stats.ongoing} icon={<Icon name="sync" />} color="warning" />
        <StatCard title="Completed" value={stats.completed} icon={<Icon name="check" />} color="success" />
        <StatCard title="Cancelled" value={stats.cancelled} icon={<Icon name="x" />} color="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Completed Revenue (Month)" value={formatUGX(stats.monthlyRevenue)} icon={<Icon name="cash" />} color="primary" />
        <StatCard title="Completed Revenue (Year)" value={formatUGX(stats.yearlyRevenue)} icon={<Icon name="trend" />} color="secondary" />
        <StatCard title="Upcoming This Week" value={stats.upcomingThisWeek} icon={<Icon name="calendar" />} color="info" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-950">Trips by Status</h3>
            <p className="text-sm text-text-secondary">Current distribution across all bookings</p>
          </div>
          <DonutChart
            data={[
              { name: 'Planned', value: stats.planned, color: '#3B82F6' },
              { name: 'Ongoing', value: stats.ongoing, color: '#10B981' },
              { name: 'Completed', value: stats.completed, color: '#94A3B8' },
              { name: 'Cancelled', value: stats.cancelled, color: '#EF4444' },
            ]}
          />
        </section>
        <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-950">Monthly Revenue</h3>
            <p className="text-sm text-text-secondary">Revenue booked by trip start month</p>
          </div>
          <LineChart data={stats.revenueByMonth} />
        </section>
      </div>

      {stats.upcomingTrips.length > 0 && (
        <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-950">Upcoming Trips</h3>
            <p className="text-sm text-text-secondary">Next planned or ongoing client movements</p>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.upcomingTrips.map((trip) => (
              <div key={trip.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-sm text-slate-950">{trip.client_name}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(trip.trip_start_date)} to {formatDate(trip.trip_end_date)}
                  </p>
                </div>
                <StatusBadge status={computeTripStatus(trip)} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4">
      <p className="truncate text-xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-text-secondary">{label}</p>
    </div>
  )
}

function Icon({ name }: { name: 'plane' | 'clipboard' | 'sync' | 'check' | 'x' | 'cash' | 'trend' | 'calendar' }) {
  const paths = {
    plane: 'M10.5 13.5 4 20l-1-3 4.5-5L3 7l1-3 6.5 6.5L19 2l2 2-6.5 8L21 20l-2 2-8.5-8.5Z',
    clipboard: 'M9 5h6M9 9h6M9 13h4M7 4h10v16H7V4Z',
    sync: 'M17 3v5h-5M7 21v-5h5M18 9a7 7 0 0 0-11.8-3M6 15a7 7 0 0 0 11.8 3',
    check: 'm5 13 4 4L19 7',
    x: 'M6 6l12 12M18 6 6 18',
    cash: 'M4 7h16v10H4V7Zm3 3h.01M17 14h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    trend: 'M4 17 9 12l4 4 7-9M15 7h5v5',
    calendar: 'M7 3v3m10-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  }

  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[name]} />
    </svg>
  )
}
