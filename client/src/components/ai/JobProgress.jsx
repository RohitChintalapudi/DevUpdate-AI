import AiStatusBadge from './AiStatusBadge'

export default function JobProgress({ job, onCancel, cancelling = false }) {
  if (!job) return null
  const progress = job.progress || {}
  const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0))
  const active = ['QUEUED', 'RUNNING'].includes(job.status)

  return (
    <div className="rounded-2xl border border-line bg-card/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">AI job</p>
          <p className="mt-1 text-sm font-semibold text-ink">{String(job.type || '').replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <AiStatusBadge value={job.status} />
          {active && onCancel ? (
            <button
              type="button"
              onClick={() => onCancel(job._id || job.jobId)}
              disabled={cancelling}
              className="rounded-lg border border-danger/25 px-2.5 py-1 text-[11px] font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>{progress.message || 'Queued.'}</span>
        <span>
          {progress.processed ? `${progress.processed}/${progress.total || '?'} · ` : ''}
          {percent}%
        </span>
      </div>
    </div>
  )
}
