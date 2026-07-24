import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Trip | null>(null)
  const [viewTrip, setViewTrip] = useState<Trip & { vehicles?: Vehicle; drivers?: Driver } | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!actionMenuOpen) return
    const btn = buttonRefs.current[actionMenuOpen]
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const menuHeight = 180
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < menuHeight
      setMenuPos({
        top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 160),
      })
    }
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActionMenuOpen(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [actionMenuOpen])

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips', showCancelled],
    queryFn: async () => {
      const query = supabase
        .from('trips')
        .select('*, vehicles!left(registration_number, make, model), drivers!left(full_name, license_number)')
        .order('trip_start_date', { ascending: false })
      if (showCancelled) {
        query.eq('status', 'cancelled')
      } else {
        query.neq('status', 'cancelled')
      }
      const { data } = await query
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

  const permanentDeleteTrip = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase.from('trips').delete().eq('id', tripId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); setPermanentDeleteTarget(null); toast.success('Trip permanently deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns = [
    { key: 'client_name', header: 'Client', render: (t: any) => <span className={!t.client_name ? 'text-text-secondary italic' : ''}>{t.client_name || 'Unnamed trip'}</span> },
    { key: 'clients', header: 'Clients', render: (t: any) => t.number_of_clients },
    { key: 'car_type', header: 'Car Type' },
    { key: 'trip_type', header: 'Trip Type', render: (t: any) => (
      <div className="flex gap-1 flex-wrap">
        {t.is_cross_border && <Badge variant="info">Cross Border</Badge>}
        {t.is_one_way && <Badge variant="warning">One Way</Badge>}
        {!t.is_cross_border && !t.is_one_way && <span className="text-text-secondary text-xs">Local</span>}
      </div>
    )},
    { key: 'vehicle_driver', header: 'Vehicle / Driver', render: (t: any) => (
      <div className="leading-tight">
        <span className="font-medium">{t.vehicles?.registration_number || '—'}</span>
        <span className="text-text-secondary text-xs block">{t.drivers?.full_name || '—'}</span>
      </div>
    )},
    { key: 'amount_in_ugx', header: 'Amount (UGX)', render: (t: any) => <span className="font-mono">{(t.amount_in_ugx || 0).toLocaleString()}</span> },
    { key: 'amount_paid', header: 'Paid (UGX)', render: (t: any) => <span className="font-mono text-success">{(t.amount_paid || 0).toLocaleString()}</span> },
    { key: 'payment_mode', header: 'Payment', render: (t: any) => <span className="capitalize">{t.payment_mode}</span> },
    { key: 'balance', header: 'Balance (UGX)', render: (t: any) => (
      <span className={t.balance > 0 ? 'text-warning font-mono' : 'text-success font-mono'}>{(t.balance || 0).toLocaleString()}</span>
    )},
    { key: 'trip_start_date', header: 'Start', render: (t: any) => t.trip_start_date ? formatDate(t.trip_start_date) : <span className="text-text-secondary">—</span> },
    { key: 'trip_end_date', header: 'End', render: (t: any) => t.trip_end_date ? formatDate(t.trip_end_date) : <span className="text-text-secondary">—</span> },
    { key: 'status', header: 'Status', render: (t: any) => <StatusBadge status={computeTripStatus(t)} /> },
    { key: 'actions', header: '', render: (t: any) => (
      <>
        <button
          ref={(el) => { buttonRefs.current[t.id] = el }}
          onClick={() => setActionMenuOpen(actionMenuOpen === t.id ? null : t.id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/30 text-text-secondary cursor-pointer text-lg leading-none"
        >⋮</button>
        {actionMenuOpen === t.id && createPortal(
          <div ref={menuRef} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }} className="bg-white border border-muted/40 rounded-xl shadow-lg py-1 min-w-[140px]">
            <button onClick={() => { setViewTrip(t); setActionMenuOpen(null) }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/20 cursor-pointer">View</button>
            <button onClick={() => { setEditTrip(t); setDrawerOpen(true); setActionMenuOpen(null) }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/20 cursor-pointer">Edit</button>
            <button onClick={() => { setDeleteTarget(t); setActionMenuOpen(null) }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/20 cursor-pointer text-danger">Cancel</button>
            <button onClick={() => { setPermanentDeleteTarget(t); setActionMenuOpen(null) }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/20 cursor-pointer text-orange-600">Delete</button>
          </div>,
          document.body
        )}
      </>
    )},
  ]

  if (isLoading) return <CardSkeleton count={3} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Trips"
        subtitle={`${trips.length} trips`}
        actions={<>
          <div className="flex items-center rounded-lg border border-muted/40 overflow-hidden text-xs">
            <button onClick={() => setShowCancelled(false)} className={`px-3 py-1.5 cursor-pointer ${!showCancelled ? 'bg-primary text-white' : 'text-text-secondary hover:bg-muted/20'}`}>Active</button>
            <button onClick={() => setShowCancelled(true)} className={`px-3 py-1.5 cursor-pointer ${showCancelled ? 'bg-primary text-white' : 'text-text-secondary hover:bg-muted/20'}`}>Cancelled</button>
          </div>
          <Button onClick={() => { setEditTrip(null); setDrawerOpen(true) }}>Create Trip</Button>
        </>}
      />

      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full responsive-table">
            <thead>
              <tr className="bg-muted/20">
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase whitespace-nowrap border-r border-muted/20 last:border-r-0">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {trips.map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                  {columns.map(col => (
                    <td key={col.key} data-label={col.header} className="px-4 py-3.5 text-sm whitespace-nowrap">{col.render ? col.render(t) : (t as any)[col.key]}</td>
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
            <p>Cancel trip for <strong>{deleteTarget.client_name || 'Unnamed trip'}</strong>? This action will be logged.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Back</Button>
              <Button variant="danger" onClick={() => deleteTrip.mutate(deleteTarget.id)}>Confirm Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!permanentDeleteTarget} onClose={() => setPermanentDeleteTarget(null)} title="Delete Trip">
        {permanentDeleteTarget && (
          <div className="space-y-4">
            <p>Are you sure you want to permanently delete this trip for <strong>{permanentDeleteTarget.client_name || 'Unnamed trip'}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPermanentDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => permanentDeleteTrip.mutate(permanentDeleteTarget.id)} isLoading={permanentDeleteTrip.isPending}>Confirm Delete</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!viewTrip} onClose={() => setViewTrip(null)} title="" className="max-w-2xl">
        {viewTrip && (
          <div className="space-y-0">
            {/* Header */}
            <div className="flex items-center gap-4 pb-5">
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-primary text-white font-bold text-lg">
                {viewTrip.client_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-text-primary">{viewTrip.client_name || 'Unnamed trip'}</p>
                <p className="text-sm text-text-secondary">{viewTrip.number_of_clients} client{viewTrip.number_of_clients !== 1 ? 's' : ''}</p>
              </div>
              <StatusBadge status={computeTripStatus(viewTrip)} />
            </div>

            {/* Vehicle & Driver */}
            <div className="grid grid-cols-2 gap-4 border-t border-muted/30 py-4">
              <div>
                <p className="text-[13px] text-text-secondary mb-0.5">Car Type</p>
                <p className="text-[15px] font-bold capitalize text-text-primary">{viewTrip.car_type}</p>
              </div>
              <div>
                <p className="text-[13px] text-text-secondary mb-0.5">Vehicle</p>
                <p className="text-[15px] font-bold text-text-primary">{viewTrip.vehicles?.registration_number || '—'}</p>
              </div>
              <div>
                <p className="text-[13px] text-text-secondary mb-0.5">Driver</p>
                <p className="text-[15px] font-bold text-text-primary">{viewTrip.drivers?.full_name || '—'}</p>
              </div>
              {(viewTrip.pickup_location || viewTrip.Destination) && (
                <div>
                  <p className="text-[13px] text-text-secondary mb-0.5">Route</p>
                  <p className="text-[15px] font-bold text-text-primary">{viewTrip.pickup_location || '—'} → {viewTrip.Destination || '—'}</p>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="border-t border-muted/30 py-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Schedule</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-xl border border-muted/40 bg-surface-2 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-text-secondary mb-0.5">Start</p>
                  <p className="text-sm font-bold text-text-primary">{formatDate(viewTrip.trip_start_date)}</p>
                </div>
                <svg className="h-5 w-5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                <div className="flex-1 rounded-xl border border-muted/40 bg-surface-2 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-text-secondary mb-0.5">End</p>
                  <p className="text-sm font-bold text-text-primary">{formatDate(viewTrip.trip_end_date)}</p>
                </div>
              </div>
              {(viewTrip.is_cross_border || viewTrip.is_one_way || viewTrip.return_trip) && (
                <div className="flex gap-2 mt-3">
                  {viewTrip.is_cross_border && <Badge variant="info">Cross Border</Badge>}
                  {viewTrip.is_one_way && <Badge variant="warning">One Way</Badge>}
                  {viewTrip.return_trip && <Badge variant="info">Return Trip</Badge>}
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="border-t border-muted/30 py-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Payment</span>
              </div>
              <div className="rounded-xl border border-muted/40 bg-surface-2 divide-y divide-muted/30">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-text-secondary">Total</span>
                  <span className="text-[15px] font-bold font-mono text-text-primary">{formatUGX(viewTrip.amount_in_ugx)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-text-secondary">Paid</span>
                  <span className="text-[15px] font-bold font-mono text-success">{formatUGX(viewTrip.amount_paid)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-text-secondary">Balance</span>
                  <span className={`text-[15px] font-bold font-mono ${viewTrip.balance > 0 ? 'text-warning' : 'text-success'}`}>{formatUGX(viewTrip.balance)}</span>
                </div>
              </div>
            </div>

            {/* Experience */}
            <div className="border-t border-muted/30 py-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0 3.5 3.5M12 12l-3.5 3.5M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" /></svg>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Experience</span>
              </div>
              {(() => {
                const hasExperience = viewTrip.car_seats || viewTrip.has_gps || viewTrip.extras || viewTrip.gorilla_tracking || viewTrip.chimpanzee_tracking || viewTrip.activities
                if (!hasExperience) return <p className="text-sm text-text-secondary">No experience details added yet.</p>
                return (
                  <div className="rounded-xl border border-muted/40 bg-surface-2 divide-y divide-muted/30">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] text-text-secondary">Car Seats</span>
                      <span className="text-[15px] font-bold text-text-primary">{viewTrip.car_seats ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] text-text-secondary">GPS</span>
                      <span className="text-[15px] font-bold text-text-primary">{viewTrip.has_gps ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] text-text-secondary">Extras</span>
                      <span className="text-[15px] font-bold text-text-primary">{viewTrip.extras || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] text-text-secondary">Gorilla Tracking</span>
                      <span className={`text-[15px] font-bold ${viewTrip.gorilla_tracking ? 'text-success' : 'text-text-primary'}`}>{viewTrip.gorilla_tracking ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] text-text-secondary">Chimpanzee Tracking</span>
                      <span className={`text-[15px] font-bold ${viewTrip.chimpanzee_tracking ? 'text-success' : 'text-text-primary'}`}>{viewTrip.chimpanzee_tracking ? 'Yes' : 'No'}</span>
                    </div>
                    {viewTrip.activities && (
                      <div className="px-4 py-3">
                        <p className="text-[15px] text-text-secondary mb-1">Activities</p>
                        <p className="text-[15px] font-bold text-text-primary whitespace-pre-wrap">{viewTrip.activities}</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TripDrawer({ open, onClose, editTrip }: { open: boolean; onClose: () => void; editTrip: Trip | null }) {
  const queryClient = useQueryClient()
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [newVehicle, setNewVehicle] = useState({ registration_number: '' })
  const [newDriver, setNewDriver] = useState({ full_name: '', phone: '' })
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
    destination: editTrip?.Destination || '',
    is_cross_border: editTrip?.is_cross_border || false,
    is_one_way: editTrip?.is_one_way || false,
    is_return_trip: editTrip?.return_trip ?? false,
    needs_accommodation: editTrip?.needs_accommodation || false,
    accommodation_name: editTrip?.accommodation_name || '',
    accommodation_checkin: editTrip?.accommodation_checkin?.split('T')[0] || '',
    accommodation_checkout: editTrip?.accommodation_checkout?.split('T')[0] || '',
    accommodation_rooms: editTrip?.accommodation_rooms ?? null,
    accommodation_cost: editTrip?.accommodation_cost ?? null,
    currency: editTrip?.currency || 'UGX',
    amount: 0,
    amount_in_ugx: editTrip?.amount_in_ugx ?? null,
    payment_mode: editTrip?.payment_mode || 'cash',
    amount_paid: editTrip?.amount_paid ?? null,
    balance: editTrip?.balance ?? null,
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

  const addVehicleMutation = useMutation({
    mutationFn: async () => {
      if (!newVehicle.registration_number) throw new Error('Registration number is required')
      const id = generateId('VEH')
      const { error } = await supabase.from('vehicles').insert({ id, registration_number: newVehicle.registration_number, source: 'trips' })
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] })
      setForm(f => ({ ...f, vehicle_id: id }))
      setShowAddVehicle(false)
      setNewVehicle({ registration_number: '' })
      toast.success('Vehicle added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addDriverMutation = useMutation({
    mutationFn: async () => {
      if (!newDriver.full_name) throw new Error('Driver name is required')
      const id = generateId('DRV')
      const { error } = await supabase.from('drivers').insert({ id, full_name: newDriver.full_name, phone: newDriver.phone, source: 'trips' })
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['active-drivers'] })
      setForm(f => ({ ...f, driver_id: id }))
      setShowAddDriver(false)
      setNewDriver({ full_name: '', phone: '' })
      toast.success('Driver added')
    },
    onError: (err: Error) => toast.error(err.message),
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
      const balance = Math.max(0, ugx - (f.amount_paid ?? 0))
      return { ...f, amount, amount_in_ugx: ugx, balance }
    })
  }

  function updateAmountPaid(paid: number) {
    setForm(f => {
      const balance = Math.max(0, (f.amount_in_ugx ?? 0) - paid)
      return { ...f, amount_paid: paid, balance }
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        client_name: form.client_name || null,
        number_of_clients: Number(form.number_of_clients) || 1,
        car_type: form.car_type,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        trip_start_date: form.trip_start_date || null,
        trip_end_date: form.trip_end_date || null,
        flight_arrival_time: form.flight_arrival_time || null,
        pickup_location: form.pickup_location || null,
        Destination: form.destination || null,
        is_cross_border: form.is_cross_border,
        is_one_way: form.is_one_way,
        return_trip: form.is_return_trip || null,
        needs_accommodation: form.needs_accommodation,
        accommodation_name: form.accommodation_name || null,
        accommodation_checkin: form.accommodation_checkin || null,
        accommodation_checkout: form.accommodation_checkout || null,
        accommodation_rooms: form.accommodation_rooms || null,
        accommodation_cost: form.accommodation_cost || null,
        currency: form.currency,
        amount_in_ugx: Number(form.amount_in_ugx) || null,
        payment_mode: form.payment_mode,
        amount_paid: Number(form.amount_paid) || null,
        balance: Number(form.balance) || null,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
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
                  <label className="block text-sm font-medium mb-1">Check-in Date</label>
                  <input type="date" value={form.accommodation_checkin} onChange={e => setForm(f => ({ ...f, accommodation_checkin: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check-out Date</label>
                  <input type="date" value={form.accommodation_checkout} onChange={e => setForm(f => ({ ...f, accommodation_checkout: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Rooms</label>
                  <input type="number" value={form.accommodation_rooms ?? ''} onChange={e => setForm(f => ({ ...f, accommodation_rooms: Number(e.target.value) || null }))} min={1} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Accommodation Cost (UGX)</label>
                  <input type="number" value={form.accommodation_cost ?? ''} onChange={e => setForm(f => ({ ...f, accommodation_cost: Number(e.target.value) || null }))} min={0} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Assign Vehicle</label>
                <button type="button" onClick={() => setShowAddVehicle(true)} className="text-xs text-primary hover:text-primary/80 font-medium">+ Add New</button>
              </div>
              <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
                <option value="">Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Assign Driver</label>
                <button type="button" onClick={() => setShowAddDriver(true)} className="text-xs text-primary hover:text-primary/80 font-medium">+ Add New</button>
              </div>
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
              <input type="date" value={form.trip_start_date} onChange={e => setForm(f => ({ ...f, trip_start_date: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trip End Date</label>
              <input type="date" value={form.trip_end_date} onChange={e => setForm(f => ({ ...f, trip_end_date: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_return_trip} onChange={e => setForm(f => ({ ...f, is_return_trip: e.target.checked }))} className="rounded border-muted/60 text-primary focus:ring-primary" />
                  <span className="text-sm">Return Trip</span>
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Destination</label>
              <input type="text" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. Bwindi National Park" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
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
                <div className="w-full px-3 py-2.5 bg-muted/20 rounded-xl text-sm font-mono font-semibold text-primary">{(form.amount_in_ugx ?? 0).toLocaleString()} UGX</div>
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
              <input type="number" value={form.amount_paid ?? ''} onChange={e => updateAmountPaid(Number(e.target.value))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Balance</label>
              <div className={`w-full px-3 py-2.5 rounded-xl text-sm font-mono font-semibold ${(form.balance ?? 0) > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {(form.balance ?? 0).toLocaleString()} UGX
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-4 border-t border-muted/30 flex gap-3">
          <Button type="submit" isLoading={saveMutation.isPending}>Save Trip</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>

      {showAddVehicle && (
        <Modal open={showAddVehicle} onClose={() => setShowAddVehicle(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add Vehicle</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Registration Number *</label>
              <input value={newVehicle.registration_number} onChange={e => setNewVehicle(v => ({ ...v, registration_number: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => addVehicleMutation.mutate()} isLoading={addVehicleMutation.isPending}>Add Vehicle</Button>
              <Button variant="outline" onClick={() => setShowAddVehicle(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {showAddDriver && (
        <Modal open={showAddDriver} onClose={() => setShowAddDriver(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add Driver</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input value={newDriver.full_name} onChange={e => setNewDriver(d => ({ ...d, full_name: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input value={newDriver.phone} onChange={e => setNewDriver(d => ({ ...d, phone: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => addDriverMutation.mutate()} isLoading={addDriverMutation.isPending}>Add Driver</Button>
              <Button variant="outline" onClick={() => setShowAddDriver(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </Drawer>
  )
}
