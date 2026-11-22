import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuActivity, LuArrowRight, LuBrainCircuit, LuDatabaseZap, LuLayers3, LuShieldCheck } from 'react-icons/lu'
import AiActionsPanel from '../../components/ai/AiActionsPanel'
import AiStatusBadge from '../../components/ai/AiStatusBadge'
import JobProgress from '../../components/ai/JobProgress'
import StatCard from '../../components/common/StatCard'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import useAiJobPolling from '../../hooks/useAiJobPolling'
import { formatDate } from '../../utils/updateHelpers'
import { aiApi, getErrorMessage, repositoriesApi } from '../../services/api'

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-xs text-subtle">{label}</span>
      <span className={`text-[11px] font-semibold ${ok ? 'text-success' : 'text-warning'}`}>
        {value}
      </span>
    </div>
  )
}

export default function AiOverview() {
  const [overview, setOverview] = useState({
    totalAnalyses: 0,
    latestAnalyses: [],
    recommendations: {},
    risks: {},
    statuses: {},
    tokensUsed: 0,
    activeJobs: [],
  })
  const [status, setStatus] = useState(null)
  const [repositories, setRepositories] = useState([])
  const [selectedRepository, setSelectedRepository] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewData, statusData, repositoryData] = await Promise.all([
        aiApi.overview(),
        aiApi.status(),
        repositoriesApi.list({ limit: 50 }),
      ])
      setOverview(overviewData)
      setStatus(statusData)
      const rows = repositoryData.repositories || []
      setRepositories(rows)
      setSelectedRepository((current) => (current && rows.some((row) => String(row._id) === current) ? current : (rows[0]?._id || '')))
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load AI overview', message: getErrorMessage(error) })
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

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const activeJobId = overview.activeJobs?.[0]?._id || null
  const onJobTerminal = useCallback(
    (job) => {
      load()
      setToast({
        type: ['FAILED', 'CANCELLED'].includes(job.status) ? 'error' : 'success',
        title: 'AI job finished',
        message: `${String(job.type || 'Analysis').replace(/_/g, ' ')} is now ${String(job.status).toLowerCase()}.`,
      })
    },
    [load],
  )
  const { job, error: jobError } = useAiJobPolling({ jobId: activeJobId, onTerminal: onJobTerminal })

  const evidenceCount = useMemo(
    () => (overview.latestAnalyses || []).reduce((total, item) => total + (item.evidence?.length || 0), 0),
    [overview.latestAnalyses],
  )

  const handleJobStarted = (result, kind) => {
    setToast({
      type: 'success',
      title: kind === 'repository' ? 'Repository analysis queued' : 'AI job queued',
      message: 'The job runs in the background. Progress appears here automatically.',
    })
    load()
    if (result?.jobId) {
      // The overview endpoint supplies active jobs on the next refresh; poll this
      // job directly as well so fast jobs are not missed.
      setOverview((current) => ({
        ...current,
        activeJobs: [
          { _id: result.jobId, type: kind === 'repository' ? 'REPOSITORY_ANALYSIS' : 'DEPENDENCY_ANALYSIS' },
          ...(current.activeJobs || []),
        ],
      }))
    }
  }

  const cancelJob = async (jobId) => {
    try {
      const result = await aiApi.cancelJob(jobId)
      setToast({ type: 'info', title: 'Cancellation requested', message: `Job is ${String(result.status).toLowerCase()}.` })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not cancel job', message: getErrorMessage(error) })
    }
  }

  if (loading && !status) {
    return (
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-9 w-80" />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="mt-6 h-72 rounded-2xl" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Phase 4 intelligence"
        title="AI Overview"
        description="Evidence-backed dependency analysis using your real repository context, Phase 3 registry data, official documentation and vector retrieval."
        actions={
          <Link to="/dashboard/recommendations">
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-elevated px-3.5 text-[13px] font-semibold text-ink transition hover:border-brandlight/40">
              All recommendations <LuArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        }
      />

      <SectionTabs section="ai" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Analyses" value={overview.totalAnalyses} description="Completed, queued and evidence-limited runs" icon={LuBrainCircuit} tone="violet" index={0} />
        <StatCard label="Active jobs" value={overview.activeJobs?.length || 0} description="Background analyses in progress" icon={LuActivity} tone="cyan" index={1} />
        <StatCard label="Evidence items" value={evidenceCount} description="Sources attached to recent analyses" icon={LuShieldCheck} tone="success" index={2} />
        <StatCard label="Tokens used" value={Number(overview.tokensUsed || 0).toLocaleString()} description="Groq prompt and completion tokens" icon={LuDatabaseZap} tone="warning" index={3} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <AiActionsPanel
          repositories={repositories}
          selectedRepository={selectedRepository}
          onRepositoryChange={setSelectedRepository}
          onJobStarted={handleJobStarted}
        />

        <div className="space-y-5">
          {job || jobError ? (
            <JobProgress job={job} onCancel={cancelJob} />
          ) : null}
          {jobError ? <p className="text-xs text-danger">{jobError}</p> : null}

          <div className="rounded-2xl border border-line bg-card/70 p-5">
            <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Service status</p>
            <div className="mt-3">
              <StatusRow label="LLM provider" value={status?.groq?.model || 'Unknown'} ok={Boolean(status?.groq?.configured)} />
              <StatusRow label="Research" value={status?.firecrawl?.configured ? 'Firecrawl ready' : 'Not configured'} ok={Boolean(status?.firecrawl?.configured)} />
              <StatusRow label="Vector store" value={status?.pinecone?.index || 'Not configured'} ok={Boolean(status?.pinecone?.configured && !status?.pinecone?.error)} />
              <StatusRow label="Embeddings" value={status?.pinecone?.embeddingModel || 'Unknown'} ok={Boolean(status?.pinecone?.embeddingModel)} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Recent analyses</p>
            <h2 className="mt-1 text-base font-semibold text-ink">Latest evidence-backed results</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(overview.recommendations || {}).UPGRADE_RECOMMENDED ? (
              <AiStatusBadge value="UPGRADE_RECOMMENDED" label={`${overview.recommendations.UPGRADE_RECOMMENDED} recommended`} />
            ) : null}
            {(overview.recommendations || {}).INSUFFICIENT_EVIDENCE ? (
              <AiStatusBadge value="INSUFFICIENT_EVIDENCE" label={`${overview.recommendations.INSUFFICIENT_EVIDENCE} insufficient`} />
            ) : null}
          </div>
        </div>

        {overview.latestAnalyses?.length ? (
          <div className="scrollbar-slim mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
            {overview.latestAnalyses.map((analysis) => (
              <Link
                key={String(analysis._id)}
                to={`/dashboard/ai/analysis/${analysis._id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-3 transition hover:border-brandlight/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {analysis.packageName}{' '}
                    <span className="font-mono text-[11px] font-normal text-muted">
                      {analysis.installedVersion || '?'} → {analysis.targetVersion || '?'}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {analysis.repositoryFullName || 'Repository'} · {formatDate(analysis.createdAt, true)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AiStatusBadge value={analysis.riskLevel || 'UNKNOWN'} />
                  <AiStatusBadge value={analysis.recommendation} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={LuLayers3}
              title="No AI analyses yet"
              description="Select a repository above and start an analysis. Results are generated from real retrieved evidence only."
            />
          </div>
        )}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
