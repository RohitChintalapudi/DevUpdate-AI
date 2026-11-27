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
    <div className="rounded-xl border border-line bg-elevated px-3.5 py-3 shadow-xl">
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
              <stop offset="0%" stopColor="var(--color-sky-500)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-sky-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="reviewedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-emerald-400)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-emerald-400)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
            dy={8}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-brandlight)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="updates"
            name="Updates detected"
            stroke="var(--color-sky-500)"
            strokeWidth={2.5}
            fill="url(#updatesFill)"
            activeDot={{ r: 5, stroke: 'var(--color-card)', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="checked"
            name="Checked"
            stroke="var(--color-emerald-400)"
            strokeWidth={2}
            fill="url(#reviewedFill)"
            activeDot={{ r: 4, stroke: 'var(--color-card)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const languageColors = [
  'var(--color-indigo-500)',
  'var(--color-sky-500)',
  'var(--color-emerald-400)',
  'var(--color-amber-500)',
  'var(--color-rose-500)',
  'var(--color-purple-500)',
  'var(--color-teal-400)',
  'var(--color-muted)',
]

export function LanguageChart({ items = [] }) {
  const data = items.filter((item) => item.count > 0)
  const total = data.reduce((sum, item) => sum + item.count, 0)

  if (!data.length) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-line bg-elevated">
          <span className="text-xl font-bold text-muted">0</span>
        </div>
        <p className="mt-4 text-xs font-semibold text-ink">No repository languages yet</p>
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted">
          Connect GitHub repositories to see their primary language mix.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell key={item.name} fill={languageColors[index % languageColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none -mt-[132px] flex h-[84px] flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-ink">{total}</span>
          <span className="text-[10px] text-muted">repositories</span>
        </div>
      </div>
      <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-[11px] text-subtle">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: languageColors[index % languageColors.length] }}
            />
            <span className="truncate">{item.name}</span>
            <span className="ml-auto font-semibold text-ink">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const statusPalette = {
  UP_TO_DATE: { name: 'Up to date', color: 'var(--color-emerald-400)' },
  MINOR_UPDATE: { name: 'Minor update', color: 'var(--color-sky-500)' },
  MAJOR_UPDATE: { name: 'Major update', color: 'var(--color-indigo-500)' },
  PATCH_UPDATE: { name: 'Patch update', color: 'var(--color-sky-400)' },
  VULNERABLE: { name: 'Security advisory', color: 'var(--color-rose-500)' },
}

export function HealthChart({ distribution = [], total = 0 }) {
  const chartItems = distribution.map((item) => ({
    name: statusPalette[item.status]?.name || item.status,
    value: item.count || 0,
    color: statusPalette[item.status]?.color || 'var(--color-muted)',
  })).filter((entry) => entry.value > 0)

  if (!chartItems.length && total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full border-4 border-dashed border-line">
          <div className="text-center">
            <span className="text-2xl font-bold tracking-tight text-ink">0</span>
            <p className="text-[10px] font-semibold text-muted uppercase">tracked</p>
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-ink">No dependency health data</p>
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted">
          Connect your GitHub repository and scan manifests to populate dependency distribution.
        </p>
      </div>
    )
  }

  const displayItems = chartItems.length
    ? chartItems
    : [{ name: 'Tracked', value: total, color: 'var(--color-sky-500)' }]

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
          <span className="text-2xl font-bold tracking-tight text-ink">{total}</span>
          <span className="text-[10px] text-muted">tracked packages</span>
        </div>
      </div>
      <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-2">
        {displayItems.map((entry) => (
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
