import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal, StatusBadge, CardSkeleton } from '@/components/common'
import { formatDate, generateId } from '@/utils'
import toast from 'react-hot-toast'
import type { Driver } from '@/types'
import { motion } from 'framer-motion'

export function DriverDetails() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editDriver, setEditDriver] = useState<Driver | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null)

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data } = await supabase.from('drivers').select('*').order('created_at', { ascending: false })
      return (data || []) as Driver[]
    },
  })

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const { count: tripCount } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('driver_id', id)
      const { count: vehicleCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('current_driver_id', id)

      const refs: string[] = []
      if (tripCount && tripCount > 0) refs.push(`${tripCount} trip${tripCount === 1 ? '' : 's'}`)
      if (vehicleCount && vehicleCount > 0) refs.push(`${vehicleCount} vehicle${vehicleCount === 1 ? '' : 's'}`)

      if (refs.length > 0) {
        throw new Error(`This driver has ${refs.join(' and ')} assigned — reassign or cancel those first`)
      }

      const { error } = await supabase.from('drivers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drivers'] }); setDeleteTarget(null); toast.success('Driver permanently deleted') },
    onError: (err: Error) => {
      setDeleteBlockReason(err.message)
      toast.error(err.message)
    },
  })

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function getColor(name: string) {
    const colors = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-blue-500', 'bg-purple-500']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  if (isLoading) return <CardSkeleton count={6} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Roster"
        subtitle={`${drivers.filter(d => d.is_active).length} active drivers`}
        actions={<Button onClick={() => { setEditDriver(null); setDrawerOpen(true) }}>Add Driver</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${getColor(d.full_name)} text-white text-sm font-bold flex items-center justify-center`}>
                {getInitials(d.full_name)}
              </div>
              <div>
                <p className="font-semibold text-text-primary">{d.full_name}</p>
                <p className="text-xs font-mono text-text-secondary">{d.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-text-secondary">License:</span> {d.license_number}</p>
              <p><span className="text-text-secondary">Phone:</span> <a href={`tel:${d.phone}`} className="text-primary hover:underline">{d.phone}</a></p>
              <p><span className="text-text-secondary">Joined:</span> {formatDate(d.date_joined, 'MMM yyyy')}</p>
              <p><span className="text-text-secondary">Experience:</span> {d.driving_experience_years} years</p>
            </div>
            <StatusBadge status={d.is_active ? 'active' : 'inactive'} />
            <div className="flex gap-1 sm:gap-2 pt-2 border-t border-muted/30">
              <button onClick={() => { setEditDriver(d); setDrawerOpen(true) }} className="text-xs text-text-secondary hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-muted/50">Edit</button>
              <button onClick={() => setDeleteTarget(d)} className="text-xs text-danger hover:underline cursor-pointer px-2 py-1.5 min-h-[36px] rounded hover:bg-danger/5">Delete</button>
            </div>
          </motion.div>
        ))}
      </div>

      <DriverDrawer key={editDriver?.id || 'new'} open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditDriver(null) }} editDriver={editDriver} />

      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteBlockReason(null) }} title="Delete Driver">
        {deleteTarget && (
          <div className="space-y-4">
            <p>Are you sure you want to permanently delete <strong>{deleteTarget.full_name}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteBlockReason(null) }}>Cancel</Button>
              <Button variant="danger" onClick={() => deleteDriver.mutate(deleteTarget.id)} isLoading={deleteDriver.isPending}>Confirm Delete</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteBlockReason} onClose={() => setDeleteBlockReason(null)} title="Cannot Delete Driver">
        <div className="space-y-4">
          <p className="text-text-secondary">{deleteBlockReason}</p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDeleteBlockReason(null)}>OK</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DriverDrawer({ open, onClose, editDriver }: { open: boolean; onClose: () => void; editDriver: Driver | null }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    full_name: editDriver?.full_name || '',
    license_number: editDriver?.license_number || '',
    phone: editDriver?.phone || '',
    date_joined: editDriver?.date_joined?.split('T')[0] || '',
    driving_experience_years: editDriver?.driving_experience_years || 0,
    driving_permit: editDriver?.driving_permit || '',
    driving_permit_expiry: editDriver?.driving_permit_expiry || '',
    is_active: editDriver?.is_active ?? true,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name,
        license_number: form.license_number || null,
        phone: form.phone || null,
        date_joined: form.date_joined || null,
        driving_experience_years: Number(form.driving_experience_years) || 0,
        driving_permit: form.driving_permit || null,
        driving_permit_expiry: form.driving_permit_expiry || null,
        is_active: form.is_active,
      }
      if (editDriver) {
        const { error } = await supabase.from('drivers').update(payload).eq('id', editDriver.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('drivers').insert({ id: generateId('DRV'), ...payload })
        if (error) throw error
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drivers'] }); onClose(); toast.success(editDriver ? 'Driver updated' : 'Driver added') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title={editDriver ? 'Edit Driver' : 'Add Driver'}>
      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">License Number</label>
          <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date Joined</label>
          <input type="date" value={form.date_joined} onChange={e => setForm(f => ({ ...f, date_joined: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Years of Driving Experience</label>
          <input type="number" value={form.driving_experience_years} onChange={e => setForm(f => ({ ...f, driving_experience_years: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Driving Permit</label>
          <input value={form.driving_permit} onChange={e => setForm(f => ({ ...f, driving_permit: e.target.value }))} placeholder="e.g. UAT 659U" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Driving Permit Expiry</label>
          <input type="date" value={form.driving_permit_expiry} onChange={e => setForm(f => ({ ...f, driving_permit_expiry: e.target.value }))} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Active</span>
          <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${form.is_active ? 'bg-success' : 'bg-muted'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={saveMutation.isPending}>{editDriver ? 'Update' : 'Save'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
