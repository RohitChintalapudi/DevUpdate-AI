import { useCallback, useEffect, useState } from 'react'
import { LuActivity, LuCircleAlert, LuClock3, LuGitBranch, LuRefreshCw, LuShieldAlert, LuSparkles } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import { formatDate } from '../../utils/updateHelpers'
import { getErrorMessage, historyApi, repositoriesApi } from '../../services/api'

const toneForStatus = (status) => {
  const value = String(status || '').toUpperCase()
  if (['FIXED', 'RESOLVED', 'VERIFIED', 'LOW'].includes(value)) return 'success'
  if (['VULNERABLE', 'CRITICAL', 'HIGH'].includes(value)) return 'danger'
  if (['SECURITY_DATA_UNAVAILABLE', 'UNKNOWN', 'MEDIUM'].includes(value)) return 'warning'
  return 'neutral'
}

const toneForRecommendation = (value) => {
  const text = String(value || '')
  if (text.includes('UPDATE') || text.includes('MIGRATE')) return 'success'
  if (text.includes('INSUFFICIENT') || text.includes('REVIEW')) return 'warning'
  if (text.includes('AVOID') || text.includes('REJECT')) return 'danger'
  return 'neutral'
}

const findingDotTone = {
  danger: 'bg-danger',
  success: 'bg-success',
  warning: 'bg-warning',
}

function FindingList({ title, items, tone }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="label-caps mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((finding, index) => (
          <li
            key={`${finding.id || 'finding'}-${index}`}
            className="flex gap-2 rounded-lg border border-line bg-canvas/40 px-3 py-2 text-xs leading-relaxed text-subtle"
          >
            <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${findingDotTone[tone] || 'bg-brandlight'}`} />
            <span>
              <span className="font-medium text-ink">{finding.title || finding.id || 'Finding'}</span>
              {finding.description ? <span className="mt-0.5 block">{finding.description}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChangeRow({ label, previous, current, changed }) {
  return (
    <div className="grid gap-2 border-b border-line/60 py-2.5 last:border-0 sm:grid-cols-[150px_minmax(0,1fr)_24px_minmax(0,1fr)] sm:items-center">
      <span className="label-caps">{label}</span>
      <span className="truncate text-xs text-subtle">{previous || '—'}</span>
      <span className={`text-center text-xs ${changed ? 'text-brandlight' : 'text-muted'}`}>
        {changed ? '→' : '·'}
      </span>
      <span className="truncate text-xs font-medium text-ink">{current || '—'}</span>
    </div>
  )
}

export default function History() {
  const [repositories, setRepositories] = useState([])
  const [repositoryId, setRepositoryId] = useState('')
  const [comparisons, setComparisons] = useState([])
  const [selected, setSelected] = useState(null)
  const [analysisId, setAnalysisId] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let active = true
    repositoriesApi.list({ limit: 50 }).then((result) => {
      if (!active) return
      const rows = result.repositories || []
      setRepositories(rows)
      setRepositoryId((current) => (
        current && rows.some((row) => String(row._id) === current)
          ? current
          : (rows[0]?._id || '')
      ))
    }).catch((error) => {
      if (active) setToast({ type: 'error', title: 'Could not load repositories', message: getErrorMessage(error) })
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const loadComparisons = useCallback(async () => {
    if (!repositoryId) {
      setComparisons([])
      return
    }
    try {
      const result = await historyApi.comparisons(repositoryId, { limit: 100 })
      setComparisons(result.items || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load comparison history', message: getErrorMessage(error) })
    }
  }, [repositoryId])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await loadComparisons()
    }
    run()
    return () => { active = false }
  }, [loadComparisons])

  const openDetail = async (item) => {
    setSelected(item)
    setDetailLoading(true)
    try {
      const result = await historyApi.comparison(String(item.dependencyId), {
        analysisId: item.currentAnalysisId,
      })
      setSelected(result.comparison || item)
    } catch (error) {
      setToast({
        type: error?.response?.status === 404 ? 'info' : 'error',
        title: error?.response?.status === 404 ? 'Stored summary only' : 'Could not load comparison detail',
        message: error?.response?.status === 404
          ? 'The stored comparison summary is shown below.'
          : getErrorMessage(error),
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const compareAnalysis = async (event) => {
    event.preventDefault()
    if (!analysisId.trim()) return
    setBusy(true)
    try {
      const result = await historyApi.compare(analysisId.trim())
      setAnalysisId('')
      setToast({
        type: 'success',
        title: 'Comparison created',
        message: result.previousAnalysisId
          ? 'Compared against the previous completed analysis for this dependency.'
          : 'No earlier analysis existed; this is recorded as a baseline, not a trend.',
      })
      await loadComparisons()
      if (result.comparison) await openDetail(result.comparison)
    } catch (error) {
      setToast({ type: 'error', title: 'Could not create comparison', message: getErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const changes = selected?.changes || {}

  return (
    <div>
      <PageHeader
        eyebrow="Historical intelligence"
        title="Change History"
        description="Compare current AI findings with earlier analyses. Previous memory never overrides current registry, OSV or evidence; comparisons are explicit snapshots."
        actions={
          <Badge tone="violet" icon={LuClock3}>
            {comparisons.length} stored comparison{comparisons.length === 1 ? '' : 's'}
          </Badge>
        }
      />

      <SectionTabs section="memento" />

      {loading ? (
        <div className="space-y-5"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>
      ) : !repositories.length ? (
        <EmptyState
          icon={LuClock3}
          title="No connected repositories"
          description="Connect GitHub, run a scan and complete an AI analysis before comparing history."
        />
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="label-caps mb-1">Repository scope</p>
              <p className="text-xs leading-relaxed text-subtle">
                Comparisons are derived from completed analyses and developer decisions for the selected repository.
              </p>
            </div>
            <div className="w-full lg:w-80">
              <label htmlFor="history-repository" className="label-caps mb-2 block">Repository</label>
              <select
                id="history-repository"
                className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none focus:border-brandlight/60"
                value={repositoryId}
                onChange={(event) => {
                  setRepositoryId(event.target.value)
                  setSelected(null)
                }}
              >
                {repositories.map((repo) => (
                  <option key={String(repo._id)} value={repo._id}>{repo.fullName || repo.name}</option>
                ))}
              </select>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <LuRefreshCw className="h-4 w-4 text-brandlight" />
              <h2 className="text-sm font-semibold text-ink">Create a comparison</h2>
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={compareAnalysis}>
              <input
                aria-label="Analysis ID"
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                value={analysisId}
                onChange={(event) => setAnalysisId(event.target.value)}
                placeholder="Paste a completed analysis ID"
              />
              <Button type="submit" leftIcon={LuActivity} loading={busy} disabled={!analysisId.trim()}>
                Compare
              </Button>
            </form>
            <p className="mt-2 text-[11px] text-muted">
              analysisId is available on each AI recommendation. The server finds the previous completed analysis automatically.
            </p>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-ink">Stored comparisons</h2>
              {comparisons.length ? (
                <div className="space-y-2">
                  {comparisons.map((item) => {
                    const c = item.changes || {}
                    const active = String(selected?._id || '') === String(item._id)
                    return (
                      <button
                        key={String(item._id)}
                        type="button"
                        onClick={() => openDetail(item)}
                        className={`w-full rounded-xl border p-3.5 text-left transition ${
                          active
                            ? 'border-brandlight/40 bg-brand/10'
                            : 'border-line bg-canvas/40 hover:border-brandlight/25 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{item.packageName || 'Dependency'}</span>
                          {c.risk?.changed ? <Badge tone="warning">Risk changed</Badge> : null}
                          {c.recommendation?.changed ? <Badge tone={toneForRecommendation(c.recommendation.current)}>Recommendation changed</Badge> : null}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-subtle">
                          {item.summary || 'Stored historical snapshot.'}
                        </p>
                        <p className="mt-2 text-[11px] text-muted">
                          {formatDate(item.currentAnalysisDate || item.createdAt, true)}
                          {c.version?.installedVersionChanged
                            ? ` · ${c.version.previousInstalledVersion || '—'} → ${c.version.currentInstalledVersion || '—'}`
                            : ''}
                        </p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={LuClock3}
                  title="No comparisons yet"
                  description="Create a comparison from a completed analysis ID above, or run repeated AI analyses on the same dependency."
                />
              )}
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selected ? <LuSparkles className="h-4 w-4 text-brandlight" /> : <LuGitBranch className="h-4 w-4 text-brandlight" />}
                  <h2 className="text-sm font-semibold text-ink">
                    {selected ? (selected.packageName || 'Comparison detail') : 'Comparison detail'}
                  </h2>
                </div>
                {selected ? <Badge tone="neutral">{formatDate(selected.createdAt, true)}</Badge> : null}
              </div>

              {!selected ? (
                <EmptyState
                  icon={LuActivity}
                  title="Select a comparison"
                  description="Choose a stored comparison to see version, risk, security and recommendation changes."
                />
              ) : detailLoading ? (
                <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-40" /></div>
              ) : (
                <div className="space-y-5">
                  <p className="text-xs leading-relaxed text-subtle">{changes.summary || selected.summary}</p>

                  {!changes.previousAnalysisAvailable ? (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs leading-relaxed text-warning">
                      <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>No earlier completed analysis was available. These findings are a baseline, not a historical trend.</span>
                    </div>
                  ) : null}

                  {changes.repositoryChangedSincePreviousAnalysis ? (
                    <div className="flex items-start gap-2 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs leading-relaxed text-brandlight">
                      <LuGitBranch className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>The repository changed since the previous analysis; repository evidence may differ.</span>
                    </div>
                  ) : null}

                  <div>
                    <p className="label-caps mb-1">What changed</p>
                    <ChangeRow
                      label="Installed version"
                      previous={changes.version?.previousInstalledVersion}
                      current={changes.version?.currentInstalledVersion}
                      changed={changes.version?.installedVersionChanged}
                    />
                    <ChangeRow
                      label="Target version"
                      previous={changes.version?.previousTargetVersion}
                      current={changes.version?.currentTargetVersion}
                      changed={changes.version?.targetVersionChanged}
                    />
                    <ChangeRow
                      label="Risk level"
                      previous={changes.risk?.previous}
                      current={changes.risk?.current}
                      changed={changes.risk?.changed}
                    />
                    <ChangeRow
                      label="Recommendation"
                      previous={changes.recommendation?.previous}
                      current={changes.recommendation?.current}
                      changed={changes.recommendation?.changed}
                    />
                  </div>

                  {changes.security ? (
                    <div>
                      <p className="label-caps mb-2">Security</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={toneForStatus(changes.security.previousStatus)}>
                          Before: {String(changes.security.previousStatus || 'UNKNOWN').replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted">→</span>
                        <Badge tone={toneForStatus(changes.security.currentStatus)}>
                          Now: {String(changes.security.currentStatus || 'UNKNOWN').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {changes.security.evidenceLimited ? (
                        <p className="mt-2 text-[11px] text-warning">
                          No advisories were retrieved in either snapshot. Security data is unavailable, not proven safe.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <FindingList title="New advisories" items={changes.security.newSecurityFindings} tone="danger" />
                          <FindingList title="Resolved advisories" items={changes.security.resolvedSecurityFindings} tone="success" />
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <FindingList title="New breaking changes" items={changes.breakingChanges?.newFindings} tone="danger" />
                    <FindingList title="Resolved breaking changes" items={changes.breakingChanges?.resolvedFindings} tone="success" />
                    <FindingList title="New compatibility findings" items={changes.compatibilityFindings?.newFindings} tone="danger" />
                    <FindingList title="New project impact" items={changes.projectImpact?.newFindings} tone="warning" />
                  </div>

                  {changes.developerDecisions?.length ? (
                    <div>
                      <p className="label-caps mb-2">Developer decisions</p>
                      <div className="space-y-2">
                        {changes.developerDecisions.map((decision) => (
                          <div key={String(decision.id)} className="rounded-lg border border-line bg-canvas/40 p-3">
                            <div className="flex items-center gap-2">
                              <Badge tone="violet">{decision.decision}</Badge>
                              <span className="text-[11px] text-muted">{formatDate(decision.createdAt, true)}</span>
                            </div>
                            {decision.explanation ? <p className="mt-2 text-xs text-subtle">{decision.explanation}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {changes.recommendation?.currentReason ? (
                    <div>
                      <p className="label-caps mb-1">Current recommendation reason</p>
                      <p className="text-xs leading-relaxed text-subtle">{changes.recommendation.currentReason}</p>
                    </div>
                  ) : null}

                  {changes.security?.newSecurityFindings?.length ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-danger">
                      <LuShieldAlert className="h-3.5 w-3.5" /> Compare advisories against current OSV data before acting.
                    </p>
                  ) : null}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
