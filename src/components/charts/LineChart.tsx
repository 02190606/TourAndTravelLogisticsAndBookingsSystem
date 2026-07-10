import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface LineData {
  name: string
  value: number
  secondary?: number
}

interface LineChartProps {
  data: LineData[]
  height?: number
  showSecondary?: boolean
}

export function LineChart({ data, height = 250, showSecondary }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLine data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
        <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            fontSize: '13px',
          }}
        />
        <Line type="monotone" dataKey="value" stroke="#22D3EE" strokeWidth={2} dot={{ r: 3 }} />
        {showSecondary && (
          <Line type="monotone" dataKey="secondary" stroke="#0F766E" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
        )}
      </RechartsLine>
    </ResponsiveContainer>
  )
}
