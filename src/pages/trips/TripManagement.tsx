import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal, StatusBadge, CardSkeleton } from '@/components/common'
import { formatDate, formatUGX, generateId, getDaysBetween, computeTripStatus } from '@/utils'
import toast from 'react-hot-toast'
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
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
      const { amount: _amount, exchangeRate: _exchangeRate, ...dbFields } = form
      const payload = {
        ...dbFields,
        number_of_clients: Number(form.number_of_clients),
        amount_in_ugx: Number(form.amount_in_ugx),
        amount_paid: Number(form.amount_paid),
        balance: Number(form.balance),
      }
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
          <div className="grid grid-cols-2 gap-4">
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
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Vehicle & Driver</h4>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trip Start Date</label>
              <input type="date" value={form.trip_start_date} onChange={e => setForm(f => ({ ...f, trip_start_date: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trip End Date</label>
              <input type="date" value={form.trip_end_date} onChange={e => setForm(f => ({ ...f, trip_end_date: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Flight Arrival Time 🛫</label>
              <input type="time" value={form.flight_arrival_time} onChange={e => setForm(f => ({ ...f, flight_arrival_time: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            {days > 0 && (
              <div className="flex items-end">
                <span className="px-3 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium">{days} Days</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Payment</h4>
          <div className="grid grid-cols-2 gap-4">
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
