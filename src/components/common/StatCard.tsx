import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'danger'
  subtitle?: string
  index?: number
}

const colorMap = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  secondary: 'bg-secondary/10 text-secondary ring-secondary/15',
  accent: 'bg-accent/10 text-cyan-700 ring-accent/20',
  info: 'bg-blue-500/10 text-blue-700 ring-blue-500/15',
  success: 'bg-success/10 text-emerald-700 ring-success/15',
  warning: 'bg-warning/10 text-amber-700 ring-warning/20',
  danger: 'bg-danger/10 text-red-700 ring-danger/15',
}

export function StatCard({ title, value, icon, color = 'primary', subtitle, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/70"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="mb-4 flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-lg ring-1 ${colorMap[color]}`}>
          <span className="text-lg leading-none [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="truncate text-2xl font-bold text-text-primary lg:text-3xl">{value}</p>
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {subtitle && <p className="text-xs text-text-secondary/70">{subtitle}</p>}
      </div>
    </motion.div>
  )
}
