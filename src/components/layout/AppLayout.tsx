import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { motion } from 'framer-motion'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-surface text-text-primary">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F8FAFC_0%,#F1F5F9_48%,#E2E8F0_100%)] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:pb-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto w-full max-w-[1500px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
