import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, StatCard, Button, CardSkeleton } from '@/components/common'
import { DonutChart } from '@/components/charts/DonutChart'
import { BarChart } from '@/components/charts/BarChart'
import { computeTripStatus } from '@/utils'

export function AdminDashboard() {
  const navigate = useNavigate()

  const { data: vehicleStats } = useQuery({
    queryKey: ['vehicle-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('status')
      if (!data) return { available: 0, onTrip: 0, inService: 0 }
      return {
        available: data.filter(v => v.status === 'available').length,
        onTrip: data.filter(v => v.status === 'on_trip').length,
        inService: data.filter(v => v.status === 'in_service').length,
      }
    },
  })

  const { data: tripCounts } = useQuery({
    queryKey: ['trip-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('trips').select('status, trip_start_date, trip_end_date')
      if (!data) return { planned: 0, ongoing: 0, completed: 0, cancelled: 0 }
      return {
        planned: data.filter(t => computeTripStatus(t) === 'planned').length,
        ongoing: data.filter(t => computeTripStatus(t) === 'ongoing').length,
        completed: data.filter(t => computeTripStatus(t) === 'completed').length,
        cancelled: data.filter(t => computeTripStatus(t) === 'cancelled').length,
      }
    },
  })

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: async () => {
      const { data } = await supabase.from('trips').select('amount_in_ugx')
      return data?.reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0) || 0
    },
  })

  if (!vehicleStats || !tripCounts) {
    return <CardSkeleton count={4} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of fleet, trips, and revenue"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Available Vehicles" value={vehicleStats.available} icon="🚙" color="success" />
        <StatCard title="Active Trips" value={tripCounts.ongoing} icon="✈️" color="warning" />
        <StatCard title="Total Revenue" value={`UGX ${(revenue || 0).toLocaleString()}`} icon="💰" color="primary" />
        <StatCard title="Completed Trips" value={tripCounts.completed} icon="✅" color="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden">
          <h3 className="font-display font-bold text-lg mb-4">Fleet Status</h3>
          <DonutChart
            data={[
              { name: 'Available', value: vehicleStats.available, color: '#4CAF50' },
              { name: 'On Trip', value: vehicleStats.onTrip, color: '#F59E0B' },
              { name: 'In Service', value: vehicleStats.inService, color: '#EF4444' },
            ]}
          />
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden">
          <h3 className="font-display font-bold text-lg mb-4">Trip Status</h3>
          <DonutChart
            data={[
              { name: 'Planned', value: tripCounts.planned, color: '#3B82F6' },
              { name: 'Ongoing', value: tripCounts.ongoing, color: '#10B981' },
              { name: 'Completed', value: tripCounts.completed, color: '#94A3B8' },
              { name: 'Cancelled', value: tripCounts.cancelled, color: '#EF4444' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Button onClick={() => navigate('/logistics/vehicles')}>Add Vehicle</Button>
        <Button onClick={() => navigate('/logistics/drivers')}>Add Driver</Button>
        <Button onClick={() => navigate('/trips/manage')}>Create Trip</Button>
        <Button onClick={() => navigate('/admin/users')}>Add User</Button>
      </div>
    </div>
  )
}
