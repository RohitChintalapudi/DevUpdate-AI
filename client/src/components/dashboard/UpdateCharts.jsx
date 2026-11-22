import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LuActivity, LuShieldAlert } from 'react-icons/lu'
import { updateStatusLabel } from '../../utils/updateHelpers'

const severityColors = {
  CRITICAL: '#fb7185',
  HIGH: '#fb7185',
  MEDIUM: '#fbbf24',
  LOW: '#22d3ee',
  UNKNOWN: '#64748b',
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-900">{label || payload[0]?.name}</p>
      <p className="mt-1 text-slate-600">{payload[0].value} dependencies</p>
    </div>
  )
}

function Panel({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  )
}

export default function UpdateCharts({ distribution = [], severityDistribution = [] }) {
  const updateData = distribution.map((item) => ({
    name: updateStatusLabel[item.status] || item.status,
    count: item.count,
  }))
  const severityData = severityDistribution.map((item) => ({
    name: item.severity,
    value: item.count,
  }))

  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Panel
        icon={LuActivity}
        title="Update distribution"
        description="Current status across every tracked dependency."
      >
        {updateData.length ? (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={updateData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line py-12 text-center text-xs text-muted">
            No update data yet. Run an update check to populate this chart.
          </p>
        )}
      </Panel>

      <Panel
        icon={LuShieldAlert}
        title="Security severity"
        description="Advisories affecting installed versions."
      >
        {severityData.length ? (
          <div className="relative h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={severityColors[entry.name] || severityColors.UNKNOWN} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-ink">{severityData.reduce((sum, item) => sum + item.value, 0)}</span>
              <span className="label-caps mt-1 text-[10px]">advisories</span>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line py-12 text-center text-xs text-muted">
            No advisory data yet. Security results appear after an update check.
          </p>
        )}
      </Panel>
    </div>
  )
}
