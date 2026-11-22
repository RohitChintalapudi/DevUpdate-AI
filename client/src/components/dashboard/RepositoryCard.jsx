import { motion } from 'framer-motion'
import { LuArrowUpRight, LuCalendarDays, LuExternalLink, LuGitBranch, LuPackage, LuStar } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Badge from '../common/Badge'
import Button from '../common/Button'

const statusTone = {
  NOT_SCANNED: 'neutral',
  QUEUED: 'warning',
  SCANNING: 'cyan',
  COMPLETED: 'success',
  FAILED: 'danger',
}

const statusLabel = {
  NOT_SCANNED: 'Not scanned',
  QUEUED: 'Queued',
  SCANNING: 'Scanning',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

const languageColors = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3776ab',
  Java: '#f89820',
  Kotlin: '#a97bff',
  Rust: '#dea584',
  PHP: '#777bb4',
  Ruby: '#cc342d',
  Go: '#00add8',
  Csharp: '#68217a',
  'C#': '#68217a',
}

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RepositoryCard({ repository, index = 0, onAnalyze, busy = false }) {
  const scanning = ['QUEUED', 'SCANNING'].includes(repository.scanStatus)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05 }}
      whileHover={{ y: -4 }}
      className="group relative flex h-full flex-col rounded-2xl border border-line bg-card/70 p-5 transition-colors hover:border-brandlight/30"
    >
      <div className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-brand/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brandlight">
          <LuGitBranch className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge tone={repository.visibility === 'private' ? 'warning' : 'neutral'}>
            {repository.visibility}
          </Badge>
          <Badge tone={statusTone[repository.scanStatus] || 'neutral'} dot>
            {statusLabel[repository.scanStatus] || repository.scanStatus}
          </Badge>
        </div>
      </div>

      <div className="relative mt-5 min-w-0">
        <Link
          to={`/dashboard/repositories/${repository._id}`}
          className="block truncate text-[15px] font-semibold text-ink transition hover:text-brandlight"
        >
          {repository.name}
        </Link>
        <p className="mt-1 truncate text-[11px] text-muted">{repository.fullName}</p>
      </div>

      <p className="relative mt-2 line-clamp-2 min-h-[36px] text-[12px] leading-relaxed text-subtle">
        {repository.description || 'No description provided.'}
      </p>

      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
        {repository.language ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: languageColors[repository.language] || '#94a3b8' }}
            />
            {repository.language}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <LuPackage className="h-3.5 w-3.5" /> {repository.dependencyCount || 0} packages
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LuStar className="h-3.5 w-3.5" /> {repository.stars || 0}
        </span>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <LuGitBranch className="h-3.5 w-3.5" /> {repository.branch || repository.defaultBranch}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LuCalendarDays className="h-3.5 w-3.5" /> {formatDate(repository.lastUpdated)}
        </span>
      </div>

      {scanning ? (
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand to-accent"
            animate={{ width: ['15%', '85%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      ) : null}

      {repository.lastScanError ? (
        <p className="relative mt-3 line-clamp-2 text-[11px] leading-relaxed text-danger">
          {repository.lastScanError}
        </p>
      ) : null}

      <div className="relative mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <a
          href={repository.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-subtle transition hover:text-ink"
        >
          View on GitHub <LuExternalLink className="h-3 w-3" />
        </a>
        <div className="flex items-center gap-2">
          <Link
            to={`/dashboard/repositories/${repository._id}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-subtle transition hover:text-ink"
          >
            Details <LuArrowUpRight className="h-3 w-3" />
          </Link>
          <Button
            size="xs"
            variant="secondary"
            loading={busy}
            disabled={scanning}
            onClick={() => onAnalyze?.(repository)}
          >
            {scanning ? 'Scanning' : 'Analyze Repository'}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
