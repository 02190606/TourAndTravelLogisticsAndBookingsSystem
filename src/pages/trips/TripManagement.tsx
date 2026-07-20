import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal, StatusBadge, Badge, CardSkeleton } from '@/components/common'
import { formatDate, formatUGX, generateId, getDaysBetween, computeTripStatus, sanitizeTripPayload } from '@/utils'
import toast from 'react-hot-toast'
import { MapPin } from 'lucide-react'
import type { Trip, TripStatus, Vehicle, Driver } from '@/types'

export function TripManagement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTrip, setEditTrip] = useState<Trip | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null)
  const [viewTrip, setViewTrip] = useState<Trip & { vehicles?: Vehicle; drivers?: Driver } | null>(null)

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trips')
        .select('*, vehicles!left(registration_number, make, model), drivers!left(full_name, license_number)')
        .order('trip_start_date', { ascending: false })
      return (data || []) as (Trip & { vehicles?: Vehicle; drivers?: Driver })[]
    },
  })

  const deleteTrip = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase.from('trips').update({ status: 'cancelled' as TripStatus }).eq('id', tripId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); setDeleteTarget(null); toast.success('Trip cancelled') },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns = [
    { key: 'client_name', header: 'Client' },
    { key: 'clients', header: 'Clients', render: (t: any) => t.number_of_clients },
    { key: 'car_type', header: 'Car Type' },
    { key: 'trip_type', header: 'Trip Type', render: (t: any) => (
      <div className="flex gap-1 flex-wrap">
        {t.is_cross_border && <Badge variant="info">Cross Border</Badge>}
        {t.is_one_way && <Badge variant="warning">One Way</Badge>}
        {!t.is_cross_border && !t.is_one_way && <span className="text-text-secondary text-xs">Local</span>}
      </div>
    )},
    { key: 'vehicle', header: 'Vehicle', render: (t: any) => t.vehicles?.registration_number || '-' },
    { key: 'driver', header: 'Driver', render: (t: any) => t.drivers?.full_name || '-' },
    { key: 'amount_in_ugx', header: 'Amount (UGX)', render: (t: any) => formatUGX(t.amount_in_ugx) },
    { key: 'payment_mode', header: 'Payment', render: (t: any) => <span className="capitalize">{t.payment_mode}</span> },
    { key: 'balance', header: 'Balance', render: (t: any) => (
      <span className={t.balance > 0 ? 'text-warning font-mono' : 'text-success font-mono'}>{formatUGX(t.balance)}</span>
    )},
    { key: 'trip_start_date', header: 'Start', render: (t: any) => formatDate(t.trip_start_date) },
    { key: 'trip_end_date', header: 'End', render: (t: any) => formatDate(t.trip_end_date) },
    { key: 'status', header: 'Status', render: (t: any) => <StatusBadge status={computeTripStatus(t)} /> },
    { key: 'actions', header: 'Actions', render: (t: any) => (
      <div className="flex gap-2">
        <button onClick={() => setViewTrip(t)} className="text-xs text-primary hover:underline cursor-pointer">View</button>
        <button onClick={() => { setEditTrip(t); setDrawerOpen(true) }} className="text-xs text-text-secondary hover:underline cursor-pointer">Edit</button>
        <button onClick={() => setDeleteTarget(t)} className="text-xs text-danger hover:underline cursor-pointer">Cancel</button>
      </div>
    )},
  ]

  if (isLoading) return <CardSkeleton count={3} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Trips"
        subtitle={`${trips.length} trips`}
        actions={<Button onClick={() => { setEditTrip(null); setDrawerOpen(true) }}>Create Trip</Button>}
      />

      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full responsive-table">
            <thead>
              <tr className="bg-muted/20">
                {columns.map(col => (
                  <th key={col.key} className="px-3 py-3 text-left text-xs font-semibold text-text-secondary uppercase whitespace-nowrap">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {trips.map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                  {columns.map(col => (
                    <td key={col.key} data-label={col.header} className="px-3 py-3 text-sm whitespace-nowrap">{col.render ? col.render(t) : (t as any)[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TripDrawer key={editTrip?.id || 'new'} open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditTrip(null) }} editTrip={editTrip} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Cancel Trip">
        {deleteTarget && (
          <div className="space-y-4">
            <p>Cancel trip for <strong>{deleteTarget.client_name}</strong>? This action will be logged.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Back</Button>
              <Button variant="danger" onClick={() => deleteTrip.mutate(deleteTarget.id)}>Confirm Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!viewTrip} onClose={() => setViewTrip(null)} title="Trip Details" className="max-w-2xl">
        {viewTrip && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><span className="text-text-secondary text-sm">Client:</span><p className="font-semibold">{viewTrip.client_name}</p></div>
              <div><span className="text-text-secondary text-sm">Clients:</span><p>{viewTrip.number_of_clients}</p></div>
              <div><span className="text-text-secondary text-sm">Car Type:</span><p className="capitalize">{viewTrip.car_type}</p></div>
              <div><span className="text-text-secondary text-sm">Vehicle:</span><p>{viewTrip.vehicles?.registration_number || '-'}</p></div>
              <div><span className="text-text-secondary text-sm">Driver:</span><p>{viewTrip.drivers?.full_name || '-'}</p></div>
              <div><span className="text-text-secondary text-sm">Status:</span><StatusBadge status={computeTripStatus(viewTrip)} /></div>
            </div>
            <div className="border-t border-muted/30 pt-4">
              <h4 className="font-medium mb-3">📅 Schedule</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center p-3 bg-muted/20 rounded-xl">
                  <p className="text-xs text-text-secondary">Start</p>
                  <p className="font-semibold text-sm">{formatDate(viewTrip.trip_start_date)}</p>
                </div>
                <div className="text-text-secondary">→</div>
                <div className="flex-1 text-center p-3 bg-muted/20 rounded-xl">
                  <p className="text-xs text-text-secondary">End</p>
                  <p className="font-semibold text-sm">{formatDate(viewTrip.trip_end_date)}</p>
                </div>
              </div>
              {viewTrip.pickup_location && (
                <div className="mt-3 text-sm">
                  <span className="text-text-secondary">Pickup Location:</span> <span className="font-medium">{viewTrip.pickup_location}</span>
                </div>
              )}
              {(viewTrip.is_cross_border || viewTrip.is_one_way) && (
                <div className="mt-2 flex gap-2">
                  {viewTrip.is_cross_border && <Badge variant="info">Cross Border</Badge>}
                  {viewTrip.is_one_way && <Badge variant="warning">One Way</Badge>}
                </div>
              )}
            </div>
            {viewTrip.needs_accommodation && (
              <div className="border-t border-muted/30 pt-4">
                <h4 className="font-medium mb-3">🏨 Accommodation</h4>
                <div className="bg-muted/20 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-secondary">Hotel</span><span className="font-medium">{viewTrip.accommodation_name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Check-in</span><span>{viewTrip.accommodation_checkin ? formatDate(viewTrip.accommodation_checkin) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Check-out</span><span>{viewTrip.accommodation_checkout ? formatDate(viewTrip.accommodation_checkout) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Rooms</span><span>{viewTrip.accommodation_rooms || '—'}</span></div>
                  {(viewTrip.accommodation_cost ?? 0) > 0 && <div className="flex justify-between border-t border-muted/30 pt-2"><span className="text-text-secondary">Cost</span><span className="font-mono font-semibold">{formatUGX(viewTrip.accommodation_cost ?? 0)}</span></div>}
                </div>
              </div>
            )}
            <div className="border-t border-muted/30 pt-4">
              <h4 className="font-medium mb-3">💳 Payment</h4>
              <div className="bg-muted/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span>Total (UGX)</span><span className="font-mono font-semibold">{formatUGX(viewTrip.amount_in_ugx)}</span></div>
                <div className="flex justify-between text-sm"><span>Paid</span><span className="font-mono text-success">{formatUGX(viewTrip.amount_paid)}</span></div>
                <div className="flex justify-between text-sm border-t border-muted/30 pt-2"><span>Balance</span><span className={`font-mono font-semibold ${viewTrip.balance > 0 ? 'text-warning' : 'text-success'}`}>{formatUGX(viewTrip.balance)}</span></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TripDrawer({ open, onClose, editTrip }: { open: boolean; onClose: () => void; editTrip: Trip | null }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    client_name: editTrip?.client_name || '',
    number_of_clients: editTrip?.number_of_clients || 1,
    car_type: editTrip?.car_type || 'sedan',
    vehicle_id: editTrip?.vehicle_id || '',
    driver_id: editTrip?.driver_id || '',
    trip_start_date: editTrip?.trip_start_date?.split('T')[0] || '',
    trip_end_date: editTrip?.trip_end_date?.split('T')[0] || '',
    flight_arrival_time: editTrip?.flight_arrival_time || '',
    pickup_location: editTrip?.pickup_location || '',
    is_cross_border: editTrip?.is_cross_border || false,
    is_one_way: editTrip?.is_one_way || false,
    needs_accommodation: editTrip?.needs_accommodation || false,
    accommodation_name: editTrip?.accommodation_name || '',
    accommodation_checkin: editTrip?.accommodation_checkin?.split('T')[0] || '',
    accommodation_checkout: editTrip?.accommodation_checkout?.split('T')[0] || '',
    accommodation_rooms: editTrip?.accommodation_rooms || 1,
    accommodation_cost: editTrip?.accommodation_cost || 0,
    currency: editTrip?.currency || 'UGX',
    amount: 0,
    amount_in_ugx: editTrip?.amount_in_ugx || 0,
    payment_mode: editTrip?.payment_mode || 'cash',
    amount_paid: editTrip?.amount_paid || 0,
    balance: editTrip?.balance || 0,
    exchangeRate: 1,
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['available-vehicles', form.car_type],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model')
        .eq('status', 'available')
      return (data || []) as Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model'>[]
    },
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['active-drivers'],
    queryFn: async () => {
      const { data } = await supabase.from('drivers').select('id, full_name, license_number').eq('is_active', true)
      return (data || []) as Pick<Driver, 'id' | 'full_name' | 'license_number'>[]
    },
  })

  const days = form.trip_start_date && form.trip_end_date
    ? getDaysBetween(form.trip_start_date, form.trip_end_date)
    : 0

  function updateCurrency(currency: string) {
    setForm(f => ({ ...f, currency }))
  }

  function updateAmount(amount: number) {
    setForm(f => {
      const ugx = f.currency === 'UGX' ? amount : Math.round(amount * f.exchangeRate)
      const balance = ugx - f.amount_paid
      return { ...f, amount, amount_in_ugx: ugx, balance: Math.max(0, balance) }
    })
  }

  function updateAmountPaid(paid: number) {
    setForm(f => {
      const balance = Math.max(0, f.amount_in_ugx - paid)
      return { ...f, amount_paid: paid, balance }
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.trip_start_date) throw new Error('Trip Start Date is required')
      if (!form.trip_end_date) throw new Error('Trip End Date is required')
      if (form.needs_accommodation) {
        if (!form.accommodation_checkin) throw new Error('Check-in Date is required when accommodation is needed')
        if (!form.accommodation_checkout) throw new Error('Check-out Date is required when accommodation is needed')
      }
      const payload = {
        client_name: form.client_name,
        number_of_clients: Number(form.number_of_clients),
        car_type: form.car_type,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        trip_start_date: form.trip_start_date,
        trip_end_date: form.trip_end_date,
        flight_arrival_time: form.flight_arrival_time || null,
        pickup_location: form.pickup_location || null,
        is_cross_border: form.is_cross_border,
        is_one_way: form.is_one_way,
        needs_accommodation: form.needs_accommodation,
        accommodation_name: form.accommodation_name || null,
        accommodation_checkin: form.accommodation_checkin || null,
        accommodation_checkout: form.accommodation_checkout || null,
        accommodation_rooms: form.accommodation_rooms || null,
        accommodation_cost: form.accommodation_cost || null,
        currency: form.currency,
        amount_in_ugx: Number(form.amount_in_ugx),
        payment_mode: form.payment_mode,
        amount_paid: Number(form.amount_paid),
        balance: Number(form.balance),
      }
      console.log('[TripDrawer] payload being sent:', JSON.stringify(payload, null, 2))
      if (editTrip) {
        const { error } = await supabase.from('trips').update(payload).eq('id', editTrip.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('trips').insert({ id: generateId('TRP'), ...payload })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      // Release vehicle
      if (form.vehicle_id && !editTrip) {
        supabase.from('vehicles').update({ status: 'on_trip' }).eq('id', form.vehicle_id)
      }
      onClose()
      toast.success(editTrip ? 'Trip updated' : 'Trip created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title={editTrip ? 'Edit Trip' : 'Create Trip'} width="max-w-2xl">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Client Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client Name *</label>
              <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Number of Clients</label>
              <input type="number" value={form.number_of_clients} onChange={e => setForm(f => ({ ...f, number_of_clients: Number(e.target.value) }))} min={1} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Accommodation</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.needs_accommodation} onChange={e => setForm(f => ({ ...f, needs_accommodation: e.target.checked }))} className="rounded border-muted/60 text-primary focus:ring-primary" />
                <span className="text-sm font-medium">Needs Accommodation</span>
              </label>
            </div>
            {form.needs_accommodation && (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Hotel / Accommodation Name</label>
                  <input value={form.accommodation_name} onChange={e => setForm(f => ({ ...f, accommodation_name: e.target.value }))} placeholder="e.g. Serena Hotel Kampala" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check-in Date *</label>
                  <input type="date" value={form.accommodation_checkin} onChange={e => setForm(f => ({ ...f, accommodation_checkin: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check-out Date *</label>
                  <input type="date" value={form.accommodation_checkout} onChange={e => setForm(f => ({ ...f, accommodation_checkout: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Rooms</label>
                  <input type="number" value={form.accommodation_rooms} onChange={e => setForm(f => ({ ...f, accommodation_rooms: Number(e.target.value) }))} min={1} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Accommodation Cost (UGX)</label>
                  <input type="number" value={form.accommodation_cost} onChange={e => setForm(f => ({ ...f, accommodation_cost: Number(e.target.value) }))} min={0} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Vehicle & Driver</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Car Type Requested</label>
              <select value={form.car_type} onChange={e => setForm(f => ({ ...f, car_type: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm capitalize">
                {['sedan', 'suv', 'van', 'bus', 'minibus'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assign Vehicle</label>
              <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
                <option value="">Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assign Driver</label>
              <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
                <option value="">Select driver</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name} ({d.license_number})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Schedule</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trip Start Date</label>
              <input type="date" value={form.trip_start_date} onChange={e => setForm(f => ({ ...f, trip_start_date: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trip End Date</label>
              <input type="date" value={form.trip_end_date} onChange={e => setForm(f => ({ ...f, trip_end_date: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            {days > 0 && (
              <div className="sm:col-span-2">
                <span className="inline-block px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-sm font-medium">{days} {days === 1 ? 'Day' : 'Days'}</span>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Trip Type</label>
              <div className="flex gap-5 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_cross_border} onChange={e => setForm(f => ({ ...f, is_cross_border: e.target.checked }))} className="rounded border-muted/60 text-primary focus:ring-primary" />
                  <span className="text-sm">Cross Border Trip</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_one_way} onChange={e => setForm(f => ({ ...f, is_one_way: e.target.checked }))} className="rounded border-muted/60 text-primary focus:ring-primary" />
                  <span className="text-sm">One Way Trip</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Flight Arrival Time 🛫</label>
              <input type="time" value={form.flight_arrival_time} onChange={e => setForm(f => ({ ...f, flight_arrival_time: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1"><MapPin className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" />Pickup Location</label>
              <input type="text" value={form.pickup_location} onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))} placeholder="e.g. Entebbe Airport, Terminal 1" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Payment</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select value={form.currency} onChange={e => updateCurrency(e.target.value)} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
                {['UGX', 'USD', 'EUR', 'GBP', 'KES', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {form.currency !== 'UGX' && (
              <div>
                <label className="block text-sm font-medium mb-1">Exchange Rate (1 {form.currency} = ? UGX)</label>
                <input type="number" value={form.exchangeRate} onChange={e => setForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))} step="0.01" min="0.01" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Amount ({form.currency})</label>
              <input type="number" value={form.amount} onChange={e => updateAmount(Number(e.target.value))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            {form.currency !== 'UGX' && (
              <div>
                <label className="block text-sm font-medium mb-1">Amount (UGX)</label>
                <div className="w-full px-3 py-2.5 bg-muted/20 rounded-xl text-sm font-mono font-semibold text-primary">{form.amount_in_ugx.toLocaleString()} UGX</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode</label>
              <div className="flex gap-4 mt-2">
                {['cash', 'credit'].map(m => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="payment_mode" checked={form.payment_mode === m} onChange={() => setForm(f => ({ ...f, payment_mode: m as 'cash' | 'credit' }))} className="text-primary" />
                    <span className="text-sm capitalize">{m}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount Paid</label>
              <input type="number" value={form.amount_paid} onChange={e => updateAmountPaid(Number(e.target.value))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Balance</label>
              <div className={`w-full px-3 py-2.5 rounded-xl text-sm font-mono font-semibold ${form.balance > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {form.balance.toLocaleString()} UGX
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-4 border-t border-muted/30 flex gap-3">
          <Button type="submit" isLoading={saveMutation.isPending}>Save Trip</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
