import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal, StatusBadge, CardSkeleton } from '@/components/common'
import { formatDate, generateId } from '@/utils'
import toast from 'react-hot-toast'
import type { Complaint, Vehicle, Driver } from '@/types'

export function Complaints() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewComplaint, setViewComplaint] = useState<Complaint | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null)

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['all-complaints'],
    queryFn: async () => {
      const { data } = await supabase
        .from('complaints')
        .select('*, vehicles!inner(registration_number, make, model), drivers(full_name)')
        .order('date_filed', { ascending: false })
      return (data || []) as Complaint[]
    },
  })

  const deleteComplaint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('complaints').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-complaints'] }); setDeleteTarget(null); toast.success('Complaint deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <CardSkeleton count={3} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Complaints Log"
        subtitle={`${complaints.filter(c => c.status === 'open').length} open complaints`}
        actions={<Button variant="outline" onClick={() => setDrawerOpen(true)}>File Complaint</Button>}
      />

      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Vehicle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Incident Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {complaints.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="Vehicle" className="px-4 py-3 text-sm font-medium">{c.vehicles?.registration_number}</td>
                <td data-label="Driver" className="px-4 py-3 text-sm text-text-secondary">{c.drivers?.full_name || '-'}</td>
                <td data-label="Incident Date" className="px-4 py-3 text-sm text-text-secondary">{c.incident_date || '-'}</td>
                <td data-label="Items" className="px-4 py-3 text-sm">{c.complaint_items?.length || 0} items</td>
                <td data-label="Status" className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td data-label="" className="px-4 py-3">
                  <div className="flex gap-1 sm:gap-2">
                    <button onClick={() => setViewComplaint(c)} className="text-xs text-primary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-primary/5">View</button>
                    <button onClick={() => setDeleteTarget(c)} className="text-xs text-danger hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-danger/5">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ComplaintDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Modal open={!!viewComplaint} onClose={() => setViewComplaint(null)} title="Complaint Details">
        {viewComplaint && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-secondary">Vehicle:</span> {viewComplaint.vehicles?.registration_number}</div>
              <div><span className="text-text-secondary">Driver:</span> {viewComplaint.drivers?.full_name || '-'}</div>
              <div><span className="text-text-secondary">Incident Date:</span> {viewComplaint.incident_date || '-'}</div>
              <div><span className="text-text-secondary">Filed:</span> {formatDate(viewComplaint.date_filed)}</div>
              <div><span className="text-text-secondary">Status:</span> <StatusBadge status={viewComplaint.status} /></div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Complaint Items:</p>
              <ol className="list-decimal list-inside space-y-1">
                {viewComplaint.complaint_items?.map((item, i) => (
                  <li key={i} className="text-sm text-text-primary p-2 bg-muted/20 rounded-lg">{item}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Complaint">
        <div className="space-y-4">
          <p>Delete this complaint? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTarget && deleteComplaint.mutate(deleteTarget.id)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ComplaintDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [vehicle_id, setVehicleId] = useState('')
  const [driver_id, setDriverId] = useState('')
  const [incident_date, setIncidentDate] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [itemInput, setItemInput] = useState('')
  const [status, setStatus] = useState<'open' | 'resolved'>('open')

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-list'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, registration_number, make, model').neq('status', 'sold')
      return (data || []) as Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model'>[]
    },
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['active-drivers'],
    queryFn: async () => {
      const { data } = await supabase.from('drivers').select('id, full_name').eq('is_active', true).order('full_name')
      return (data || []) as Pick<Driver, 'id' | 'full_name'>[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('complaints').insert({
        id: generateId('CMP'),
        vehicle_id,
        driver_id: driver_id || null,
        incident_date: incident_date || null,
        complaint_items: items,
        date_filed: new Date().toISOString(),
        status,
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-complaints'] }); onClose(); toast.success('Complaint filed') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title="File Complaint">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Vehicle</label>
                     <select value={vehicle_id} onChange={e => setVehicleId(e.target.value)} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
            <option value="">Select vehicle</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Driver</label>
          <select value={driver_id} onChange={e => setDriverId(e.target.value)} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
            <option value="">None</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Incident Date</label>
          <input type="date" value={incident_date} onChange={e => setIncidentDate(e.target.value)} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          <button type="button" onClick={() => setStatus(s => s === 'open' ? 'resolved' : 'open')} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${status === 'open' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
            {status === 'open' ? '🔴 Open' : '🟢 Resolved'}
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
