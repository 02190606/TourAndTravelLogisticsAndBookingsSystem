import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, CardSkeleton } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import { formatDate, computeTripStatus } from '@/utils'
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

  const { data: sentAlerts } = useQuery({
    queryKey: ['sent-trip-alerts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sent_alerts')
        .select('alert_item_id')
        .eq('user_id', user?.id)
      return data?.map(a => a.alert_item_id) || []
    },
  })

  useEffect(() => {
    if (sentAlerts && sentAlerts.length > 0) {
      const toAck = sentAlerts.filter(id => !acknowledgedIds?.has(id))
      if (toAck.length > 0) {
        const ackRows = toAck.map(alert_id => ({ user_id: user?.id, alert_id }))
        supabase.from('acknowledged_alerts').upsert(ackRows, { onConflict: 'user_id,alert_id', ignoreDuplicates: true })
          .then(() => queryClient.invalidateQueries({ queryKey: ['acknowledged-trip-alerts'] }))
      }
    }
  }, [sentAlerts, acknowledgedIds, user?.id])

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

  function getDaysToStart(trip: Trip): number {
    if (!trip.trip_start_date) return Infinity
    const start = parseISO(trip.trip_start_date)
    return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  function dayLabel(n: number): string {
    return Math.abs(n) === 1 ? 'day' : 'days'
  }

  type Urgency = 'overdue' | 'today' | 'soon'

  function getUrgency(trip: Trip): Urgency {
    const d = getDaysToStart(trip)
    if (d < 0) return 'overdue'
    if (d === 0) return 'today'
    return 'soon'
  }

  const tripAlerts = trips
    .filter(t => {
      const s = computeTripStatus(t)
      return s === 'planned' || s === 'ongoing' || s === 'ends_today'
    })
    .filter(t => {
      if (!t.trip_start_date || !t.trip_end_date) return false
      const start = parseISO(t.trip_start_date)
      const end = parseISO(t.trip_end_date)
      const startThreshold = addDays(today, daysBefore)
      const endThreshold = addDays(today, daysBeforeEnd)
      return isBefore(start, startThreshold) || isBefore(end, endThreshold)
    })
    .filter(t => !acknowledgedIds?.has(`trip-start-${t.id}`))
    .sort((a, b) => getDaysToStart(a) - getDaysToStart(b))
    .slice(0, 20)

  const sections: { key: Urgency; label: string; dot: string; items: typeof tripAlerts }[] = [
    { key: 'overdue', label: 'Overdue', dot: 'bg-danger', items: tripAlerts.filter(t => getUrgency(t) === 'overdue') },
    { key: 'today', label: 'Starting Today', dot: 'bg-warning', items: tripAlerts.filter(t => getUrgency(t) === 'today') },
    { key: 'soon', label: 'Starting Soon', dot: 'bg-secondary', items: tripAlerts.filter(t => getUrgency(t) === 'soon') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip Alerts"
        actions={
          tripAlerts.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
              {tripAlerts.length}
            </span>
          ) : undefined
        }
      />

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

      <div className="space-y-5">
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
          sections.filter(s => s.items.length > 0).map(section => (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`w-2 h-2 rounded-full ${section.dot}`} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  {section.label}
                </h3>
                <span className="text-xs text-text-secondary/60">({section.items.length})</span>
              </div>
              <div className="space-y-2">
                {section.items.map((trip, i) => {
                  const daysToStart = getDaysToStart(trip)
                  const isOverdue = daysToStart < 0
                  const borderClass = isOverdue
                    ? 'border-l-danger'
                    : daysToStart === 0
                      ? 'border-l-warning'
                      : 'border-l-secondary'

                  return (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`bg-white rounded-xl px-4 py-3 shadow-sm border border-muted/40 border-l-4 ${borderClass} flex items-center justify-between gap-4`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{trip.client_name}</p>
                          <p className="text-xs text-text-secondary">
                            {isOverdue
                              ? `Started ${Math.abs(daysToStart)} ${dayLabel(daysToStart)} ago`
                              : daysToStart === 0
                                ? 'Starts today'
                                : `Starts in ${daysToStart} ${dayLabel(daysToStart)}`
                            }
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                            <span>{formatDate(trip.trip_start_date)} — {formatDate(trip.trip_end_date)}</span>
                            {trip.vehicles && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15h14l-1.4-4.2A2.6 2.6 0 0 0 15.1 9H8.9a2.6 2.6 0 0 0-2.5 1.8L5 15Z" /></svg>
                                {trip.vehicles.registration_number}
                              </span>
                            )}
                            {trip.drivers && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                {trip.drivers.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => acknowledgeTripAlert.mutate(`trip-start-${trip.id}`)}
                        disabled={acknowledgeTripAlert.isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Acknowledge
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
