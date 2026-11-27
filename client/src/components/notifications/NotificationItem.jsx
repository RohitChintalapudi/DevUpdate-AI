import { Link } from 'react-router-dom'
import { LuArrowUpRight, LuCheck, LuTrash2 } from 'react-icons/lu'
import Badge from '../common/Badge'
import { formatRelativeTime, getNotificationDestination } from '../../utils/notificationHelpers'
import { getNotificationMeta } from './notificationMeta'

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40'

export default function NotificationItem({
  notification,
  repositoryName = '',
  variant = 'full',
  onMarkRead,
  onDelete,
  onOpen,
  busy = false,
}) {
  const meta = getNotificationMeta(notification.type)
  const Icon = meta.icon
  const isUnread = !notification.readAt
  const destination = getNotificationDestination(notification)
  const relativeTime = formatRelativeTime(notification.createdAt)

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => onOpen?.(notification)}
        className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.tile}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate text-[13px] ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>
              {notification.title}
            </span>
            {isUnread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {meta.short} · {relativeTime}
          </span>
        </span>
        <LuArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-slate-600" aria-hidden="true" />
      </button>
    )
  }

  return (
    <article
      className={`group relative flex gap-4 overflow-hidden rounded-2xl border p-4 transition duration-200 sm:p-5 ${
        isUnread
          ? 'border-sky-200/80 bg-sky-50/40 shadow-[0_1px_2px_rgba(2,132,199,0.06)] hover:border-sky-300'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <span className={`absolute inset-y-4 left-0 w-[3px] rounded-r-full ${meta.bar}`} aria-hidden="true" />

      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.tile}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={destination.path}
            onClick={() => onOpen?.(notification)}
            className={`text-sm leading-snug transition hover:text-sky-700 ${
              isUnread ? 'font-semibold text-slate-950' : 'font-medium text-slate-700'
            }`}
          >
            {notification.title}
          </Link>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {isUnread ? <Badge tone="cyan" dot>New</Badge> : null}
        </div>

        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{notification.message}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
          <span title={notification.createdAt ? new Date(notification.createdAt).toLocaleString() : undefined}>
            {relativeTime}
          </span>
          {repositoryName ? (
            <Link to={`/dashboard/repositories/${notification.repositoryId}`} className="truncate transition hover:text-sky-700">
              {repositoryName}
            </Link>
          ) : null}
          {notification.data?.packageName ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
              {notification.data.packageName}
            </span>
          ) : null}
          <Link to={destination.path} onClick={() => onOpen?.(notification)} className="inline-flex items-center gap-1 font-medium text-sky-700 transition hover:text-sky-900">
            {destination.label}
            <LuArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-0.5">
        {isUnread ? (
          <button
            type="button"
            onClick={() => onMarkRead?.(notification)}
            disabled={busy}
            aria-label={`Mark ${notification.title} as read`}
            title="Mark as read"
            className={iconButton}
          >
            <LuCheck className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete?.(notification)}
          disabled={busy}
          aria-label={`Delete ${notification.title}`}
          title="Delete notification"
          className={`${iconButton} hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}
        >
          <LuTrash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
