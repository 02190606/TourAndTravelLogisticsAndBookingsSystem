import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, CardSkeleton, Modal, Button, StatusBadge, Badge } from '@/components/common'
import type { Trip, TripStatus } from '@/types'
import { useNavigate } from 'react-router-dom'
import { formatDate, computeTripStatus } from '@/utils'
import { parseISO, isAfter, format, addDays, subMonths, addMonths, subWeeks, addWeeks, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_META: Record<TripStatus, { color: string; bg: string; label: string }> = {
  planned: { color: '#3B82F6', bg: '#EFF6FF', label: 'PLANNED' },
  ongoing: { color: '#10B981', bg: '#ECFDF5', label: 'ONGOING' },
  ends_today: { color: '#F59E0B', bg: '#FFFBEB', label: 'ENDS TODAY' },
  completed: { color: '#8B5CF6', bg: '#F5F3FF', label: 'DONE' },
  cancelled: { color: '#EF4444', bg: '#FEF2F2', label: 'CANCELLED' },
}

const STATUS_ORDER: TripStatus[] = ['planned', 'ongoing', 'ends_today', 'completed', 'cancelled']

const STAR_COLOR = '#FACC15'
const DOT_COLOR = '#EF4444'
const CLIENT_NAME_COLOR = '#0F172A'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type TripRow = Trip & { vehicles?: { registration_number: string }; drivers?: { full_name: string } }

type DayCard = { trip: TripRow; kind: 'start' | 'end' | 'same' }

type CalendarViewMode = 'month' | 'week' | 'day'

function statusPill(status: TripStatus) {
  const meta = STATUS_META[status] || STATUS_META.planned
  return (
    <span
      className="inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-px text-[9px] font-bold uppercase leading-none whitespace-nowrap"
      style={{ backgroundColor: meta.bg, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}33` }}
    >
      {meta.label}
    </span>
  )
}

function endPill() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-bold uppercase leading-none whitespace-nowrap text-slate-600 ring-1 ring-slate-500/15">
      END
    </span>
  )
}

export function CalendarView() {
  const navigate = useNavigate()
  const [selectedTrip, setSelectedTrip] = useState<TripRow | null>(null)
  const [view, setView] = useState<CalendarViewMode>('month')
  const [cursor, setCursor] = useState<Date>(() => new Date())

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips-for-calendar'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trips')
        .select('*, vehicles!left(registration_number), drivers!left(full_name)')
      return (data || []) as TripRow[]
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const visibleTrips = trips
    .filter(t => t.trip_start_date && t.trip_end_date)
    .filter(t => {
      const s = computeTripStatus(t)
      if (s === 'planned' || s === 'ongoing' || s === 'ends_today' || s === 'cancelled') return true
      if (s === 'completed') {
        const endDate = parseISO(t.trip_end_date)
        return isAfter(today, endDate) && (today.getTime() - endDate.getTime()) <= 30 * 86400000
      }
      return false
    })

  const dayMap = useMemo(() => {
    const map = new Map<string, DayCard[]>()
    visibleTrips.forEach(t => {
      const s = t.trip_start_date.slice(0, 10)
      const e = t.trip_end_date.slice(0, 10)
      const keys = s === e ? [s] : [s, e]
      keys.forEach(k => {
        const kind: DayCard['kind'] = s === e ? 'same' : k === s ? 'start' : 'end'
        if (!map.has(k)) map.set(k, [])
        map.get(k)!.push({ trip: t, kind })
      })
    })
    map.forEach(list =>
      list.sort((a, b) => {
        const sa = a.trip.trip_start_date || ''
        const sb = b.trip.trip_start_date || ''
        if (sa !== sb) return sa < sb ? -1 : 1
        const ea = a.trip.trip_end_date || ''
        const eb = b.trip.trip_end_date || ''
        if (ea !== eb) return ea < eb ? -1 : 1
        return (a.trip.client_name || '').localeCompare(b.trip.client_name || '')
      }),
    )
    return map
  }, [visibleTrips])

  if (isLoading) return <CardSkeleton count={3} />

  const days: Date[] =
    view === 'month'
      ? eachDayOfInterval({
          start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
          end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
        })
      : view === 'week'
        ? eachDayOfInterval({
            start: startOfWeek(cursor, { weekStartsOn: 0 }),
            end: addDays(startOfWeek(cursor, { weekStartsOn: 0 }), 6),
          })
        : [startOfDay(cursor)]

  const title =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(startOfWeek(cursor, { weekStartsOn: 0 }), 'MMM d')} – ${format(endOfWeek(cursor, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
        : format(cursor, 'EEEE, MMMM d, yyyy')

  const cellHeight = view === 'month' ? 'min-h-[110px]' : view === 'week' ? 'min-h-[320px]' : 'min-h-[520px]'

  const goPrev = () => setCursor(c => (view === 'month' ? subMonths(c, 1) : view === 'week' ? subWeeks(c, 1) : subDays(c, 1)))
  const goNext = () => setCursor(c => (view === 'month' ? addMonths(c, 1) : view === 'week' ? addWeeks(c, 1) : addDays(c, 1)))
  const goToday = () => setCursor(new Date())

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar View" subtitle="Trip schedule overview" />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={goPrev} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button variant="outline" size="sm" onClick={goNext} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <div className="flex gap-1.5">
            {(['month', 'week', 'day'] as const).map(m => (
              <Button
                key={m}
                size="sm"
                variant={view === m ? 'primary' : 'outline'}
                onClick={() => setView(m)}
                className="capitalize"
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        {view !== 'day' && (
          <div className="mb-2 grid grid-cols-7 gap-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                {d}
              </div>
            ))}
          </div>
        )}

        <div className={`grid grid-cols-7 gap-2 ${view === 'month' ? 'auto-rows-fr' : ''}`}>
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const cards = dayMap.get(key) || []
            const inMonth = isSameMonth(day, cursor)
            const isTodayDate = isToday(day)
            return (
              <div
                key={key}
                className={`flex flex-col rounded-xl border bg-white p-1.5 transition-colors ${cellHeight} ${isTodayDate ? 'border-primary/60 ring-1 ring-primary/30' : 'border-slate-200'}`}
              >
                <div className="flex h-5 items-center justify-end">
                  {isTodayDate ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                      {format(day, 'd')}
                    </span>
                  ) : (
                    <span className={`text-[11px] font-medium ${inMonth ? 'text-text-secondary' : 'text-slate-300'}`}>
                      {format(day, 'd')}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex min-w-0 flex-col gap-1">
                  {cards.map(card => (
                    <TripCard key={`${card.trip.id}-${card.kind}`} card={card} onSelect={setSelectedTrip} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {STATUS_ORDER.map(key => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: STATUS_META[key].color }} />
            <span className="text-text-secondary capitalize">{STATUS_META[key].label}</span>
          </div>
        ))}
        <span className="hidden w-px self-stretch bg-muted/40 sm:block" />
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] leading-none" style={{ color: STAR_COLOR }}>★</span>
          <span className="text-text-secondary">start day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DOT_COLOR }} />
          <span className="text-text-secondary">end day</span>
        </div>
        <div className="flex items-center gap-1.5">{endPill()}<span className="text-text-secondary">last day</span></div>
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

function TripCard({ card, onSelect }: { card: DayCard; onSelect: (t: TripRow) => void }) {
  const { trip, kind } = card
  const isStartOrSame = kind === 'start' || kind === 'same'
  return (
    <button
      type="button"
      onClick={() => onSelect(trip)}
      className="flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md bg-slate-50/80 px-1.5 py-1 text-left transition-colors hover:bg-slate-100"
      title={`${trip.client_name} · ${trip.trip_start_date} → ${trip.trip_end_date}`}
    >
      {isStartOrSame ? (
        <span className="flex-shrink-0 text-[11px] leading-none" style={{ color: STAR_COLOR }}>★</span>
      ) : (
        <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DOT_COLOR }} />
      )}
      <span className="min-w-0 flex-1 truncate text-xs font-bold leading-tight" style={{ color: CLIENT_NAME_COLOR }}>
        {trip.client_name}
      </span>
      {isStartOrSame ? statusPill(computeTripStatus(trip)) : endPill()}
    </button>
  )
}
