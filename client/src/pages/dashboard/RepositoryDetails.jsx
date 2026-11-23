import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LuArrowLeft, LuCalendarDays, LuCircleAlert, LuCircleCheck, LuExternalLink, LuFileJson, LuGitBranch, LuPackage, LuRefreshCw, LuStar } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import Skeleton, { TableSkeleton } from '../../components/common/Skeleton'
import StatCard from '../../components/common/StatCard'
import Toast from '../../components/common/Toast'
import DependencyTable from '../../components/dashboard/DependencyTable'
import { getErrorMessage, dependenciesApi, repositoriesApi } from '../../services/api'

const statusTone = {
  NOT_SCANNED: 'neutral',
  QUEUED: 'warning',
  SCANNING: 'cyan',
  COMPLETED: 'success',
  FAILED: 'danger',
}

const statusLabel = {
  NOT_SCANNED: 'Not scanned',
  QUEUED: 'Queued',
  SCANNING: 'Scanning',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

function formatDate(value, withTime = false) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.015] p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brandlight" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">{label}</p>
        <p className="mt-1 truncate text-[13px] text-ink">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function RepositoryDetails() {
  const { id } = useParams()
  const [repository, setRepository] = useState(null)
  const [scanJob, setScanJob] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [ecosystems, setEcosystems] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [branch, setBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')

  const loadDependencies = useCallback(async () => {
    try {
      const data = await dependenciesApi.byRepository(id, { limit: 100, sort: 'name' })
      const cleanList = (data.dependencies || []).filter(
        (dep) => dep.packageName && !dep.packageName.startsWith('@'),
      )
      setDependencies(cleanList)
    } catch (loadError) {
      setToast({
        type: 'error',
        title: 'Could not load dependencies',
        message: getErrorMessage(loadError),
      })
    }
  }, [id])

  const loadRepository = useCallback(async () => {
    setLoading(true)
    try {
      const data = await repositoriesApi.get(id)
      setRepository(data.repository)
      setScanJob(data.latestJob)
      setScanHistory(data.scanHistory || [])
      setEcosystems(data.ecosystems || [])
      setBranch(data.repository.branch || data.repository.defaultBranch || '')
      setError('')
      await loadDependencies()
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [id, loadDependencies])

  useEffect(() => {
    let active = true
    const load = async () => {
      await Promise.resolve()
      if (active) await loadRepository()
    }
    load()
    return () => {
      active = false
    }
  }, [loadRepository])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!['QUEUED', 'SCANNING'].includes(repository?.scanStatus)) return undefined
    const timer = setInterval(async () => {
      try {
        const data = await repositoriesApi.scanStatus(id)
        setRepository((current) => (current ? { ...current, ...data.repository } : current))
        setScanJob(data.scanJob)
        if (!['QUEUED', 'SCANNING'].includes(data.repository.scanStatus)) {
          await Promise.all([loadRepository(), loadDependencies()])
        }
      } catch {
        // A transient polling failure should not interrupt the background scan.
      }
    }, 2500)
    return () => clearInterval(timer)
  }, [id, repository?.scanStatus, loadRepository, loadDependencies])

  const handleRescan = async () => {
    setScanning(true)
    try {
      const data = await repositoriesApi.analyze(id, { branch })
      setScanJob(data.scanJob)
      setRepository((current) => ({
        ...current,
        scanStatus: 'QUEUED',
        branch,
        lastScanError: '',
      }))
      setToast({
        type: 'success',
        title: 'Rescan queued',
        message: 'The scan continues in the background, even if you close this page.',
      })
    } catch (scanError) {
      setToast({ type: 'error', title: 'Could not start rescan', message: getErrorMessage(scanError) })
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-9 w-72" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-card/60">
          <TableSkeleton rows={5} />
        </div>
      </div>
    )
  }

  if (error || !repository) {
    return (
      <div>
        <PageHeader eyebrow="Repository details" title="Repository unavailable" />
        <EmptyState
          icon={LuCircleAlert}
          title="We could not open this repository"
          description={error || 'It may have been removed or disconnected.'}
          action={
            <Link to="/dashboard/repositories">
              <Button variant="secondary">Back to repositories</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const scanningNow = ['QUEUED', 'SCANNING'].includes(repository.scanStatus)
  const progress = scanJob?.progress || {}

  return (
    <div>
      <Link
        to="/dashboard/repositories"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition hover:text-ink"
      >
        <LuArrowLeft className="h-3.5 w-3.5" /> Back to repositories
      </Link>

      <PageHeader
        eyebrow={`${repository.owner}/${repository.name}`}
        title={repository.name}
        description={repository.description || 'No description provided.'}
        actions={
          <>
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" leftIcon={LuExternalLink}>GitHub</Button>
            </a>
            <Button
              size="sm"
              leftIcon={LuRefreshCw}
              loading={scanning}
              disabled={scanningNow}
              onClick={handleRescan}
            >
              {scanningNow ? 'Scanning…' : 'Rescan Repository'}
            </Button>
          </>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[repository.scanStatus] || 'neutral'} dot>
            {statusLabel[repository.scanStatus] || repository.scanStatus}
          </Badge>
          <Badge tone={repository.visibility === 'private' ? 'warning' : 'neutral'}>
            {repository.visibility}
          </Badge>
          {repository.language ? <Badge tone="cyan">{repository.language}</Badge> : null}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Dependencies"
          value={repository.dependencyCount || 0}
          description="Unique packages extracted"
          icon={LuPackage}
          tone="violet"
          index={0}
        />
        <StatCard
          label="Manifests"
          value={repository.manifestFiles?.length || 0}
          description="Dependency files discovered"
          icon={LuFileJson}
          tone="cyan"
          index={1}
        />
        <StatCard
          label="Stars"
          value={repository.stars || 0}
          description="Repository popularity on GitHub"
          icon={LuStar}
          tone="warning"
          index={2}
        />
        <StatCard
          label="Last scan"
          value={formatDate(repository.lastScannedAt).split(',')[0]}
          description={formatDate(repository.lastScannedAt, true)}
          icon={LuCalendarDays}
          tone="success"
          index={3}
        />
      </div>

      {scanningNow ? (
        <div className="mt-6 rounded-2xl border border-brand/25 bg-brand/[0.06] p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-ink">Scan in progress</p>
            <span className="text-xs text-brandlight">{progress.message || 'Working…'}</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(8, ((progress.manifestsProcessed || 0) / Math.max(1, repository.manifestFiles?.length || 1)) * 100))}%`,
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted">
            <span>{progress.filesDiscovered || 0} files discovered</span>
            <span>{progress.manifestsProcessed || 0} manifests processed</span>
            <span>{progress.dependenciesExtracted || 0} dependencies extracted</span>
          </div>
        </div>
      ) : null}

      {repository.lastScanError ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/[0.06] p-4 text-sm text-danger">
          <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Last scan failed</p>
            <p className="mt-1 text-xs leading-relaxed text-subtle">{repository.lastScanError}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card/70 p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-ink">Repository metadata</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetaItem icon={LuGitBranch} label="Default branch" value={repository.defaultBranch} />
            <MetaItem icon={LuGitBranch} label="Scanned branch" value={repository.branch || repository.defaultBranch} />
            <MetaItem icon={LuPackage} label="Language" value={repository.language || 'Unknown'} />
            <MetaItem icon={LuStar} label="Stars" value={repository.stars} />
            <MetaItem icon={LuCalendarDays} label="Last GitHub update" value={formatDate(repository.lastUpdated)} />
            <MetaItem icon={LuCircleCheck} label="Scan status" value={statusLabel[repository.scanStatus]} />
          </div>

          <div className="mt-5">
            <label htmlFor="branch" className="mb-2 block text-[13px] font-medium text-subtle">
              Branch to scan
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="branch"
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                placeholder="main"
              />
              <Button variant="secondary" onClick={handleRescan} loading={scanning} disabled={scanningNow}>
                Scan this branch
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card/70 p-5">
            <h3 className="text-sm font-semibold text-ink">Ecosystem breakdown</h3>
            {ecosystems.length ? (
              <div className="mt-4 space-y-3">
                {ecosystems.map((item) => (
                  <div key={item.ecosystem} className="flex items-center justify-between text-xs">
                    <Badge tone="violet">{item.ecosystem}</Badge>
                    <span className="font-semibold text-ink">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted">No dependencies extracted yet.</p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-card/70 p-5">
            <h3 className="text-sm font-semibold text-ink">Manifest files</h3>
            {repository.manifestFiles?.length ? (
              <ul className="mt-3 space-y-2">
                {repository.manifestFiles.map((file) => (
                  <li key={file} className="truncate font-mono text-[11px] text-subtle">{file}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted">No manifests found on the last scan.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Extracted dependencies</h3>
          <span className="text-xs text-muted">{dependencies.length} shown</span>
        </div>
        {scanningNow && !dependencies.length ? (
          <div className="rounded-2xl border border-line bg-card/60"><TableSkeleton rows={4} /></div>
        ) : (
          <DependencyTable dependencies={dependencies} showRepository={false} />
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card/70 p-5">
        <h3 className="text-sm font-semibold text-ink">Scan history</h3>
        {scanHistory.length ? (
          <div className="mt-4 divide-y divide-line">
            {scanHistory.map((job) => (
              <div key={job._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone[job.status] || 'neutral'} dot>{job.status}</Badge>
                  <span className="text-subtle">{job.branch}</span>
                </div>
                <span className="text-muted">
                  {formatDate(job.completedAt || job.createdAt, true)}
                  {job.error ? ` · ${job.error}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">No scans recorded yet.</p>
        )}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
