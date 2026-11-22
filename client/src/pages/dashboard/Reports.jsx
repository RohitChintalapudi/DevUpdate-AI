import { Download, FileBarChart2, History, ShieldCheck, TrendingUp } from 'lucide-react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import DemoLabel from '../../components/common/DemoLabel'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import { reportHistory } from '../../data/mockData'

const healthBars = [
  { label: 'Up to date', value: 96, color: 'bg-success', total: 128 },
  { label: 'Minor updates', value: 20, color: 'bg-accent', total: 128 },
  { label: 'Major updates', value: 8, color: 'bg-brandlight', total: 128 },
  { label: 'Security risks', value: 4, color: 'bg-danger', total: 128 },
]

export default function Reports() {
  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title="Reports"
        description="Preview the reporting experience for dependency health and update history."
        actions={<DemoLabel />}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-gradient-to-r from-brand/[0.08] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/25 bg-brand/12 text-brandlight">
            <FileBarChart2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Dependency health — November 2026</h2>
            <p className="mt-1 text-[12px] text-subtle">Illustrative summary · generated preview content</p>
          </div>
        </div>
        <Button variant="secondary" disabled leftIcon={Download}>
          Export PDF — Coming Soon
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Health score" value="82%" description="Sample composite score" icon={TrendingUp} tone="success" />
        <StatCard index={1} label="Updates reviewed" value="24" description="During the sample period" icon={History} tone="violet" />
        <StatCard index={2} label="Advisories" value="03" description="Flagged for investigation" icon={ShieldCheck} tone="danger" />
        <StatCard index={3} label="Reports" value="03" description="Preview records available" icon={FileBarChart2} tone="cyan" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <p className="label-caps">Summary</p>
          <h3 className="mt-1.5 text-base font-semibold text-ink">Dependency health distribution</h3>
          <div className="mt-6 space-y-5">
            {healthBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <span className="text-subtle">{bar.label}</span>
                  <span className="font-medium text-ink">{bar.value} / {bar.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className={`h-full rounded-full ${bar.color}`}
                    style={{ width: `${(bar.value / bar.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="label-caps">History</p>
          <h3 className="mt-1.5 text-base font-semibold text-ink">Report archive</h3>
          <div className="mt-4 divide-y divide-line">
            {reportHistory.map((report) => (
              <div key={report.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-brandlight">
                  <report.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{report.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{report.range}</p>
                </div>
                <Badge tone="neutral">{report.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
