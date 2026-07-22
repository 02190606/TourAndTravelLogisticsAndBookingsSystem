import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { addDays, parseISO, isBefore, isAfter } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'
import type { AlertSetting, ServiceRecord, Vehicle } from '@/types'

interface Alert {
  id: string
  type: 'service' | 'maintenance' | 'permit' | 'insurance' | 'pmo' | 'psv'
  vehicle_reg: string
  message: string
  due_date: string
  severity: 'upcoming' | 'overdue'
}

export function useAlerts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async (): Promise<{ alerts: Alert[]; count: number }> => {
      if (!user) return { alerts: [], count: 0 }

      const { data: settings } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_enabled', true)

      const settingsMap: Record<string, number> = {}
      if (settings) {
        settings.forEach((s: AlertSetting) => {
          settingsMap[s.alert_type] = s.days_before
        })
      }

      const daysBeforeService = settingsMap.service || 7
      const daysBeforePermit = settingsMap.permit || 30
      const daysBeforeInsurance = settingsMap.insurance || 30
      const daysBeforePMO = settingsMap.pmo || 30
      const daysBeforePSV = settingsMap.psv || 30

      const alerts: Alert[] = []
      const today = new Date()

      const { data: acknowledged } = await supabase
        .from('acknowledged_alerts')
        .select('alert_id')
        .eq('user_id', user.id)
      const acknowledgedIds = new Set(acknowledged?.map(a => a.alert_id) || [])

      const { data: vehicles } = await supabase.from('vehicles').select('*')
      if (!vehicles) return { alerts: [], count: 0 }

      for (const v of vehicles) {
        if (v.permit_expiry_date) {
          const dueDate = parseISO(v.permit_expiry_date)
          const threshold = addDays(today, daysBeforePermit)
          if (isBefore(dueDate, threshold)) {
            alerts.push({
              id: `permit-${v.id}`,
              type: 'permit',
              vehicle_reg: v.registration_number,
              message: isBefore(dueDate, today)
                ? `Permit expired on ${v.permit_expiry_date}`
                : `Permit expires in ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days`,
              due_date: v.permit_expiry_date,
              severity: isBefore(dueDate, today) ? 'overdue' : 'upcoming',
            })
          }
        }

        if (v.insurance_expiry) {
          const dueDate = parseISO(v.insurance_expiry)
          const threshold = addDays(today, daysBeforeInsurance)
          if (isBefore(dueDate, threshold)) {
            alerts.push({
              id: `insurance-${v.id}`,
              type: 'insurance',
              vehicle_reg: v.registration_number,
              message: isBefore(dueDate, today)
                ? `Insurance expired on ${v.insurance_expiry}`
                : `Insurance expires in ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days`,
              due_date: v.insurance_expiry,
              severity: isBefore(dueDate, today) ? 'overdue' : 'upcoming',
            })
          }
        }

        if (v.pmo_expiry) {
          const dueDate = parseISO(v.pmo_expiry)
          const threshold = addDays(today, daysBeforePMO)
          if (isBefore(dueDate, threshold)) {
            alerts.push({
              id: `pmo-${v.id}`,
              type: 'pmo',
              vehicle_reg: v.registration_number,
              message: isBefore(dueDate, today)
                ? `PMO expired on ${v.pmo_expiry}`
                : `PMO expires in ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days`,
              due_date: v.pmo_expiry,
              severity: isBefore(dueDate, today) ? 'overdue' : 'upcoming',
            })
          }
        }

        if (v.psv_expiry) {
          const dueDate = parseISO(v.psv_expiry)
          const threshold = addDays(today, daysBeforePSV)
          if (isBefore(dueDate, threshold)) {
            alerts.push({
              id: `psv-${v.id}`,
              type: 'psv',
              vehicle_reg: v.registration_number,
              message: isBefore(dueDate, today)
                ? `PSV expired on ${v.psv_expiry}`
                : `PSV expires in ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days`,
              due_date: v.psv_expiry,
              severity: isBefore(dueDate, today) ? 'overdue' : 'upcoming',
            })
          }
        }
      }

      const { data: services } = await supabase
        .from('service_records')
        .select('*, vehicles!inner(*)')

      if (services) {
        for (const s of services as (ServiceRecord & { vehicles: Vehicle })[]) {
          if (s.next_service_date) {
            const dueDate = parseISO(s.next_service_date)
            const threshold = addDays(today, daysBeforeService)
            if (isBefore(dueDate, threshold)) {
              alerts.push({
                id: `service-${s.id}`,
                type: 'service',
                vehicle_reg: s.vehicles.registration_number,
                message: isBefore(dueDate, today)
                  ? `Service was due on ${s.next_service_date}`
                  : `Service due in ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days`,
                due_date: s.next_service_date,
                severity: isBefore(dueDate, today) ? 'overdue' : 'upcoming',
              })
            }
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
