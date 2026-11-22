import {
  ArrowUpCircle,
  CalendarDays,
  GitBranch,
  Package,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Card from '../../components/common/Card'
import DemoLabel from '../../components/common/DemoLabel'
import StatCard from '../../components/common/StatCard'
import { dashboardStats } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { HealthChart, UpdateActivityChart } from '../../components/dashboard/Charts'
import ActivityTimeline from '../../components/dashboard/ActivityTimeline'
import AIInsightCard from '../../components/dashboard/AIInsightCard'

const iconMap = { GitBranch, Package, ArrowUpCircle, ShieldAlert }

export default function Overview() {
  const { user } = useAuth()
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div>
      <div className="relative mb-7 overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-brand/[0.09] via-elevated/70 to-accent/[0.04] p-6 sm:p-8">
        <div className="radial-glow pointer-events-none absolute -top-24 right-10 h-56 w-72" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="label-caps text-brandlight">Overview</span>
              <DemoLabel />
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[26px] font-bold tracking-[-0.04em] text-ink sm:text-[32px]"
            >
              Welcome to your workspace{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
            </motion.h1>
            <p className="mt-2 text-sm text-subtle">
              Here's your dependency intelligence overview.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-line bg-canvas/50 px-3.5 py-2.5 text-[12px] text-subtle">
            <CalendarDays className="h-4 w-4 text-brandlight" /> {today}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat, index) => (
          <StatCard
            key={stat.label}
            {...stat}
            icon={iconMap[stat.icon]}
            index={index}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label-caps">Analytics</p>
              <h2 className="mt-1.5 text-base font-semibold text-ink">Dependency update activity</h2>
              <p className="mt-1 text-[12px] text-muted">Sample weekly activity across tracked projects</p>
            </div>
            <span className="rounded-lg border border-line px-2.5 py-1 text-[10px] text-muted">
              Last 7 days
            </span>
          </div>
          <UpdateActivityChart />
        </Card>

        <Card>
          <div className="mb-2">
            <p className="label-caps">Breakdown</p>
            <h2 className="mt-1.5 text-base font-semibold text-ink">Dependency health</h2>
            <p className="mt-1 text-[12px] text-muted">Illustrative distribution of 128 packages</p>
          </div>
          <HealthChart />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="label-caps">Timeline</p>
              <h2 className="mt-1.5 text-base font-semibold text-ink">Recent activity</h2>
            </div>
            <Sparkles className="h-4 w-4 text-brandlight" />
          </div>
          <ActivityTimeline />
        </Card>
        <AIInsightCard />
      </div>
    </div>
  )
}
