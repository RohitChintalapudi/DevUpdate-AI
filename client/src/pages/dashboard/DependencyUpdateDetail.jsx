import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LuArrowLeft, LuCalendarDays, LuCircleCheck, LuExternalLink, LuGitBranch, LuPackage, LuRefreshCw, LuShieldAlert, LuTriangleAlert } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import { getErrorMessage, updatesApi } from '../../services/api'
import {
  ecosystemTone,
  formatDate,
  formatVersion,
  securityStatusLabel,
  securityStatusTone,
  severityTone,
  updateStatusLabel,
  updateStatusTone,
  updateTypeTone,
} from '../../utils/updateHelpers'

const rangeStatusLabel = {
  WITHIN_RANGE: 'Latest version is within the declared range',
  OUTSIDE_RANGE: 'Latest version is outside the declared range',
  NO_DECLARED_RANGE: 'No declared range was extracted',
  UNKNOWN: 'Range compatibility could not be determined',
}

function DetailRow({ label, children, mono = false }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line/50 py-3 last:border-0 sm:flex-row sm:items-start sm:gap-6">
      <dt className="w-44 shrink-0 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className={`min-w-0 flex-1 text-[13px] text-ink ${mono ? 'font-mono' : ''}`}>{children}</dd>
    </div>
  )
}

function AdvisoryCard({ advisory }) {
  const severity = advisory.severity?.level || 'UNKNOWN'
  const identifier = advisory.cveIds?.[0] || advisory.ghsaIds?.[0] || advisory.id
  const advisoryUrl = advisory.references?.find((reference) => /advisory|CVE|GHSA|security/i.test(reference.url))?.url
    || advisory.references?.[0]?.url

  return (
    <div className="rounded-xl border border-danger/20 bg-danger/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={severityTone[severity] || 'neutral'} dot>{severity}</Badge>
        <span className="font-mono text-[12px] font-semibold text-ink">{identifier}</span>
        {advisory.aliases?.length ? (
          <span className="text-[11px] text-muted">also {advisory.aliases.slice(0, 3).join(', ')}</span>
        ) : null}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-subtle">{advisory.summary}</p>
      <dl className="mt-4 space-y-1.5 text-[12px]">
        {advisory.affectedRanges?.map((range, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <span className="text-muted">Affected:</span>
            <span className="font-mono text-subtle">{range.display || 'Unavailable'}</span>
          </div>
        ))}
        {advisory.fixedVersions?.length ? (
          <div className="flex flex-wrap gap-2">
            <span className="text-muted">Fixed in:</span>
            <span className="font-mono text-success">{advisory.fixedVersions.join(', ')}</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="text-muted">Fixed in:</span>
            <span className="text-subtle">Not published in advisory data</span>
          </div>
        )}
      </dl>
      {advisoryUrl ? (
        <a
          href={advisoryUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brandlight hover:underline"
        >
          View advisory <LuExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  )
}

export default function DependencyUpdateDetail() {
  const { dependencyId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await updatesApi.dependency(dependencyId)
      setData(response)
      setNotFound(false)
    } catch (error) {
      if (error?.response?.status === 404) setNotFound(true)
      else setToast({ type: 'error', title: 'Could not load dependency details', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [dependencyId])

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

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleCheckAgain = async () => {
    setChecking(true)
    try {
      const response = await updatesApi.checkDependency(dependencyId)
      setToast({
        type: 'success',
        title: 'Dependency rechecked',
        message: response.changes?.length
          ? `Changed: ${response.changes.join(', ')}.`
          : 'No status changes detected since the last check.',
      })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Check failed', message: getErrorMessage(error) })
    } finally {
      setChecking(false)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Dependency detail" title="Loading dependency…" />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div>
        <PageHeader eyebrow="Dependency detail" title="Dependency not found" />
        <EmptyState
          icon={LuPackage}
          title="No update intelligence found"
          description="Run an update check for the owning repository before opening a dependency detail view."
          action={
            <Link to="/dashboard/updates">
              <Button variant="secondary">Back to updates</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const update = data.update
  const versionHistory = update.metadata?.versionHistory || []
  const history = data.history || []

  return (
    <div>
      <PageHeader
        eyebrow="Dependency detail"
        title={update.packageName}
        description="Declared requirement, resolved version, latest stable release and advisory evidence — all from live sources."
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
              onClick={handleCheckAgain}
            >
              Check Again
            </Button>
          </>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={ecosystemTone[update.ecosystem] || 'neutral'}>{update.ecosystem}</Badge>
          <Badge tone={updateTypeTone[update.updateType] || 'neutral'}>{update.updateType?.toLowerCase()}</Badge>
          <Badge tone={updateStatusTone[update.updateStatus] || 'neutral'} dot>
            {updateStatusLabel[update.updateStatus] || update.updateStatus}
          </Badge>
          <Badge tone={securityStatusTone[update.securityStatus] || 'neutral'} dot>
            {securityStatusLabel[update.securityStatus] || update.securityStatus}
          </Badge>
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-line bg-card/60 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <LuPackage className="h-4 w-4 text-brandlight" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ink">Version intelligence</h2>
          </div>
          <dl className="mt-4">
            <DetailRow label="Repository">
              {data.repository?.htmlUrl ? (
                <a href={data.repository.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brandlight hover:underline">
                  {data.repository.fullName || data.repository.name}
                  <LuExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                data.repository?.fullName || '—'
              )}
            </DetailRow>
            <DetailRow label="Declared requirement" mono>{formatVersion(update.declaredVersion)}</DetailRow>
            <DetailRow label="Installed / resolved" mono>{formatVersion(update.installedVersion || update.resolvedVersion)}</DetailRow>
            <DetailRow label="Latest stable version" mono>{formatVersion(update.latestStableVersion || update.latestVersion)}</DetailRow>
            <DetailRow label="Latest release date" icon={LuCalendarDays}>
              <span className="inline-flex items-center gap-2">
                <LuCalendarDays className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                {formatDate(update.latestReleaseDate)}
              </span>
            </DetailRow>
            <DetailRow label="Update type">
              <Badge tone={updateTypeTone[update.updateType] || 'neutral'}>{update.updateType}</Badge>
            </DetailRow>
            <DetailRow label="Range status">{rangeStatusLabel[update.rangeStatus] || update.rangeStatus}</DetailRow>
            <DetailRow label="Deprecation">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={update.deprecated ? 'warning' : 'success'} dot>
                  {update.deprecated ? 'Deprecated' : 'Not deprecated'}
                </Badge>
                {update.abandoned ? <Badge tone="warning">Abandoned</Badge> : null}
                {update.yanked ? <Badge tone="danger">Yanked</Badge> : null}
              </div>
            </DetailRow>
            <DetailRow label="Last checked">{formatDate(update.lastCheckedAt, true)}</DetailRow>
            <DetailRow label="Next scheduled check">{formatDate(update.nextCheckAt, true)}</DetailRow>
            {update.registryUrl ? (
              <DetailRow label="Registry">
                <a href={update.registryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brandlight hover:underline">
                  Open package registry <LuExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </DetailRow>
            ) : null}
            {update.registryError ? (
              <DetailRow label="Registry error"><span className="text-danger">{update.registryError}</span></DetailRow>
            ) : null}
            {update.securityError ? (
              <DetailRow label="Advisory error"><span className="text-warning">{update.securityError}</span></DetailRow>
            ) : null}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-card/60 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <LuShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-ink">Security advisories</h2>
            </div>
            <div className="mt-4 space-y-3">
              {update.vulnerabilities?.length ? (
                update.vulnerabilities.map((advisory) => (
                  <AdvisoryCard key={advisory.id} advisory={advisory} />
                ))
              ) : update.securityStatus === 'SECURITY_DATA_UNAVAILABLE' ? (
                <div className="flex gap-3 rounded-xl border border-warning/20 bg-warning/[0.05] p-4 text-xs leading-relaxed text-warning">
                  <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Advisory data could not be retrieved. This is not proof that the package is safe.</span>
                </div>
              ) : (
                <div className="flex gap-3 rounded-xl border border-success/20 bg-success/[0.05] p-4 text-xs leading-relaxed text-success">
                  <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>OSV returned no advisories affecting the installed version.</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-card/60 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <LuGitBranch className="h-4 w-4 text-accent" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-ink">Version history</h2>
            </div>
            {versionHistory.length ? (
              <div className="scrollbar-slim mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {versionHistory.map((item) => (
                  <div
                    key={item.version}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-canvas/40 px-3 py-2"
                  >
                    <span className="font-mono text-[12px] text-ink">{item.version}</span>
                    <span className="text-[11px] text-muted">{formatDate(item.publishedAt)}</span>
                    {item.yanked ? <Badge tone="danger">Yanked</Badge> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-line py-8 text-center text-xs text-muted">
                The registry did not publish version dates for this package.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card/60 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-caps">History</p>
            <h2 className="mt-1.5 text-base font-semibold text-ink">Detected changes over time</h2>
          </div>
          <span className="text-xs text-muted">{history.length} snapshots</span>
        </div>
        {history.length ? (
          <div className="mt-5 space-y-3">
            {history.map((snapshot) => (
              <div key={String(snapshot._id)} className="rounded-xl border border-line/60 bg-canvas/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{formatDate(snapshot.checkedAt, true)}</span>
                  <Badge tone="violet">{snapshot.current?.updateStatus || 'UNKNOWN'}</Badge>
                </div>
                {snapshot.changes?.length ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-subtle">
                    Changed: {snapshot.changes.join(', ')}
                  </p>
                ) : (
                  <p className="mt-2 text-[12px] text-muted">Checked with no status changes.</p>
                )}
                {snapshot.current?.latestStableVersion ? (
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    latest stable → {snapshot.current.latestStableVersion}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-line py-8 text-center text-xs text-muted">
            History appears after a subsequent check detects a change.
          </p>
        )}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
