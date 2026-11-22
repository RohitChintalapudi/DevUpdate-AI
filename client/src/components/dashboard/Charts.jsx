import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { updateActivityData, healthDistribution } from '../../data/mockData'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-elevated/95 px-3.5 py-3 shadow-xl backdrop-blur-md">
      {label ? <p className="mb-1.5 text-[11px] font-semibold text-ink">{label}</p> : null}
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2 text-[11px] text-subtle">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill }} />
          <span className="capitalize">{entry.name}</span>
          <span className="ml-auto font-semibold text-ink">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function UpdateActivityChart() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={updateActivityData} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="updatesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="reviewedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            dy={8}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(167,139,250,0.3)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="updates"
            name="Updates found"
            stroke="#A78BFA"
            strokeWidth={2.5}
            fill="url(#updatesFill)"
            activeDot={{ r: 5, stroke: '#0D1220', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="reviewed"
            name="Reviewed"
            stroke="#22D3EE"
            strokeWidth={2}
            fill="url(#reviewedFill)"
            activeDot={{ r: 4, stroke: '#0D1220', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function HealthChart() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={healthDistribution}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              stroke="none"
            >
              {healthDistribution.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none -mt-[132px] flex h-[84px] flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-ink">128</span>
          <span className="text-[10px] text-muted">tracked packages</span>
        </div>
      </div>
      <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-2">
        {healthDistribution.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-[11px] text-subtle">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto font-semibold text-ink">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
