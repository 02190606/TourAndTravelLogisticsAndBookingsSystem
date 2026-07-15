import type { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'
  children: ReactNode
  className?: string
}

const badgeVariants = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  primary: 'bg-teal-50 text-teal-700 ring-teal-600/15',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

export function Badge({ variant = 'primary', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    available: { variant: 'success', label: 'Available' },
    on_trip: { variant: 'warning', label: 'On Trip' },
    in_service: { variant: 'danger', label: 'In Service' },
    sold: { variant: 'danger', label: 'Sold' },
    planned: { variant: 'info', label: 'Planned' },
    ongoing: { variant: 'success', label: 'Ongoing' },
    completed: { variant: 'neutral', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    open: { variant: 'warning', label: 'Open' },
    resolved: { variant: 'success', label: 'Resolved' },
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'danger', label: 'Inactive' },
    unpaid: { variant: 'danger', label: 'Unpaid' },
    paid: { variant: 'success', label: 'Paid' },
    disputed: { variant: 'warning', label: 'Disputed' },
  }

  const config = map[status] || { variant: 'info' as const, label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    admin: { variant: 'primary', label: 'Admin' },
    logistics: { variant: 'success', label: 'Logistics' },
    trips: { variant: 'info', label: 'Trips' },
  }
  const config = map[role] || { variant: 'info' as const, label: role }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
