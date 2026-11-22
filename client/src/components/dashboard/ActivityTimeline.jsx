import { LuCircleAlert, LuClock3, LuGitBranch, LuPackage, LuShieldAlert, LuSparkles } from 'react-icons/lu'

const notifIcon = {
  SECURITY_VULNERABILITY: { icon: LuShieldAlert, tone: 'danger' },
  DEPRECATED_PACKAGE: { icon: LuCircleAlert, tone: 'warning' },
  AI_ANALYSIS_FAILED: { icon: LuCircleAlert, tone: 'danger' },
  SCAN_FAILED: { icon: LuCircleAlert, tone: 'danger' },
  VULNERABILITY_FIXED: { icon: LuShieldAlert, tone: 'cyan' },
  AI_ANALYSIS_COMPLETED: { icon: LuSparkles, tone: 'violet' },
  RECOMMENDATION_CHANGED: { icon: LuSparkles, tone: 'cyan' },
  MAJOR_UPDATE: { icon: LuPackage, tone: 'violet' },
}

const toneMap = {
  violet: 'bg-violet-50 text-violet-600 ring-violet-200/60',
  cyan: 'bg-sky-50 text-sky-600 ring-sky-200/60',
  danger: 'bg-rose-50 text-rose-600 ring-rose-200/60',
  warning: 'bg-amber-50 text-amber-600 ring-amber-200/60',
}

function timeAgo(dateString) {
  if (!dateString) return 'Just now'
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ActivityTimeline({ items = [] }) {
  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-400">
          <LuClock3 className="h-5 w-5" />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-900">No recent activity recorded</p>
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
          Repository scans, package version updates, and security alerts will appear here as they occur.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {items.map((item, index) => {
        const meta = notifIcon[item.type] || { icon: LuGitBranch, tone: 'cyan' }
        const Icon = meta.icon
        return (
          <div key={item._id || item.id || index} className="relative flex gap-3.5 pb-5 last:pb-0">
            {index !== items.length - 1 ? (
              <span className="absolute top-10 bottom-0 left-[17px] w-px bg-slate-200" />
            ) : null}
            <span
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneMap[meta.tone] || toneMap.violet}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold leading-snug text-slate-900">{item.title}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.message || item.detail}</p>
            </div>
            <span className="hidden shrink-0 pt-1 text-[10px] text-slate-400 sm:block">
              {item.createdAt ? timeAgo(item.createdAt) : item.time || 'Recent'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
