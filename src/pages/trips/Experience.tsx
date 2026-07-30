import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Modal, Button, CardSkeleton } from '@/components/common'
import { formatDate, computeTripStatus, isActiveTrip } from '@/utils'
import toast from 'react-hot-toast'
import type { Trip, Vehicle, Driver } from '@/types'

const PERMITS = [
  { key: 'gorilla_tracking', label: 'Gorilla Tracking' },
  { key: 'gorilla_habituation', label: 'Gorilla Habituation' },
  { key: 'chimpanzee_tracking', label: 'Chimpanzee Tracking' },
  { key: 'golden_monkey_tracking', label: 'Golden Monkey Tracking' },
  { key: 'chimpanzee_habituation', label: 'Chimpanzee Habituation' },
  { key: 'already_bought', label: 'Already Bought' },
] as const

type TripWithJoins = Trip & { vehicles?: Vehicle; drivers?: Driver }

function hasExperienceData(trip: TripWithJoins): boolean {
  return !!(trip.car_seats || trip.has_gps || trip.has_binoculars || trip.extras ||
    trip.gorilla_tracking || trip.gorilla_tracking_date || trip.gorilla_tracking_qty ||
    trip.gorilla_habituation || trip.gorilla_habituation_date || trip.gorilla_habituation_qty ||
    trip.chimpanzee_tracking || trip.chimpanzee_tracking_date || trip.chimpanzee_tracking_qty ||
    trip.golden_monkey_tracking || trip.golden_monkey_tracking_date || trip.golden_monkey_tracking_qty ||
    trip.chimpanzee_habituation || trip.chimpanzee_habituation_date || trip.chimpanzee_habituation_qty ||
    trip.already_bought || trip.already_bought_date || trip.already_bought_qty ||
    trip.activities)
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || '?'
}

const AVATAR_COLORS = [
  'bg-primary text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-violet-500 text-white',
  'bg-cyan-500 text-white',
]

function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function Experience() {
  const queryClient = useQueryClient()
  const blurRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [selected, setSelected] = useState<TripWithJoins | null>(null)
  const [form, setForm] = useState({
    car_seats: 0,
    has_gps: false,
    has_binoculars: false,
    extras: '',
    gorilla_tracking: false,
    gorilla_habituation: false,
    chimpanzee_tracking: false,
    chimpanzee_habituation: false,
    golden_monkey_tracking: false,
    already_bought: false,
    activities: '',
  })
  const [permitData, setPermitData] = useState<Record<string, { date: string; qty: number }>>({})
  const [expandedPermit, setExpandedPermit] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const savedFormRef = useRef(form)
  const savedPermitDataRef = useRef(permitData)

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips', false],
    queryFn: async () => {
      const { data } = await supabase
        .from('trips')
        .select('*, vehicles(registration_number, make, model), drivers(full_name)')
        .order('trip_start_date', { ascending: false })
      return (data || []).filter(isActiveTrip) as TripWithJoins[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return
      const payload: Record<string, unknown> = {
        car_seats: form.car_seats || null,
        has_gps: form.has_gps || null,
        has_binoculars: form.has_binoculars || null,
        extras: form.extras || null,
        gorilla_tracking: form.gorilla_tracking || null,
        gorilla_tracking_date: permitData.gorilla_tracking?.date || null,
        gorilla_tracking_qty: permitData.gorilla_tracking?.qty || null,
        gorilla_habituation: form.gorilla_habituation || null,
        gorilla_habituation_date: permitData.gorilla_habituation?.date || null,
        gorilla_habituation_qty: permitData.gorilla_habituation?.qty || null,
        chimpanzee_tracking: form.chimpanzee_tracking || null,
        chimpanzee_tracking_date: permitData.chimpanzee_tracking?.date || null,
        chimpanzee_tracking_qty: permitData.chimpanzee_tracking?.qty || null,
        chimpanzee_habituation: form.chimpanzee_habituation || null,
        chimpanzee_habituation_date: permitData.chimpanzee_habituation?.date || null,
        chimpanzee_habituation_qty: permitData.chimpanzee_habituation?.qty || null,
        golden_monkey_tracking: form.golden_monkey_tracking || null,
        golden_monkey_tracking_date: permitData.golden_monkey_tracking?.date || null,
        golden_monkey_tracking_qty: permitData.golden_monkey_tracking?.qty || null,
        already_bought: form.already_bought || null,
        already_bought_date: permitData.already_bought?.date || null,
        already_bought_qty: permitData.already_bought?.qty || null,
        activities: form.activities || null,
      }
      const { error } = await supabase.from('trips').update(payload).eq('id', selected.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      savedFormRef.current = { ...form }
      savedPermitDataRef.current = Object.fromEntries(Object.entries(permitData).map(([k, v]) => [k, { ...v }])) as Record<string, { date: string; qty: number }>
      setEditing(false)
      toast.success('Experience saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openModal(trip: TripWithJoins) {
    const f = {
      car_seats: trip.car_seats ?? 0,
      has_gps: trip.has_gps ?? false,
      has_binoculars: trip.has_binoculars ?? false,
      extras: trip.extras ?? '',
      gorilla_tracking: trip.gorilla_tracking ?? false,
      gorilla_habituation: trip.gorilla_habituation ?? false,
      chimpanzee_tracking: trip.chimpanzee_tracking ?? false,
      chimpanzee_habituation: trip.chimpanzee_habituation ?? false,
      golden_monkey_tracking: trip.golden_monkey_tracking ?? false,
      already_bought: trip.already_bought ?? false,
      activities: trip.activities ?? '',
    }
    const pd = {
      gorilla_tracking: { date: trip.gorilla_tracking_date ?? '', qty: trip.gorilla_tracking_qty ?? 1 },
      gorilla_habituation: { date: trip.gorilla_habituation_date ?? '', qty: trip.gorilla_habituation_qty ?? 1 },
      chimpanzee_tracking: { date: trip.chimpanzee_tracking_date ?? '', qty: trip.chimpanzee_tracking_qty ?? 1 },
      chimpanzee_habituation: { date: trip.chimpanzee_habituation_date ?? '', qty: trip.chimpanzee_habituation_qty ?? 1 },
      golden_monkey_tracking: { date: trip.golden_monkey_tracking_date ?? '', qty: trip.golden_monkey_tracking_qty ?? 1 },
      already_bought: { date: trip.already_bought_date ?? '', qty: trip.already_bought_qty ?? 1 },
    }
    setForm(f)
    setPermitData(pd)
    savedFormRef.current = { ...f }
    savedPermitDataRef.current = Object.fromEntries(Object.entries(pd).map(([k, v]) => [k, { ...v }])) as Record<string, { date: string; qty: number }>
    setEditing(false)
    setExpandedPermit(null)
    setSelected(trip)
  }

  if (isLoading) return <CardSkeleton count={3} />

  return (
    <div className="space-y-6">
      <PageHeader title="Experience" subtitle="Manage trip amenities, permits, and activities" />

      <p className="text-sm text-text-secondary">{trips.length} active trip{trips.length !== 1 ? 's' : ''}</p>

      <div className="flex flex-col gap-2">
        {trips.map(trip => {
          const added = hasExperienceData(trip)
          return (
            <button
              key={trip.id}
              onClick={() => openModal(trip)}
              className="flex items-center gap-4 rounded-xl border border-muted/40 bg-surface-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/20 cursor-pointer"
            >
              <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-full font-semibold text-sm ${getAvatarColor(trip.client_name)}`}>
                {getInitial(trip.client_name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">{trip.client_name}'s trip</p>
                <p className="text-xs text-text-secondary">{formatDate(trip.trip_start_date)} — {formatDate(trip.trip_end_date)}</p>
              </div>

              <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${added ? 'bg-success/10 text-success' : 'bg-muted/30 text-text-secondary'}`}>
                {added ? 'Added' : 'Not set'}
              </span>

              <svg className="h-4 w-4 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )
        })}

        {trips.length === 0 && (
          <div className="rounded-xl border border-dashed border-muted/40 bg-surface-2 p-14 text-center">
            <p className="text-text-secondary font-medium">No trips found</p>
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Experience — ${selected?.client_name || ''}`} className="max-w-xl">
        {selected && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Amenities</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Car Seats</label>
                    <input
                      type="number"
                      min={0}
                      value={form.car_seats}
                      onChange={e => setForm(f => ({ ...f, car_seats: Number(e.target.value) }))}
                      disabled={!editing}
                      className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="flex items-end pb-1">
                  <label className={`flex items-center gap-2 ${editing ? 'cursor-pointer' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.has_gps}
                      onChange={e => setForm(f => ({ ...f, has_gps: e.target.checked }))}
                      disabled={!editing}
                      className="rounded border-muted/60 text-primary focus:ring-primary disabled:opacity-50"
                    />
                    <span className="text-sm font-medium">GPS</span>
                  </label>
                </div>
                <div className="flex items-end pb-1">
                  <label className={`flex items-center gap-2 ${editing ? 'cursor-pointer' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.has_binoculars}
                      onChange={e => setForm(f => ({ ...f, has_binoculars: e.target.checked }))}
                      disabled={!editing}
                      className="rounded border-muted/60 text-primary focus:ring-primary disabled:opacity-50"
                    />
                    <span className="text-sm font-medium">Binoculars</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Extras</label>
                  <input
                    type="text"
                    value={form.extras}
                    onChange={e => setForm(f => ({ ...f, extras: e.target.value }))}
                    placeholder="e.g. Cooler box, child seat, Wi-Fi"
                    disabled={!editing}
                    className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-muted/30 pt-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Permits</h4>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {PERMITS.map(p => {
                  const checked = form[p.key as keyof typeof form] as boolean
                  const data = permitData[p.key]
                  const hasDetails = data && (data.date || data.qty)
                  const isExpanded = expandedPermit === p.key
                  return (
                    <div key={p.key} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <label className={`flex items-center gap-2 ${editing ? 'cursor-pointer' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              setForm(f => ({ ...f, [p.key]: e.target.checked }))
                              if (!e.target.checked) {
                                setPermitData(d => ({ ...d, [p.key]: { date: '', qty: 1 } }))
                              }
                            }}
                            disabled={!editing}
                            className="rounded border-muted/60 text-primary focus:ring-primary disabled:opacity-50"
                          />
                          <span className="text-sm font-medium">{p.label}</span>
                        </label>
                        {editing && checked && !isExpanded && !hasDetails && (
                          <button
                            type="button"
                            onClick={() => setExpandedPermit(p.key)}
                            className="text-xs text-primary/70 hover:text-primary cursor-pointer"
                          >+ <span className="underline">Add details</span></button>
                        )}
                        {checked && hasDetails && !isExpanded && (
                          editing ? (
                            <button
                              type="button"
                              onClick={() => setExpandedPermit(p.key)}
                              className="text-xs text-text-secondary hover:text-text-primary cursor-pointer"
                            >
                              <span className="text-success font-semibold">✓</span> ({data?.qty || 1}x, {data?.date ? formatDate(data.date, 'dd MMM') : '—'})
                            </button>
                          ) : (
                            <span className="text-xs text-text-secondary">
                              <span className="text-success font-semibold">✓</span> ({data?.qty || 1}x, {data?.date ? formatDate(data.date, 'dd MMM') : '—'})
                            </span>
                          )
                        )}
                      </div>
                      {isExpanded && (
                        <div
                          className="flex items-center gap-2 ml-1"
                          onBlur={e => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                              blurRef.current = setTimeout(() => setExpandedPermit(null), 120)
                            }
                          }}
                          onFocus={() => { if (blurRef.current) clearTimeout(blurRef.current) }}
                        >
                          <input
                            type="date"
                            value={data?.date || ''}
                            onChange={e => setPermitData(d => ({ ...d, [p.key]: { ...d[p.key], date: e.target.value, qty: d[p.key]?.qty || 1 } }))}
                            disabled={!editing}
                            className="w-36 px-2 py-1.5 border border-muted/60 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <input
                            type="number"
                            min={1}
                            value={data?.qty || 1}
                            onChange={e => setPermitData(d => ({ ...d, [p.key]: { ...d[p.key], date: d[p.key]?.date || '', qty: Math.max(1, Number(e.target.value)) } }))}
                            disabled={!editing}
                            className="w-16 px-2 py-1.5 border border-muted/60 rounded-lg text-xs text-center disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className="text-xs text-text-secondary">people</span>
                          {editing && (
                            <button
                              type="button"
                              onClick={() => setExpandedPermit(null)}
                              className="text-xs text-primary/70 hover:text-primary cursor-pointer underline"
                            >Done</button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-muted/30 pt-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Activities</h4>
              <textarea
                value={form.activities}
                onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
                placeholder="e.g. Game drive at Murchison Falls, boat safari, nature walk..."
                rows={4}
                disabled={!editing}
                className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => { if (!editing) setEditing(true) }}>Edit</Button>
              <Button variant="outline" onClick={() => {
                if (editing) {
                  setForm({ ...savedFormRef.current } as typeof form)
                  setPermitData({ ...savedPermitDataRef.current })
                  setEditing(false)
                } else {
                  setSelected(null)
                }
              }}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} disabled={!editing}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
