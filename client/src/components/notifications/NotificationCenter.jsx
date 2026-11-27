import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuArrowRight, LuBell, LuCheck, LuInbox, LuX } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import NotificationItem from './NotificationItem'
import { notificationsApi } from '../../services/api'
import { getNotificationDestination } from '../../utils/notificationHelpers'
import { NOTIFICATIONS_CHANGED_EVENT, notifyNotificationsChanged } from '../../utils/notificationEvents'

const REFRESH_MS = 60_000

const iconButton =
  'inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-white/[0.04] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'

export default function NotificationCenter() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const mountedRef = useRef(true)
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [countResult, recentResult] = await Promise.all([
        notificationsApi.unreadCount(),
        notificationsApi.recent({ limit: 6 }),
      ])
      if (!mountedRef.current) return
      setUnread(countResult.count || 0)
      setItems(recentResult.notifications || [])
    } catch {
      // Notifications are non-critical chrome; a failure must not break the layout.
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const initialLoad = async () => {
      await Promise.resolve()
      if (mountedRef.current) await load()
    }
    initialLoad()
    const interval = setInterval(load, REFRESH_MS)
    const onFocus = () => load()
    const onChanged = () => load()
    window.addEventListener('focus', onFocus)
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged)
    }
  }, [load])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const markOne = async (item) => {
    if (item.readAt) return
    const readAt = new Date().toISOString()
    setUnread((current) => Math.max(0, current - 1))
    setItems((current) => current.map((n) => (String(n._id) === String(item._id) ? { ...n, readAt } : n)))
    try {
      await notificationsApi.readOne(item._id)
      notifyNotificationsChanged()
    } catch {
      await load()
    }
  }

  const markAll = async () => {
    setBusy(true)
    try {
      await notificationsApi.readAll()
      const readAt = new Date().toISOString()
      setUnread(0)
      setItems((current) => current.map((item) => ({ ...item, readAt })))
      notifyNotificationsChanged()
    } catch {
      await load()
    } finally {
      setBusy(false)
    }
  }

  const openItem = (item) => {
    setOpen(false)
    if (!item.readAt) void markOne(item)
    navigate(getNotificationDestination(item).path)
  }

  const openAll = () => {
    setOpen(false)
    navigate('/dashboard/notifications')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          open
            ? 'border-sky-400 bg-sky-50 text-sky-700'
            : 'border-line bg-elevated text-muted hover:border-brandlight/40 hover:bg-white/[0.04] hover:text-ink'
        }`}
      >
        <LuBell className="h-[17px] w-[17px]" aria-hidden="true" />
        {unread ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold text-white ring-2 ring-card">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="notification-center"
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute top-[calc(100%+10px)] right-0 z-50 w-[min(92vw,390px)] origin-top-right overflow-hidden rounded-2xl border border-line bg-elevated shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <LuBell className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">Notifications</p>
                  <p className="truncate text-[11px] text-muted">
                    {unread ? `${unread} unread event${unread === 1 ? '' : 's'}` : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={markAll}
                  disabled={!unread || busy}
                  aria-label="Mark all notifications as read"
                  title="Mark all as read"
                  className={iconButton}
                >
                  <LuCheck className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className={iconButton}
                >
                  <LuX className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {items.length ? (
              <div className="max-h-[380px] overflow-y-auto p-1.5">
                {items.map((item) => (
                  <NotificationItem key={String(item._id)} notification={item} variant="compact" onOpen={openItem} />
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-muted">
                  <LuInbox className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[13px] font-semibold text-ink">Nothing new right now</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Scan, advisory and AI events will show up here.
                </p>
              </div>
            )}

            <div className="border-t border-line p-2">
              <button
                type="button"
                onClick={openAll}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold text-subtle transition hover:bg-white/[0.04] hover:text-ink"
              >
                View all notifications
                <LuArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
