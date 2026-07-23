import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal, CardSkeleton } from '@/components/common'
import { formatDate, generateId } from '@/utils'
import toast from 'react-hot-toast'
import type { MileageRecord, Vehicle, VehicleStatus, Driver } from '@/types'

export function MileageDetails() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<MileageRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MileageRecord | null>(null)
  const [filterVehicle, setFilterVehicle] = useState('')

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, registration_number, make, model, status, current_location, current_driver_id').order('registration_number')
      return (data || []) as Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model' | 'status' | 'current_location' | 'current_driver_id'>[]
    },
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('drivers').select('id, full_name').eq('is_active', true).order('full_name')
      return (data || []) as Pick<Driver, 'id' | 'full_name'>[]
    },
  })

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['mileage', filterVehicle],
    queryFn: async () => {
      let query = supabase
        .from('mileage_records')
        .select('*, vehicles!inner(id, registration_number, make, model)')
        .order('date', { ascending: false })
      if (filterVehicle) query = query.eq('vehicle_id', filterVehicle)
      const { data } = await query
      return (data || []) as MileageRecord[]
    },
  })

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mileage_records').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mileage'] }); setDeleteTarget(null); toast.success('Mileage record deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  function getVehicleLabel(v: MileageRecord['vehicles']) {
    if (!v) return 'Unknown'
    return `${v.registration_number} — ${v.make} ${v.model}`
  }

  if (isLoading) return <CardSkeleton count={6} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mileage Tracking"
        subtitle={`${records.length} ${records.length === 1 ? 'entry' : 'entries'}${filterVehicle ? ' (filtered)' : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <select
              value={filterVehicle}
              onChange={e => setFilterVehicle(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-muted/60 bg-white text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
              ))}
            </select>
            <Button onClick={() => { setEditRecord(null); setDrawerOpen(true) }}>Add Mileage</Button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Vehicle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Opening</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Closing</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Distance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Service Given</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Service Due</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {records.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="Vehicle" className="px-4 py-3 text-sm font-medium">{getVehicleLabel(r.vehicles)}</td>
                <td data-label="Date" className="px-4 py-3 text-sm">{formatDate(r.date)}</td>
                <td data-label="Status" className="px-4 py-3 text-sm capitalize">{r.status?.replace('_', ' ') || '-'}</td>
                <td data-label="Location" className="px-4 py-3 text-sm">{r.current_location || '-'}</td>
                <td data-label="Opening" className="px-4 py-3 text-sm font-mono">{r.opening_mileage.toLocaleString()}</td>
                <td data-label="Closing" className="px-4 py-3 text-sm font-mono">{r.closing_mileage.toLocaleString()}</td>
                <td data-label="Distance" className="px-4 py-3 text-sm font-mono font-semibold">{r.distance_covered.toLocaleString()}</td>
                <td data-label="Service Given" className="px-4 py-3 text-sm font-mono">{r.service_given.toLocaleString()}</td>
                <td data-label="Service Due" className="px-4 py-3 text-sm font-mono">{r.service_due.toLocaleString()}</td>
                <td data-label="" className="px-4 py-3">
                  <div className="flex gap-1 sm:gap-2">
                    <button onClick={() => { setEditRecord(r); setDrawerOpen(true) }} className="text-xs text-text-secondary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-muted/50">Edit</button>
                    <button onClick={() => setDeleteTarget(r)} className="text-xs text-danger hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-danger/5">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-secondary text-sm">
                  No mileage records found. Click "Add Mileage" to log your first entry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MileageDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditRecord(null) }}
        editRecord={editRecord}
        vehicles={vehicles}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Mileage Record">
        {deleteTarget && (
          <div className="space-y-4">
            <p>Delete this mileage record? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => deleteRecord.mutate(deleteTarget.id)} isLoading={deleteRecord.isPending}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MileageDrawer({ open, onClose, editRecord, vehicles }: { open: boolean; onClose: () => void; editRecord: MileageRecord | null; vehicles: Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model' | 'status' | 'current_location'>[] }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    vehicle_id: editRecord?.vehicle_id || '',
    date: editRecord?.date || new Date().toISOString().split('T')[0],
    status: (editRecord?.status || '') as VehicleStatus | '',
    current_location: editRecord?.current_location || '',
    opening_mileage: editRecord?.opening_mileage || 0,
    closing_mileage: editRecord?.closing_mileage || 0,
    service_given: editRecord?.service_given || 0,
  })

  const distanceCovered = Math.max(0, form.closing_mileage - form.opening_mileage)
  const serviceDue = Math.max(0, form.service_given - distanceCovered)

  const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        vehicle_id: form.vehicle_id,
        date: form.date || null,
        status: form.status || null,
        current_location: form.current_location || null,
        opening_mileage: Number(form.opening_mileage) || 0,
        closing_mileage: Number(form.closing_mileage) || 0,
        distance_covered: distanceCovered,
        service_given: Number(form.service_given) || 0,
        service_due: serviceDue,
      }
      if (editRecord) {
        const { error } = await supabase.from('mileage_records').update(payload).eq('id', editRecord.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('mileage_records').insert({ id: generateId('MLG'), ...payload })
        if (error) throw error
      }

      if (form.vehicle_id && form.status) {
        const vehicleUpdate: Record<string, unknown> = { status: form.status }
        if (form.current_location) vehicleUpdate.current_location = form.current_location
        const { error: vehicleError } = await supabase.from('vehicles').update(vehicleUpdate).eq('id', form.vehicle_id)
        if (vehicleError) throw vehicleError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onClose()
      toast.success(editRecord ? 'Mileage updated' : 'Mileage added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title={editRecord ? 'Edit Mileage' : 'Add Mileage'} width="max-w-2xl">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Trip Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Vehicle *</label>
              <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select a vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Status & Location</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as VehicleStatus }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— Keep current —</option>
                <option value="available">🟢 Available</option>
                <option value="on_trip">🟡 On Trip</option>
                <option value="sold">⚫ Sold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Current Location</label>
              <input value={form.current_location} onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))} placeholder={selectedVehicle?.current_location || 'e.g. Kampala'} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Mileage Readings</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Opening Mileage *</label>
              <input type="number" value={form.opening_mileage} onChange={e => setForm(f => ({ ...f, opening_mileage: Number(e.target.value) }))} required min={0} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Closing Mileage *</label>
              <input type="number" value={form.closing_mileage} onChange={e => setForm(f => ({ ...f, closing_mileage: Number(e.target.value) }))} required min={0} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Distance Covered</label>
              <input type="number" value={distanceCovered} readOnly className="w-full px-3 py-2.5 border border-muted/30 rounded-xl text-sm bg-muted/20 text-text-secondary font-mono" />
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Service</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Service Given *</label>
              <input type="number" value={form.service_given} onChange={e => setForm(f => ({ ...f, service_given: Number(e.target.value) }))} required min={0} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Service Due</label>
              <input type="number" value={serviceDue} readOnly className="w-full px-3 py-2.5 border border-muted/30 rounded-xl text-sm bg-muted/20 text-text-secondary font-mono" />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-4 border-t border-muted/30 flex gap-3">
          <Button type="submit" isLoading={saveMutation.isPending}>Save Mileage</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
