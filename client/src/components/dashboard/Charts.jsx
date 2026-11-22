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

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xl">
      {label ? <p className="mb-1.5 text-[11px] font-semibold text-slate-900">{label}</p> : null}
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill }} />
          <span className="capitalize">{entry.name}</span>
          <span className="ml-auto font-semibold text-slate-900">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

const defaultActivityBaseline = [
  { day: 'Mon', updates: 0, checked: 0 },
  { day: 'Tue', updates: 0, checked: 0 },
  { day: 'Wed', updates: 0, checked: 0 },
  { day: 'Thu', updates: 0, checked: 0 },
  { day: 'Fri', updates: 0, checked: 0 },
  { day: 'Sat', updates: 0, checked: 0 },
  { day: 'Sun', updates: 0, checked: 0 },
]

export function UpdateActivityChart({ data = [] }) {
  const chartData = data.length > 0 ? data : defaultActivityBaseline

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="updatesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0284C7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="reviewedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            dy={8}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(2,132,199,0.3)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="updates"
            name="Updates detected"
            stroke="#0284C7"
            strokeWidth={2.5}
            fill="url(#updatesFill)"
            activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="checked"
            name="Checked"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#reviewedFill)"
            activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const statusPalette = {
  UP_TO_DATE: { name: 'Up to date', color: '#10B981' },
  MINOR_UPDATE: { name: 'Minor update', color: '#0284C7' },
  MAJOR_UPDATE: { name: 'Major update', color: '#6366F1' },
  PATCH_UPDATE: { name: 'Patch update', color: '#38BDF8' },
  VULNERABLE: { name: 'Security advisory', color: '#EF4444' },
}

export function HealthChart({ distribution = [], total = 0 }) {
  const chartItems = distribution.map((item) => ({
    name: statusPalette[item.status]?.name || item.status,
    value: item.count || 0,
    color: statusPalette[item.status]?.color || '#94A3B8',
  })).filter((entry) => entry.value > 0)

  if (!chartItems.length && total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full border-4 border-dashed border-slate-200">
          <div className="text-center">
            <span className="text-2xl font-bold tracking-tight text-slate-950">0</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">tracked</p>
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-700">No dependency health data</p>
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
          Connect your GitHub repository and scan manifests to populate dependency distribution.
        </p>
      </div>
    )
  }

  const displayItems = chartItems.length
    ? chartItems
    : [{ name: 'Tracked', value: total, color: '#0284C7' }]

  return (
    <div className="flex flex-col items-center">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayItems}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              stroke="none"
            >
              {displayItems.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none -mt-[132px] flex h-[84px] flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-slate-950">{total}</span>
          <span className="text-[10px] text-slate-400">tracked packages</span>
        </div>
      </div>
      <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-2">
        {displayItems.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto font-semibold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
