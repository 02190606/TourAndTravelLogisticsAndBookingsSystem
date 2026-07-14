import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, StatCard, Table, Modal, Drawer, StatusBadge, RoleBadge } from '@/components/common'
import { generatePassword } from '@/utils'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import type { Column } from '@/components/common'
import type { User, UserRole } from '@/types'

export function UserManagement() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [credentialModal, setCredentialModal] = useState<{ email: string; password: string; name: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      return (data || []) as User[]
    },
  })

  const activeUsers = users.filter(u => u.is_active).length
  const inactiveUsers = users.filter(u => !u.is_active).length

  const createUser = useMutation({
    mutationFn: async (formData: { full_name: string; email: string; role: UserRole; phone: string; is_active: boolean }) => {
      const password = generatePassword()

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password,
        options: { data: { role: formData.role, full_name: formData.full_name } },
      })
      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('Failed to create auth user')

      const { error: dbError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: formData.email,
        role: formData.role,
        full_name: formData.full_name,
        phone: formData.phone,
        is_active: formData.is_active,
      })
      if (dbError) throw dbError

      return { email: formData.email, password, name: formData.full_name }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDrawerOpen(false)
      setCredentialModal({ email: result.email, password: result.password, name: result.name })
      toast.success('Account created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { full_name: string; email: string; role: UserRole; phone: string; is_active: boolean } }) => {
      const { error } = await supabase.from('users').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDrawerOpen(false)
      setEditUser(null)
      toast.success('User updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('users').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteTarget(null)
      toast.success('User deactivated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns: Column<User>[] = [
    { key: 'full_name', header: 'Name', render: (u) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center">
          {u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <span className="font-medium">{u.full_name}</span>
      </div>
    )},
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u) => <RoleBadge role={u.role} /> },
    { key: 'is_active', header: 'Status', render: (u) => (
      <button
        onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${u.is_active ? 'bg-success' : 'bg-muted'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    )},
    { key: 'created_at', header: 'Date Created', render: (u) => new Date(u.created_at).toLocaleDateString() },
    { key: 'actions', header: 'Actions', render: (u) => (
      <div className="flex items-center gap-2">
        <button onClick={() => { setEditUser(u); setDrawerOpen(true) }} className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer" title="Edit">
          <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={() => setDeleteTarget(u)} className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors cursor-pointer" title="Delete">
          <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage system users and their roles"
        actions={<Button onClick={() => { setEditUser(null); setDrawerOpen(true) }}>Add User</Button>}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Total Users" value={users.length} icon="👥" color="primary" />
        <StatCard title="Active Users" value={activeUsers} icon="✅" color="success" />
        <StatCard title="Inactive Users" value={inactiveUsers} icon="⛔" color="danger" />
      </div>

      <Table columns={columns} data={users} isLoading={isLoading} emptyMessage="No users found" />

      <UserDrawer
        key={editUser?.id || 'new'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditUser(null) }}
        editUser={editUser}
        onSubmit={(data) => editUser ? updateUser.mutate({ id: editUser.id, data }) : createUser.mutate(data)}
        isLoading={createUser.isPending || updateUser.isPending}
      />

      <Modal open={!!credentialModal} onClose={() => setCredentialModal(null)} title="Account Created!">
        {credentialModal && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold">{credentialModal.name}</p>
            <div className="bg-muted/30 rounded-xl p-4 text-left font-mono text-sm space-y-2">
              <p><span className="text-text-secondary">Email:</span> {credentialModal.email}</p>
              <p><span className="text-text-secondary">Password:</span> <span className="text-primary font-bold">{credentialModal.password}</span></p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${credentialModal.email} | Password: ${credentialModal.password}`)
                toast.success('Copied!')
              }}
              className="bg-secondary text-white px-6 py-2 rounded-xl font-medium hover:bg-secondary/90 transition-colors cursor-pointer"
            >
              Copy Credentials
            </button>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        {deleteTarget && (
          <div className="space-y-4">
            <p>Are you sure you want to delete <strong>{deleteTarget.full_name}</strong>? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => deleteUser.mutate(deleteTarget.id)}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function UserDrawer({ open, onClose, editUser, onSubmit, isLoading }: {
  open: boolean
  onClose: () => void
  editUser: User | null
  onSubmit: (data: { full_name: string; email: string; role: UserRole; phone: string; is_active: boolean }) => void
  isLoading: boolean
}) {
  const [name, setName] = useState(editUser?.full_name || '')
  const [email, setEmail] = useState(editUser?.email || '')
  const [role, setRole] = useState<UserRole>(editUser?.role || 'logistics')
  const [phone, setPhone] = useState(editUser?.phone || '')
  const [isActive, setIsActive] = useState(editUser?.is_active ?? true)

  return (
    <Drawer open={open} onClose={onClose} title={editUser ? 'Edit User' : 'Add User'}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ full_name: name, email, role, phone, is_active: isActive }) }} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Role</label>
          <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
            <option value="admin">Admin</option>
            <option value="logistics">Logistics</option>
            <option value="trips">Trips</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Phone Number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2.5 border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">Active</span>
          <button type="button" onClick={() => setIsActive(!isActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isActive ? 'bg-success' : 'bg-muted'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={isLoading}>{editUser ? 'Update' : 'Create Account'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Drawer>
  )
}
