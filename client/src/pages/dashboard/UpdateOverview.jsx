import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuArrowUpRight, LuCalendarClock, LuGitBranch, LuPackage, LuRefreshCw, LuShieldAlert, LuSparkles, LuTrendingUp, LuTriangleAlert } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton, { TableSkeleton } from '../../components/common/Skeleton'
import StatCard from '../../components/common/StatCard'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import UpdateCharts from '../../components/dashboard/UpdateCharts'
import UpdateTable from '../../components/dashboard/UpdateTable'
import { getErrorMessage, updatesApi } from '../../services/api'
import { formatDate } from '../../utils/updateHelpers'

export default function UpdateOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    try {
      const response = await updatesApi.overview()
      setData(response)
      setError('')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load update intelligence.'))
    } finally {
      setLoading(false)
    }
  }, [])

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

  const isPolling = ['QUEUED', 'SCANNING'].includes(data?.progress?.status)
  useEffect(() => {
    if (!isPolling) return undefined
    const timer = setInterval(() => {
      load().catch(() => null)
    }, 2500)
    return () => clearInterval(timer)
  }, [isPolling, load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleCheckAll = async () => {
    setChecking(true)
    try {
      const response = await updatesApi.checkAll()
      setToast({
        type: 'success',
        title: 'Update checks queued',
        message: response.message || 'Repository checks are running in the background.',
      })
      await load()
    } catch (requestError) {
      setToast({
        type: 'error',
        title: 'Could not start update checks',
        message: getErrorMessage(requestError),
      })
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="Intelligence"
          title="Update Intelligence"
          description="Live package registry and security advisory signals for your dependencies."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[180px] rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-card/60">
          <TableSkeleton rows={6} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Intelligence" title="Update Intelligence" />
        <EmptyState
          icon={LuTriangleAlert}
          title="Update intelligence is unavailable"
          description={error}
          action={<Button variant="secondary" onClick={load}>Try again</Button>}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    )
  }

  const stats = data?.stats || {}
  const hasData = Number(stats.totalDependencies || 0) > 0
  const progress = data?.progress

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Update Intelligence"
        description="Real registry versions, release metadata and security advisories for every extracted dependency."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={LuRefreshCw}
            loading={checking}
            onClick={handleCheckAll}
          >
            Check all repositories
          </Button>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="violet" icon={LuSparkles}>
            Live registry data
          </Badge>
          <Badge tone="cyan" icon={LuCalendarClock}>
            {stats.lastCheckedAt ? `Checked ${formatDate(stats.lastCheckedAt, true)}` : 'Not checked yet'}
          </Badge>
          {progress ? (
            <Badge tone={progress.status === 'FAILED' ? 'danger' : 'warning'} dot>
              {progress.status} · {progress.progress?.processed || 0}/{progress.progress?.total || 0}
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      <SectionTabs section="updates" />

      {!hasData ? (
        <EmptyState
          icon={LuPackage}
          title="No dependency intelligence yet"
          description="Connect GitHub, scan a repository, then run an update check to populate this dashboard."
          action={
            <Link to="/dashboard/repositories">
              <Button variant="secondary">Go to repositories</Button>
            </Link>
          }
        />
      ) : (
        <>
          {progress ? (
            <div className="mb-6 rounded-2xl border border-brand/25 bg-brand/[0.06] p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-brandlight">{progress.progress?.message || 'Update check running'}</span>
                <span className="font-mono text-subtle">
                  {progress.progress?.processed || 0}/{progress.progress?.total || 0}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all duration-500"
                  style={{
                    width: `${progress.progress?.total
                      ? Math.round((progress.progress.processed / progress.progress.total) * 100)
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <StatCard index={0} label="Repositories" value={stats.repositoriesAnalyzed} description="Analyzed" icon={LuGitBranch} tone="violet" />
            <StatCard index={1} label="Dependencies" value={stats.totalDependencies} description="Tracked packages" icon={LuPackage} tone="cyan" />
            <StatCard index={2} label="Up to date" value={stats.upToDate} description="Latest stable" icon={LuSparkles} tone="success" />
            <StatCard index={3} label="Available" value={stats.updateAvailable || stats.outdated || 0} description="Need updating" icon={LuTrendingUp} tone="warning" />
            <StatCard index={4} label="Major updates" value={stats.majorUpdates} description="Breaking risks" icon={LuArrowUpRight} tone="danger" />
            <StatCard index={5} label="Vulnerable" value={stats.vulnerableDependencies} description="Security risks" icon={LuShieldAlert} tone="danger" />
          </div>

          <div className="mt-6">
            <UpdateCharts
              distribution={data?.distribution || []}
              severityDistribution={data?.severityDistribution || []}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-card/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-caps">Repository summary</p>
                <h2 className="mt-1.5 text-base font-semibold text-ink">Update health by repository</h2>
              </div>
              <Link to="/dashboard/updates" className="text-xs font-semibold text-brandlight hover:underline">
                View all updates →
              </Link>
            </div>
            {data?.repositorySummary?.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.repositorySummary.map((repository) => (
                  <Link
                    key={String(repository.repositoryId)}
                    to={`/dashboard/updates?repositoryId=${repository.repositoryId}`}
                    className="rounded-xl border border-line bg-canvas/40 p-4 transition hover:border-brandlight/30 hover:bg-brand/[0.04]"
                  >
                    <p className="truncate text-sm font-semibold text-ink">{repository.fullName}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="neutral">{repository.total} dependencies</Badge>
                      <Badge tone="danger">{repository.outdated} outdated</Badge>
                      <Badge tone="warning">{repository.vulnerable} vulnerable</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-line py-8 text-center text-xs text-muted">
                No repository summaries yet.
              </p>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="label-caps">Recently detected</p>
                <h2 className="mt-1.5 text-base font-semibold text-ink">Latest update signals</h2>
              </div>
              <span className="text-xs text-muted">{data?.recentUpdates?.length || 0} records</span>
            </div>
            <UpdateTable updates={data?.recentUpdates || []} />
          </div>
        </>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
