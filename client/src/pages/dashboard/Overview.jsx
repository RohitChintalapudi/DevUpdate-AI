import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LuCalendarDays,
  LuCircleArrowUp,
  LuGitBranch,
  LuPackage,
  LuRefreshCw,
  LuShieldAlert,
  LuSparkles,
} from 'react-icons/lu'
import { motion } from 'framer-motion'
import Card from '../../components/common/Card'
import StatCard from '../../components/common/StatCard'
import { useAuth } from '../../context/AuthContext'
import { HealthChart, LanguageChart } from '../../components/dashboard/Charts'
import ActivityTimeline from '../../components/dashboard/ActivityTimeline'
import AIInsightCard from '../../components/dashboard/AIInsightCard'
import { dependenciesApi, notificationsApi, repositoriesApi, updatesApi } from '../../services/api'

export default function Overview() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    repositoriesCount: 0,
    dependenciesCount: 0,
    updatesCount: 0,
    vulnerabilitiesCount: 0,
    languageDistribution: [],
    distribution: [],
    activity: [],
  })

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  const fetchOverviewData = useCallback(async () => {
    try {
      const [reposResult, updatesResult, notifsResult, depsResult] = await Promise.allSettled([
        repositoriesApi.list({ limit: 50 }),
        updatesApi.overview(),
        notificationsApi.recent({ limit: 6 }),
        dependenciesApi.list({ limit: 1 }),
      ])

      const reposData = reposResult.status === 'fulfilled' ? reposResult.value : null
      const updatesData = updatesResult.status === 'fulfilled' ? updatesResult.value : null
      const notifsData = notifsResult.status === 'fulfilled' ? notifsResult.value : null
      const depsData = depsResult.status === 'fulfilled' ? depsResult.value : null

      const repositories = reposData?.repositories || []
      const repositoriesCount = reposData?.pagination?.total ?? repositories.length ?? 0
      const languageCounts = repositories.reduce((counts, repo) => {
        const language = repo.language || 'Unknown'
        counts[language] = (counts[language] || 0) + 1
        return counts
      }, {})
      const languageDistribution = Object.entries(languageCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
      const dependenciesCount = updatesData?.stats?.totalDependencies ?? depsData?.pagination?.total ?? 0
      const updatesCount = (updatesData?.stats?.updateAvailable || 0) + (updatesData?.stats?.outdated || 0)
      const vulnerabilitiesCount = updatesData?.stats?.vulnerableDependencies || 0
      const distribution = updatesData?.distribution || []
      const activity = notifsData?.notifications || notifsData?.items || []

      setStats({
        repositoriesCount,
        dependenciesCount,
        updatesCount,
        vulnerabilitiesCount,
        languageDistribution,
        distribution,
        activity,
      })
    } catch (error) {
      console.error('Failed to load dashboard overview data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      await Promise.resolve()
      if (active) {
        await fetchOverviewData()
      }
    }
    load()
    return () => {
      active = false
    }
  }, [fetchOverviewData])

  const handleRefresh = async () => {
    setLoading(true)
    await fetchOverviewData()
  }

  const statCards = [
    {
      label: 'Total Repositories',
      value: String(stats.repositoriesCount).padStart(2, '0'),
      description:
        stats.repositoriesCount > 0
          ? `${stats.repositoriesCount} connected repository${stats.repositoriesCount > 1 ? 'ies' : ''}`
          : 'No repositories connected yet',
      icon: LuGitBranch,
      tone: 'violet',
      trend: stats.repositoriesCount > 0 ? `${stats.repositoriesCount} active` : undefined,
      onClick: () => navigate('/dashboard/repositories'),
    },
    {
      label: 'Total Dependencies',
      value: String(stats.dependenciesCount).padStart(2, '0'),
      description:
        stats.dependenciesCount > 0
          ? `${stats.dependenciesCount} packages tracked across manifests`
          : 'No dependencies tracked yet',
      icon: LuPackage,
      tone: 'cyan',
      trend: stats.dependenciesCount > 0 ? 'Monitored' : undefined,
      onClick: () => navigate('/dashboard/repositories'),
    },
    {
      label: 'Updates Available',
      value: String(stats.updatesCount).padStart(2, '0'),
      description:
        stats.updatesCount > 0
          ? `${stats.updatesCount} newer versions ready to upgrade`
          : 'All dependencies up to date',
      icon: LuCircleArrowUp,
      tone: 'warning',
      trend: stats.updatesCount > 0 ? `${stats.updatesCount} pending` : undefined,
      onClick: () => navigate('/dashboard/updates'),
    },
    {
      label: 'Security Alerts',
      value: String(stats.vulnerabilitiesCount).padStart(2, '0'),
      description:
        stats.vulnerabilitiesCount > 0
          ? `${stats.vulnerabilitiesCount} security advisories to review`
          : 'No active vulnerabilities found',
      icon: LuShieldAlert,
      tone: 'danger',
      trend: stats.vulnerabilitiesCount > 0 ? `${stats.vulnerabilitiesCount} advisories` : undefined,
      onClick: () => navigate('/dashboard/updates'),
    },
  ]

  return (
    <div>
      {/* Top Welcome Banner with vibrant Blue/Cyan Glow */}
      <div className="relative mb-7 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
        {/* Layer 1: Ambient Blue & Cyan Glows */}
        <div className="pointer-events-none absolute -top-32 -right-20 h-96 w-96 rounded-full bg-gradient-to-br from-sky-400/30 via-blue-500/20 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-400/25 via-sky-400/15 to-transparent blur-2xl" />

        {/* Layer 2: Concentric orbital light rings */}
        <div className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full border border-sky-400/25 opacity-70" />
        <div className="pointer-events-none absolute -right-44 -top-44 h-[560px] w-[560px] rounded-full border border-blue-400/15 opacity-50" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-[260px] w-[260px] rounded-full border border-sky-300/30" />

        {/* Layer 3: Architectural dot pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06]" />

        {/* Header Content */}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/90 bg-sky-50 px-3 py-1 text-[11px] font-bold tracking-wider text-sky-700 uppercase shadow-2xs backdrop-blur-xs">
                <LuSparkles className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
                Live Workspace Intelligence
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Active
              </span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl"
            >
              Welcome to your workspace{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
            </motion.h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Real-time dependency health, automated update monitoring, and AI recommendations for your repositories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-white/90 px-3.5 py-2.5 text-[12px] font-medium text-slate-700 shadow-2xs backdrop-blur-xs">
              <LuCalendarDays className="h-4 w-4 text-sky-600" />
              <span>{today}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-60 cursor-pointer"
              title="Refresh dashboard metrics"
            >
              <LuRefreshCw className={`h-3.5 w-3.5 text-sky-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Stat Cards with visible Lucide Icons & live counts */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            tone={stat.tone}
            trend={stat.trend}
            onClick={stat.onClick}
            index={index}
          />
        ))}
      </div>

      {/* Analytics & Breakdown */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label-caps">Analytics</p>
              <h2 className="mt-1.5 text-base font-semibold text-ink">Repository languages</h2>
              <p className="mt-1 text-[12px] text-muted">Connected projects grouped by primary language</p>
            </div>
            <span className="rounded-lg border border-line px-2.5 py-1 text-[10px] text-muted">
              {stats.repositoriesCount} repositories
            </span>
          </div>
          <LanguageChart items={stats.languageDistribution} />
        </Card>

        <Card>
          <div className="mb-2">
            <p className="label-caps">Breakdown</p>
            <h2 className="mt-1.5 text-base font-semibold text-ink">Dependency health</h2>
            <p className="mt-1 text-[12px] text-muted">
              {stats.dependenciesCount > 0
                ? `Distribution across ${stats.dependenciesCount} tracked packages`
                : 'Package health status breakdown'}
            </p>
          </div>
          <HealthChart distribution={stats.distribution} total={stats.dependenciesCount} />
        </Card>
      </div>

      {/* Activity Timeline & AI Insight */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="label-caps">Timeline</p>
              <h2 className="mt-1.5 text-base font-semibold text-ink">Recent activity</h2>
            </div>
            <LuSparkles className="h-4 w-4 text-brandlight" />
          </div>
          <ActivityTimeline items={stats.activity} />
        </Card>
        <AIInsightCard />
      </div>
    </div>
  )
}
