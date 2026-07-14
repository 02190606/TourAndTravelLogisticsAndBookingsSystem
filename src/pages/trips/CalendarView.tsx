import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, CardSkeleton, Modal, Button, StatusBadge } from '@/components/common'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { Trip } from '@/types'
import { useNavigate } from 'react-router-dom'
import { formatDate, computeTripStatus } from '@/utils'

const statusColors: Record<string, string> = {
  planned: '#3B82F6',
  ongoing: '#10B981',
  completed: '#94A3B8',
  cancelled: '#EF4444',
}

export function CalendarView() {
  const navigate = useNavigate()
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [viewStart, setViewStart] = useState<string>('')
  const [viewEnd, setViewEnd] = useState<string>('')

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

  const nameCount: Record<string, number> = {}
  trips.forEach(t => { nameCount[t.client_name] = (nameCount[t.client_name] || 0) + 1 })

  const events = trips
    .filter(t => {
      const s = computeTripStatus(t)
      return s === 'planned' || s === 'ongoing'
    })
    .filter(t => {
      if (!viewStart || !viewEnd) return true
      return t.trip_start_date >= viewStart && t.trip_start_date < viewEnd
    })
    .map(trip => {
      const computed = computeTripStatus(trip)
      const label = nameCount[trip.client_name] > 1
        ? `${trip.client_name} · ${formatDate(trip.trip_start_date, 'dd MMM')}–${formatDate(trip.trip_end_date, 'dd MMM')}`
        : trip.client_name
      return {
        id: trip.id,
        title: label,
        start: trip.trip_start_date,
        end: trip.trip_end_date,
        backgroundColor: statusColors[computed] || '#475569',
        borderColor: statusColors[computed] || '#475569',
        textColor: '#fff',
        extendedProps: {
          vehicle: trip.vehicles?.registration_number,
          driver: trip.drivers?.full_name,
          status: computed,
        },
      }
    })

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
          eventClassNames="cursor-pointer hover:brightness-110 hover:shadow-md transition-all"
          eventContent={(arg) => {
            const status = arg.event.extendedProps.status as string
            const dot = status === 'ongoing' ? 'bg-amber-300' : 'bg-blue-300'
            const label = status === 'ongoing' ? 'ONGOING' : 'PLANNED'
            return (
              <span className="flex items-center gap-1 text-xs leading-tight px-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                <span className="truncate">{arg.event.title}</span>
                <span className="opacity-50 text-[10px] flex-shrink-0">{label}</span>
                <span className="opacity-40 flex-shrink-0">→</span>
              </span>
            )
          }}
          datesSet={(dateInfo) => {
            setViewStart(dateInfo.startStr.slice(0, 10))
            setViewEnd(dateInfo.endStr.slice(0, 10))
          }}
          eventClick={(info) => {
            const trip = trips.find(t => t.id === info.event.id)
            if (trip) setSelectedTrip(trip)
          }}
          height="auto"
          aspectRatio={1.8}
        />
      </div>

      <Modal open={!!selectedTrip} onClose={() => setSelectedTrip(null)} title="Trip Details">
        {selectedTrip && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Client</p>
                <p className="font-semibold text-sm mt-1">{selectedTrip.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Status</p>
                <div className="mt-1"><StatusBadge status={computeTripStatus(selectedTrip)} /></div>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Start Date</p>
                <p className="text-sm mt-1">{formatDate(selectedTrip.trip_start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">End Date</p>
                <p className="text-sm mt-1">{formatDate(selectedTrip.trip_end_date)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Vehicle</p>
                <p className="text-sm mt-1">{selectedTrip.vehicles?.registration_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Driver</p>
                <p className="text-sm mt-1">{selectedTrip.drivers?.full_name || '—'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-muted/30">
              <Button variant="outline" onClick={() => setSelectedTrip(null)}>Close</Button>
              <Button onClick={() => { navigate(`/trips/manage/${selectedTrip.id}`); setSelectedTrip(null) }}>View & Edit</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
