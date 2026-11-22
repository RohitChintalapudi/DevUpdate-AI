import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LuArrowLeft, LuCalendarClock, LuExternalLink, LuGitBranch, LuPackage, LuRefreshCw, LuSearch, LuShieldAlert, LuTrendingUp } from 'react-icons/lu'
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
import useDebounce from '../../hooks/useDebounce'
import { getErrorMessage, updatesApi } from '../../services/api'
import { formatDate } from '../../utils/updateHelpers'

const selectClass =
  'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'

const emptyStats = { total: 0, outdated: 0, updateAvailable: 0, vulnerable: 0, deprecated: 0 }

export default function RepositoryUpdateDetails() {
  const { repositoryId } = useParams()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [updateStatus, setUpdateStatus] = useState('')
  const [securityStatus, setSecurityStatus] = useState('')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await updatesApi.repository(repositoryId, {
        search: debouncedSearch,
        updateStatus,
        securityStatus,
        sort,
        page,
        limit: 20,
      })
      setData(response)
      setNotFound(false)
    } catch (error) {
      if (error?.response?.status === 404) setNotFound(true)
      else setToast({ type: 'error', title: 'Could not load repository updates', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [repositoryId, debouncedSearch, updateStatus, securityStatus, sort, page])

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

  const jobStatus = data?.latestJob?.status || data?.repository?.updateCheckStatus
  const isPolling = ['QUEUED', 'SCANNING'].includes(jobStatus)
  useEffect(() => {
    if (!isPolling) return undefined
    const timer = setInterval(() => {
      load().catch(() => null)
    }, 3000)
    return () => clearInterval(timer)
  }, [isPolling, load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleCheck = async () => {
    setChecking(true)
    try {
      const response = await updatesApi.checkRepository(repositoryId)
      setToast({
        type: 'success',
        title: 'Update check queued',
        message: response.message || 'Registry and advisory checks are running in the background.',
      })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not start update check', message: getErrorMessage(error) })
    } finally {
      setChecking(false)
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
              <Button variant="secondary">Back to all updates</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const repository = data?.repository || {}
  const stats = data?.stats || emptyStats
  const latestJob = data?.latestJob

  return (
    <div>
      <PageHeader
        eyebrow="Repository intelligence"
        title={repository.fullName || 'Repository updates'}
        description="Version and advisory intelligence for every dependency extracted from this repository."
        actions={
          <>
            <Link to="/dashboard/updates">
              <Button variant="ghost" size="sm" leftIcon={LuArrowLeft}>All updates</Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              leftIcon={LuRefreshCw}
              loading={checking}
              onClick={handleCheck}
            >
              Check updates
            </Button>
          </>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {repository.htmlUrl ? (
            <a
              href={repository.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brandlight hover:underline"
            >
              Open on GitHub <LuExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
          <Badge tone={jobStatus === 'FAILED' ? 'danger' : jobStatus === 'COMPLETED' ? 'success' : 'warning'} dot>
            {jobStatus || 'NOT_CHECKED'}
          </Badge>
          <Badge tone="cyan" icon={LuCalendarClock}>
            {repository.lastUpdateCheckAt ? `Checked ${formatDate(repository.lastUpdateCheckAt, true)}` : 'Not checked yet'}
          </Badge>
        </div>
      </PageHeader>

      {isPolling && latestJob ? (
        <div className="mb-6 rounded-2xl border border-brand/25 bg-brand/[0.06] p-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-brandlight">
              {latestJob.progress?.message || 'Update check running'}
            </span>
            <span className="font-mono text-subtle">
              {latestJob.progress?.processed || 0}/{latestJob.progress?.total || 0}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-brandlight transition-all duration-500"
              style={{
                width: `${latestJob.progress?.total
                  ? Math.round((latestJob.progress.processed / latestJob.progress.total) * 100)
                  : 0}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard index={0} label="Dependencies" value={stats.total} description="With update intelligence" icon={LuPackage} tone="violet" />
        <StatCard index={1} label="Outdated" value={stats.outdated} description="Major or outside range" icon={LuTrendingUp} tone="danger" />
        <StatCard index={2} label="Update available" value={stats.updateAvailable} description="Compatible releases ready" icon={LuRefreshCw} tone="warning" />
        <StatCard index={3} label="Vulnerable" value={stats.vulnerable} description="Installed versions affected" icon={LuShieldAlert} tone="danger" />
        <StatCard index={4} label="Deprecated" value={stats.deprecated} description="Flagged by the registry" icon={LuGitBranch} tone="warning" />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-card/60 p-4 lg:flex-row lg:items-center">
        <Input
          icon={LuSearch}
          placeholder="Search packages in this repository…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="lg:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by update status"
            className={selectClass}
            value={updateStatus}
            onChange={(event) => {
              setUpdateStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All update statuses</option>
            <option value="UP_TO_DATE">Up to date</option>
            <option value="OUTDATED">Outdated</option>
            <option value="UPDATE_AVAILABLE">Update available</option>
            <option value="SECURITY_RISK">Security risk</option>
            <option value="NOT_FOUND">Not found</option>
            <option value="REGISTRY_ERROR">Registry error</option>
          </select>
          <select
            aria-label="Filter by security status"
            className={selectClass}
            value={securityStatus}
            onChange={(event) => {
              setSecurityStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All security states</option>
            <option value="VULNERABLE">Vulnerable</option>
            <option value="NO_KNOWN_VULNERABILITY">No known vulnerabilities</option>
            <option value="SECURITY_DATA_UNAVAILABLE">Security data unavailable</option>
          </select>
          <select
            aria-label="Sort updates"
            className={selectClass}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setPage(1)
            }}
          >
            <option value="name">Package name</option>
            <option value="status">Update status</option>
            <option value="security">Security status</option>
            <option value="updated">Recently checked</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        {loading && !data ? (
          <div className="rounded-2xl border border-line bg-card/60">
            <TableSkeleton rows={8} />
          </div>
        ) : data?.updates?.length ? (
          <UpdateTable updates={data.updates} showRepository={false} />
        ) : (
          <EmptyState
            icon={LuPackage}
            title="No update records for this repository"
            description="Analyze the repository first, then run an update check to populate version and advisory data."
          />
        )}
      </div>

      <Pagination
        pagination={data?.pagination}
        page={page}
        onPageChange={(value) => {
          setPage(value)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
