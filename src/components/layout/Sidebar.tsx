import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useAlerts } from '@/hooks/useAlerts'
import type { UserRole } from '@/types'
import { useState, type ReactNode } from 'react'

type IconName = 'chart' | 'vehicle' | 'tool' | 'alert' | 'fine' | 'user' | 'bell' | 'plane' | 'calendar' | 'cash' | 'users' | 'compass'

interface NavItem {
  label: string
  path: string
  icon: IconName
  roles: UserRole[]
  badge?: 'alerts'
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Logistics',
    items: [
      { label: 'Dashboard', path: '/logistics', icon: 'chart', roles: ['admin', 'logistics'] },
      { label: 'Fleet', path: '/logistics/vehicles', icon: 'vehicle', roles: ['admin', 'logistics'] },
      { label: 'Maintenance', path: '/logistics/service', icon: 'tool', roles: ['admin', 'logistics'] },
      { label: 'Complaints', path: '/logistics/complaints', icon: 'alert', roles: ['admin', 'logistics'] },
      { label: 'Penalties', path: '/logistics/penalties', icon: 'fine', roles: ['admin', 'logistics'] },
      { label: 'Drivers', path: '/logistics/drivers', icon: 'user', roles: ['admin', 'logistics'] },
      { label: 'Alerts', path: '/logistics/alerts', icon: 'bell', roles: ['admin', 'logistics'], badge: 'alerts' },
    ],
  },
  {
    title: 'Trips',
    items: [
      { label: 'Dashboard', path: '/trips', icon: 'chart', roles: ['admin', 'trips'] },
      { label: 'Trips', path: '/trips/manage', icon: 'plane', roles: ['admin', 'trips'] },
      { label: 'Experience', path: '/trips/experience', icon: 'compass', roles: ['admin', 'trips'] },
      { label: 'Calendar', path: '/trips/calendar', icon: 'calendar', roles: ['admin', 'trips'] },
      { label: 'Revenue', path: '/trips/payments', icon: 'cash', roles: ['admin', 'trips'] },
      { label: 'Alerts', path: '/trips/alerts', icon: 'bell', roles: ['admin', 'trips'], badge: 'alerts' },
    ],
  },
]

const adminItems: NavItem[] = [
  { label: 'Users', path: '/admin/users', icon: 'users', roles: ['admin'] },
  { label: 'Overview', path: '/admin', icon: 'chart', roles: ['admin'] },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const { data: alertData } = useAlerts()
  const role = user?.role || 'logistics'
  const location = useLocation()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const groups: { title: string; items: NavItem[] }[] = []
    if (role === 'admin') groups.push({ title: 'Admin', items: adminItems })
    groups.push(...sections)

    for (const group of groups) {
      if (group.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))) {
        return { [group.title]: true }
      }
    }
    return {}
  })

  function toggleSection(title: string) {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const alertCount = alertData?.count || 0

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#141414] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.28'%3E%3Cpath d='M20 0v40M0 20h40'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Logo */}
      <div className="relative z-10 border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 shadow-lg shadow-black/15">
            <span className="text-lg font-black text-white">S</span>
          </div>
          <div>
            <p className="font-display text-[17px] font-bold uppercase leading-tight text-white">SafariTour</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70 mt-0.5">Operations</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto py-2 px-3 space-y-1">
        {role === 'admin' && (
          <CollapsibleGroup
            title="Admin"
            items={adminItems}
            role={role}
            isOpen={!!openSections['Admin']}
            onToggle={() => toggleSection('Admin')}
            onNavClick={onClose}
            alertCount={alertCount}
          />
        )}

        {sections.map(section => (
          <CollapsibleGroup
            key={section.title}
            title={section.title}
            items={section.items}
            role={role}
            isOpen={!!openSections[section.title]}
            onToggle={() => toggleSection(section.title)}
            onNavClick={onClose}
            alertCount={alertCount}
          />
        ))}
      </nav>

      {/* User */}
      <div className="relative z-10 border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
            <span className="text-xs font-bold text-white/80">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white/95">{user?.full_name || 'User'}</p>
            <p className="text-[11px] capitalize text-white/55">{user?.role || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden h-screen w-60 flex-shrink-0 shadow-2xl shadow-black/10 lg:block">
        {sidebar}
      </aside>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="relative h-full w-72 shadow-2xl"
            >
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NavEntry({ item, onClick, alertCount }: { item: NavItem; onClick: () => void; alertCount: number }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-all duration-150 ${
          isActive
            ? 'bg-[#2A2A2A] text-white shadow-md shadow-black/10'
            : 'text-white/85 hover:bg-white/[0.09] hover:text-white'
        }`
      }
    >
      <span className="grid h-5 w-5 flex-shrink-0 place-items-center">
        <SidebarIcon name={item.icon} />
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge === 'alerts' && alertCount > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white shadow-sm shadow-danger/30">
          {alertCount > 9 ? '9+' : alertCount}
        </span>
      )}
    </NavLink>
  )
}

function CollapsibleGroup({
  title,
  items,
  role,
  isOpen,
  onToggle,
  onNavClick,
  alertCount,
}: {
  title: string
  items: NavItem[]
  role: string
  isOpen: boolean
  onToggle: () => void
  onNavClick: () => void
  alertCount: number
}) {
  const visible = items.filter(i => i.roles.includes(role as UserRole))
  if (visible.length === 0) return null

  return (
    <div>
      <button
        onClick={onToggle}
        className="mb-0.5 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-white/85 transition-colors hover:text-white"
      >
        {title}
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5">
              {visible.map(item => (
                <NavEntry key={item.path} item={item} onClick={onNavClick} alertCount={alertCount} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SidebarIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6" />,
    vehicle: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15h14l-1.4-4.2A2.6 2.6 0 0 0 15.1 9H8.9a2.6 2.6 0 0 0-2.5 1.8L5 15Zm2 0v3m10-3v3M8 18h.01M16 18h.01M7 12h10" />,
    tool: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m14.7 6.3 3 3M5 19l8.2-8.2m1.5-4.5 3-3 3 3-3 3m-3-3 3 3" />,
    alert: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 4.9 3.7 16.3A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.7L13.7 4.9a2 2 0 0 0-3.4 0Z" />,
    fine: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4M15 3H9a2 2 0 0 0-2 2v14l4-2 4 2V5a2 2 0 0 0-2-2Z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 19a7 7 0 0 1 14 0" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17H9m9-2V11a6 6 0 1 0-12 0v4l-2 2h16l-2-2Zm-5 4a2 2 0 0 1-2 0" />,
    plane: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 13.5 4 20l-1-3 4.5-5L3 7l1-3 6.5 6.5L19 2l2 2-6.5 8L21 20l-2 2-8.5-8.5Z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v3m10-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />,
    cash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16v10H4V7Zm3 3h.01M17 14h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a3 3 0 1 0-2.8-4M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-8 11a5 5 0 0 1 10 0m2 0a4.5 4.5 0 0 1 6 0" />,
    compass: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0 3.5 3.5M12 12l-3.5 3.5M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />,
  }

  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {paths[name]}
    </svg>
  )
}
