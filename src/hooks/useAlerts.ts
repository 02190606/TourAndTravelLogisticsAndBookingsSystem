import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { parseISO, differenceInCalendarDays } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'
import type { ServiceRecord, Vehicle } from '@/types'

const INTERVALS = [
  { days: 14, label: '2 weeks', severity: 'upcoming' as const },
  { days: 7, label: '1 week', severity: 'upcoming' as const },
  { days: 0, label: 'today', severity: 'upcoming' as const },
]

interface Alert {
  id: string
  type: 'service' | 'maintenance' | 'permit' | 'insurance' | 'pmo' | 'psv'
  vehicle_reg: string
  message: string
  due_date: string
  severity: 'upcoming' | 'overdue'
}

function checkDocumentExpiry(
  dueDateStr: string,
  type: Alert['type'],
  vehicleReg: string,
  vehicleId: string,
  prefix: string,
): Alert[] {
  const dueDate = parseISO(dueDateStr)
  const today = new Date()
  const diff = differenceInCalendarDays(dueDate, today)
  const alerts: Alert[] = []

  for (const interval of INTERVALS) {
    if (diff <= interval.days) {
      const isOverdue = diff < 0
      let message: string

      if (isOverdue) {
        message = `${type.charAt(0).toUpperCase() + type.slice(1)} expired on ${dueDateStr}`
      } else if (diff === 0) {
        message = `${type.charAt(0).toUpperCase() + type.slice(1)} expires today`
      } else {
        message = `${type.charAt(0).toUpperCase() + type.slice(1)} expires in ${diff} day${diff === 1 ? '' : 's'}`
      }

      alerts.push({
        id: `${prefix}-${interval.days}-${vehicleId}`,
        type,
        vehicle_reg: vehicleReg,
        message,
        due_date: dueDateStr,
        severity: isOverdue ? 'overdue' : interval.severity,
      })
    }
  }

  return alerts
}

export function useAlerts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async (): Promise<{ alerts: Alert[]; count: number }> => {
      if (!user) return { alerts: [], count: 0 }

      const alerts: Alert[] = []

      const { data: acknowledged } = await supabase
        .from('acknowledged_alerts')
        .select('alert_id')
        .eq('user_id', user.id)
      const acknowledgedIds = new Set(acknowledged?.map(a => a.alert_id) || [])

      const { data: vehicles } = await supabase.from('vehicles').select('*')
      if (!vehicles) return { alerts: [], count: 0 }

      for (const v of vehicles) {
        if (v.permit_expiry_date) {
          alerts.push(...checkDocumentExpiry(v.permit_expiry_date, 'permit', v.registration_number, v.id, 'permit'))
        }
        if (v.insurance_expiry) {
          alerts.push(...checkDocumentExpiry(v.insurance_expiry, 'insurance', v.registration_number, v.id, 'insurance'))
        }
        if (v.pmo_expiry) {
          alerts.push(...checkDocumentExpiry(v.pmo_expiry, 'pmo', v.registration_number, v.id, 'pmo'))
        }
        if (v.psv_expiry) {
          alerts.push(...checkDocumentExpiry(v.psv_expiry, 'psv', v.registration_number, v.id, 'psv'))
        }
      }

      const { data: services } = await supabase
        .from('service_records')
        .select('*, vehicles!inner(*)')

      if (services) {
        for (const s of services as (ServiceRecord & { vehicles: Vehicle })[]) {
          if (s.next_service_date) {
            alerts.push(...checkDocumentExpiry(s.next_service_date, 'service', s.vehicles.registration_number, s.vehicles.id, `service-${s.id}`))
          }
        }
      }

      const filteredAlerts = alerts.filter(a => !acknowledgedIds.has(a.id))
      filteredAlerts.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

      return { alerts: filteredAlerts, count: filteredAlerts.length }
    },
    refetchInterval: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!user || !query.data) return

    const allAlertIds = query.data.alerts.map(a => a.id)
    if (allAlertIds.length === 0) return

    const syncAcknowledge = async () => {
      const { data: sentAlerts } = await supabase
        .from('sent_alerts')
        .select('alert_item_id')
        .eq('user_id', user.id)

      if (!sentAlerts || sentAlerts.length === 0) return

      const { data: acknowledged } = await supabase
        .from('acknowledged_alerts')
        .select('alert_id')
        .eq('user_id', user.id)

      const ackedSet = new Set(acknowledged?.map(a => a.alert_id) || [])
      const toAck = sentAlerts.filter(s => allAlertIds.includes(s.alert_item_id) && !ackedSet.has(s.alert_item_id))

      if (toAck.length > 0) {
        const ackRows = toAck.map(s => ({ user_id: user.id, alert_id: s.alert_item_id }))
        await supabase.from('acknowledged_alerts').upsert(ackRows, { onConflict: 'user_id,alert_id', ignoreDuplicates: true })
        queryClient.invalidateQueries({ queryKey: ['alerts'] })
      }
    }

    syncAcknowledge()
  }, [user, query.data])

  return query
}
