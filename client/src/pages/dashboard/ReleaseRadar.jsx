import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LuArrowRight,
  LuBookOpen,
  LuCircleCheck,
  LuClock3,
  LuExternalLink,
  LuFlame,
  LuFolderGit2,
  LuPackage,
  LuRadio,
  LuRefreshCw,
  LuSearch,
  LuShieldAlert,
  LuShieldCheck,
  LuSparkles,
  LuTrendingUp,
  LuTriangleAlert,
} from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import Pagination from '../../components/common/Pagination'
import Skeleton, { RepositoryCardSkeleton } from '../../components/common/Skeleton'
import StatCard from '../../components/common/StatCard'
import Toast from '../../components/common/Toast'
import DependencyResearchDrawer from '../../components/dashboard/DependencyResearchDrawer'
import useDebounce from '../../hooks/useDebounce'
import { getErrorMessage, updatesApi } from '../../services/api'
import {
  ecosystemTone,
  formatDate,
  formatVersion,
  getCanonicalUpdateStatus,
  updateStatusLabel,
  updateStatusTone,
  updateTypeTone,
} from '../../utils/updateHelpers'

const selectClass =
  'h-10 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-sky-500 shadow-2xs'

function formatRelativeRelease(dateString) {
  if (!dateString) return 'Recent update'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Recent update'
  const now = new Date()
  const diffDays = Math.round((now - date) / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'Released today'
  if (diffDays === 1) return 'Released yesterday'
  if (diffDays < 7) return `Released ${diffDays} days ago`
  if (diffDays < 30) return `Released ${Math.round(diffDays / 7)}w ago`
  if (diffDays < 365) return `Released ${Math.round(diffDays / 30)}mo ago`
  return `Released ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

export default function ReleaseRadar() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [days, setDays] = useState('180') // Default: 6 months = 180 days
  const [repositoryId, setRepositoryId] = useState('')
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateType, setUpdateType] = useState('')
  const [sort, setSort] = useState('checked')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Drawer detail selection
  const [selectedDependency, setSelectedDependency] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const loadUpdates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await updatesApi.list({
        search: debouncedSearch,
        days: days === 'all' ? undefined : days,
        repositoryId: repositoryId || undefined,
        updateStatus: updateStatus || undefined,
        updateType: updateType || undefined,
        sort,
        page,
        limit,
      })
      setData(response)
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not load Release Radar updates',
        message: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, days, repositoryId, updateStatus, updateType, sort, page, limit])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await loadUpdates()
    }
    run()
    return () => {
      active = false
    }
  }, [loadUpdates])

  const updates = data?.updates || []
  const repositories = data?.repositories || []
  const paginationMeta = data?.pagination || { page: 1, limit: 12, total: 0, pages: 1 }
  const apiStats = data?.stats || {}

  // Radar metrics derived from backend aggregation or returned feed
  const totalInWindow = apiStats.total || paginationMeta.total || updates.length
  const needsUpgradeCount =
    apiStats.needsUpgrade !== undefined
      ? apiStats.needsUpgrade
      : updates.filter((u) => getCanonicalUpdateStatus(u) === 'UPDATE_AVAILABLE').length
  const outdatedCount =
    apiStats.outdated !== undefined
      ? apiStats.outdated
      : updates.filter((u) => getCanonicalUpdateStatus(u) === 'OUTDATED').length
  const researchedCount =
    apiStats.researched !== undefined
      ? apiStats.researched
      : updates.filter((u) => u.researchStatus === 'COMPLETED' || u.researchId).length

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        eyebrow="Firecrawl ecosystem radar"
        title="Release Radar"
        description="Live feed of recent dependency updates, official changelogs, and release notes captured by Firecrawl across your repositories from the past six months."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/dashboard/updates">
              <Button variant="secondary" size="sm" leftIcon={LuFolderGit2}>
                Repository Intelligence
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              leftIcon={LuRefreshCw}
              loading={loading}
              onClick={loadUpdates}
              title="Refresh recent release notes"
            >
              Refresh Radar
            </Button>
          </div>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live 6-Month Rolling Window Active
          </span>
          <span className="text-xs text-slate-500">
            Scanning official package registries, changelogs, and GitHub releases.
          </span>
        </div>
      </PageHeader>

      {/* Top Stat Cards: Small Square Boxes */}
      <div className="grid grid-cols-2 gap-2.5 max-w-xs sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:max-w-none">
        <div className="w-full sm:w-36">
          <StatCard
            square
            index={0}
            label="Recent Updates"
            value={totalInWindow}
            description="Within 6 months"
            icon={LuRadio}
            tone="cyan"
          />
        </div>
        <div className="w-full sm:w-36">
          <StatCard
            square
            index={1}
            label="Needs Upgrade"
            value={needsUpgradeCount}
            description="Minor & patch releases"
            icon={LuTrendingUp}
            tone="warning"
          />
        </div>
        <div className="w-full sm:w-36">
          <StatCard
            square
            index={2}
            label="Outdated"
            value={outdatedCount}
            description="Major version shifts"
            icon={LuTriangleAlert}
            tone="danger"
          />
        </div>
        <div className="w-full sm:w-36">
          <StatCard
            square
            index={3}
            label="Researched"
            value={researchedCount}
            description="Official docs verified"
            icon={LuFlame}
            tone="purple"
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs lg:flex-row lg:items-center justify-between">
        <Input
          icon={LuSearch}
          placeholder="Search package name, repository, or ecosystem…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-full lg:max-w-xs"
        />

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
          {/* Time Window Filter (Past 6 Months Default) */}
          <select
            aria-label="Filter by time range"
            className={`${selectClass} border-sky-300 bg-sky-50/50 text-sky-950 font-bold w-full sm:w-auto`}
            value={days}
            onChange={(e) => {
              setDays(e.target.value)
              setPage(1)
            }}
          >
            <option value="180">Past 6 Months (Default)</option>
            <option value="30">Past 30 Days</option>
            <option value="90">Past 90 Days</option>
            <option value="365">Past 1 Year</option>
            <option value="all">All Time</option>
          </select>

          {/* Repository Selector */}
          {repositories.length > 0 && (
            <select
              aria-label="Filter by repository"
              className={`${selectClass} w-full sm:w-auto`}
              value={repositoryId}
              onChange={(e) => {
                setRepositoryId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Repositories</option>
              {repositories.map((repo) => (
                <option key={repo._id} value={repo._id}>
                  {repo.fullName || repo.name}
                </option>
              ))}
            </select>
          )}

          {/* Strictly 3 Statuses */}
          <select
            aria-label="Filter by update status"
            className={`${selectClass} w-full sm:w-auto`}
            value={updateStatus}
            onChange={(e) => {
              setUpdateStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Statuses</option>
            <option value="UPDATE_AVAILABLE">Needs Upgrade</option>
            <option value="OUTDATED">Outdated</option>
            <option value="UP_TO_DATE">Up to Date</option>
          </select>

          {/* Update Type */}
          <select
            aria-label="Filter by update type"
            className={`${selectClass} w-full sm:w-auto`}
            value={updateType}
            onChange={(e) => {
              setUpdateType(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Types</option>
            <option value="MAJOR">Major Updates</option>
            <option value="MINOR">Minor Updates</option>
            <option value="PATCH">Patch Updates</option>
          </select>

          {/* Sort By */}
          <select
            aria-label="Sort updates"
            className={`${selectClass} col-span-2 sm:col-span-1 w-full sm:w-auto`}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
          >
            <option value="checked">Recently Checked</option>
            <option value="released">Release Date</option>
            <option value="name">Package Name</option>
            <option value="status">Update Status</option>
          </select>
        </div>
      </div>

      {/* Dependency Cards Grid */}
      <div className="mt-6">
        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl border border-slate-200 bg-white p-5 animate-pulse" />
            ))}
          </div>
        ) : updates.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {updates.map((update) => {
              const canonical = getCanonicalUpdateStatus(update)
              const research = update.researchId || {}
              const breakingChangesCount = research.breakingChanges?.length || 0
              const findingsCount = research.findings?.length || 0
              const repository = update.repositoryId || {}
              const releaseDateStr = update.latestReleaseDate || research.researchedAt || update.lastCheckedAt

              return (
                <div
                  key={String(update._id)}
                  className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
                >
                  {/* Subtle top indicator bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      canonical === 'OUTDATED'
                        ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                        : canonical === 'UPDATE_AVAILABLE'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                  />

                  {/* Top: Package Header & Repository */}
                  <div>
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600 font-bold">
                          <LuPackage className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-base font-bold text-slate-950 group-hover:text-sky-600 transition" title={update.packageName}>
                            {update.packageName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge tone={ecosystemTone[update.ecosystem] || 'neutral'}>
                              {update.ecosystem}
                            </Badge>
                            {update.classification && (
                              <span className="font-mono text-[10px] text-slate-400 uppercase">
                                {update.classification}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Relative time pill */}
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        <LuClock3 className="h-3 w-3 text-slate-400" />
                        {formatRelativeRelease(releaseDateStr)}
                      </span>
                    </div>

                    {/* Repository Association Tag */}
                    {repository.fullName && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <LuFolderGit2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate font-medium">{repository.fullName}</span>
                      </div>
                    )}

                    {/* Version Change Box */}
                    <div className="mt-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                            Installed
                          </p>
                          <span className="font-bold text-slate-700">
                            {formatVersion(update.installedVersion || update.declaredVersion)}
                          </span>
                        </div>

                        <LuArrowRight className="h-4 w-4 text-slate-400 shrink-0" />

                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                            Latest Stable
                          </p>
                          <span className="font-bold text-slate-950 text-sm">
                            {formatVersion(update.latestStableVersion || update.latestVersion)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <Badge tone={updateStatusTone[canonical]} dot>
                          {updateStatusLabel[canonical]}
                        </Badge>

                        {update.updateType && update.updateType !== 'NONE' && (
                          <Badge tone={updateTypeTone[update.updateType]}>
                            {update.updateType} update
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Firecrawl Intelligence Snippet */}
                    <div className="mt-3.5 space-y-2">
                      <p className="line-clamp-2 text-xs text-slate-600 leading-relaxed">
                        {update.metadata?.description ||
                          research.packageInfo?.description ||
                          `Official documentation verified with Firecrawl for ${update.packageName}. Latest release: ${update.latestStableVersion}.`}
                      </p>

                      {/* Highlights / Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {breakingChangesCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <LuTriangleAlert className="h-3 w-3" />
                            {breakingChangesCount} breaking change{breakingChangesCount > 1 ? 's' : ''}
                          </span>
                        )}

                        {update.securityStatus === 'VULNERABLE' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                            <LuShieldAlert className="h-3 w-3" />
                            Security vulnerability
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                          <LuFlame className="h-3 w-3 text-purple-600" />
                          Firecrawl verified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      leftIcon={LuFlame}
                      onClick={() => setSelectedDependency(update)}
                    >
                      View Intelligence
                    </Button>

                    {update.registryUrl && (
                      <a
                        href={update.registryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-sky-600 hover:bg-slate-50 transition shadow-2xs"
                        title="Open official registry page"
                      >
                        <LuExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={LuRadio}
            title="No updates found in this time window"
            description="No dependency releases were detected for the selected filters. Try switching the time range to 'Past 1 Year' or 'All Time'."
            action={
              <Button variant="secondary" onClick={() => setDays('all')}>
                Show All Releases
              </Button>
            }
          />
        )}
      </div>

      {/* Pagination Controls */}
      {paginationMeta.total > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Showing <strong>{(page - 1) * limit + 1}</strong> to{' '}
            <strong>{Math.min(page * limit, paginationMeta.total)}</strong> of{' '}
            <strong>{paginationMeta.total}</strong> recent updates
          </p>

          <div className="flex justify-center sm:justify-end">
            <Pagination
              page={page}
              pages={paginationMeta.pages}
              total={paginationMeta.total}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}

      {/* Slide-over Dependency Research Drawer */}
      <DependencyResearchDrawer
        dependencyId={selectedDependency?.dependencyId || selectedDependency?._id}
        repositoryId={selectedDependency?.repositoryId?._id || selectedDependency?.repositoryId}
        open={Boolean(selectedDependency)}
        onClose={() => setSelectedDependency(null)}
        onResearchUpdated={loadUpdates}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
