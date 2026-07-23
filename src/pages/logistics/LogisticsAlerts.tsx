import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, CardSkeleton } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useAlerts } from '@/hooks/useAlerts'

export function LogisticsAlerts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: alertData, isLoading } = useAlerts()

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

  if (isLoading) return <CardSkeleton count={3} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Reminders"
        subtitle={`${alertData?.count || 0} active alerts`}
      />

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-display font-bold mb-2">Alert Schedule</h3>
        <p className="text-sm text-text-secondary mb-3">Alerts fire automatically at three intervals for every document:</p>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-info/10 text-info text-sm font-medium">📅 2 weeks before</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-sm font-medium">📅 1 week before</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-sm font-medium">📅 Exact day</span>
        </div>
        <p className="text-xs text-text-secondary mt-3">Applies to: Insurance, PMO, PSV, Service, and Permit expiry dates.</p>
      </div>

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
                  {alert.type === 'service' ? '🔧' : '🛡️'}
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
