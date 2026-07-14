import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, StatCard, CardSkeleton } from '@/components/common'
import { DonutChart } from '@/components/charts/DonutChart'

export function LogisticsDashboard() {
  const { data: vehicleStats, isLoading } = useQuery({
    queryKey: ['logistics-stats'],
    queryFn: async () => {
      const { data: vehicles } = await supabase.from('vehicles').select('status')
      const { data: drivers } = await supabase.from('drivers').select('is_active')
      const { data: complaints } = await supabase.from('complaints').select('status')

      return {
        total: vehicles?.length || 0,
        available: vehicles?.filter(v => v.status === 'available').length || 0,
        onTrip: vehicles?.filter(v => v.status === 'on_trip').length || 0,
        inService: vehicles?.filter(v => v.status === 'in_service').length || 0,
        totalDrivers: drivers?.length || 0,
        activeDrivers: drivers?.filter(d => d.is_active).length || 0,
        openComplaints: complaints?.filter(c => c.status === 'open').length || 0,
      }
    },
  })

  if (isLoading || !vehicleStats) return <CardSkeleton count={4} />

  const availabilityRate = vehicleStats.total > 0
    ? Math.round((vehicleStats.available / vehicleStats.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Logistics Dashboard" subtitle="Fleet readiness, driver coverage, and service exceptions" />

      <section className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="grid gap-4 sm:items-center lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Fleet command center</p>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-950">Vehicles, drivers, and issues at a glance</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Monitor trip readiness and maintenance pressure before it affects scheduled tours.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniMetric label="Availability" value={`${availabilityRate}%`} />
            <MiniMetric label="Active drivers" value={vehicleStats.activeDrivers} />
            <MiniMetric label="Open issues" value={vehicleStats.openComplaints} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Vehicles" value={vehicleStats.total} icon={<Icon name="vehicle" />} color="primary" />
        <StatCard title="Available" value={vehicleStats.available} icon={<Icon name="check" />} color="success" />
        <StatCard title="On Trip" value={vehicleStats.onTrip} icon={<Icon name="route" />} color="warning" />
        <StatCard title="In Service" value={vehicleStats.inService} icon={<Icon name="tool" />} color="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Drivers" value={vehicleStats.totalDrivers} icon={<Icon name="user" />} color="primary" />
        <StatCard title="Active Drivers" value={vehicleStats.activeDrivers} icon={<Icon name="check" />} color="success" />
        <StatCard title="Open Complaints" value={vehicleStats.openComplaints} icon={<Icon name="clipboard" />} color="warning" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-950">Vehicle Status</h3>
            <p className="text-sm text-text-secondary">Operational mix across the fleet</p>
          </div>
          <DonutChart
            data={[
              { name: 'Available', value: vehicleStats.available, color: '#10B981' },
              { name: 'On Trip', value: vehicleStats.onTrip, color: '#F59E0B' },
              { name: 'In Service', value: vehicleStats.inService, color: '#EF4444' },
            ]}
          />
        </section>

        <section className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-950">Operational Focus</h3>
            <p className="text-sm text-text-secondary">Quick signals for daily dispatch planning</p>
          </div>
          <div className="space-y-4">
            <ProgressRow label="Vehicle availability" value={availabilityRate} tone="primary" />
            <ProgressRow
              label="Driver activation"
              value={vehicleStats.totalDrivers > 0 ? Math.round((vehicleStats.activeDrivers / vehicleStats.totalDrivers) * 100) : 0}
              tone="success"
            />
            <ProgressRow
              label="Service load"
              value={vehicleStats.total > 0 ? Math.round((vehicleStats.inService / vehicleStats.total) * 100) : 0}
              tone="danger"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4">
      <p className="text-xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-text-secondary">{label}</p>
    </div>
  )
}

function ProgressRow({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'success' | 'danger' }) {
  const tones = {
    primary: 'bg-primary',
    success: 'bg-success',
    danger: 'bg-danger',
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-950">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

function Icon({ name }: { name: 'vehicle' | 'check' | 'route' | 'tool' | 'user' | 'clipboard' }) {
  const paths = {
    vehicle: 'M5 15h14l-1.4-4.2A2.6 2.6 0 0 0 15.1 9H8.9a2.6 2.6 0 0 0-2.5 1.8L5 15Zm2 0v3m10-3v3M8 18h.01M16 18h.01M7 12h10',
    check: 'm5 13 4 4L19 7',
    route: 'M5 19c5-8 9 0 14-8M6 5h.01M18 19h.01',
    tool: 'm14.7 6.3 3 3M5 19l8.2-8.2m1.5-4.5 3-3 3 3-3 3m-3-3 3 3',
    user: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 19a7 7 0 0 1 14 0',
    clipboard: 'M9 5h6M9 9h6M9 13h4M7 4h10v16H7V4Z',
  }

  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[name]} />
    </svg>
  )
}
