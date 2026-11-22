import { useCallback, useEffect, useState } from 'react'
import { LuChartNoAxesCombined,LuDownload, LuFileJson, LuRefreshCw, LuShieldCheck, LuTrash2 } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import { formatDate } from '../../utils/updateHelpers'
import { getErrorMessage, reportsApi, repositoriesApi } from '../../services/api'

const typeLabels = {
  HEALTH: 'Repository health',
  DEPENDENCY_UPDATE: 'Dependency updates',
  SECURITY: 'Security advisories',
  AI_RECOMMENDATION: 'AI recommendations',
  HISTORICAL_COMPARISON: 'Historical comparison',
}

const typeTone = {
  HEALTH: 'cyan',
  DEPENDENCY_UPDATE: 'violet',
  SECURITY: 'danger',
  AI_RECOMMENDATION: 'warning',
  HISTORICAL_COMPARISON: 'success',
}

export default function Reports() {
  const [options, setOptions] = useState({ types: [], formats: [] })
  const [repositories, setRepositories] = useState([])
  const [reports, setReports] = useState([])
  const [repositoryId, setRepositoryId] = useState('')
  const [reportType, setReportType] = useState('HEALTH')
  const [title, setTitle] = useState('')
  const [filterRepository, setFilterRepository] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let active = true
    Promise.all([reportsApi.options(), repositoriesApi.list({ limit: 50 })])
      .then(([optionResult, repoResult]) => {
        if (!active) return
        setOptions(optionResult)
        setReportType(optionResult.types?.[0] || 'HEALTH')
        setRepositories(repoResult.repositories || [])
      })
      .catch((error) => {
        if (active) setToast({ type: 'error', title: 'Could not load report options', message: getErrorMessage(error) })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const loadReports = useCallback(async () => {
    try {
      const result = await reportsApi.list({
        limit: 50,
        ...(filterRepository ? { repositoryId: filterRepository } : {}),
      })
      setReports(result.items || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load reports', message: getErrorMessage(error) })
    }
  }, [filterRepository])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await loadReports()
    }
    run()
    return () => { active = false }
  }, [loadReports])

  const generate = async (event) => {
    event.preventDefault()
    setBusy('generate')
    try {
      const result = await reportsApi.generate({
        reportType,
        ...(repositoryId ? { repositoryId } : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
      })
      setTitle('')
      setToast({
        type: 'success',
        title: 'Report generated',
        message: `${result.report?.data?.meta?.includedRows || 0} rows from current MongoDB data.`,
      })
      await loadReports()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not generate report', message: getErrorMessage(error) })
    } finally {
      setBusy('')
    }
  }

  const download = async (report, format) => {
    setBusy(`${report._id}-${format}`)
    try {
      const { blob, filename } = await reportsApi.download(report._id, format)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setToast({ type: 'error', title: 'Could not export report', message: getErrorMessage(error) })
    } finally {
      setBusy('')
    }
  }

  const remove = async (reportId) => {
    try {
      await reportsApi.delete(reportId)
      setToast({ type: 'success', title: 'Report deleted' })
      await loadReports()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not delete report', message: getErrorMessage(error) })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title="Reports"
        description="Generate real, scoped reports from dependency, security, AI and history records. CSV includes every capped row; PDF is limited and labeled."
        actions={<Badge tone="violet" icon={LuShieldCheck}>MongoDB source</Badge>}
      />

      <SectionTabs section="updates" />

      {loading ? (
        <div className="space-y-5"><Skeleton className="h-40" /><Skeleton className="h-72" /></div>
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <LuChartNoAxesCombined className="h-4 w-4 text-brandlight" />
              <h2 className="text-sm font-semibold text-ink">Generate a report</h2>
            </div>
            <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-end" onSubmit={generate}>
              <div>
                <label htmlFor="report-type" className="label-caps mb-1.5 block">Type</label>
                <select
                  id="report-type"
                  className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value)}
                >
                  {(options.types || []).map((value) => (
                    <option key={value} value={value}>{typeLabels[value] || value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="report-repository" className="label-caps mb-1.5 block">Repository</label>
                <select
                  id="report-repository"
                  className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                  value={repositoryId}
                  onChange={(event) => setRepositoryId(event.target.value)}
                >
                  <option value="">All repositories</option>
                  {repositories.map((repo) => (
                    <option key={String(repo._id)} value={repo._id}>{repo.fullName || repo.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="report-title" className="label-caps mb-1.5 block">Title (optional)</label>
                <input
                  id="report-title"
                  className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="November dependency health"
                  maxLength={240}
                />
              </div>
              <Button type="submit" leftIcon={LuRefreshCw} loading={busy === 'generate'}>Generate</Button>
            </form>
            <p className="mt-3 text-[11px] text-muted">
              Maximum {options.maxRows || 5000} rows. PDF shows the first 500 rows and 10 columns; CSV and JSON retain all capped rows.
            </p>
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Generated reports</h2>
                <p className="mt-1 text-xs text-subtle">Each record is a snapshot of real data at generation time.</p>
              </div>
              <select
                aria-label="Filter reports by repository"
                className="h-9 rounded-lg border border-line bg-canvas/60 px-2.5 text-xs text-ink outline-none focus:border-brandlight/60"
                value={filterRepository}
                onChange={(event) => setFilterRepository(event.target.value)}
              >
                <option value="">All repositories</option>
                {repositories.map((repo) => (
                  <option key={String(repo._id)} value={repo._id}>{repo.fullName || repo.name}</option>
                ))}
              </select>
            </div>

            {reports.length ? (
              <div className="space-y-3">
                {reports.map((report) => {
                  const meta = report.data?.meta || {}
                  return (
                    <div key={String(report._id)} className="rounded-xl border border-line bg-canvas/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{report.title}</span>
                            <Badge tone={typeTone[report.reportType] || 'neutral'}>
                              {typeLabels[report.reportType] || report.reportType}
                            </Badge>
                            {meta.truncated ? <Badge tone="warning">Truncated</Badge> : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                            <span>{formatDate(report.generatedAt, true)}</span>
                            <span>{meta.includedRows || 0} rows included</span>
                            <span>{meta.repositoryName || 'All repositories'}</span>
                            <span>{meta.source || 'MongoDB'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(report._id)}
                          aria-label={`Delete ${report.title}`}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {report.data?.summary ? (
                        <pre className="mt-3 max-h-24 overflow-auto rounded-lg bg-elevated/60 p-3 text-[11px] leading-relaxed text-subtle">
                          {JSON.stringify(report.data.summary, null, 2)}
                        </pre>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(options.formats || ['JSON', 'CSV', 'PDF']).map((format) => (
                          <Button
                            key={format}
                            size="sm"
                            variant="secondary"
                            leftIcon={format === 'JSON' ? LuFileJson : LuDownload}
                            loading={busy === `${report._id}-${format}`}
                            onClick={() => download(report, format)}
                          >
                            {format}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={LuChartNoAxesCombined}
                title="No reports yet"
                description="Generate a report above to capture the current state of this workspace."
              />
            )}
          </Card>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
