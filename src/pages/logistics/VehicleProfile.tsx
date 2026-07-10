import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Badge, Modal, Drawer, StatusBadge, CardSkeleton } from '@/components/common'
import { formatDate, formatUGX, generateId } from '@/utils'
import toast from 'react-hot-toast'
import type { Vehicle, ServiceRecord, MaintenanceRecord, Complaint, Repair } from '@/types'

type SubTab = 'service' | 'maintenance' | 'complaints' | 'repairs'

export function VehicleProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subTab, setSubTab] = useState<SubTab>('service')

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('*, current_driver:drivers!left(full_name, phone)').eq('id', id).single()
      return data as Vehicle | null
    },
  })

  if (isLoading) return <CardSkeleton />
  if (!vehicle) return <div className="text-center py-12 text-text-secondary">Vehicle not found</div>

  function ComplianceChip({ label, date }: { label: string; date?: string }) {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    const variant = d < now ? 'danger' : d < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) ? 'warning' : 'success'
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-muted/30 text-sm">
        <span className="font-medium">{label}</span>
        <Badge variant={variant}>{variant === 'danger' ? 'Expired' : variant === 'warning' ? 'Expiring' : 'Valid'}</Badge>
        <span className="text-text-secondary">{formatDate(date)}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${vehicle.registration_number}`} subtitle={`${vehicle.make} ${vehicle.model} • ${vehicle.year}`} />

      <div className="bg-gradient-to-r from-dark-base via-dark-base/95 to-dark-base text-white rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <svg className="w-12 h-12 text-primary/60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
              <div>
                <p className="text-2xl font-mono font-bold">{vehicle.registration_number}</p>
                <p className="text-white/60 text-sm">{vehicle.chassis_number}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-white/50">Make:</span> {vehicle.make}</div>
              <div><span className="text-white/50">Model:</span> {vehicle.model}</div>
              <div><span className="text-white/50">Year:</span> {vehicle.year}</div>
              <div><span className="text-white/50">Mileage:</span> {vehicle.mileage.toLocaleString()} km</div>
              <div><span className="text-white/50">Fuel:</span> {vehicle.fuel_type}</div>
              <div><span className="text-white/50">Engine:</span> {vehicle.engine_capacity}</div>
              <div><span className="text-white/50">Location:</span> {vehicle.current_location || 'N/A'}</div>
              <div><span className="text-white/50">Toolbox:</span> {vehicle.has_toolbox ? 'Yes' : 'No'}</div>
              <div className="col-span-2">
                <span className="text-white/50">Current Driver:</span>{' '}
                {vehicle.current_driver ? `${vehicle.current_driver.full_name}${vehicle.current_driver.phone ? ` (${vehicle.current_driver.phone})` : ''}` : 'Not assigned'}
              </div>
            </div>
          </div>
          <div>
            <StatusBadge status={vehicle.status} />
            <div className="mt-4 space-y-2">
              <ComplianceChip label="Driving Permit" date={vehicle.permit_expiry_date} />
              {vehicle.insurance_commencement && <ComplianceChip label="Insurance Started" date={vehicle.insurance_commencement} />}
              <ComplianceChip label="Insurance" date={vehicle.insurance_expiry} />
              {vehicle.pmo_commencement && <ComplianceChip label="PMO Started" date={vehicle.pmo_commencement} />}
              <ComplianceChip label="PMO" date={vehicle.pmo_expiry} />
              <ComplianceChip label="PSV" date={vehicle.psv_expiry} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-muted/30 pb-2">
        {(['service', 'maintenance', 'complaints', 'repairs'] as SubTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer capitalize ${subTab === tab ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {tab === 'service' ? '📋 Service Records' : tab === 'maintenance' ? '🔧 Maintenance Records' : tab === 'complaints' ? '⚠️ Complaints' : '🔧 Repairs'}
          </button>
        ))}
      </div>

      {subTab === 'service' && <ServiceRecordsTable vehicleId={vehicle.id} />}
      {subTab === 'maintenance' && <MaintenanceRecordsTable vehicleId={vehicle.id} />}
      {subTab === 'complaints' && <ComplaintsTable vehicleId={vehicle.id} />}
      {subTab === 'repairs' && <RepairsTable vehicleId={vehicle.id} />}
    </div>
  )
}

function ServiceRecordsTable({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ServiceRecord | null>(null)

  const { data: records = [] } = useQuery({
    queryKey: ['services', vehicleId],
    queryFn: async () => {
      const { data } = await supabase.from('service_records').select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false })
      return (data || []) as ServiceRecord[]
    },
  })

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_records').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services', vehicleId] }); setDeleteTarget(null); toast.success('Record deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="info">{formatUGX(totalCost)} total</Badge>
        <Button size="sm" onClick={() => setDrawerOpen(true)}>Log Service</Button>
      </div>
      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Place</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Cost</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Next Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {records.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="ID" className="px-4 py-3 font-mono text-sm">{r.id.slice(0, 8)}</td>
                <td data-label="Date" className="px-4 py-3 text-sm">{formatDate(r.service_date)}</td>
                <td data-label="Description" className="px-4 py-3 text-sm">{r.description}</td>
                <td data-label="Place" className="px-4 py-3 text-sm">{r.place_done}</td>
                <td data-label="Cost" className="px-4 py-3 text-sm font-mono">{formatUGX(r.cost)}</td>
                <td data-label="Next" className="px-4 py-3 text-sm">{r.next_service_date ? formatDate(r.next_service_date) : '-'}</td>
                <td data-label="" className="px-4 py-3">
                  <button onClick={() => setDeleteTarget(r)} className="text-xs text-danger hover:underline cursor-pointer">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ServiceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} vehicleId={vehicleId} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Record">
        <div className="space-y-4">
          <p>Delete this service record? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTarget && deleteRecord.mutate(deleteTarget.id)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ServiceDrawer({ open, onClose, vehicleId }: { open: boolean; onClose: () => void; vehicleId: string }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ service_date: '', description: '', place_done: '', cost: 0, next_service_date: '' })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('service_records').insert({
        id: generateId('SRV'), vehicle_id: vehicleId, ...form, cost: Number(form.cost),
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services', vehicleId] }); onClose(); toast.success('Service record added') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title="Log Service">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Service Date</label>
          <input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Place Done</label>
          <input value={form.place_done} onChange={e => setForm(f => ({ ...f, place_done: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cost (UGX)</label>
          <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Next Service Date</label>
          <input type="date" value={form.next_service_date} onChange={e => setForm(f => ({ ...f, next_service_date: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={saveMutation.isPending}>Save</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}

function MaintenanceRecordsTable({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null)

  const { data: records = [] } = useQuery({
    queryKey: ['maintenance', vehicleId],
    queryFn: async () => {
      const { data } = await supabase.from('maintenance_records').select('*').eq('vehicle_id', vehicleId).order('repair_date', { ascending: false })
      return (data || []) as MaintenanceRecord[]
    },
  })

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('maintenance_records').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance', vehicleId] }); setDeleteTarget(null); toast.success('Record deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setDrawerOpen(true)}>Log Maintenance</Button>
      </div>
      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Mechanic</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Repair Types</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Garage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Cost</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {records.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="ID" className="px-4 py-3 font-mono text-sm">{r.id.slice(0, 8)}</td>
                <td data-label="Mechanic" className="px-4 py-3 text-sm">{r.mechanic_id}</td>
                <td data-label="Repairs" className="px-4 py-3 text-sm">{r.repair_types?.join(', ')}</td>
                <td data-label="Date" className="px-4 py-3 text-sm">{formatDate(r.repair_date)}</td>
                <td data-label="Garage" className="px-4 py-3 text-sm">{r.garage}</td>
                <td data-label="Cost" className="px-4 py-3 text-sm font-mono">{formatUGX(r.cost)}</td>
                <td data-label="" className="px-4 py-3">
                  <button onClick={() => setDeleteTarget(r)} className="text-xs text-danger hover:underline cursor-pointer">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MaintenanceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} vehicleId={vehicleId} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Record">
        <div className="space-y-4">
          <p>Delete this maintenance record? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTarget && deleteRecord.mutate(deleteTarget.id)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function MaintenanceDrawer({ open, onClose, vehicleId }: { open: boolean; onClose: () => void; vehicleId: string }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ mechanic_id: '', repair_types: [] as string[], repair_date: '', garage: '', cost: 0 })
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    if (tagInput.trim() && !form.repair_types.includes(tagInput.trim())) {
      setForm(f => ({ ...f, repair_types: [...f.repair_types, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('maintenance_records').insert({
        id: generateId('MNT'), vehicle_id: vehicleId, ...form, cost: Number(form.cost), repair_types: form.repair_types,
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance', vehicleId] }); onClose(); toast.success('Maintenance record added') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title="Log Maintenance">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mechanic ID</label>
          <input value={form.mechanic_id} onChange={e => setForm(f => ({ ...f, mechanic_id: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Repair Types</label>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Type and press Enter" className="flex-1 px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            <button type="button" onClick={addTag} className="px-3 py-2 bg-primary/10 text-primary rounded-xl text-sm cursor-pointer">Add</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.repair_types.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs">
                {t}
                <button type="button" onClick={() => setForm(f => ({ ...f, repair_types: f.repair_types.filter((_, j) => j !== i) }))} className="hover:text-danger cursor-pointer">×</button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={form.repair_date} onChange={e => setForm(f => ({ ...f, repair_date: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Garage Name</label>
          <input value={form.garage} onChange={e => setForm(f => ({ ...f, garage: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cost (UGX)</label>
          <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={saveMutation.isPending}>Save</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}

function ComplaintsTable({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null)

  const { data: records = [] } = useQuery({
    queryKey: ['complaints', vehicleId],
    queryFn: async () => {
      const { data } = await supabase.from('complaints').select('*').eq('vehicle_id', vehicleId).order('date_filed', { ascending: false })
      return (data || []) as Complaint[]
    },
  })

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('complaints').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['complaints', vehicleId] }); setDeleteTarget(null); toast.success('Complaint deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>File Complaint</Button>
      </div>
      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Date Filed</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {records.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="ID" className="px-4 py-3 font-mono text-sm">{c.id.slice(0, 8)}</td>
                <td data-label="Date" className="px-4 py-3 text-sm">{formatDate(c.date_filed)}</td>
                <td data-label="Items" className="px-4 py-3 text-sm">{c.complaint_items?.length || 0} items</td>
                <td data-label="Status" className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td data-label="" className="px-4 py-3">
                  <button onClick={() => setDeleteTarget(c)} className="text-xs text-danger hover:underline cursor-pointer">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ComplaintDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} vehicleId={vehicleId} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Complaint">
        <div className="space-y-4">
          <p>Delete this complaint? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTarget && deleteRecord.mutate(deleteTarget.id)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ComplaintDrawer({ open, onClose, vehicleId }: { open: boolean; onClose: () => void; vehicleId: string }) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<string[]>([])
  const [itemInput, setItemInput] = useState('')
  const [status, setStatus] = useState<'open' | 'resolved'>('open')

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('complaints').insert({
        id: generateId('CMP'), vehicle_id: vehicleId, complaint_items: items, date_filed: new Date().toISOString(), status,
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['complaints', vehicleId] }); onClose(); toast.success('Complaint filed') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title="File Complaint">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          <button type="button" onClick={() => setStatus(s => s === 'open' ? 'resolved' : 'open')} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${status === 'open' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
            {status === 'open' ? 'Open' : 'Resolved'}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Complaint Items</label>
          <div className="flex gap-2">
            <input value={itemInput} onChange={e => setItemInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), setItems(i => [...i, itemInput.trim()]), setItemInput(''))} placeholder="Type a complaint item" className="flex-1 px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
            <button type="button" onClick={() => { if (itemInput.trim()) { setItems(i => [...i, itemInput.trim()]); setItemInput('') } }} className="px-3 py-2 bg-primary/10 text-primary rounded-xl text-sm cursor-pointer">Add</button>
          </div>
          <ul className="mt-3 space-y-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-lg text-sm">
                <span>{i + 1}. {item}</span>
                <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-danger hover:text-danger/80 cursor-pointer">×</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={saveMutation.isPending}>Save Complaint</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}

function RepairsTable({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Repair | null>(null)

  const { data: records = [] } = useQuery({
    queryKey: ['repairs', vehicleId],
    queryFn: async () => {
      const { data } = await supabase.from('repairs').select('*').eq('vehicle_id', vehicleId).order('date_of_repair', { ascending: false })
      return (data || []) as Repair[]
    },
  })

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('repairs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['repairs', vehicleId] }); setDeleteTarget(null); toast.success('Repair record deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  const urgencyColors: Record<string, string> = {
    low: 'bg-info/15 text-info',
    medium: 'bg-warning/15 text-warning',
    high: 'bg-danger/15 text-danger',
    critical: 'bg-danger/25 text-danger font-semibold',
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-info/15 text-info',
    in_progress: 'bg-warning/15 text-warning',
    completed: 'bg-success/15 text-success',
  }

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="info">{formatUGX(totalCost)} total</Badge>
        <Button size="sm" onClick={() => setDrawerOpen(true)}>Log Repair</Button>
      </div>
      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Issue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Urgency</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Workshop</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Cost</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {records.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="Date" className="px-4 py-3 text-sm">{formatDate(r.date_of_repair)}</td>
                <td data-label="Issue" className="px-4 py-3 text-sm max-w-[200px] truncate">{r.issue_description}</td>
                <td data-label="Urgency" className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-lg text-xs ${urgencyColors[r.urgency]}`}>{r.urgency}</span></td>
                <td data-label="Workshop" className="px-4 py-3 text-sm">{r.workshop_mechanic || '-'}</td>
                <td data-label="Cost" className="px-4 py-3 text-sm font-mono">{formatUGX(r.cost)}</td>
                <td data-label="Status" className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-lg text-xs capitalize ${statusColors[r.status]}`}>{r.status.replace('_', ' ')}</span></td>
                <td data-label="" className="px-4 py-3">
                  <button onClick={() => setDeleteTarget(r)} className="text-xs text-danger hover:underline cursor-pointer">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RepairDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} vehicleId={vehicleId} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Repair Record">
        <div className="space-y-4">
          <p>Delete this repair record? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTarget && deleteRecord.mutate(deleteTarget.id)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function RepairDrawer({ open, onClose, vehicleId }: { open: boolean; onClose: () => void; vehicleId: string }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    date_of_repair: '',
    issue_description: '',
    repair_description: '',
    urgency: 'medium' as Repair['urgency'],
    workshop_mechanic: '',
    cost: 0,
    status: 'scheduled' as Repair['status'],
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error: insertError } = await supabase.from('repairs').insert({
        id: generateId('REP'),
        vehicle_id: vehicleId,
        ...form,
        cost: Number(form.cost),
      })
      if (insertError) throw insertError

      if (form.status === 'in_progress') {
        const { error: updateError } = await supabase.from('vehicles').update({ status: 'in_service' }).eq('id', vehicleId)
        if (updateError) throw updateError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
      onClose()
      toast.success('Repair record added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title="Log Repair" width="max-w-2xl">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date of Repair *</label>
            <input type="date" value={form.date_of_repair} onChange={e => setForm(f => ({ ...f, date_of_repair: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Urgency *</label>
            <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value as Repair['urgency'] }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Issue Description *</label>
          <textarea value={form.issue_description} onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))} rows={3} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Repair Description</label>
          <textarea value={form.repair_description} onChange={e => setForm(f => ({ ...f, repair_description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Workshop / Mechanic Name</label>
            <input value={form.workshop_mechanic} onChange={e => setForm(f => ({ ...f, workshop_mechanic: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cost (UGX) *</label>
            <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} required min={0} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status *</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Repair['status'] }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={saveMutation.isPending}>Save Repair</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
