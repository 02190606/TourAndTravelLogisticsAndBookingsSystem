import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'
import { useState, type ReactNode } from 'react'

type IconName = 'chart' | 'vehicle' | 'tool' | 'alert' | 'user' | 'bell' | 'plane' | 'calendar' | 'cash' | 'users'

interface NavItem {
  label: string
  path: string
  icon: IconName
  roles: UserRole[]
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Logistics',
    items: [
      { label: 'Dashboard', path: '/logistics', icon: 'chart', roles: ['admin', 'logistics'] },
      { label: 'Fleet', path: '/logistics/vehicles', icon: 'vehicle', roles: ['admin', 'logistics'] },
      { label: 'Maintenance and Repair', path: '/logistics/service', icon: 'tool', roles: ['admin', 'logistics'] },
      { label: 'Complaints', path: '/logistics/complaints', icon: 'alert', roles: ['admin', 'logistics'] },
      { label: 'Drivers', path: '/logistics/drivers', icon: 'user', roles: ['admin', 'logistics'] },
      { label: 'Alerts', path: '/logistics/alerts', icon: 'bell', roles: ['admin', 'logistics'] },
    ],
  },
  {
    title: 'Trips',
    items: [
      { label: 'Dashboard', path: '/trips', icon: 'chart', roles: ['admin', 'trips'] },
      { label: 'Trips', path: '/trips/manage', icon: 'plane', roles: ['admin', 'trips'] },
      { label: 'Calendar', path: '/trips/calendar', icon: 'calendar', roles: ['admin', 'trips'] },
      { label: 'Revenue', path: '/trips/payments', icon: 'cash', roles: ['admin', 'trips'] },
      { label: 'Alerts', path: '/trips/alerts', icon: 'bell', roles: ['admin', 'trips'] },
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

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#0a2e28] to-[#041e33] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.28'%3E%3Cpath d='M20 0v40M0 20h40'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary shadow-lg shadow-primary/10">
            <span className="text-lg font-bold text-white">S</span>
          </div>
          <div>
            <p className="text-base font-bold text-white">SafariTour</p>
            <p className="text-[10px] uppercase tracking-widest text-white/45">Operations</p>
          </div>
        </div>
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto py-4">
        {role === 'admin' && (
          <CollapsibleGroup
            title="Admin"
            items={adminItems}
            role={role}
            isOpen={!!openSections['Admin']}
            onToggle={() => toggleSection('Admin')}
            onNavClick={onClose}
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
          />
        ))}
      </nav>

      <div className="relative z-10 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/10">
            <span className="text-xs font-bold text-white/65">{user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/75">{user?.full_name || 'User'}</p>
            <p className="text-[10px] capitalize text-white/35">{user?.role || '-'}</p>
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

function NavEntry({ item, onClick }: { item: NavItem; onClick: () => void }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `group mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200 border-l-2 ${
          isActive
            ? 'border-primary bg-primary/20 text-white'
            : 'border-transparent text-white/60 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <span className="grid h-5 w-5 place-items-center">
        <SidebarIcon name={item.icon} />
      </span>
      <span className="font-medium">{item.label}</span>
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
}: {
  title: string
  items: NavItem[]
  role: string
  isOpen: boolean
  onToggle: () => void
  onNavClick: () => void
}) {
  const visible = items.filter(i => i.roles.includes(role as UserRole))
  if (visible.length === 0) return null

  return (
    <div className="mb-2 px-4">
      <button
        onClick={onToggle}
        className="mb-1 flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:text-white"
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
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
          >
            {visible.map(item => (
              <NavEntry key={item.path} item={item} onClick={onNavClick} />
            ))}
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
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 19a7 7 0 0 1 14 0" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17H9m9-2V11a6 6 0 1 0-12 0v4l-2 2h16l-2-2Zm-5 4a2 2 0 0 1-2 0" />,
    plane: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 13.5 4 20l-1-3 4.5-5L3 7l1-3 6.5 6.5L19 2l2 2-6.5 8L21 20l-2 2-8.5-8.5Z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v3m10-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />,
    cash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16v10H4V7Zm3 3h.01M17 14h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a3 3 0 1 0-2.8-4M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-8 11a5 5 0 0 1 10 0m2 0a4.5 4.5 0 0 1 6 0" />,
  }

  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {paths[name]}
    </svg>
  )
}
