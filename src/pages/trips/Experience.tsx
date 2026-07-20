import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Modal, Button, CardSkeleton, StatusBadge, Badge, Table } from '@/components/common'
import type { Column } from '@/components/common'
import { formatDate, formatUGX, computeTripStatus } from '@/utils'
import toast from 'react-hot-toast'
import type { Trip, Vehicle, Driver } from '@/types'

type TripWithJoins = Trip & { vehicles?: Vehicle; drivers?: Driver }

const EXPERIENCE_FIELDS = [
  'car_seats', 'has_gps', 'extras', 'gorilla_tracking', 'chimpanzee_tracking', 'activities',
] as const

export function Experience() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<TripWithJoins | null>(null)
  const [form, setForm] = useState({
    car_seats: 0,
    has_gps: false,
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
      return (data || []) as TripWithJoins[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return
      const payload: Record<string, unknown> = {
        car_seats: form.car_seats || null,
        has_gps: form.has_gps || null,
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
      extras: trip.extras ?? '',
      gorilla_tracking: trip.gorilla_tracking ?? false,
      chimpanzee_tracking: trip.chimpanzee_tracking ?? false,
      activities: trip.activities ?? '',
    })
    setSelected(trip)
  }

  const columns: Column<TripWithJoins>[] = [
    { key: 'client_name', header: 'Client' },
    { key: 'clients', header: 'Clients', render: t => t.number_of_clients },
    { key: 'car_type', header: 'Car Type', render: t => <span className="capitalize">{t.car_type}</span> },
    {
      key: 'trip_type', header: 'Trip Type', render: t => (
        <div className="flex gap-1">
          {t.is_cross_border && <Badge variant="info">Cross Border</Badge>}
          {t.is_one_way && <Badge variant="warning">One Way</Badge>}
          {!t.is_cross_border && !t.is_one_way && <span className="text-text-secondary">Local</span>}
        </div>
      ),
    },
    {
      key: 'vehicle_driver', header: 'Vehicle / Driver', render: t => (
        <div>
          <p className="font-medium">{t.vehicles?.registration_number || '—'}</p>
          <p className="text-xs text-text-secondary">{t.drivers?.full_name || '—'}</p>
        </div>
      ),
    },
    { key: 'amount_in_ugx', header: 'Amount (UGX)', render: t => <span className="font-mono">{formatUGX(t.amount_in_ugx)}</span> },
    { key: 'payment_mode', header: 'Payment', render: t => <span className="capitalize">{t.payment_mode}</span> },
    {
      key: 'balance', header: 'Balance', render: t => (
        <span className={`font-mono ${t.balance > 0 ? 'text-warning' : 'text-success'}`}>{formatUGX(t.balance)}</span>
      ),
    },
    { key: 'trip_start_date', header: 'Start', render: t => formatDate(t.trip_start_date) },
    { key: 'trip_end_date', header: 'End', render: t => formatDate(t.trip_end_date) },
    { key: 'status', header: 'Status', render: t => <StatusBadge status={computeTripStatus(t)} /> },
    {
      key: 'experience', header: '', render: t => {
        const hasData = EXPERIENCE_FIELDS.some(f => t[f as keyof TripWithJoins])
        return hasData ? <Badge variant="success">Set</Badge> : <span className="text-xs text-text-secondary">—</span>
      },
    },
  ]

  if (isLoading) return <CardSkeleton count={3} />

  return (
    <div className="space-y-6">
      <PageHeader title="Experience" subtitle="Manage trip amenities, permits, and activities" />

      <Table<TripWithJoins>
        columns={columns}
        data={trips}
        onRowClick={openModal}
        emptyMessage="No trips found"
      />

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
