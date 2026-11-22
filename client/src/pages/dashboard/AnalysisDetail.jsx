import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LuArrowLeft, LuBot, LuClock3, LuExternalLink, LuGitBranch, LuPackage, LuRoute, LuShieldCheck } from 'react-icons/lu'
import AiStatusBadge from '../../components/ai/AiStatusBadge'
import EvidenceList from '../../components/ai/EvidenceList'
import Badge from '../../components/common/Badge'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import { formatDate } from '../../utils/updateHelpers'
import { aiApi, getErrorMessage } from '../../services/api'

function Section({ title, icon: Icon, children, description }) {
  return (
    <section className="rounded-2xl border border-line bg-card/70 p-5">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brandlight">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-subtle">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ClaimList({ items = [] }) {
  if (!items.length) return <p className="text-xs text-muted">No evidence-backed claims were recorded.</p>
  return (
    <div className="scrollbar-slim max-h-80 space-y-2 overflow-y-auto pr-1">
      {items.map((item, index) => (
        <div key={String(item.id || index)} className="rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink">{item.title || item.id}</p>
            <AiStatusBadge value={item.verificationStatus || 'UNVERIFIED'} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-subtle">{item.description || item.action || item.reason}</p>
          {item.severity ? <p className="mt-2 text-[11px] text-muted">Severity: {item.severity}</p> : null}
          {item.evidenceIds?.length ? (
            <p className="mt-2 font-mono text-[10px] break-all text-muted">
              Evidence: {item.evidenceIds.join(', ')}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default function AnalysisDetail() {
  const { analysisId } = useParams()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await aiApi.analysis(analysisId)
      setAnalysis(response.analysis)
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load analysis', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [analysisId])

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

  if (loading) {
    return (
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-9 w-96" />
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div>
        <PageHeader eyebrow="AI analysis" title="Analysis unavailable" />
        <EmptyState
          icon={LuBot}
          title="We could not open this analysis"
          description="It may have been removed, or it may not belong to your account."
          action={<Link to="/dashboard/recommendations"><Badge tone="violet">Back to recommendations</Badge></Link>}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    )
  }

  const release = analysis.releaseIntelligence || {}
  const releaseRows = [
    ['Important changes', release.importantChanges],
    ['New features', release.newFeatures],
    ['Bug fixes', release.bugFixes],
    ['Deprecated APIs', release.deprecatedApis],
  ].filter(([, rows]) => rows?.length)

  return (
    <div>
      <Link
        to="/dashboard/recommendations"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition hover:text-ink"
      >
        <LuArrowLeft className="h-3.5 w-3.5" /> Back to recommendations
      </Link>

      <PageHeader
        eyebrow="Evidence-backed analysis"
        title={`${analysis.packageName} ${analysis.installedVersion || ''} → ${analysis.targetVersion || 'latest'}`}
        description={analysis.upgradeSummary || 'No summary was generated for this analysis.'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AiStatusBadge value={analysis.recommendation} />
            <AiStatusBadge value={analysis.riskLevel || 'UNKNOWN'} />
          </div>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="neutral" icon={LuGitBranch}>
            {analysis.repositoryFullName || 'Repository'}
          </Badge>
          <Badge tone="neutral" icon={LuPackage}>
            {analysis.ecosystem || 'Unknown ecosystem'}
          </Badge>
          <Badge tone="neutral" icon={LuClock3}>
            {formatDate(analysis.completedAt || analysis.createdAt, true)}
          </Badge>
          <Badge tone="violet" icon={LuShieldCheck}>
            {analysis.evidence?.length || 0} evidence items
          </Badge>
        </div>
      </PageHeader>

      {analysis.analysisStatus === 'INSUFFICIENT_EVIDENCE' ? (
        <div className="mb-6 rounded-2xl border border-warning/25 bg-warning/[0.06] p-5 text-sm leading-relaxed text-warning">
          This result is marked INSUFFICIENT_EVIDENCE. Generated claims could not all be linked to retrieved,
          verifiable sources, so no upgrade action should be inferred from it.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title="Recommendation" icon={LuBot}>
            <p className="text-[13px] leading-relaxed text-subtle">
              {analysis.recommendationReason || 'No reason was recorded.'}
            </p>
            {releaseRows.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {releaseRows.map(([label, rows]) => (
                  <div key={label} className="rounded-xl border border-line bg-white/[0.02] p-3">
                    <p className="text-[11px] font-bold tracking-wide text-muted uppercase">{label}</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-subtle">
                      {rows.slice(0, 8).map((row, index) => <li key={index}>• {row}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </Section>

          <Section title="Breaking changes" description="Only changes supported by retrieved documentation are kept.">
            <ClaimList items={analysis.breakingChanges} />
          </Section>

          <Section title="Repository code impact" description="Documented changes mapped to retrieved repository files.">
            <ClaimList items={analysis.projectImpact} />
          </Section>

          <Section title="Migration checklist" icon={LuRoute} description="Review-only steps. DevUpdate AI never applies them.">
            {analysis.migrationPlan?.length ? (
              <ol className="scrollbar-slim max-h-96 space-y-2 overflow-y-auto pr-1">
                {analysis.migrationPlan.map((step, index) => (
                  <li key={String(step.id || index)} className="rounded-xl border border-line bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-ink">{step.order || index + 1}. {step.action}</p>
                      <AiStatusBadge value={step.verificationStatus || 'UNVERIFIED'} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-subtle">{step.reason}</p>
                    {step.validation ? <p className="mt-2 text-[11px] text-success">Validate: {step.validation}</p> : null}
                    {step.documentationUrl ? (
                      <a
                        href={step.documentationUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brandlight hover:text-accent"
                      >
                        Source <LuExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted">No evidence-backed migration steps were recorded.</p>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Evidence" icon={LuShieldCheck} description="Every source below was retrieved during this analysis.">
            <EvidenceList evidence={analysis.evidence} />
          </Section>

          <Section title="Risk assessment" description="Risk is derived from evidence and repository context, not the version number alone.">
            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <p className="font-mono text-2xl font-bold text-ink">{analysis.riskLevel || 'UNKNOWN'}</p>
              <p className="mt-2 text-xs leading-relaxed text-subtle">{analysis.riskReason || 'No risk reason was recorded.'}</p>
            </div>
          </Section>

          <Section title="Compatibility">
            <ClaimList items={analysis.compatibilityFindings} />
          </Section>

          <Section title="Limitations">
            {analysis.limitations?.length ? (
              <ul className="scrollbar-slim max-h-56 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed text-subtle">
                {analysis.limitations.map((item, index) => <li key={index}>• {item}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-muted">No limitations were recorded.</p>
            )}
          </Section>

          <Section title="Model metadata">
            <dl className="space-y-2 text-[11px]">
              {[
                ['Provider', analysis.modelMetadata?.provider],
                ['Model', analysis.modelMetadata?.model],
                ['Vector store', analysis.modelMetadata?.vectorStore],
                ['Embeddings', analysis.modelMetadata?.embeddingModel],
                ['Prompt version', analysis.modelMetadata?.promptVersion],
                ['Retrieved evidence', analysis.modelMetadata?.retrievalCount],
                ['Tokens', analysis.tokens?.total],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-line/50 pb-2 last:border-0">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
