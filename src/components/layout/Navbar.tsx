import { useAuth } from '@/context/AuthContext'
import { useAlerts } from '@/hooks/useAlerts'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth()
  const { data: alertData } = useAlerts()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="cursor-pointer rounded-md p-2.5 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

        </div>

        <div className="flex items-center gap-2">
          <button
            className="relative cursor-pointer rounded-md p-2.5 transition-colors hover:bg-slate-100"
            aria-label={`Notifications`}
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {(alertData?.count || 0) > 0 && (
              <span className="absolute right-1 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white shadow-sm shadow-danger/30">
                {alertData!.count > 9 ? '9+' : alertData!.count}
              </span>
            )}
          </button>

          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-secondary to-primary text-xs font-bold text-white shadow-sm">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-text-primary leading-tight">{user?.full_name}</p>
                <p className="text-[11px] text-text-secondary capitalize leading-tight">{user?.role}</p>
              </div>
              <svg className="w-4 h-4 text-text-secondary hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            <AnimateDropdown open={showDropdown}>
              <div className="px-4 py-3 border-b border-muted/20">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
                <p className="text-xs text-text-secondary mt-0.5">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowDropdown(false); logout(); navigate('/login') }}
                className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign Out
              </button>
            </AnimateDropdown>
          </div>
        </div>
      </div>
    </header>
  )
}

function AnimateDropdown({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-10" />
      <div className="animate-dropdown absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
        {children}
      </div>
    </>
  )
}
