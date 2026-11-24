import { LuExternalLink, LuRefreshCw, LuSparkles } from 'react-icons/lu'
import Badge from '../common/Badge'

const categoryTone = {
  Language: 'violet',
  Runtime: 'cyan',
  Framework: 'danger',
  Database: 'warning',
  Tool: 'success',
}

const categoryBar = {
  Language: 'bg-violet-400',
  Runtime: 'bg-cyan-400',
  Framework: 'bg-rose-400',
  Database: 'bg-amber-400',
  Tool: 'bg-emerald-400',
}

export default function UniversalDependencyCard({ item }) {
  const category = item.category || 'Tool'
  const live = item.versionSource === 'live'

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-sky-200 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${categoryBar[category] || 'bg-slate-300'}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
            <LuSparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-950">{item.name}</h3>
            <p className="text-[11px] font-medium text-slate-500">{item.ecosystem}</p>
          </div>
        </div>
        <Badge tone={categoryTone[category] || 'neutral'}>{category}</Badge>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold tracking-wide text-slate-500 uppercase">Latest version</span>
          <Badge tone={live ? 'success' : 'neutral'} dot>
            {live ? 'Live registry' : 'Curated'}
          </Badge>
        </div>
        <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-emerald-700">
          <LuRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {item.latestVersion || 'Latest'}
        </p>
      </div>

      <div className="mt-3 space-y-2 text-[12px] leading-relaxed">
        <p className="text-slate-600">
          <span className="font-semibold text-slate-800">Stack note: </span>
          {item.stackNote}
        </p>
        <p className="text-slate-600">
          <span className="font-semibold text-slate-800">On update: </span>
          {item.updateNote}
        </p>
      </div>

      <a
        href={item.registryUrl || item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
      >
        View official source <LuExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  )
}
