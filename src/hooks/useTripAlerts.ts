import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { addDays, parseISO, isBefore } from 'date-fns'
import { computeTripStatus } from '@/utils/tripStatus'
import type { Trip, AlertSetting } from '@/types'

export function useTripAlerts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['trip-alert-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0

      const { data: settings } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', user.id)

      const settingsData = (settings || []) as AlertSetting[]
      const daysBefore = settingsData.find(s => s.alert_type === 'trip_start')?.days_before ?? 7
      const daysBeforeEnd = settingsData.find(s => s.alert_type === 'trip_end')?.days_before ?? 1

      const { data: acknowledged } = await supabase
        .from('acknowledged_alerts')
        .select('alert_id')
        .eq('user_id', user.id)
      const ackedIds = new Set(acknowledged?.map(a => a.alert_id) || [])

      const { data: trips } = await supabase
        .from('trips')
        .select('id, status, trip_start_date, trip_end_date')
        .order('trip_start_date', { ascending: true })

      if (!trips) return 0

      const today = new Date()
      let count = 0

      for (const t of trips as Trip[]) {
        if (!t.trip_start_date || !t.trip_end_date) continue
        const status = computeTripStatus(t)
        if (status !== 'planned' && status !== 'ongoing' && status !== 'ends_today') continue

        const start = parseISO(t.trip_start_date)
        const end = parseISO(t.trip_end_date)
        const startThreshold = addDays(today, daysBefore)
        const endThreshold = addDays(today, daysBeforeEnd)

        if ((isBefore(start, startThreshold) || isBefore(end, endThreshold)) && !ackedIds.has(`trip-start-${t.id}`)) {
          count++
        }
      }

      return count
    },
    refetchInterval: 10 * 60 * 1000,
  })
}
