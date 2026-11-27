import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LuActivity, LuShieldAlert } from 'react-icons/lu'
import { updateStatusLabel } from '../../utils/updateHelpers'

const severityColors = {
  CRITICAL: 'var(--color-rose-500)',
  HIGH: 'var(--color-rose-500)',
  MEDIUM: 'var(--color-amber-500)',
  LOW: 'var(--color-cyan-400)',
  UNKNOWN: 'var(--color-muted)',
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-elevated px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-ink">{label || payload[0]?.name}</p>
      <p className="mt-1 text-subtle">{payload[0].value} dependencies</p>
    </div>
  )
}

function Panel({ icon: Icon, title, description, children }) {
  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200/80 bg-sky-50 text-sky-600">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-xs text-muted">{description}</p>
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
                <CartesianGrid strokeDasharray="3 6" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(125, 211, 252, 0.06)' }} />
                <Bar dataKey="count" fill="var(--color-violet-500)" radius={[6, 6, 0, 0]} maxBarSize={42} />
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
