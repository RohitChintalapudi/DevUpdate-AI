import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LuArrowUpRight,
  LuBell,
  LuCheck,
  LuInbox,
  LuRefreshCw,
  LuSearch,
  LuSettings,
  LuShieldAlert,
  LuSparkles,
  LuX,
} from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import NotificationItem from '../../components/notifications/NotificationItem'
import { NOTIFICATION_META } from '../../components/notifications/notificationMeta'
import {
  NOTIFICATION_CATEGORIES,
  categoryForType,
  groupNotificationsByDay,
  matchesNotificationFilters,
} from '../../utils/notificationHelpers'
import { getErrorMessage, notificationsApi, repositoriesApi } from '../../services/api'
import { notifyNotificationsChanged } from '../../utils/notificationEvents'

const defaultPreferences = {
  inApp: true,
  email: false,
  types: {},
  mutedRepositories: [],
}

const categoryIcons = {
  all: LuInbox,
  unread: LuBell,
  security: LuShieldAlert,
  updates: LuArrowUpRight,
  ai: LuSparkles,
  system: LuRefreshCw,
}

function Switch({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-sky-600 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}

function StatCard({ icon: Icon, label, value, accent, hint }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${accent}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-lg font-bold tracking-tight text-slate-950">{value}</p>
        {hint ? <p className="truncate text-[10px] text-slate-400">{hint}</p> : null}
      </div>
    </div>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [repositories, setRepositories] = useState([])
  const [unread, setUnread] = useState(0)
  const [category, setCategory] = useState('all')
  const [repositoryId, setRepositoryId] = useState('')
  const [search, setSearch] = useState('')
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [showPreferences, setShowPreferences] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(timer)
  }, [toast])

  const repoName = useCallback(
    (id) => {
      const match = repositories.find((repo) => String(repo._id) === String(id))
      return match ? match.fullName || match.name : ''
    },
    [repositories],
  )

  const load = useCallback(async () => {
    try {
      const [result, countResult] = await Promise.all([
        notificationsApi.list({
          limit: 100,
          ...(repositoryId ? { repositoryId } : {}),
        }),
        notificationsApi.unreadCount(),
      ])
      setNotifications(result.items || [])
      setUnread(countResult.count || 0)
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load notifications', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [repositoryId])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await load()
    }
    run()
    return () => { active = false }
  }, [load])

  useEffect(() => {
    let active = true
    Promise.all([repositoriesApi.list({ limit: 50 }), notificationsApi.preferences()])
      .then(([repoResult, prefResult]) => {
        if (!active) return
        setRepositories(repoResult.repositories || [])
        if (prefResult.preferences) setPreferences(prefResult.preferences)
      })
      .catch((error) => {
        if (active) setToast({ type: 'error', title: 'Could not load preferences', message: getErrorMessage(error) })
      })
    return () => { active = false }
  }, [])

  const categoryCounts = useMemo(() => {
    const counts = { all: notifications.length, unread: 0, security: 0, updates: 0, ai: 0, system: 0 }
    for (const item of notifications) {
      if (!item.readAt) counts.unread += 1
      counts[categoryForType(item.type)] += 1
    }
    return counts
  }, [notifications])

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((item) =>
        matchesNotificationFilters(item, { search, category, repositoryId }, repoName(item.repositoryId)),
      ),
    [notifications, search, category, repositoryId, repoName],
  )

  const groups = useMemo(() => groupNotificationsByDay(visibleNotifications), [visibleNotifications])

  const todayCount = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return notifications.filter((item) => item.createdAt && new Date(item.createdAt) >= start).length
  }, [notifications])

  const criticalCount = useMemo(
    () => notifications.filter((item) => !item.readAt && item.type === 'SECURITY_VULNERABILITY').length,
    [notifications],
  )

  const hasFilters = Boolean(search || repositoryId || category !== 'all')

  const clearFilters = () => {
    setSearch('')
    setRepositoryId('')
    setCategory('all')
  }

  const markRead = async (item) => {
    if (item.readAt) return
    const readAt = new Date().toISOString()
    setNotifications((current) => current.map((n) => (String(n._id) === String(item._id) ? { ...n, readAt } : n)))
    setUnread((current) => Math.max(0, current - 1))
    try {
      await notificationsApi.readOne(item._id)
      notifyNotificationsChanged()
    } catch (error) {
      await load()
      setToast({ type: 'error', title: 'Could not mark notification as read', message: getErrorMessage(error) })
    }
  }

  const markAllRead = async () => {
    setSaving(true)
    const readAt = new Date().toISOString()
    const previous = notifications
    setNotifications((current) => current.map((item) => ({ ...item, readAt })))
    setUnread(0)
    try {
      const result = await notificationsApi.readAll(repositoryId || undefined)
      notifyNotificationsChanged()
      setToast({
        type: 'success',
        title: 'Inbox up to date',
        message: `${result.modified || 0} notification${result.modified === 1 ? '' : 's'} marked as read.`,
      })
    } catch (error) {
      setNotifications(previous)
      await load()
      setToast({ type: 'error', title: 'Could not mark all as read', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    const previous = notifications
    setNotifications((current) => current.filter((n) => String(n._id) !== String(item._id)))
    if (!item.readAt) setUnread((current) => Math.max(0, current - 1))
    try {
      await notificationsApi.delete(item._id)
      notifyNotificationsChanged()
      setToast({ type: 'success', title: 'Notification removed', message: item.title })
    } catch (error) {
      setNotifications(previous)
      await load()
      setToast({ type: 'error', title: 'Could not delete notification', message: getErrorMessage(error) })
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const result = await notificationsApi.updatePreferences(preferences)
      setPreferences(result.preferences)
      notifyNotificationsChanged()
      setToast({ type: 'success', title: 'Preferences saved', message: 'Your notification settings are up to date.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Could not save preferences', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const toggleType = (type, enabled) => {
    setPreferences((current) => ({
      ...current,
      types: { ...(current.types || {}), [type]: enabled },
    }))
  }

  const toggleMuted = (id, enabled) => {
    setPreferences((current) => {
      const values = new Set((current.mutedRepositories || []).map(String))
      if (enabled) values.add(String(id))
      else values.delete(String(id))
      return { ...current, mutedRepositories: [...values] }
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Every scan, advisory and AI event in one place. Nothing here changes your analysis evidence — it only points you to the source."
        actions={
          <Button
            variant="secondary"
            leftIcon={showPreferences ? LuX : LuSettings}
            onClick={() => setShowPreferences((value) => !value)}
            aria-expanded={showPreferences}
          >
            {showPreferences ? 'Close preferences' : 'Preferences'}
          </Button>
        }
      >
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={LuBell}
            label="Unread"
            value={unread}
            hint="Across all repositories"
            accent="bg-sky-50 text-sky-600 ring-sky-100"
          />
          <StatCard
            icon={LuShieldAlert}
            label="Security alerts"
            value={criticalCount}
            hint="Unread advisories"
            accent="bg-rose-50 text-rose-600 ring-rose-100"
          />
          <StatCard
            icon={LuSparkles}
            label="Today"
            value={todayCount}
            hint="Events received today"
            accent="bg-violet-50 text-violet-600 ring-violet-100"
          />
        </div>
      </PageHeader>

      {showPreferences ? (
        <Card className="mb-6 border-sky-200/80 bg-gradient-to-br from-sky-50/40 via-white to-white">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                  <LuSettings className="h-4 w-4" aria-hidden="true" />
                </span>
                <h2 className="text-base font-semibold tracking-tight text-slate-950">Notification preferences</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Decide which events reach this inbox. Muted repositories keep their history but stop new alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPreferences(false)}
              aria-label="Close preferences"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
            >
              <LuX className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="label-caps">Delivery</p>
              <Switch
                label="In-app notifications"
                description="Store events in this inbox and show the unread badge."
                checked={preferences.inApp}
                onChange={(value) => setPreferences({ ...preferences, inApp: value })}
              />
              <Switch
                label="Email notifications"
                description="Recorded for future delivery; email is not configured in this deployment."
                checked={preferences.email}
                onChange={(value) => setPreferences({ ...preferences, email: value })}
              />
            </div>

            <div>
              <p className="label-caps mb-2">Event types</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(NOTIFICATION_META).map(([type, meta]) => {
                  const enabled = preferences.types?.[type] !== false
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type, !enabled)}
                      aria-pressed={enabled}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                        enabled
                          ? 'border-sky-200 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {enabled ? <LuCheck className="h-3 w-3" aria-hidden="true" /> : null}
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {repositories.length ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="label-caps">Muted repositories</p>
                  <p className="mt-1 text-[11px] text-slate-500">Existing notifications stay visible when a repository is muted.</p>
                </div>
                <Badge tone="neutral">{(preferences.mutedRepositories || []).length} muted</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {repositories.map((repo) => {
                  const muted = (preferences.mutedRepositories || []).map(String).includes(String(repo._id))
                  return (
                    <button
                      key={String(repo._id)}
                      type="button"
                      onClick={() => toggleMuted(repo._id, !muted)}
                      aria-pressed={muted}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                        muted
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {muted ? 'Muted · ' : ''}
                      {repo.fullName || repo.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <Button leftIcon={LuCheck} loading={saving} onClick={savePreferences}>Save preferences</Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Card padded={false} className="overflow-hidden lg:sticky lg:top-24">
            <div className="border-b border-slate-100 px-4 py-3.5">
              <p className="label-caps">Inbox views</p>
            </div>
            <nav className="space-y-0.5 p-2" aria-label="Notification categories">
              {NOTIFICATION_CATEGORIES.map((item) => {
                const Icon = categoryIcons[item.id] || LuBell
                const active = category === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    <span className={`text-[11px] font-semibold ${active ? 'text-sky-200' : 'text-slate-400'}`}>
                      {categoryCounts[item.id] || 0}
                    </span>
                  </button>
                )
              })}
            </nav>
            <div className="border-t border-slate-100 p-3">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                leftIcon={LuSettings}
                onClick={() => setShowPreferences(true)}
              >
                Manage preferences
              </Button>
            </div>
          </Card>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Notification categories">
            {NOTIFICATION_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  category === item.id
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {item.label}
                <span className="ml-1.5 opacity-60">{categoryCounts[item.id] || 0}</span>
              </button>
            ))}
          </div>

          <Card padded={false} className="mb-5 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <LuSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search alerts, packages, repositories..."
                  aria-label="Search notifications"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pr-3 pl-9 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                />
              </div>
              <select
                aria-label="Filter notifications by repository"
                value={repositoryId}
                onChange={(event) => setRepositoryId(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-400"
              >
                <option value="">All repositories</option>
                {repositories.map((repo) => (
                  <option key={String(repo._id)} value={repo._id}>{repo.fullName || repo.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" leftIcon={LuRefreshCw} onClick={load}>Refresh</Button>
                <Button
                  size="sm"
                  leftIcon={LuCheck}
                  loading={saving}
                  disabled={!unread}
                  onClick={markAllRead}
                >
                  Mark all read
                </Button>
              </div>
            </div>
            {hasFilters ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-500">
                  {visibleNotifications.length} of {notifications.length} loaded events
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  <LuX className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </button>
              </div>
            ) : null}
          </Card>

          {loading ? (
            <div className="space-y-5">
              <Skeleton className="h-4 w-24" />
              {[0, 1, 2].map((key) => (
                <Card key={key} padded={false} className="p-5">
                  <div className="flex gap-4">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="flex-1 space-y-2.5">
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : visibleNotifications.length ? (
            <div>
              {groups.map((group) => (
                <section key={group.key} className="mb-6">
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">{group.label}</h2>
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-medium text-slate-400">{group.items.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {group.items.map((item) => (
                      <NotificationItem
                        key={String(item._id)}
                        notification={item}
                        repositoryName={repoName(item.repositoryId)}
                        onMarkRead={markRead}
                        onDelete={remove}
                        onOpen={markRead}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <Card className="text-center">
              <EmptyState
                icon={hasFilters ? LuSearch : LuInbox}
                title={hasFilters ? 'No matching notifications' : 'Your inbox is clear'}
                description={hasFilters
                  ? 'Try another search term, repository or inbox view.'
                  : 'Real scan, advisory and AI events will appear here as your repositories are analyzed.'}
              />
              {hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
              ) : null}
            </Card>
          )}
        </section>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
