import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface BarData {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarData[]
  height?: number
  color?: string
}

export function BarChart({ data, height = 250, color = '#0F766E' }: BarChartProps) {
  const hasColors = data.some(d => d.color)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
        <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            fontSize: '13px',
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {hasColors && data.map((entry, index) => (
            <Cell key={index} fill={entry.color || color} />
          ))}
          {!hasColors && undefined}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  )
}
