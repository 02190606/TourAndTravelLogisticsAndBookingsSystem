import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, CardSkeleton } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import { formatDate, formatUGX } from '@/utils'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { addDays, parseISO, isBefore } from 'date-fns'
import type { Trip, AlertSetting } from '@/types'

export function TripAlerts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [daysBefore, setDaysBefore] = useState(7)
  const [daysBeforeEnd, setDaysBeforeEnd] = useState(1)

  const { data: trips = [] } = useQuery({
    queryKey: ['all-trips'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trips')
        .select('*, vehicles!left(registration_number), drivers!left(full_name)')
        .order('trip_start_date', { ascending: true })
      return (data || []) as (Trip & { vehicles?: { registration_number: string }; drivers?: { full_name: string } })[]
    },
  })

  const { data: settings } = useQuery({
    queryKey: ['trip-alert-settings', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('alert_settings').select('*').eq('user_id', user?.id)
      return (data || []) as AlertSetting[]
    },
  })

  const saveSettings = useMutation({
    mutationFn: async () => {
      for (const { alert_type, days } of [
        { alert_type: 'trip_start', days: daysBefore },
        { alert_type: 'trip_end', days: daysBeforeEnd },
      ]) {
        const existing = settings?.find(s => s.alert_type === alert_type)
        if (existing) {
          await supabase.from('alert_settings').update({ days_before: days }).eq('id', existing.id)
        } else {
          await supabase.from('alert_settings').insert({
            user_id: user?.id, alert_type, days_before: days, is_enabled: true,
          })
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip-alert-settings'] }); toast.success('Alert settings saved') },
    onError: (err: Error) => toast.error(err.message),
  })

  const { data: acknowledgedIds } = useQuery({
    queryKey: ['acknowledged-trip-alerts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('acknowledged_alerts')
        .select('alert_id')
        .eq('user_id', user?.id)
      return new Set(data?.map(a => a.alert_id) || [])
    },
  })

  const acknowledgeTripAlert = useMutation({
    mutationFn: async (alertId: string) => {
      await supabase.from('acknowledged_alerts').insert({ user_id: user?.id, alert_id: alertId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledged-trip-alerts'] })
      toast.success('Alert acknowledged')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  useEffect(() => {
    const start = settings?.find(s => s.alert_type === 'trip_start')
    const end = settings?.find(s => s.alert_type === 'trip_end')
    if (start) setDaysBefore(start.days_before)
    if (end) setDaysBeforeEnd(end.days_before)
  }, [settings])

  const today = new Date()
  const tripAlerts = trips
    .filter(t => t.status === 'planned' || t.status === 'ongoing')
    .filter(t => {
      const start = parseISO(t.trip_start_date)
      const end = parseISO(t.trip_end_date)
      const startThreshold = addDays(today, daysBefore)
      const endThreshold = addDays(today, daysBeforeEnd)
      return isBefore(start, startThreshold) || isBefore(end, endThreshold)
    })
    .filter(t => !acknowledgedIds?.has(`trip-start-${t.id}`))
    .slice(0, 20)

  return (
    <div className="space-y-6">
      <PageHeader title="Trip Alerts" subtitle={`${tripAlerts.length} upcoming alerts`} />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-muted/10 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span>⚙️</span>
            <h3 className="font-display font-bold">Alert Settings</h3>
          </div>
          <svg className={`w-5 h-5 text-text-secondary transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-5 pb-5 space-y-4 border-t border-muted/30 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Alert me X days before a trip starts</label>
                    <input type="number" value={daysBefore} onChange={e => setDaysBefore(Number(e.target.value))} min={1} className="w-32 px-3 py-2 border border-muted/60 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alert me X days before a trip ends</label>
                    <input type="number" value={daysBeforeEnd} onChange={e => setDaysBeforeEnd(Number(e.target.value))} min={0} className="w-32 px-3 py-2 border border-muted/60 rounded-xl text-sm" />
                  </div>
                </div>
                <Button size="sm" onClick={() => saveSettings.mutate()} isLoading={saveSettings.isPending}>Save Settings</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        {tripAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium">No upcoming alerts</p>
          </div>
        ) : (
          tripAlerts.map((trip, i) => {
            const start = parseISO(trip.trip_start_date)
            const daysToStart = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            const isOverdue = daysToStart < 0

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 flex items-start justify-between gap-4 ${
                  isOverdue ? 'border-l-danger' : daysToStart <= 1 ? 'border-l-danger' : 'border-l-warning'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">✈️</span>
                  <div>
                    <p className="font-semibold text-sm">{trip.client_name}</p>
                    <p className="text-sm text-text-secondary">
                      {isOverdue
                        ? `Trip started ${Math.abs(daysToStart)} days ago`
                        : daysToStart === 0
                          ? 'Trip starts today!'
                          : `Trip starts in ${daysToStart} days`
                      }
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {formatDate(trip.trip_start_date)} — {formatDate(trip.trip_end_date)}
                    </p>
                    {trip.vehicles && <p className="text-xs text-text-secondary">🚙 {trip.vehicles.registration_number}</p>}
                    {trip.drivers && <p className="text-xs text-text-secondary">👤 {trip.drivers.full_name}</p>}
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeTripAlert.mutate(`trip-start-${trip.id}`)}
                  disabled={acknowledgeTripAlert.isPending}
                  className="px-3 py-1.5 text-xs bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
                >
                  {acknowledgeTripAlert.isPending ? '...' : 'Acknowledge'}
                </button>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
