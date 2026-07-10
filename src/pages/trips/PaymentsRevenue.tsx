import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, StatCard, Button, CardSkeleton } from '@/components/common'
import { BarChart } from '@/components/charts/BarChart'
import { formatUGX, formatDate } from '@/utils'
import { saveAs } from 'file-saver'
import type { Trip } from '@/types'

export function PaymentsRevenue() {
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['payments-revenue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .order('trip_start_date', { ascending: false })
      return (data || []) as Trip[]
    },
  })

  if (isLoading) return <CardSkeleton count={3} />

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  const monthlyRevenue = trips
    .filter(t => t.status === 'completed' && new Date(t.trip_start_date).getMonth() === thisMonth && new Date(t.trip_start_date).getFullYear() === thisYear)
    .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

  const yearlyRevenue = trips
    .filter(t => t.status === 'completed' && new Date(t.trip_start_date).getFullYear() === thisYear)
    .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

  const outstandingBalance = trips
    .filter(t => t.balance > 0 && t.status !== 'cancelled')
    .reduce((sum, t) => sum + (t.balance || 0), 0)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const revenueByMonth = months.map((name, i) => ({
    name,
    value: trips
      .filter(t => new Date(t.trip_start_date).getMonth() === i && new Date(t.trip_start_date).getFullYear() === thisYear)
      .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0),
  }))

  const monthlySummary = months.map((name, i) => {
    const monthTrips = trips.filter(t => new Date(t.trip_start_date).getMonth() === i && new Date(t.trip_start_date).getFullYear() === thisYear)
    return {
      name,
      revenue: monthTrips.reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0),
      count: monthTrips.length,
    }
  })

  function exportCSV() {
    const headers = 'Client,Amount(UGX),Payment Mode,Balance,Start Date,End Date,Status\n'
    const rows = trips.map(t =>
      `${t.client_name},${t.amount_in_ugx},${t.payment_mode},${t.balance},${formatDate(t.trip_start_date)},${formatDate(t.trip_end_date)},${t.status}`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `payments-${thisYear}.csv`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue & Payments"
        subtitle="Financial overview"
        actions={<Button size="sm" variant="outline" onClick={exportCSV}>Export CSV</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="This Month" value={formatUGX(monthlyRevenue)} icon="💰" color="primary" />
        <StatCard title="This Year" value={formatUGX(yearlyRevenue)} icon="📈" color="secondary" />
        <StatCard title="Outstanding Balances" value={formatUGX(outstandingBalance)} icon="⚠️" color="warning" />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-display font-bold text-lg mb-4">Monthly Revenue</h3>
        <BarChart data={revenueByMonth} color="#22D3EE" />
      </div>

      <div className="bg-white rounded-xl border border-muted/30 overflow-hidden">
        <table className="w-full responsive-table">
          <thead>
            <tr className="bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Amount (UGX)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Payment Mode</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Start</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {trips.map((t, i) => (
              <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td data-label="Client" className="px-4 py-3 text-sm">{t.client_name}</td>
                <td data-label="Amount (UGX)" className="px-4 py-3 text-sm font-mono">{formatUGX(t.amount_in_ugx)}</td>
                <td data-label="Payment" className="px-4 py-3 text-sm capitalize">{t.payment_mode}</td>
                <td data-label="Balance" className={`px-4 py-3 text-sm font-mono ${t.balance > 0 ? 'text-warning' : 'text-success'}`}>{formatUGX(t.balance)}</td>
                <td data-label="Start" className="px-4 py-3 text-sm">{formatDate(t.trip_start_date)}</td>
                <td data-label="Status" className="px-4 py-3 text-sm capitalize">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {monthlySummary.map(m => (
          <div key={m.name} className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-xs text-text-secondary font-medium">{m.name}</p>
            <p className="text-sm font-mono font-bold text-text-primary mt-1">{formatUGX(m.revenue)}</p>
            <p className="text-xs text-text-secondary">{m.count} trips</p>
          </div>
        ))}
      </div>
    </div>
  )
}
