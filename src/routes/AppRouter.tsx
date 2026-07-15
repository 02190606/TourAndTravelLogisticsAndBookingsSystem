import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { Login } from '@/pages/auth/Login'
import { ProtectedRoute } from './ProtectedRoute'

// Lazy load pages for better initial bundle size
import { lazy, Suspense } from 'react'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const UserManagement = lazy(() => import('@/pages/admin/UserManagement').then(m => ({ default: m.UserManagement })))
const LogisticsDashboard = lazy(() => import('@/pages/logistics/LogisticsDashboard').then(m => ({ default: m.LogisticsDashboard })))
const VehicleDetails = lazy(() => import('@/pages/logistics/VehicleDetails').then(m => ({ default: m.VehicleDetails })))
const VehicleProfile = lazy(() => import('@/pages/logistics/VehicleProfile').then(m => ({ default: m.VehicleProfile })))
const ServiceMaintenance = lazy(() => import('@/pages/logistics/ServiceMaintenance').then(m => ({ default: m.ServiceMaintenance })))
const Complaints = lazy(() => import('@/pages/logistics/Complaints').then(m => ({ default: m.Complaints })))
const Penalties = lazy(() => import('@/pages/logistics/Penalties').then(m => ({ default: m.Penalties })))
const DriverDetails = lazy(() => import('@/pages/logistics/DriverDetails').then(m => ({ default: m.DriverDetails })))
const LogisticsAlerts = lazy(() => import('@/pages/logistics/LogisticsAlerts').then(m => ({ default: m.LogisticsAlerts })))
const TripsDashboard = lazy(() => import('@/pages/trips/TripsDashboard').then(m => ({ default: m.TripsDashboard })))
const TripManagement = lazy(() => import('@/pages/trips/TripManagement').then(m => ({ default: m.TripManagement })))
const CalendarView = lazy(() => import('@/pages/trips/CalendarView').then(m => ({ default: m.CalendarView })))
const PaymentsRevenue = lazy(() => import('@/pages/trips/PaymentsRevenue').then(m => ({ default: m.PaymentsRevenue })))
const TripAlerts = lazy(() => import('@/pages/trips/TripAlerts').then(m => ({ default: m.TripAlerts })))

function LazyLoad({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Admin routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <LazyLoad><UserManagement /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <LazyLoad><AdminDashboard /></LazyLoad>
              </ProtectedRoute>
            }
          />

          {/* Logistics routes */}
          <Route
            path="/logistics"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><LogisticsDashboard /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics/vehicles"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><VehicleDetails /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics/vehicles/:id"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><VehicleProfile /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics/service"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><ServiceMaintenance /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics/complaints"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><Complaints /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics/penalties"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><Penalties /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics/drivers"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><DriverDetails /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics/alerts"
            element={
              <ProtectedRoute roles={['admin', 'logistics']}>
                <LazyLoad><LogisticsAlerts /></LazyLoad>
              </ProtectedRoute>
            }
          />

          {/* Trips routes */}
          <Route
            path="/trips"
            element={
              <ProtectedRoute roles={['admin', 'trips']}>
                <LazyLoad><TripsDashboard /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/manage"
            element={
              <ProtectedRoute roles={['admin', 'trips']}>
                <LazyLoad><TripManagement /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/manage/:id"
            element={
              <ProtectedRoute roles={['admin', 'trips']}>
                <LazyLoad><TripManagement /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/calendar"
            element={
              <ProtectedRoute roles={['admin', 'trips']}>
                <LazyLoad><CalendarView /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/payments"
            element={
              <ProtectedRoute roles={['admin', 'trips']}>
                <LazyLoad><PaymentsRevenue /></LazyLoad>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/alerts"
            element={
              <ProtectedRoute roles={['admin', 'trips']}>
                <LazyLoad><TripAlerts /></LazyLoad>
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
