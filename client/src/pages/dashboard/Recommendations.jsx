import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuBookOpenText, LuRefreshCw, LuSparkles } from 'react-icons/lu'
import AiActionsPanel from '../../components/ai/AiActionsPanel'
import JobProgress from '../../components/ai/JobProgress'
import Pagination from '../../components/common/Pagination'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import RecommendationCard from '../../components/ai/RecommendationCard'
import useAiJobPolling from '../../hooks/useAiJobPolling'
import { aiApi, getErrorMessage, repositoriesApi } from '../../services/api'

const selectClass =
  'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'

const RECOMMENDATIONS = [
  ['UPGRADE_RECOMMENDED', 'Upgrade recommended'],
  ['UPGRADE_WITH_CAUTION', 'Upgrade with caution'],
  ['REVIEW_BEFORE_UPGRADE', 'Review before upgrade'],
  ['DEFER_UPGRADE', 'Defer upgrade'],
  ['INSUFFICIENT_EVIDENCE', 'Insufficient evidence'],
]

const STATUSES = [
  ['COMPLETED', 'Completed'],
  ['INSUFFICIENT_EVIDENCE', 'Insufficient evidence'],
  ['RUNNING', 'Running'],
  ['QUEUED', 'Queued'],
  ['FAILED', 'Failed'],
]

export default function Recommendations() {
  const [repositories, setRepositories] = useState([])
  const [selectedRepository, setSelectedRepository] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 })
  const [activeJobId, setActiveJobId] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 12 }
      if (selectedRepository) params.repositoryId = selectedRepository
      if (recommendation) params.recommendation = recommendation
      if (status) params.status = status
      const [result, overview] = await Promise.all([
        aiApi.recommendations(params),
        aiApi.overview(),
      ])
      setData(result)
      setActiveJobId(overview.activeJobs?.[0]?._id || '')
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load AI recommendations', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [page, recommendation, selectedRepository, status])

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
    let active = true
    repositoriesApi.list({ limit: 50 }).then((result) => {
      if (!active) return
      setRepositories(result.repositories || [])
    }).catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const onJobTerminal = useCallback(() => {
    load()
  }, [load])
  const { job, error: jobError } = useAiJobPolling({ jobId: activeJobId || null, onTerminal: onJobTerminal })

  const handleJobStarted = (result, kind) => {
    setToast({
      type: 'success',
      title: kind === 'repository' ? 'Repository analysis queued' : 'AI job queued',
      message: 'The workflow continues in the background. Progress is shown above.',
    })
    if (result?.jobId) setActiveJobId(String(result.jobId))
    load()
  }

  const cancelJob = async (jobId) => {
    try {
      await aiApi.cancelJob(jobId)
      load()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not cancel job', message: getErrorMessage(error) })
    }
  }

  const resetFilters = () => {
    setSelectedRepository('')
    setRecommendation('')
    setStatus('')
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Phase 4 intelligence"
        title="AI Recommendations"
        description="Upgrade guidance generated from registry data, OSV advisories, repository usage, official documentation and validated evidence IDs."
        actions={
          <Link
            to="/dashboard/ai/research"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-elevated px-3.5 text-[13px] font-semibold text-ink transition hover:border-brandlight/40"
          >
            <LuBookOpenText className="h-3.5 w-3.5" /> Research library
          </Link>
        }
      />

      <SectionTabs section="ai" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <AiActionsPanel
          repositories={repositories}
          selectedRepository={selectedRepository}
          onRepositoryChange={(value) => {
            setSelectedRepository(value)
            setPage(1)
          }}
          onJobStarted={handleJobStarted}
        />
        <div className="space-y-4">
          {job || jobError ? <JobProgress job={job} onCancel={cancelJob} /> : null}
          {jobError ? <p className="text-xs text-danger">{jobError}</p> : null}
          <div className="rounded-2xl border border-line bg-card/60 p-5">
            <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Review rules</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-subtle">
              <li>• Every claim must cite a retrieved evidence ID.</li>
              <li>• Unsupported claims downgrade the result to insufficient evidence.</li>
              <li>• OSV lookup failures remain security data unavailable, never safe.</li>
              <li>• Recommendations are review-only; nothing is installed or committed.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card/60 p-4">
        <select
          aria-label="Filter by repository"
          className={selectClass}
          value={selectedRepository}
          onChange={(event) => {
            setSelectedRepository(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All repositories</option>
          {repositories.map((repository) => (
            <option key={String(repository._id)} value={repository._id}>
              {repository.fullName || repository.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by recommendation"
          className={selectClass}
          value={recommendation}
          onChange={(event) => {
            setRecommendation(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All recommendations</option>
          {RECOMMENDATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select
          aria-label="Filter by analysis status"
          className={selectClass}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-subtle transition hover:bg-white/[0.05] hover:text-ink"
        >
          <LuRefreshCw className="h-3.5 w-3.5" /> Reset
        </button>
        <span className="ml-auto text-xs text-muted">
          {data.total} analysis{data.total === 1 ? '' : 'es'}
        </span>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-56 rounded-2xl" />)}
          </div>
        ) : data.items?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.items.map((analysis) => <RecommendationCard key={String(analysis._id)} analysis={analysis} />)}
          </div>
        ) : (
          <EmptyState
            icon={LuSparkles}
            title="No AI recommendations match these filters"
            description="Start a repository analysis above, or clear the filters to view existing evidence-backed results."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-line bg-elevated px-4 py-2 text-xs font-semibold text-ink transition hover:border-brandlight/40"
              >
                Clear filters
              </button>
            }
          />
        )}
      </div>

      <Pagination
        pagination={data}
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
