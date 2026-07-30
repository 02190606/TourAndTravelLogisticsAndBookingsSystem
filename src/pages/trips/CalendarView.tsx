import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, CardSkeleton, Modal, Button, StatusBadge, Badge } from '@/components/common'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { Trip, TripStatus } from '@/types'
import { useNavigate } from 'react-router-dom'
import { formatDate, computeTripStatus } from '@/utils'
import { parseISO, isAfter } from 'date-fns'

const statusColors: Record<string, string> = {
  planned: '#3B82F6',
  ongoing: '#10B981',
  ends_today: '#F59E0B',
  completed: '#8B5CF6',
  cancelled: '#EF4444',
}

const statusLabels: Record<string, string> = {
  planned: 'PLANNED',
  ongoing: 'ONGOING',
  ends_today: 'ENDS TODAY',
  completed: 'DONE',
  cancelled: 'CANCELLED',
}

const statusDots: Record<string, string> = {
  planned: 'bg-blue-300',
  ongoing: 'bg-emerald-300',
  ends_today: 'bg-amber-300',
  completed: 'bg-violet-300',
  cancelled: 'bg-red-300',
}

const CLIENT_COLORS = [
  { bg: '#E3F2FD', dot: '#1565C0' },
  { bg: '#FCE4EC', dot: '#C62828' },
  { bg: '#E8F5E9', dot: '#2E7D32' },
  { bg: '#FFF3E0', dot: '#E65100' },
  { bg: '#F3E5F5', dot: '#7B1FA2' },
  { bg: '#E0F7FA', dot: '#00838F' },
  { bg: '#FFF8E1', dot: '#F9A825' },
  { bg: '#FBE9E7', dot: '#BF360C' },
  { bg: '#E8EAF6', dot: '#283593' },
  { bg: '#FCE4EC', dot: '#AD1457' },
  { bg: '#E0F2F1', dot: '#00695C' },
  { bg: '#FFFDE7', dot: '#F57F17' },
  { bg: '#EDE7F6', dot: '#4527A0' },
  { bg: '#F1F8E9', dot: '#558B2F' },
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
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

  const clientColors: Record<string, { bg: string; dot: string }> = {}
  trips.forEach(t => {
    if (!clientColors[t.client_name]) {
      clientColors[t.client_name] = CLIENT_COLORS[hashString(t.client_name) % CLIENT_COLORS.length]
    }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const events = trips
    .filter(t => t.trip_start_date && t.trip_end_date)
    .filter(t => {
      const s = computeTripStatus(t)
      if (s === 'planned' || s === 'ongoing' || s === 'ends_today') return true
      if (s === 'completed') {
        const endDate = parseISO(t.trip_end_date)
        return isAfter(today, endDate) && (today.getTime() - endDate.getTime()) <= 30 * 86400000
      }
      return false
    })
    .filter(t => {
      if (!viewStart || !viewEnd) return true
      return t.trip_end_date >= viewStart && t.trip_start_date < viewEnd
    })
    .flatMap(trip => {
      const color = clientColors[trip.client_name]
      return [
        {
          id: `${trip.id}-start`,
          title: trip.client_name,
          start: trip.trip_start_date,
          end: trip.trip_start_date,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: color.dot,
          classNames: ['trip-pill'],
          extendedProps: { tripId: trip.id, type: 'start', clientName: trip.client_name },
        },
        {
          id: `${trip.id}-end`,
          title: trip.client_name,
          start: trip.trip_end_date,
          end: trip.trip_end_date,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: color.dot,
          classNames: ['trip-pill'],
          extendedProps: { tripId: trip.id, type: 'end', clientName: trip.client_name },
        },
      ]
    })

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar View" subtitle="Trip schedule overview" />

      <style>{`
        .fc-event {
          border: none !important;
          position: relative;
        }
        .fc-daygrid-event {
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          overflow: visible !important;
        }
        .fc-daygrid-event .fc-event-main {
          padding: 0 !important;
          overflow: visible !important;
        }
        .fc-daygrid-day-events {
          min-height: 0 !important;
        }
        .fc-daygrid-event-harness {
          margin-top: 1px !important;
        }
        .fc-daygrid-event-harness + .fc-daygrid-event-harness {
          margin-top: 1px !important;
        }
      `}</style>

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
          eventDidMount={(arg) => {
            const el = arg.el
            el.style.borderRadius = '999px'
            el.style.border = 'none'
          }}
          eventContent={(arg) => {
            const type = arg.event.extendedProps.type as string
            const clientName = arg.event.extendedProps.clientName as string
            const color = clientColors[clientName]
            if (!color) return null
            return (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] leading-tight max-w-full"
                style={{ background: color.bg }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color.dot }} />
                <span className="font-medium truncate" style={{ color: color.dot }}>{clientName}</span>
                <span className="text-gray-500 flex-shrink-0 whitespace-nowrap">{type === 'start' ? 'starts' : 'ends'}</span>
              </span>
            )
          }}
          datesSet={(dateInfo) => {
            setViewStart(dateInfo.startStr.slice(0, 10))
            setViewEnd(dateInfo.endStr.slice(0, 10))
          }}
          eventClick={(info) => {
            const tripId = info.event.extendedProps.tripId as string
            const trip = trips.find(t => t.id === tripId)
            if (trip) setSelectedTrip(trip)
          }}
          height="auto"
          aspectRatio={1.8}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(statusColors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-text-secondary capitalize">{statusLabels[key] || key}</span>
          </div>
        ))}
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
                <p className="text-xs text-text-secondary uppercase tracking-wider">Duration</p>
                <p className="text-sm mt-1">
                  {selectedTrip.trip_start_date && selectedTrip.trip_end_date
                    ? `${Math.round((new Date(selectedTrip.trip_end_date).getTime() - new Date(selectedTrip.trip_start_date).getTime()) / 86400000) + 1} days`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Vehicle</p>
                <p className="text-sm mt-1">{selectedTrip.vehicles?.registration_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Driver</p>
                <p className="text-sm mt-1">{selectedTrip.drivers?.full_name || (selectedTrip.needs_driver ? 'With Driver (TBD)' : '—')}</p>
              </div>
              {(selectedTrip.is_cross_border || selectedTrip.is_one_way) && (
                <div className="col-span-2">
                  <p className="text-xs text-text-secondary uppercase tracking-wider">Trip Type</p>
                  <div className="flex gap-2 mt-1">
                    {selectedTrip.is_cross_border && <Badge variant="info">Cross Border</Badge>}
                    {selectedTrip.is_one_way && <Badge variant="warning">One Way</Badge>}
                  </div>
                </div>
              )}
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
