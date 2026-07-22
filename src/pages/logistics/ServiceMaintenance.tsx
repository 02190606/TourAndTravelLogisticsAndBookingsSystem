import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal } from '@/components/common'
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatDate, formatUGX, generateId } from '@/utils'
import toast from 'react-hot-toast'
import type { ServiceRecord, Repair, Vehicle } from '@/types'

type SubTab = 'service' | 'repairs'

export function ServiceMaintenance() {
  const [subTab, setSubTab] = useState<SubTab>('service')
  const [showCombinedChart, setShowCombinedChart] = useState(false)

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['all-services-summary'],
    queryFn: async () => {
      const { data } = await supabase.from('service_records').select('cost, service_date')
      return (data || []) as { cost: number; service_date: string }[]
    },
  })

  const { data: repairRecords = [] } = useQuery({
    queryKey: ['all-repairs-summary'],
    queryFn: async () => {
      const { data } = await supabase.from('repairs').select('cost, date_of_repair')
      return (data || []) as { cost: number; date_of_repair: string }[]
    },
  })

  const serviceTotal = serviceRecords.reduce((s, r) => s + (r.cost || 0), 0)
  const repairTotal = repairRecords.reduce((s, r) => s + (r.cost || 0), 0)
  const maintenanceTotal = repairTotal
  const combinedTotal = serviceTotal + repairTotal

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const year = new Date().getFullYear()

  const combinedMonthlyData = months.map((name, i) => {
    const s = serviceRecords
      .filter(r => { const d = new Date(r.service_date); return d.getMonth() === i && d.getFullYear() === year })
      .reduce((sum, r) => sum + (r.cost || 0), 0)
    const r = repairRecords
      .filter(r => { const d = new Date(r.date_of_repair); return d.getMonth() === i && d.getFullYear() === year })
      .reduce((sum, r) => sum + (r.cost || 0), 0)
    return { name, service: Math.round(s / 1000), repair: Math.round(r / 1000) }
  })

  const hasCombinedData = combinedMonthlyData.some(d => d.service || d.repair)

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance and Repair" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="bg-white rounded-xl px-4 py-3 border border-muted/30">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Service Total</p>
          <p className="text-lg font-bold font-mono mt-0.5">{formatUGX(serviceTotal)}</p>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 border border-muted/30">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Repairs Total</p>
          <p className="text-lg font-bold font-mono mt-0.5">{formatUGX(repairTotal)}</p>
        </div>
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl px-4 py-3 border border-primary/20">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Total Maintenance</p>
          <p className="text-lg font-bold font-mono mt-0.5 text-primary">{formatUGX(combinedTotal)}</p>
        </div>
      </div>

      {hasCombinedData && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setShowCombinedChart(!showCombinedChart)} className="flex items-center gap-2 px-4 sm:px-6 py-3 w-full text-left text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
            <svg className={`w-4 h-4 transition-transform ${showCombinedChart ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
            View Monthly Trend
          </button>
          {showCombinedChart && (
            <div className="px-4 sm:px-6 pb-6">
              <p className="text-xs text-text-secondary mb-3">Monthly cost breakdown (UGX in thousands)</p>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsLine data={combinedMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="service" stroke="#0F766E" strokeWidth={2} dot={{ r: 3 }} name="Service" />
                  <Line type="monotone" dataKey="repair" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} name="Repair" />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 bg-muted/20 rounded-xl p-1 overflow-x-auto">
        <button onClick={() => setSubTab('service')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${subTab === 'service' ? 'bg-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}> Service</button>
        <button onClick={() => setSubTab('repairs')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${subTab === 'repairs' ? 'bg-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}> Repairs</button>
      </div>

      {subTab === 'service' ? <ServiceTab /> : <RepairsTab />}
    </div>
  )
}

function ServiceTab() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ServiceRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceRecord | null>(null)

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['all-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_records')
        .select('*, vehicles!inner(registration_number, make, model)')
        .order('service_date', { ascending: false })
      return (data || []) as (ServiceRecord & { vehicles: Vehicle })[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_records').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-services'] })
      queryClient.invalidateQueries({ queryKey: ['all-services-summary'] })
      setDeleteTarget(null)
      toast.success('Service record deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openDrawer(record?: ServiceRecord) {
    setEditTarget(record || null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTarget(null)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDrawer()}>Log Service</Button>
      </div>

      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Vehicle</th>
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
                <td data-label="Vehicle" className="px-4 py-3 text-sm font-medium">{r.vehicles?.registration_number}</td>
                <td data-label="Date" className="px-4 py-3 text-sm">{formatDate(r.service_date)}</td>
                <td data-label="Description" className="px-4 py-3 text-sm">{r.description}</td>
                <td data-label="Place" className="px-4 py-3 text-sm">{r.place_done}</td>
                <td data-label="Cost" className="px-4 py-3 text-sm font-mono">{formatUGX(r.cost)}</td>
                <td data-label="Next" className="px-4 py-3 text-sm">{r.next_service_date ? formatDate(r.next_service_date) : '-'}</td>
                <td data-label="Actions" className="px-4 py-3">
                  <button onClick={() => openDrawer(r)} className="text-primary hover:text-primary/80 mr-2 cursor-pointer" title="Edit">✏️</button>
                  <button onClick={() => setDeleteTarget(r)} className="text-danger hover:text-danger/80 cursor-pointer" title="Delete">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ServiceDrawer open={drawerOpen} onClose={closeDrawer} record={editTarget} key={editTarget?.id || 'new-service'} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Service Record">
        <p className="text-sm text-text-secondary mb-6">Are you sure you want to delete this service record? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button type="button" variant="danger" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}>Delete</Button>
        </div>
      </Modal>
    </>
  )
}

function ServiceDrawer({ open, onClose, record }: { open: boolean; onClose: () => void; record?: ServiceRecord | null }) {
  const queryClient = useQueryClient()
  const isEdit = !!record
  const [form, setForm] = useState({
    vehicle_id: '',
    service_date: '',
    description: '',
    place_done: '',
    cost: 0,
    next_service_date: '',
  })

  useEffect(() => {
    if (record) {
      setForm({
        vehicle_id: record.vehicle_id,
        service_date: record.service_date,
        description: record.description || '',
        place_done: record.place_done || '',
        cost: record.cost,
        next_service_date: record.next_service_date || '',
      })
    } else {
      setForm({ vehicle_id: '', service_date: '', description: '', place_done: '', cost: 0, next_service_date: '' })
    }
  }, [record])

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-list'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, registration_number, make, model').neq('status', 'sold')
      return (data || []) as Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model'>[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        cost: Number(form.cost),
        description: form.description || null,
        place_done: form.place_done || null,
        next_service_date: form.next_service_date || null,
      }
      if (isEdit) {
        const { error } = await supabase.from('service_records').update(payload).eq('id', record.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('service_records').insert({ id: generateId('SRV'), ...payload })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-services'] })
      queryClient.invalidateQueries({ queryKey: ['all-services-summary'] })
      onClose()
      toast.success(isEdit ? 'Service record updated' : 'Service record added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Service' : 'Log Service'}>
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Vehicle</label>
          <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
            <option value="">Select vehicle</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Service Date</label>
          <input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
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
          <Button type="submit" isLoading={saveMutation.isPending}>{isEdit ? 'Update' : 'Save'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}

function RepairsTab() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Repair | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Repair | null>(null)

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['all-repairs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('repairs')
        .select('*, vehicles!inner(registration_number, make, model)')
        .order('date_of_repair', { ascending: false })
      return (data || []) as (Repair & { vehicles: Vehicle })[]
    },
  })

  const urgencyColors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-info/15 text-info',
    in_progress: 'bg-warning/15 text-warning',
    completed: 'bg-success/15 text-success',
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('repairs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-repairs'] })
      queryClient.invalidateQueries({ queryKey: ['all-repairs-summary'] })
      setDeleteTarget(null)
      toast.success('Repair record deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openDrawer(record?: Repair) {
    setEditTarget(record || null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTarget(null)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDrawer()}>Log Repair</Button>
      </div>

      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Vehicle</th>
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
                <td data-label="Vehicle" className="px-4 py-3 text-sm font-medium">{r.vehicles?.registration_number}</td>
                <td data-label="Date" className="px-4 py-3 text-sm">{formatDate(r.date_of_repair)}</td>
                <td data-label="Issue" className="px-4 py-3 text-sm max-w-[200px] truncate">{r.issue_description}</td>
                <td data-label="Urgency" className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-lg text-xs ${urgencyColors[r.urgency]}`}>{r.urgency}</span></td>
                <td data-label="Workshop" className="px-4 py-3 text-sm">{r.workshop_mechanic || '-'}</td>
                <td data-label="Cost" className="px-4 py-3 text-sm font-mono">{formatUGX(r.cost)}</td>
                <td data-label="Status" className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-lg text-xs capitalize ${statusColors[r.status]}`}>{r.status.replace('_', ' ')}</span></td>
                <td data-label="Actions" className="px-4 py-3">
                  <button onClick={() => openDrawer(r)} className="text-primary hover:text-primary/80 mr-2 cursor-pointer" title="Edit">✏️</button>
                  <button onClick={() => setDeleteTarget(r)} className="text-danger hover:text-danger/80 cursor-pointer" title="Delete">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RepairDrawer open={drawerOpen} onClose={closeDrawer} record={editTarget} key={editTarget?.id || 'new-repair'} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Repair Record">
        <p className="text-sm text-text-secondary mb-6">Are you sure you want to delete this repair record? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button type="button" variant="danger" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}>Delete</Button>
        </div>
      </Modal>
    </>
  )
}

function RepairDrawer({ open, onClose, record }: { open: boolean; onClose: () => void; record?: Repair | null }) {
  const queryClient = useQueryClient()
  const isEdit = !!record
  const [form, setForm] = useState({
    vehicle_id: '',
    date_of_repair: '',
    issue_description: '',
    repair_description: '',
    urgency: 'medium' as Repair['urgency'],
    workshop_mechanic: '',
    cost: 0,
    status: 'scheduled' as Repair['status'],
  })

  useEffect(() => {
    if (record) {
      setForm({
        vehicle_id: record.vehicle_id,
        date_of_repair: record.date_of_repair,
        issue_description: record.issue_description,
        repair_description: record.repair_description || '',
        urgency: record.urgency,
        workshop_mechanic: record.workshop_mechanic || '',
        cost: record.cost,
        status: record.status,
      })
    } else {
      setForm({
        vehicle_id: '',
        date_of_repair: '',
        issue_description: '',
        repair_description: '',
        urgency: 'medium',
        workshop_mechanic: '',
        cost: 0,
        status: 'scheduled',
      })
    }
  }, [record])

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-list'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, registration_number, make, model').neq('status', 'sold')
      return (data || []) as Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model'>[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        cost: Number(form.cost),
        repair_description: form.repair_description || null,
        workshop_mechanic: form.workshop_mechanic || null,
      }
      if (isEdit) {
        const { error } = await supabase.from('repairs').update(payload).eq('id', record.id)
        if (error) throw error
      } else {
        const { error: insertError } = await supabase.from('repairs').insert({
          id: generateId('REP'),
          ...payload,
        })
        if (insertError) throw insertError

        if (form.status === 'in_progress') {
          const { error: updateError } = await supabase.from('vehicles').update({ status: 'in_service' }).eq('id', form.vehicle_id)
          if (updateError) throw updateError
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-repairs'] })
      queryClient.invalidateQueries({ queryKey: ['all-repairs-summary'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-list'] })
      onClose()
      toast.success(isEdit ? 'Repair record updated' : 'Repair record added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Repair' : 'Log Repair'} width="max-w-2xl">
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Vehicle</label>
          <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Select vehicle</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date of Repair</label>
            <input type="date" value={form.date_of_repair} onChange={e => setForm(f => ({ ...f, date_of_repair: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Urgency</label>
            <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value as Repair['urgency'] }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Issue Description</label>
          <textarea value={form.issue_description} onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
            <label className="block text-sm font-medium mb-1">Cost (UGX)</label>
            <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} min={0} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Repair['status'] }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={saveMutation.isPending}>{isEdit ? 'Update' : 'Save Repair'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
