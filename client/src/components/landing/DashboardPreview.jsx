import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CircleDot,
  GitBranch,
  Package,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import DemoLabel from '../common/DemoLabel'

const stats = [
  { label: 'Repositories', value: '04', icon: GitBranch, tone: 'text-brandlight' },
  { label: 'Dependencies', value: '128', icon: Package, tone: 'text-accent' },
  { label: 'Updates', value: '16', icon: ArrowUpRight, tone: 'text-warning' },
  { label: 'Security', value: '03', icon: ShieldAlert, tone: 'text-danger' },
]

const bars = [38, 62, 45, 78, 55, 88, 68, 95, 72, 84, 60, 92]
const activity = [
  { icon: ArrowUpRight, color: 'text-brandlight', title: 'React 18.2.0 → 19.0.0', repo: 'acme-dashboard' },
  { icon: Activity, color: 'text-accent', title: 'Express version reviewed', repo: 'payments-api' },
  { icon: ShieldAlert, color: 'text-danger', title: 'Security advisory detected', repo: 'acme-dashboard' },
]

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-14 max-w-5xl sm:mt-16"
    >
      <div className="pointer-events-none absolute -inset-x-16 -top-10 bottom-0 rounded-full bg-brand/20 blur-[100px]" />
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#0D1220]/95 shadow-[0_50px_120px_-40px_rgba(76,29,149,0.65)] backdrop-blur-xl">
        {/* window bar */}
        <div className="flex h-11 items-center gap-2 border-b border-line bg-white/[0.02] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FB7185]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]/70" />
          <div className="mx-auto hidden items-center gap-1.5 rounded-md border border-line bg-canvas/60 px-3 py-1 text-[10px] text-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> app.devupdate.ai/dashboard
          </div>
          <div className="ml-auto"><DemoLabel label="Illustrative preview" /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr]">
          {/* mini sidebar */}
          <div className="hidden border-r border-line bg-white/[0.015] p-3 sm:block">
            <div className="mb-5 flex items-center gap-2 px-1.5 pt-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand to-accent">
                <Boxes className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-[10px] font-bold text-ink">DevUpdate AI</span>
            </div>
            {[
              { icon: CircleDot, label: 'Dashboard', active: true },
              { icon: GitBranch, label: 'Repositories' },
              { icon: Package, label: 'Dependencies' },
              { icon: Sparkles, label: 'AI Insights' },
            ].map((item) => (
              <div
                key={item.label}
                className={`mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-[10px] ${
                  item.active ? 'bg-brand/15 text-brandlight' : 'text-muted'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>

          {/* preview content */}
          <div className="p-4 sm:p-6">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">Workspace overview</p>
                <p className="mt-1 text-base font-bold tracking-tight text-ink sm:text-lg">Welcome back, developer</p>
              </div>
              <span className="hidden rounded-md border border-line px-2 py-1 text-[10px] text-muted sm:block">
                November 2026
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.08 }}
                  className="rounded-xl border border-line bg-card/80 p-3"
                >
                  <stat.icon className={`h-4 w-4 ${stat.tone}`} />
                  <p className="mt-3 text-xl font-bold tracking-tight text-ink sm:text-2xl">{stat.value}</p>
                  <p className="mt-0.5 truncate text-[9px] text-muted">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-line bg-card/60 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-ink">Update activity</p>
                  <p className="text-[9px] text-muted">Sample · last 12 weeks</p>
                </div>
                <div className="flex h-24 items-end gap-1.5">
                  {bars.map((height, index) => (
                    <motion.div
                      key={index}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.7, delay: 0.8 + index * 0.04, ease: 'easeOut' }}
                      className={`flex-1 rounded-t-[3px] ${
                        index % 3 === 0
                          ? 'bg-gradient-to-t from-brand/30 to-brandlight/90'
                          : 'bg-gradient-to-t from-accent/10 to-accent/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-card/60 p-4">
                <p className="mb-3 text-[11px] font-semibold text-ink">Recent activity</p>
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div key={item.title} className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                        <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-medium text-subtle">{item.title}</p>
                        <p className="truncate text-[9px] text-muted">{item.repo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
