import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LuArrowLeft,
  LuChevronDown,
  LuCircleCheck,
  LuExternalLink,
  LuFlame,
  LuFolderGit2,
  LuGitBranch,
  LuLayers,
  LuPackage,
  LuRefreshCw,
  LuSearch,
  LuShieldAlert,
  LuSparkles,
  LuTrendingUp,
  LuTriangleAlert,
} from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import PageHeader from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeleton'
import StatCard from '../../components/common/StatCard'
import Toast from '../../components/common/Toast'
import UpdateTable from '../../components/dashboard/UpdateTable'
import DependencyResearchDrawer from '../../components/dashboard/DependencyResearchDrawer'
import useDebounce from '../../hooks/useDebounce'
import { getErrorMessage, updatesApi } from '../../services/api'
import { formatDate } from '../../utils/updateHelpers'

const selectClass =
  'h-10 rounded-xl border border-slate-200/80 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-sky-500'

const emptyStats = {
  total: 0,
  upToDate: 0,
  updateAvailable: 0,
  majorUpdates: 0,
  minorUpdates: 0,
  patchUpdates: 0,
  vulnerable: 0,
  vulnerableDependencies: 0,
  researchCompleted: 0,
  coreDependencies: 0,
}

export default function RepositoryUpdateDetails() {
  const { repositoryId } = useParams()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [updateStatus, setUpdateStatus] = useState('')
  const [securityStatus, setSecurityStatus] = useState('')
  const [researchStatus, setResearchStatus] = useState('')
  const [classification, setClassification] = useState('')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [autoUpdating, setAutoUpdating] = useState(false)
  const hasAutoChecked = useRef(false)
  const [researchingAll, setResearchingAll] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState(null)

  // Drawer state
  const [selectedDependency, setSelectedDependency] = useState(null)

  // Research job status
  const [activeResearchJob, setActiveResearchJob] = useState(null)

  const load = useCallback(async () => {
    if (!repositoryId) return
    setLoading(true)
    try {
      const response = await updatesApi.repository(repositoryId, {
        search: debouncedSearch,
        updateStatus,
        securityStatus,
        researchStatus,
        classification,
        sort,
        page,
        limit: 20,
      })
      setData(response)
      if (response.activeResearchJob) {
        setActiveResearchJob(response.activeResearchJob)
      }
      setNotFound(false)
    } catch (error) {
      if (error?.response?.status === 404) setNotFound(true)
      else {
        setToast({
          type: 'error',
          title: 'Could not load repository updates',
          message: getErrorMessage(error),
        })
      }
    } finally {
      setLoading(false)
    }
  }, [repositoryId, debouncedSearch, updateStatus, securityStatus, researchStatus, classification, sort, page])

  // Silent refresh that updates dependencies, counts and research without full-screen loading flash
  const silentRefresh = useCallback(async () => {
    if (!repositoryId) return
    try {
      const response = await updatesApi.repository(repositoryId, {
        search: debouncedSearch,
        updateStatus,
        securityStatus,
        researchStatus,
        classification,
        sort,
        page,
        limit: 20,
      })
      setData(response)
      if (response.activeResearchJob) {
        setActiveResearchJob(response.activeResearchJob)
      }
    } catch {
      // silent background refresh
    }
  }, [repositoryId, debouncedSearch, updateStatus, securityStatus, researchStatus, classification, sort, page])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await load()
    }
    run()
    return () => {
      active = false
    }
  }, [load])

  // Auto-updating on opening repository when dependencies exist but updates haven't been checked
  useEffect(() => {
    if (!data || hasAutoChecked.current) return
    const repo = data.repository
    const stats = data.stats
    const totalCount = stats?.total || stats?.totalDependencies || 0
    const needsCheck =
      (!repo?.lastUpdateCheckAt || repo?.updateCheckStatus === 'NOT_CHECKED') &&
      totalCount > 0

    if (needsCheck) {
      hasAutoChecked.current = true
      setAutoUpdating(true)
      const runAutoUpdate = async () => {
        try {
          await updatesApi.checkRepository(repositoryId).catch(() => null)
          let attempts = 0
          const checkTimer = setInterval(async () => {
            attempts += 1
            await silentRefresh()
            if (attempts >= 4) {
              clearInterval(checkTimer)
              setAutoUpdating(false)
            }
          }, 1200)
        } catch {
          setAutoUpdating(false)
        }
      }
      runAutoUpdate()
    }
  }, [data, repositoryId, silentRefresh])

  // Polling for update version check job
  const jobStatus = data?.latestJob?.status || data?.repository?.updateCheckStatus
  const isVersionCheckPolling = ['QUEUED', 'SCANNING'].includes(jobStatus)

  useEffect(() => {
    if (!isVersionCheckPolling) return undefined
    const timer = setInterval(() => {
      silentRefresh().catch(() => null)
    }, 2500)
    return () => clearInterval(timer)
  }, [isVersionCheckPolling, silentRefresh])

  // Polling for Firecrawl research background job with live metric count-up
  const isResearchPolling =
    researchingAll ||
    activeResearchJob?.status === 'RUNNING' ||
    activeResearchJob?.status === 'QUEUED'

  useEffect(() => {
    if (!isResearchPolling) return undefined
    const timer = setInterval(async () => {
      try {
        const res = await updatesApi.researchStatus(repositoryId)
        if (res.job) {
          setActiveResearchJob(res.job)
          await silentRefresh()
          if (res.job.status === 'COMPLETED' || res.job.status === 'FAILED') {
            await load()
          }
        } else {
          setActiveResearchJob(null)
          await load()
        }
      } catch {
        // silent error during polling
      }
    }, 1500)
    return () => clearInterval(timer)
  }, [isResearchPolling, repositoryId, silentRefresh, load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  // Trigger authoritative version check
  const handleCheckVersions = async () => {
    setChecking(true)
    try {
      const response = await updatesApi.checkRepository(repositoryId)
      setToast({
        type: 'success',
        title: 'Authoritative version check queued',
        message: response.message || 'Verifying registry versions and OSV security advisories in background.',
      })
      await silentRefresh()
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not start version check',
        message: getErrorMessage(error),
      })
    } finally {
      setChecking(false)
    }
  }

  // Trigger repository Firecrawl research job
  const handleTriggerResearchAll = async () => {
    const totalCount = data?.stats?.total || data?.stats?.totalDependencies || 1
    // Immediately set optimistic activeResearchJob so the animated progress bar pops up with zero delay
    setActiveResearchJob({
      status: 'RUNNING',
      total: totalCount,
      completed: 0,
      failed: 0,
      percent: 4,
      currentPackage: 'Connecting to Firecrawl crawler engine…',
      startedAt: new Date().toISOString(),
    })
    setResearchingAll(true)
    try {
      const response = await updatesApi.researchRepository(repositoryId)
      if (response.job) {
        setActiveResearchJob(response.job)
      }
      setToast({
        type: 'success',
        title: 'Firecrawl documentation research initiated',
        message: 'Researching official release notes, breaking changes, and changelogs.',
      })
      await silentRefresh()
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not start research',
        message: getErrorMessage(error),
      })
      setActiveResearchJob(null)
    } finally {
      setResearchingAll(false)
    }
  }

  // Quick research for a single dependency
  const handleQuickResearch = async (update) => {
    const depId = update.dependencyId || update._id
    try {
      setToast({
        type: 'info',
        title: `Researching ${update.packageName}`,
        message: 'Connecting to Firecrawl for official documentation…',
      })
      const res = await updatesApi.researchDependency(depId, { force: true })
      setToast({
        type: 'success',
        title: `Research completed for ${update.packageName}`,
        message: 'Official findings and AI interpretation ready.',
      })
      await load()
      if (res.research || res.update) {
        setSelectedDependency(res.update || update)
      }
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Research failed',
        message: getErrorMessage(err),
      })
    }
  }

  if (notFound) {
    return (
      <div>
        <PageHeader eyebrow="Intelligence" title="Repository updates" />
        <EmptyState
          icon={LuGitBranch}
          title="Repository not found"
          description="This repository is not part of your connected GitHub account."
          action={
            <Link to="/dashboard/updates">
              <Button variant="secondary">Back to connected repositories</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const repository = data?.repository || {}
  const stats = data?.stats || emptyStats
  const connectedRepos = data?.connectedRepositories || []

  // Firecrawl research live tracking calculations
  const isResearchActive =
    researchingAll ||
    activeResearchJob?.status === 'RUNNING' ||
    activeResearchJob?.status === 'QUEUED'

  const researchTotalCount =
    activeResearchJob?.total || stats.total || stats.totalDependencies || 1
  const researchCompletedCount =
    (activeResearchJob?.completed || 0) + (activeResearchJob?.failed || 0)
  const rawResearchPercent =
    activeResearchJob?.percent !== undefined
      ? activeResearchJob.percent
      : Math.round((researchCompletedCount / Math.max(1, researchTotalCount)) * 100)
  const displayPercent = isResearchActive
    ? Math.max(4, Math.min(100, rawResearchPercent))
    : rawResearchPercent
  const currentResearchPackage =
    activeResearchJob?.currentPackage || 'Scanning dependency tree…'

  const remainingPackages = Math.max(0, researchTotalCount - researchCompletedCount)
  const etaSeconds = Math.max(3, Math.round(remainingPackages * 2.2))
  const formatEtaTime = (secs) => {
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}m ${rem}s`
  }

  let researchStageLabel = 'Discovering official package documentation & GitHub links…'
  if (displayPercent >= 85) {
    researchStageLabel = 'Running Gemini AI upgrade impact & migration step interpretation…'
  } else if (displayPercent >= 55) {
    researchStageLabel = 'Extracting breaking changes, deprecated APIs & security CVE fixes…'
  } else if (displayPercent >= 25) {
    researchStageLabel = 'Deep-crawling official changelogs, release notes & migration guides…'
  }

  return (
    <div>
      {/* Header with Repository Switcher and Actions */}
      <PageHeader
        eyebrow="Dependency intelligence center"
        title={repository.fullName || 'Repository updates'}
        description="Authoritative ecosystem version verification, Firecrawl official documentation research, and AI upgrade impact interpretation."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/dashboard/updates">
              <Button variant="ghost" size="sm" leftIcon={LuArrowLeft}>
                Repositories
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={LuRefreshCw}
              loading={checking || isVersionCheckPolling}
              onClick={handleCheckVersions}
              title="Verify latest versions with official package registries (npm, PyPI, Maven, etc.)"
            >
              Verify Versions
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={LuFlame}
              loading={researchingAll || isResearchPolling}
              onClick={handleTriggerResearchAll}
              title="Research official changelogs, migration guides, and breaking changes with Firecrawl"
            >
              Research with Firecrawl
            </Button>
          </div>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Repository Switcher Dropdown */}
          {connectedRepos.length > 1 && (
            <div className="relative">
              <select
                aria-label="Switch repository"
                className="h-8 rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-400 focus:border-sky-500 focus:outline-hidden"
                value={repositoryId}
                onChange={(e) => navigate(`/dashboard/updates/repository/${e.target.value}`)}
              >
                {connectedRepos.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.fullName || r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {repository.htmlUrl && (
            <a
              href={repository.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition"
            >
              GitHub <LuExternalLink className="h-3 w-3" />
            </a>
          )}

          {repository.language && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
              {repository.language}
            </span>
          )}

          <Badge tone={jobStatus === 'FAILED' ? 'danger' : jobStatus === 'COMPLETED' ? 'success' : 'warning'} dot>
            Registry check: {jobStatus || 'NOT_CHECKED'}
          </Badge>

          {repository.lastUpdateCheckAt && (
            <span className="text-xs text-slate-400">
              Checked {formatDate(repository.lastUpdateCheckAt, true)}
            </span>
          )}
        </div>
      </PageHeader>

      {/* Auto-updating Dependency Intelligence Banner */}
      {autoUpdating && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-sky-200/90 bg-gradient-to-r from-sky-50 via-blue-50/50 to-white p-4.5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm relative">
              <LuRefreshCw className="h-5 w-5 animate-spin text-sky-400" />
              <span className="absolute -inset-1 rounded-xl border border-sky-400/40 animate-ping opacity-60" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-950">Updating Dependency Intelligence…</h4>
                <Badge tone="cyan" dot>Verifying Ecosystem Registries</Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Resolving latest stable package releases, semver classifications, and OSV security advisories in real-time.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:self-center">
            <span className="text-xs font-semibold text-sky-700 animate-pulse">Syncing package trees…</span>
          </div>
        </div>
      )}

      {/* Active Firecrawl Research Progress Banner with High-Tech Network Animation */}
      <AnimatePresence>
        {isResearchActive && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/95 via-orange-50/50 to-amber-50/90 p-5 shadow-sm relative overflow-hidden"
          >
            {/* Subtle animated network grid background */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle, #f59e0b 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            />

            <div className="relative flex flex-col gap-3.5">
              {/* Top row: Status, Live Indicator, and Counter */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
                    <LuFlame className="h-5 w-5 animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-950">
                        Firecrawl Documentation Research
                      </h4>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Network Streaming
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Target:</span>
                      <span className="inline-flex items-center gap-1.5 rounded bg-amber-100/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-900 border border-amber-200 shadow-2xs">
                        <LuRefreshCw className="h-3 w-3 animate-spin text-amber-700" />
                        {currentResearchPackage}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Live percentage & ETA */}
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="flex items-baseline justify-end gap-0.5 font-mono text-2xl font-black tracking-tight text-amber-950">
                      <span>{displayPercent}</span>
                      <span className="text-base font-bold text-amber-600">%</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">
                      {researchCompletedCount} / {researchTotalCount} packages completed
                    </p>
                  </div>
                  <div className="hidden sm:block border-l border-amber-200/80 pl-4 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Estimated ETA</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      ~{formatEtaTime(etaSeconds)}
                    </p>
                  </div>
                </div>
              </div>

              {/* The Network Flow Animated Progress Bar */}
              <div className="relative">
                <div className="h-4 sm:h-5 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5 shadow-inner">
                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-700 ease-out overflow-hidden"
                    style={{ width: `${displayPercent}%` }}
                  >
                    {/* Network Fiber Diagonal Flow Stripes */}
                    <div className="absolute inset-0 animate-network-stripes opacity-40 pointer-events-none" />

                    {/* High-speed Network Light Beam Sweep */}
                    <div className="absolute inset-0 w-28 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-network-beam pointer-events-none" />

                    {/* Glowing Leading Head Node */}
                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-white shadow-[0_0_8px_#ffffff,0_0_14px_#f59e0b] ring-1 ring-amber-300">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom status text: Stage info & Network Health */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-medium text-amber-900">
                  <LuSparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                  {researchStageLabel}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Parallel Firecrawl crawler • Rate-limited safe discovery
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 2: Repository Update Overview (All 8 Cards in One Single Line on Desktop) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 sm:gap-2.5">
        <StatCard
          square
          index={0}
          label="Total Deps"
          value={stats.total || stats.totalDependencies || 0}
          description="Detected"
          icon={LuPackage}
          tone="neutral"
        />
        <StatCard
          square
          index={1}
          label="Up to Date"
          value={stats.upToDate || 0}
          description="Latest stable"
          icon={LuCircleCheck}
          tone="success"
        />
        <StatCard
          square
          index={2}
          label="Available"
          value={stats.updateAvailable || 0}
          description="Newer releases"
          icon={LuTrendingUp}
          tone="warning"
        />
        <StatCard
          square
          index={3}
          label="Major"
          value={stats.majorUpdates || 0}
          description="Breaking risks"
          icon={LuTriangleAlert}
          tone="danger"
        />
        <StatCard
          square
          index={4}
          label="Minor"
          value={stats.minorUpdates || 0}
          description="Features added"
          icon={LuRefreshCw}
          tone="warning"
        />
        <StatCard
          square
          index={5}
          label="Patch"
          value={stats.patchUpdates || 0}
          description="Bugfixes only"
          icon={LuGitBranch}
          tone="cyan"
        />
        <StatCard
          square
          index={6}
          label="Vulnerable"
          value={stats.vulnerable || stats.vulnerableDependencies || 0}
          description="Advisories"
          icon={LuShieldAlert}
          tone="danger"
        />
        <StatCard
          square
          index={7}
          label="Research Done"
          value={Math.max(stats.researchCompleted || 0, activeResearchJob?.completed || 0)}
          description="Firecrawl"
          icon={LuFlame}
          tone="purple"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:flex-row lg:items-center">
        <Input
          icon={LuSearch}
          placeholder="Search package names…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="lg:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by classification"
            className={selectClass}
            value={classification}
            onChange={(e) => {
              setClassification(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All classifications</option>
            <option value="CORE">Core dependencies</option>
            <option value="DEVELOPMENT">Development</option>
            <option value="SUPPORTING">Supporting</option>
            <option value="TRANSITIVE">Transitive</option>
          </select>

          <select
            aria-label="Filter by update status"
            className={selectClass}
            value={updateStatus}
            onChange={(e) => {
              setUpdateStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All update statuses</option>
            <option value="UP_TO_DATE">Up to date</option>
            <option value="UPDATE_AVAILABLE">Update available</option>
            <option value="OUTDATED">Outdated</option>
            <option value="DEPRECATED">Deprecated</option>
            <option value="YANKED">Yanked</option>
            <option value="SECURITY_RISK">Security risk</option>
            <option value="NOT_FOUND">Not found</option>
            <option value="REGISTRY_ERROR">Registry error</option>
          </select>

          <select
            aria-label="Filter by security status"
            className={selectClass}
            value={securityStatus}
            onChange={(e) => {
              setSecurityStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All security states</option>
            <option value="VULNERABLE">Vulnerable</option>
            <option value="NO_KNOWN_VULNERABILITY">No known vulnerabilities</option>
            <option value="SECURITY_DATA_UNAVAILABLE">Security data unavailable</option>
            <option value="UNKNOWN">Security unknown</option>
          </select>

          <select
            aria-label="Filter by research status"
            className={selectClass}
            value={researchStatus}
            onChange={(e) => {
              setResearchStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All research statuses</option>
            <option value="COMPLETED">Research completed</option>
            <option value="NOT_RESEARCHED">Not researched</option>
            <option value="RESEARCHING">Researching</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            aria-label="Sort updates"
            className={selectClass}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
          >
            <option value="name">Package name</option>
            <option value="status">Update status</option>
            <option value="security">Security status</option>
            <option value="research">Research status</option>
            <option value="updated">Recently checked</option>
          </select>
        </div>
      </div>

      {/* Section 3: Dependency Update Intelligence Table */}
      <div className="mt-5">
        {loading && !data ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : data?.updates?.length ? (
          <UpdateTable
            updates={data.updates}
            showRepository={false}
            onSelectDependency={(u) => setSelectedDependency(u)}
            onQuickResearch={handleQuickResearch}
          />
        ) : (
          <EmptyState
            icon={LuPackage}
            title="No update records found for this filter"
            description="Adjust your search criteria or click 'Verify Versions' to run authoritative ecosystem checks."
          />
        )}
      </div>

      {data?.pagination?.pages > 1 && (
        <div className="mt-6">
          <Pagination
            pagination={data.pagination}
            page={page}
            onPageChange={(value) => {
              setPage(value)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </div>
      )}

      {/* Section 7: Dependency Research Detail Drawer */}
      <DependencyResearchDrawer
        dependencyId={selectedDependency?.dependencyId || selectedDependency?._id}
        repositoryId={repositoryId}
        open={Boolean(selectedDependency)}
        onClose={() => setSelectedDependency(null)}
        onResearchUpdated={load}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}