import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal, StatusBadge, CardSkeleton } from '@/components/common'
import { formatDate, generateId } from '@/utils'
import toast from 'react-hot-toast'
import type { Vehicle, VehicleStatus, Driver } from '@/types'
import { motion } from 'framer-motion'

export function VehicleDetails() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Vehicle | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSold, setShowSold] = useState(false)

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', showSold],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('*, current_driver:drivers!left(full_name, phone)')
        .order('created_at', { ascending: false })
      if (!showSold) query = query.neq('status', 'sold')
      const { data } = await query
      return (data || []) as Vehicle[]
    },
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('drivers').select('id, full_name, license_number, phone').eq('is_active', true).order('full_name')
      return (data || []) as Pick<Driver, 'id' | 'full_name' | 'license_number' | 'phone'>[]
    },
  })

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['all-vehicles-count'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('status')
      return (data || []) as { status: string }[]
    },
    staleTime: 60000,
  })

  const activeCount = allVehicles.filter(v => v.status !== 'sold').length
  const soldCount = allVehicles.filter(v => v.status === 'sold').length

  const markAsSold = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').update({ status: 'sold' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['all-vehicles-count'] })
      setDeleteTarget(null)
      toast.success('Vehicle marked as sold')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const permanentDeleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('trips').update({ vehicle_id: null }).eq('vehicle_id', id)
      const { error } = await supabase.from('vehicles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['all-vehicles-count'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      setPermanentDeleteTarget(null)
      toast.success('Vehicle permanently deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <CardSkeleton count={6} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        subtitle={`${activeCount} active · ${soldCount} sold`}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowSold(!showSold)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${showSold ? 'bg-danger/10 text-danger' : 'bg-muted/30 text-text-secondary hover:text-text-primary'}`}
            >
              {showSold ? 'Hide Sold' : 'Show Sold'}
            </button>
            <div className="flex bg-muted/30 rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}>⊞</button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>☰</button>
            </div>
            <Button onClick={() => { setEditVehicle(null); setDrawerOpen(true) }}>Add Vehicle</Button>
          </div>
        }
      />

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-28 bg-gradient-to-r from-secondary to-primary flex items-center justify-center">
                <svg className="w-16 h-16 text-white/30" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-lg font-mono font-bold text-text-primary">{v.registration_number}</p>
                <p className="text-sm text-text-secondary">{v.make} {v.model} • {v.year}</p>
                <StatusBadge status={v.status} />
                <p className="text-xs text-text-secondary flex items-center gap-1">
                  <span>📍</span> {v.current_location || 'N/A'}
                </p>
                {v.current_driver && (
                  <p className="text-xs text-text-secondary flex items-center gap-1">
                    <span>👤</span> {v.current_driver.full_name}
                  </p>
                )}
                <div className="flex gap-1 sm:gap-2 pt-2 border-t border-muted/30">
                  <button onClick={() => navigate(`/logistics/vehicles/${v.id}`)} className="text-xs text-primary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-primary/5">View</button>
                  <button onClick={() => { setEditVehicle(v); setDrawerOpen(true) }} className="text-xs text-text-secondary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-muted/50">Edit</button>
                  <button onClick={() => setDeleteTarget(v)} className="text-xs text-text-secondary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-muted/50" title="Mark as sold">Sold</button>
                  <button onClick={() => setPermanentDeleteTarget(v)} className="text-xs text-danger hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-danger/5" title="Permanently delete">Delete</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full responsive-table">
            <thead>
              <tr className="bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Registration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Make</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {vehicles.map((v, i) => (
                <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                  <td data-label="Reg No" className="px-4 py-3 font-mono font-semibold">{v.registration_number}</td>
                  <td data-label="Make" className="px-4 py-3">{v.make}</td>
                  <td data-label="Model" className="px-4 py-3">{v.model}</td>
                  <td data-label="Year" className="px-4 py-3">{v.year}</td>
                  <td data-label="Status" className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td data-label="Location" className="px-4 py-3 text-sm text-text-secondary">{v.current_location || '-'}</td>
                  <td data-label="Driver" className="px-4 py-3 text-sm text-text-secondary">{v.current_driver?.full_name || '-'}</td>
                  <td data-label="" className="px-4 py-3">
                    <div className="flex gap-1 sm:gap-2">
                      <button onClick={() => navigate(`/logistics/vehicles/${v.id}`)} className="text-xs text-primary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-primary/5">View</button>
                      <button onClick={() => { setEditVehicle(v); setDrawerOpen(true) }} className="text-xs text-text-secondary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-muted/50">Edit</button>
                      <button onClick={() => setDeleteTarget(v)} className="text-xs text-text-secondary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-muted/50" title="Mark as sold">Sold</button>
                      <button onClick={() => setPermanentDeleteTarget(v)} className="text-xs text-danger hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-danger/5" title="Permanently delete">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VehicleDrawer
        key={editVehicle?.id || 'new'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditVehicle(null) }}
        editVehicle={editVehicle}
        drivers={drivers}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Mark Vehicle as Sold">
        {deleteTarget && (
          <div className="space-y-4">
            <p>Mark <strong>{deleteTarget.registration_number}</strong> as sold? It will be removed from the active fleet list but its service, maintenance, and repair history will be kept.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => markAsSold.mutate(deleteTarget.id)}>Mark as Sold</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!permanentDeleteTarget} onClose={() => setPermanentDeleteTarget(null)} title="Delete Vehicle">
        {permanentDeleteTarget && (
          <div className="space-y-4">
            <p>Are you sure you want to permanently delete <strong>{permanentDeleteTarget.registration_number}</strong>? Any trips using this vehicle will be unlinked. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPermanentDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => permanentDeleteVehicle.mutate(permanentDeleteTarget.id)} isLoading={permanentDeleteVehicle.isPending}>Confirm Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function VehicleDrawer({ open, onClose, editVehicle, drivers }: { open: boolean; onClose: () => void; editVehicle: Vehicle | null; drivers: Pick<Driver, 'id' | 'full_name'>[] }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    registration_number: editVehicle?.registration_number || '',
    chassis_number: editVehicle?.chassis_number || '',
    make: editVehicle?.make || '',
    model: editVehicle?.model || '',
    year: editVehicle?.year || new Date().getFullYear(),
    date_added: editVehicle?.date_added || new Date().toISOString().split('T')[0],
    status: editVehicle?.status || 'available' as VehicleStatus,
    current_location: editVehicle?.current_location || '',
    current_driver_id: editVehicle?.current_driver_id || '',
    insurance_commencement: editVehicle?.insurance_commencement || '',
    insurance_expiry: editVehicle?.insurance_expiry || '',
    pmo_commencement: editVehicle?.pmo_commencement || '',
    pmo_expiry: editVehicle?.pmo_expiry || '',
    psv_expiry: editVehicle?.psv_expiry || '',
    fuel_type: editVehicle?.fuel_type || 'petrol',
    engine_capacity: editVehicle?.engine_capacity || '',
    has_toolbox: editVehicle?.has_toolbox ?? true,
    additional_requirements: editVehicle?.additional_requirements || '',
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        registration_number: form.registration_number,
        id: editVehicle?.id || generateId('VEH'),
        chassis_number: form.chassis_number || null,
        make: form.make || null,
        model: form.model || null,
        year: Number(form.year) || null,
        date_added: form.date_added || null,
        status: form.status,
        current_location: form.current_location || null,
        current_driver_id: form.current_driver_id || null,
        insurance_commencement: form.insurance_commencement || null,
        insurance_expiry: form.insurance_expiry || null,
        pmo_commencement: form.pmo_commencement || null,
        pmo_expiry: form.pmo_expiry || null,
        psv_expiry: form.psv_expiry || null,
        fuel_type: form.fuel_type || null,
        engine_capacity: form.engine_capacity || null,
        has_toolbox: form.has_toolbox,
        additional_requirements: form.additional_requirements || null,
      }
      if (editVehicle) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editVehicle.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vehicles').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onClose()
      toast.success(editVehicle ? 'Vehicle updated' : 'Vehicle added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function isExpiryStatus(date: string): 'valid' | 'expiring' | 'expired' {
    if (!date) return 'valid'
    const d = new Date(date)
    const now = new Date()
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    if (d < now) return 'expired'
    if (d < in30) return 'expiring'
    return 'valid'
  }

  function ExpiryIndicator({ date }: { date: string }) {
    const status = isExpiryStatus(date)
    const colors = { valid: 'border-success text-success', expiring: 'border-warning text-warning', expired: 'border-danger text-danger' }
    return <div className={`w-2 h-2 rounded-full border-2 ${colors[status]}`} />
  }

  return (
    <Drawer open={open} onClose={onClose} title={editVehicle ? 'Edit Vehicle' : 'Add Vehicle'} width="max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Identity</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Registration Number *</label>
              <input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Chassis Number</label>
              <input value={form.chassis_number} onChange={e => setForm(f => ({ ...f, chassis_number: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Make</label>
              <input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Model</label>
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Year</label>
              <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Date Added</label>
              <input type="date" value={form.date_added} onChange={e => setForm(f => ({ ...f, date_added: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Status & Location</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as VehicleStatus }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="available">🟢 Available</option>
                <option value="on_trip">🟡 On Trip</option>
                <option value="sold">⚫ Sold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Current Location</label>
              <input value={form.current_location} onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Current Driver</label>
              <select value={form.current_driver_id} onChange={e => setForm(f => ({ ...f, current_driver_id: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— No driver assigned —</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Documentation & Compliance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { key: 'insurance_commencement' as const, label: 'Insurance Commencement', type: 'date' as const },
              { key: 'insurance_expiry' as const, label: 'Insurance Expiry', type: 'date' as const },
              { key: 'pmo_commencement' as const, label: 'PMO Commencement', type: 'date' as const },
              { key: 'pmo_expiry' as const, label: 'PMO Expiry', type: 'date' as const },
              { key: 'psv_expiry' as const, label: 'PSV Expiry', type: 'date' as const },
            ]).map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-text-primary mb-1 flex items-center gap-2">
                  {label}
                  {type === 'date' && <ExpiryIndicator date={form[key]} />}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Technical</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Fuel Type</label>
              <div className="flex gap-3">
                {(['petrol', 'diesel', 'electric', 'hybrid'] as const).map(f => (
                  <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="fuel" checked={form.fuel_type === f} onChange={() => setForm(f2 => ({ ...f2, fuel_type: f }))} className="text-primary" />
                    <span className="text-sm capitalize">{f}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Engine Capacity</label>
              <input value={form.engine_capacity} onChange={e => setForm(f => ({ ...f, engine_capacity: e.target.value }))} placeholder="e.g. 2.8L" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Has Toolbox</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, has_toolbox: !f.has_toolbox }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${form.has_toolbox ? 'bg-success' : 'bg-muted'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.has_toolbox ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-text-primary mb-1">Additional Requirements</label>
            <textarea value={form.additional_requirements} onChange={e => setForm(f => ({ ...f, additional_requirements: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-4 border-t border-muted/30 flex gap-3">
          <Button type="submit" isLoading={saveMutation.isPending}>Save Vehicle</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
