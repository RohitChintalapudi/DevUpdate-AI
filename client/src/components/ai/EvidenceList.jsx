import { LuExternalLink, LuFileText } from 'react-icons/lu'
import AiStatusBadge from './AiStatusBadge'

export default function EvidenceList({ evidence = [], emptyLabel = 'No verified evidence is attached.' }) {
  if (!evidence.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white/[0.01] px-4 py-6 text-center text-xs text-muted">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="scrollbar-slim max-h-96 space-y-2 overflow-y-auto pr-1">
      {evidence.map((item) => (
        <div key={item.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <LuFileText className="mt-0.5 h-4 w-4 shrink-0 text-brandlight" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{item.title || item.id}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {String(item.sourceType || 'OFFICIAL_DOCS').replace(/_/g, ' ')}
                </p>
              </div>
            </div>
            <AiStatusBadge value={item.verificationStatus || 'UNVERIFIED'} />
          </div>
          {item.excerpt ? (
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-subtle">{item.excerpt}</p>
          ) : null}
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brandlight hover:text-accent"
            >
              View source <LuExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}
