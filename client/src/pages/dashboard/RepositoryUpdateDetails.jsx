import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

  // Polling for update version check job
  const jobStatus = data?.latestJob?.status || data?.repository?.updateCheckStatus
  const isVersionCheckPolling = ['QUEUED', 'SCANNING'].includes(jobStatus)

  useEffect(() => {
    if (!isVersionCheckPolling) return undefined
    const timer = setInterval(() => {
      load().catch(() => null)
    }, 3000)
    return () => clearInterval(timer)
  }, [isVersionCheckPolling, load])

  // Polling for Firecrawl research background job
  const isResearchPolling = activeResearchJob?.status === 'RUNNING'

  useEffect(() => {
    if (!isResearchPolling) return undefined
    const timer = setInterval(async () => {
      try {
        const res = await updatesApi.researchStatus(repositoryId)
        if (res.job) {
          setActiveResearchJob(res.job)
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
    }, 2500)
    return () => clearInterval(timer)
  }, [isResearchPolling, repositoryId, load])

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
      await load()
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
    setResearchingAll(true)
    try {
      const response = await updatesApi.researchRepository(repositoryId)
      setActiveResearchJob(response.job)
      setToast({
        type: 'success',
        title: 'Firecrawl documentation research queued',
        message: 'Researching official release notes, breaking changes, and changelogs.',
      })
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not start research',
        message: getErrorMessage(error),
      })
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

      {/* Active Firecrawl Research Progress Banner */}
      {isResearchPolling && activeResearchJob && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/30 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <LuFlame className="h-4 w-4 animate-bounce text-amber-600" />
              <span className="font-bold">
                Firecrawl Official Research in Progress…
              </span>
              {activeResearchJob.currentPackage && (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-800">
                  {activeResearchJob.currentPackage}
                </span>
              )}
            </div>
            <span className="font-mono text-xs font-semibold text-amber-900">
              {activeResearchJob.completed + activeResearchJob.failed} / {activeResearchJob.total} dependencies ({activeResearchJob.percent}%)
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-200/60">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${activeResearchJob.percent || 5}%` }}
            />
          </div>
        </div>
      )}

      {/* Section 2: Repository Update Overview (8 Calculated Summary Metrics) */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard
          index={0}
          label="Total Deps"
          value={stats.total || stats.totalDependencies}
          description="Detected packages"
          icon={LuPackage}
          tone="neutral"
        />
        <StatCard
          index={1}
          label="Up to Date"
          value={stats.upToDate}
          description="At latest stable"
          icon={LuCircleCheck}
          tone="success"
        />
        <StatCard
          index={2}
          label="Updates Available"
          value={stats.updateAvailable}
          description="Newer releases"
          icon={LuTrendingUp}
          tone="warning"
        />
        <StatCard
          index={3}
          label="Major Updates"
          value={stats.majorUpdates}
          description="Breaking potential"
          icon={LuTriangleAlert}
          tone="danger"
        />
        <StatCard
          index={4}
          label="Minor Updates"
          value={stats.minorUpdates}
          description="Features added"
          icon={LuRefreshCw}
          tone="warning"
        />
        <StatCard
          index={5}
          label="Patch Updates"
          value={stats.patchUpdates}
          description="Bugfixes only"
          icon={LuGitBranch}
          tone="cyan"
        />
        <StatCard
          index={6}
          label="Vulnerable"
          value={stats.vulnerable || stats.vulnerableDependencies}
          description="Security advisories"
          icon={LuShieldAlert}
          tone="danger"
        />
        <StatCard
          index={7}
          label="Research Done"
          value={stats.researchCompleted}
          description="Firecrawl verified"
          icon={LuFlame}
          tone="violet"
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