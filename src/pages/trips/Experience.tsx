import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Modal, Button, CardSkeleton } from '@/components/common'
import { formatDate, computeTripStatus, isActiveTrip } from '@/utils'
import toast from 'react-hot-toast'
import type { Trip, Vehicle, Driver } from '@/types'

type TripWithJoins = Trip & { vehicles?: Vehicle; drivers?: Driver }

function hasExperienceData(trip: TripWithJoins): boolean {
  return !!(trip.car_seats || trip.has_gps || trip.has_binoculars || trip.extras || trip.gorilla_tracking || trip.chimpanzee_tracking || trip.activities)
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
  const [selected, setSelected] = useState<TripWithJoins | null>(null)
  const [form, setForm] = useState({
    car_seats: 0,
    has_gps: false,
    has_binoculars: false,
    extras: '',
    gorilla_tracking: false,
    chimpanzee_tracking: false,
    activities: '',
  })

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
        chimpanzee_tracking: form.chimpanzee_tracking || null,
        activities: form.activities || null,
      }
      const { error } = await supabase.from('trips').update(payload).eq('id', selected.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      setSelected(null)
      toast.success('Experience saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openModal(trip: TripWithJoins) {
    setForm({
      car_seats: trip.car_seats ?? 0,
      has_gps: trip.has_gps ?? false,
      has_binoculars: trip.has_binoculars ?? false,
      extras: trip.extras ?? '',
      gorilla_tracking: trip.gorilla_tracking ?? false,
      chimpanzee_tracking: trip.chimpanzee_tracking ?? false,
      activities: trip.activities ?? '',
    })
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
                    className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.has_gps}
                      onChange={e => setForm(f => ({ ...f, has_gps: e.target.checked }))}
                      className="rounded border-muted/60 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">GPS</span>
                  </label>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.has_binoculars}
                      onChange={e => setForm(f => ({ ...f, has_binoculars: e.target.checked }))}
                      className="rounded border-muted/60 text-primary focus:ring-primary"
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
                    className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-muted/30 pt-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Permits</h4>
              <div className="flex gap-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.gorilla_tracking}
                    onChange={e => setForm(f => ({ ...f, gorilla_tracking: e.target.checked }))}
                    className="rounded border-muted/60 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Gorilla Tracking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.chimpanzee_tracking}
                    onChange={e => setForm(f => ({ ...f, chimpanzee_tracking: e.target.checked }))}
                    className="rounded border-muted/60 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Chimpanzee Tracking</span>
                </label>
              </div>
            </div>

            <div className="border-t border-muted/30 pt-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Activities</h4>
              <textarea
                value={form.activities}
                onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
                placeholder="e.g. Game drive at Murchison Falls, boat safari, nature walk..."
                rows={4}
                className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
