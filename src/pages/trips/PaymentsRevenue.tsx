import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, StatCard, Button, CardSkeleton, StatusBadge } from '@/components/common'
import { BarChart } from '@/components/charts/BarChart'
import { formatUGX, formatDate, computeTripStatus, isActiveTrip } from '@/utils'
import { saveAs } from 'file-saver'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import type { Trip } from '@/types'

export function PaymentsRevenue() {
  const [showChart, setShowChart] = useState(false)
  const now = new Date()
  const thisYear = now.getFullYear()
  const [yearFilter, setYearFilter] = useState(thisYear)

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

  const thisMonth = now.getMonth()

  const filteredTrips = trips.filter(t => new Date(t.trip_start_date).getFullYear() === yearFilter)

  const monthlyRevenue = trips
    .filter(t => isActiveTrip(t) && new Date(t.trip_start_date).getMonth() === thisMonth && new Date(t.trip_start_date).getFullYear() === yearFilter)
    .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

  const yearlyRevenue = filteredTrips
    .filter(t => isActiveTrip(t))
    .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0)

  const outstandingBalance = trips
    .filter(t => t.balance > 0 && isActiveTrip(t))
    .reduce((sum, t) => sum + (t.balance || 0), 0)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const revenueByMonth = months.map((name, i) => ({
    name,
    value: filteredTrips
      .filter(t => isActiveTrip(t) && new Date(t.trip_start_date).getMonth() === i)
      .reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0),
  }))

  const monthlySummary = months.map((name, i) => {
    const monthTrips = filteredTrips.filter(t => isActiveTrip(t) && new Date(t.trip_start_date).getMonth() === i)
    return {
      name,
      revenue: monthTrips.reduce((sum, t) => sum + (t.amount_in_ugx || 0), 0),
      count: monthTrips.length,
    }
  })

  const yearOptions = Array.from({ length: 5 }, (_, i) => thisYear - i)

  function exportCSV() {
    const headers = 'Client,Amount(UGX),Payment Mode,Balance,Start Date,End Date,Status\n'
    const rows = filteredTrips.map(t =>
      `${t.client_name},${t.amount_in_ugx},${t.payment_mode},${t.balance},${formatDate(t.trip_start_date)},${formatDate(t.trip_end_date)},${computeTripStatus(t)}`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `payments-${yearFilter}.csv`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue & Payments"
        subtitle="Financial overview"
        actions={
          <div className="flex items-center gap-3">
            <select
              value={yearFilter}
              onChange={e => setYearFilter(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-slate-200/80 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={exportCSV}>Export CSV</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-x-auto">
        <StatCard title="This Month" value={formatUGX(monthlyRevenue)} icon={<DollarSign />} color="primary" />
        <StatCard title="This Year" value={formatUGX(yearlyRevenue)} icon={<TrendingUp />} color="secondary" />
        <StatCard title="Outstanding Balances" value={formatUGX(outstandingBalance)} icon={<AlertTriangle />} color="warning" className="border-amber-200/60 bg-amber-50/20" />
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <button onClick={() => setShowChart(!showChart)} className="flex items-center gap-2 px-6 py-3 w-full text-left text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
          <svg className={`w-4 h-4 transition-transform ${showChart ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
          Monthly Revenue
        </button>
        {showChart && (
          <div className="px-6 pb-6">
            <BarChart data={revenueByMonth} color="#22D3EE" />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-x-auto">
        <table className="w-full border-separate border-spacing-x-4 responsive-table">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Client</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Amount (UGX)</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Payment Mode</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Balance</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Start</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {filteredTrips.map((t, i) => (
              <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td data-label="Client" className="px-3 py-3 text-sm whitespace-nowrap">{t.client_name}</td>
                <td data-label="Amount (UGX)" className="px-3 py-3 text-sm font-mono text-right whitespace-nowrap">{formatUGX(t.amount_in_ugx)}</td>
                <td data-label="Payment" className="px-3 py-3 text-sm capitalize whitespace-nowrap">{t.payment_mode}</td>
                <td data-label="Balance" className={`px-3 py-3 text-sm font-mono text-right whitespace-nowrap ${t.balance > 0 ? 'text-warning' : 'text-success'}`}>{formatUGX(t.balance)}</td>
                <td data-label="Start" className="px-3 py-3 text-sm whitespace-nowrap">{formatDate(t.trip_start_date)}</td>
                <td data-label="Status" className="whitespace-nowrap"><StatusBadge status={computeTripStatus(t)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {monthlySummary.map(m => (
          <div key={m.name} className={`rounded-lg border border-slate-200/80 p-3 shadow-sm text-center transition-colors ${m.revenue > 0 ? 'bg-white' : 'bg-slate-50/60 opacity-50'}`}>
            <p className="text-xs text-text-secondary font-medium">{m.name}</p>
            <p className={`text-sm font-mono font-bold mt-1 ${m.revenue > 0 ? 'text-text-primary' : 'text-text-secondary/50'}`}>{formatUGX(m.revenue)}</p>
            <p className="text-xs text-text-secondary">{m.count} trips</p>
          </div>
        ))}
      </div>
    </div>
  )
}
