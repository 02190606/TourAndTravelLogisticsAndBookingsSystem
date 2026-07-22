import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface DonutData {
  name: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutData[]
}

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <p className="mt-3 text-sm text-text-secondary font-medium">No trip data yet</p>
        <p className="text-xs text-text-secondary/70">Bookings will appear here</p>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-5">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-text-secondary">{d.name}</span>
              <span className="font-semibold">0%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full min-h-[200px] sm:min-h-[250px]">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
              }}
              formatter={(value: any, name: any) => [`${value}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs sm:text-sm">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-text-secondary">{d.name}</span>
            <span className="font-semibold">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
