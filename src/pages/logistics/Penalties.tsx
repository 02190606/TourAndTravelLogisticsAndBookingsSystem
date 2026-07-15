import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, Drawer, Modal, StatusBadge, CardSkeleton } from '@/components/common'
import { formatDate, formatUGX, generateId } from '@/utils'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import type { Penalty, PenaltyStatus, Vehicle } from '@/types'

export function Penalties() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewPenalty, setViewPenalty] = useState<(Penalty & { vehicles?: Vehicle }) | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Penalty | null>(null)

  const { data: penalties = [], isLoading } = useQuery({
    queryKey: ['all-penalties'],
    queryFn: async () => {
      const { data } = await supabase
        .from('penalties')
        .select('*, vehicles!inner(registration_number, make, model)')
        .order('date_issued', { ascending: false })
      return (data || []) as (Penalty & { vehicles: Vehicle })[]
    },
  })

  const deletePenalty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('penalties').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-penalties'] }); setDeleteTarget(null); toast.success('Penalty deleted') },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <CardSkeleton count={3} />

  const unpaidTotal = penalties.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penalties & Fines"
        subtitle={`${formatUGX(unpaidTotal)} unpaid`}
        actions={<Button variant="outline" onClick={() => setDrawerOpen(true)}>Log Penalty</Button>}
      />

      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Vehicle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Date Issued</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {penalties.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="Vehicle" className="px-4 py-3 text-sm font-medium">
                  <button onClick={() => navigate(`/logistics/vehicles/${p.vehicle_id}`)} className="text-primary hover:underline cursor-pointer">
                    {p.vehicles?.registration_number}
                  </button>
                </td>
                <td data-label="Date Issued" className="px-4 py-3 text-sm">{formatDate(p.date_issued)}</td>
                <td data-label="Reason" className="px-4 py-3 text-sm">{p.reason}</td>
                <td data-label="Amount" className="px-4 py-3 text-sm font-medium">{formatUGX(p.amount)}</td>
                <td data-label="Status" className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td data-label="" className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setViewPenalty(p)} className="text-xs text-primary hover:underline cursor-pointer">View</button>
                    <button onClick={() => setDeleteTarget(p)} className="text-xs text-danger hover:underline cursor-pointer">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PenaltyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Modal open={!!viewPenalty} onClose={() => setViewPenalty(null)} title="Penalty Details">
        {viewPenalty && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-secondary">Vehicle:</span> {viewPenalty.vehicles?.registration_number}</div>
              <div><span className="text-text-secondary">Date Issued:</span> {formatDate(viewPenalty.date_issued)}</div>
              <div><span className="text-text-secondary">Amount:</span> <span className="font-semibold">{formatUGX(viewPenalty.amount)}</span></div>
              <div><span className="text-text-secondary">Status:</span> <StatusBadge status={viewPenalty.status} /></div>
              <div><span className="text-text-secondary">Issued By:</span> {viewPenalty.issued_by}</div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1 text-text-secondary">Reason:</p>
              <p className="text-sm p-3 bg-muted/20 rounded-lg">{viewPenalty.reason}</p>
            </div>
            {viewPenalty.notes && (
              <div>
                <p className="text-sm font-medium mb-1 text-text-secondary">Notes:</p>
                <p className="text-sm p-3 bg-muted/20 rounded-lg">{viewPenalty.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Penalty">
        <div className="space-y-4">
          <p>Delete this penalty record? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTarget && deletePenalty.mutate(deleteTarget.id)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PenaltyDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [vehicle_id, setVehicleId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<PenaltyStatus>('unpaid')
  const [issued_by, setIssuedBy] = useState('')
  const [notes, setNotes] = useState('')

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-list'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, registration_number, make, model').neq('status', 'sold')
      return (data || []) as Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model'>[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('penalties').insert({
        id: generateId('PEN'),
        vehicle_id,
        amount: Number(amount),
        reason,
        status,
        issued_by,
        notes,
        date_issued: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-penalties'] }); onClose(); toast.success('Penalty logged') },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Drawer open={open} onClose={onClose} title="Log Penalty">
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
          <label className="block text-sm font-medium mb-1">Amount (UGX)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min={0} placeholder="e.g. 500000" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={3} placeholder="Reason for the penalty" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as PenaltyStatus)} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm">
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Issued By</label>
          <input value={issued_by} onChange={e => setIssuedBy(e.target.value)} required placeholder="Name or ID of issuer" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes" className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm" />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={saveMutation.isPending}>Save Penalty</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
