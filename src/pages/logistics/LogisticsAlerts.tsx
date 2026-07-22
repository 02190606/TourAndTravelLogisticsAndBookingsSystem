import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Button, CardSkeleton } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'
import type { AlertSetting } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { useAlerts } from '@/hooks/useAlerts'

export function LogisticsAlerts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: alertData, isLoading } = useAlerts()
  const [settingsOpen, setSettingsOpen] = useState(true)

  const { data: settings = [] } = useQuery({
    queryKey: ['alert-settings', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('alert_settings').select('*').eq('user_id', user?.id)
      return (data || []) as AlertSetting[]
    },
  })

  const getSetting = (type: string) => settings.find(s => s.alert_type === type)

  const saveSettings = useMutation({
    mutationFn: async (newSettings: { alert_type: string; days_before: number }[]) => {
      for (const s of newSettings) {
        const existing = getSetting(s.alert_type)
        if (existing) {
          await supabase.from('alert_settings').update({ days_before: s.days_before }).eq('id', existing.id)
        } else {
          await supabase.from('alert_settings').insert({
            user_id: user?.id, alert_type: s.alert_type, days_before: s.days_before, is_enabled: true,
          })
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alert-settings'] }); toast.success('Alert settings saved') },
    onError: (err: Error) => toast.error(err.message),
  })

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      await supabase.from('acknowledged_alerts').insert({ user_id: user?.id, alert_id: alertId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert acknowledged')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const [serviceDays, setServiceDays] = useState(7)
  const [permitDays, setPermitDays] = useState(30)

  useEffect(() => {
    const service = getSetting('service')
    const permit = getSetting('permit')
    if (service) setServiceDays(service.days_before)
    if (permit) setPermitDays(permit.days_before)
  }, [settings])

  if (isLoading) return <CardSkeleton count={3} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Reminders"
        subtitle={`${alertData?.count || 0} active alerts`}
      />

      {/* Settings Panel */}
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
                    <label className="block text-sm font-medium mb-1">Alert me X days before a service is due</label>
                    <input type="number" value={serviceDays} onChange={e => setServiceDays(Number(e.target.value))} min={1} className="w-32 px-3 py-2 border border-muted/60 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alert me X days before a permit/insurance expires</label>
                    <input type="number" value={permitDays} onChange={e => setPermitDays(Number(e.target.value))} min={1} className="w-32 px-3 py-2 border border-muted/60 rounded-xl text-sm" />
                  </div>
                </div>
                <Button size="sm" onClick={() => saveSettings.mutate([
                  { alert_type: 'service', days_before: serviceDays },
                  { alert_type: 'permit', days_before: permitDays },
                  { alert_type: 'insurance', days_before: permitDays },
                  { alert_type: 'pmo', days_before: permitDays },
                  { alert_type: 'psv', days_before: permitDays },
                ])} isLoading={saveSettings.isPending}>
                  Save Settings
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Alert Feed */}
      <div className="space-y-3">
        {alertData?.alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium">All clear! No alerts at this time.</p>
          </div>
        ) : (
          alertData?.alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-xl p-4 shadow-sm border-l-4 flex items-start justify-between gap-4 ${
                alert.severity === 'overdue' ? 'border-l-danger' : 'border-l-warning'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">
                  {alert.type === 'service' ? '🔧' : alert.type === 'maintenance' ? '⚠️' : '🛡️'}
                </span>
                <div>
                  <p className="font-semibold text-sm">{alert.vehicle_reg}</p>
                  <p className="text-sm text-text-secondary">{alert.message}</p>
                  <p className="text-xs text-text-secondary mt-1">{formatDate(alert.due_date)}</p>
                </div>
              </div>
              <button
                onClick={() => acknowledgeAlert.mutate(alert.id)}
                disabled={acknowledgeAlert.isPending}
                className="px-3 py-2 min-h-[36px] text-xs bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
              >
                {acknowledgeAlert.isPending ? '...' : 'Acknowledge'}
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

