import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-text-primary lg:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}
