import { useCallback, useEffect, useState } from 'react'
import { LuCircleCheck, LuHistory, LuMessageSquare, LuSend, LuSparkles, LuThumbsUp } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import { formatDate } from '../../utils/updateHelpers'
import { aiApi, feedbackApi, getErrorMessage, repositoriesApi } from '../../services/api'

const decisionLabels = {
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  POSTPONED: 'Postponed',
  COMPLETED: 'Completed',
  INCORRECT: 'Incorrect',
}

const decisionTone = {
  ACCEPTED: 'success',
  REJECTED: 'danger',
  POSTPONED: 'warning',
  COMPLETED: 'violet',
  INCORRECT: 'danger',
}

const emptyForm = { analysisId: '', decision: 'ACCEPTED', explanation: '', notes: '' }

export default function Feedback() {
  const [repositories, setRepositories] = useState([])
  const [repositoryId, setRepositoryId] = useState('')
  const [analyses, setAnalyses] = useState([])
  const [decisions, setDecisions] = useState([])
  const [options, setOptions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let active = true
    Promise.all([repositoriesApi.list({ limit: 50 }), feedbackApi.options()])
      .then(([repoResult, optionResult]) => {
        if (!active) return
        const rows = repoResult.repositories || []
        setRepositories(rows)
        setRepositoryId((current) => (
          current && rows.some((row) => String(row._id) === current)
            ? current
            : (rows[0]?._id || '')
        ))
        const values = Array.isArray(optionResult) ? optionResult : (optionResult.decisions || [])
        setOptions(values)
        if (values.length) setForm((current) => ({ ...current, decision: values[0] }))
      })
      .catch((error) => {
        if (active) setToast({ type: 'error', title: 'Could not load feedback options', message: getErrorMessage(error) })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const loadDecisions = useCallback(async () => {
    if (!repositoryId) {
      setDecisions([])
      return
    }
    try {
      const result = await feedbackApi.list(repositoryId, { limit: 100 })
      setDecisions(result.items || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load decisions', message: getErrorMessage(error) })
    }
  }, [repositoryId])

  const loadAnalyses = useCallback(async () => {
    if (!repositoryId) {
      setAnalyses([])
      return
    }
    try {
      const result = await aiApi.recommendations({ repositoryId, limit: 100 })
      setAnalyses(result.items || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load analyses', message: getErrorMessage(error) })
    }
  }, [repositoryId])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (!active) return
      await Promise.all([loadDecisions(), loadAnalyses()])
    }
    run()
    return () => { active = false }
  }, [loadDecisions, loadAnalyses])

  const record = async (event) => {
    event.preventDefault()
    if (!form.analysisId) return
    setSaving(true)
    try {
      const result = await feedbackApi.record(form.analysisId, {
        decision: form.decision,
        explanation: form.explanation,
        notes: form.notes,
      })
      setToast({
        type: 'success',
        title: 'Decision recorded',
        message: result.memoryId
          ? 'Your decision was saved and added to repository memory.'
          : 'Your decision was saved.',
      })
      setForm({ ...emptyForm, decision: form.decision })
      await Promise.all([loadDecisions(), loadAnalyses()])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not record decision', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const decidedAnalysisIds = new Set(decisions.map((item) => String(item.analysisId)))
  const availableAnalyses = analyses.filter((item) => !decidedAnalysisIds.has(String(item._id)))

  return (
    <div>
      <PageHeader
        eyebrow="Developer feedback"
        title="Decision Feedback"
        description="Record what you decided to do with an AI recommendation. Decisions are stored per user and repository and become bounded, non-authoritative memory context."
        actions={
          <Badge tone="violet" icon={LuMessageSquare}>
            {decisions.length} recorded decision{decisions.length === 1 ? '' : 's'}
          </Badge>
        }
      />

      <SectionTabs section="memento" />

      {loading ? (
        <div className="space-y-5"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>
      ) : !repositories.length ? (
        <EmptyState
          icon={LuThumbsUp}
          title="No connected repositories"
          description="Connect GitHub and complete an AI analysis before recording feedback."
        />
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="label-caps mb-1">Repository scope</p>
              <p className="text-xs leading-relaxed text-subtle">
                Feedback never changes a vulnerability status, evidence finding or recommendation. It records your decision only.
              </p>
            </div>
            <div className="w-full lg:w-80">
              <label htmlFor="feedback-repository" className="label-caps mb-2 block">Repository</label>
              <select
                id="feedback-repository"
                className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none focus:border-brandlight/60"
                value={repositoryId}
                onChange={(event) => setRepositoryId(event.target.value)}
              >
                {repositories.map((repo) => (
                  <option key={String(repo._id)} value={repo._id}>{repo.fullName || repo.name}</option>
                ))}
              </select>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <LuSend className="h-4 w-4 text-brandlight" />
                <h2 className="text-sm font-semibold text-ink">Record a decision</h2>
              </div>
              <form className="space-y-3" onSubmit={record}>
                <div>
                  <label htmlFor="feedback-analysis" className="label-caps mb-1.5 block">AI analysis</label>
                  <select
                    id="feedback-analysis"
                    className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                    value={form.analysisId}
                    onChange={(event) => setForm({ ...form, analysisId: event.target.value })}
                  >
                    <option value="">Select a completed analysis</option>
                    {availableAnalyses.map((analysis) => (
                      <option key={String(analysis._id)} value={analysis._id}>
                        {analysis.packageName || 'Package'}
                        {analysis.targetVersion ? ` → ${analysis.targetVersion}` : ''}
                        {analysis.recommendation ? ` · ${analysis.recommendation}` : ''}
                      </option>
                    ))}
                  </select>
                  {!availableAnalyses.length ? (
                    <p className="mt-1.5 text-[11px] text-muted">
                      No undecided analyses for this repository. Run an AI analysis first.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="feedback-decision" className="label-caps mb-1.5 block">Decision</label>
                  <select
                    id="feedback-decision"
                    className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                    value={form.decision}
                    onChange={(event) => setForm({ ...form, decision: event.target.value })}
                  >
                    {(options.length ? options : Object.keys(decisionLabels)).map((value) => (
                      <option key={value} value={value}>{decisionLabels[value] || value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="feedback-explanation" className="label-caps mb-1.5 block">Why?</label>
                  <textarea
                    id="feedback-explanation"
                    className="min-h-24 w-full rounded-xl border border-line bg-canvas/60 p-3 text-sm text-ink outline-none focus:border-brandlight/60"
                    value={form.explanation}
                    onChange={(event) => setForm({ ...form, explanation: event.target.value })}
                    placeholder="We are blocked by a legacy runtime until Q1."
                    maxLength={4000}
                  />
                </div>
                <div>
                  <label htmlFor="feedback-notes" className="label-caps mb-1.5 block">Notes (optional)</label>
                  <textarea
                    id="feedback-notes"
                    className="min-h-20 w-full rounded-xl border border-line bg-canvas/60 p-3 text-sm text-ink outline-none focus:border-brandlight/60"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    placeholder="Owner: platform team"
                    maxLength={4000}
                  />
                </div>
                <Button type="submit" fullWidth leftIcon={LuCircleCheck} loading={saving} disabled={!form.analysisId}>
                  Save decision
                </Button>
              </form>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                <LuSparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brandlight" />
                Decisions are used as prompt context only. They cannot create evidence or override current registry data.
              </p>
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2">
                <LuHistory className="h-4 w-4 text-brandlight" />
                <h2 className="text-sm font-semibold text-ink">Recorded decisions</h2>
              </div>
              {decisions.length ? (
                <div className="space-y-3">
                  {decisions.map((item) => (
                    <div key={String(item._id)} className="rounded-xl border border-line bg-canvas/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{item.packageName || 'Package'}</span>
                          <Badge tone={decisionTone[item.decision] || 'neutral'}>
                            {decisionLabels[item.decision] || item.decision}
                          </Badge>
                          {item.targetVersion ? <Badge tone="neutral">Target {item.targetVersion}</Badge> : null}
                        </div>
                        <span className="text-[11px] text-muted">{formatDate(item.updatedAt || item.createdAt, true)}</span>
                      </div>
                      {item.explanation ? (
                        <p className="mt-2 text-xs leading-relaxed text-subtle">{item.explanation}</p>
                      ) : (
                        <p className="mt-2 text-xs italic text-muted">No explanation recorded.</p>
                      )}
                      {item.notes ? <p className="mt-1.5 text-[11px] text-muted">Notes: {item.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={LuMessageSquare}
                  title="No decisions recorded"
                  description="Choose a completed analysis and record your decision to build a scoped feedback history."
                />
              )}
            </Card>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
