import { LuArrowRight, LuClock3, LuGitBranch, LuPackage } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import AiStatusBadge from './AiStatusBadge'

export default function RecommendationCard({ analysis }) {
  const target = analysis.targetVersion || analysis.latestVersion || 'latest'
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-card/70 p-5 transition hover:-translate-y-0.5 hover:border-brandlight/30">
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand/8 blur-2xl opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
            <LuPackage className="h-4 w-4 text-brandlight" aria-hidden="true" />
            <span className="truncate">{analysis.packageName}</span>
            <span className="font-mono text-[11px] font-normal text-muted">
              {analysis.installedVersion || '?'} → {target}
            </span>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            <LuGitBranch className="h-3 w-3" aria-hidden="true" />
            {analysis.repository?.fullName || analysis.repositoryName || 'Repository'}
          </p>
        </div>
        <AiStatusBadge value={analysis.recommendation} />
      </div>

      <p className="relative mt-4 line-clamp-3 text-[13px] leading-relaxed text-subtle">
        {analysis.upgradeSummary || analysis.recommendationReason || 'No summary is available for this analysis.'}
      </p>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <AiStatusBadge value={analysis.riskLevel || 'UNKNOWN'} />
          <span className="inline-flex items-center gap-1">
            <LuClock3 className="h-3 w-3" aria-hidden="true" />
            {analysis.evidence?.length || 0} evidence
          </span>
        </div>
        <Link
          to={`/dashboard/ai/analysis/${analysis._id || analysis.analysisId}`}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brandlight transition hover:text-accent"
        >
          View analysis <LuArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
