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
import { addDays, parseISO, isAfter } from 'date-fns'

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
    .map(trip => {
      const computed = computeTripStatus(trip)
      const label = nameCount[trip.client_name] > 1
        ? `${trip.client_name} · ${formatDate(trip.trip_start_date, 'dd MMM')}–${formatDate(trip.trip_end_date, 'dd MMM')}`
        : trip.client_name
      const endDate = addDays(parseISO(trip.trip_end_date), 1)
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
      return {
        id: trip.id,
        title: label,
        start: trip.trip_start_date,
        end: endStr,
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

      <style>{`
        .fc-event {
          border-radius: 4px !important;
          border-right-width: 4px !important;
          border-right-style: solid !important;
          border-right-color: rgba(0,0,0,0.35) !important;
          padding-right: 0 !important;
          position: relative;
        }
        .fc-event-end-flag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 3px;
          background: rgba(0,0,0,0.3);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          line-height: 1;
          flex-shrink: 0;
          margin-left: auto;
          letter-spacing: -0.5px;
        }
        .fc-daygrid-event-harness + .fc-daygrid-event-harness {
          margin-top: 1px;
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
          eventContent={(arg) => {
            const status = arg.event.extendedProps.status as string
            const dot = statusDots[status] || 'bg-slate-400'
            const label = statusLabels[status] || status.toUpperCase()
            const hasEnd = !!arg.event.end
            return (
              <span className="flex items-center gap-1 text-xs leading-tight px-0.5 overflow-hidden w-full">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                <span className="truncate">{arg.event.title}</span>
                <span className="opacity-50 text-[10px] flex-shrink-0">{label}</span>
                {hasEnd && <span className="fc-event-end-flag" title="Trip ends here">END</span>}
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
                <p className="text-sm mt-1">{selectedTrip.drivers?.full_name || '—'}</p>
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
