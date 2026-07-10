import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, CardSkeleton } from '@/components/common'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { Trip } from '@/types'
import { useNavigate } from 'react-router-dom'

const statusColors: Record<string, string> = {
  planned: '#3B82F6',
  ongoing: '#F59E0B',
  completed: '#4CAF50',
  cancelled: '#EF4444',
}

export function CalendarView() {
  const navigate = useNavigate()

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips-for-calendar'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trips')
        .select('*, vehicles!left(registration_number), drivers!left(full_name)')
      return (data || []) as (Trip & { vehicles?: { registration_number: string }; drivers?: { full_name: string } })[]
    },
  })

  if (isLoading) return <CardSkeleton count={3} />

  const events = trips.map(trip => ({
    id: trip.id,
    title: trip.client_name,
    start: trip.trip_start_date,
    end: trip.trip_end_date,
    backgroundColor: statusColors[trip.status] || '#475569',
    borderColor: statusColors[trip.status] || '#475569',
    textColor: '#fff',
    extendedProps: {
      vehicle: trip.vehicles?.registration_number,
      driver: trip.drivers?.full_name,
      status: trip.status,
    },
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar View" subtitle="Trip schedule overview" />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          eventClick={(info) => {
            navigate(`/trips/manage/${info.event.id}`)
          }}
          height="auto"
          aspectRatio={1.8}
        />
      </div>
    </div>
  )
}
