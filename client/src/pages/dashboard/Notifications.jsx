import { useCallback, useEffect, useState } from 'react'
import { LuBell, LuCheck, LuCircleAlert, LuInbox, LuRefreshCw, LuSettings, LuShieldAlert, LuSparkles, LuTrash2, LuTriangleAlert } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import { formatDate } from '../../utils/updateHelpers'
import { getErrorMessage, notificationsApi, repositoriesApi } from '../../services/api'

const typeMeta = {
  MAJOR_UPDATE: { label: 'Major update', tone: 'violet', icon: LuSparkles },
  SECURITY_VULNERABILITY: { label: 'Security advisory', tone: 'danger', icon: LuShieldAlert },
  DEPRECATED_PACKAGE: { label: 'Deprecated package', tone: 'warning', icon: LuTriangleAlert },
  AI_ANALYSIS_COMPLETED: { label: 'Analysis completed', tone: 'success', icon: LuCheck },
  AI_ANALYSIS_FAILED: { label: 'Analysis failed', tone: 'danger', icon: LuCircleAlert },
  SCAN_FAILED: { label: 'Scan failed', tone: 'danger', icon: LuCircleAlert },
  VULNERABILITY_FIXED: { label: 'Vulnerability fixed', tone: 'success', icon: LuShieldAlert },
  RECOMMENDATION_CHANGED: { label: 'Recommendation changed', tone: 'cyan', icon: LuSparkles },
}

const defaultPreferences = {
  inApp: true,
  email: false,
  types: {},
  mutedRepositories: [],
}

const iconToneClass = {
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  danger: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  warning: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  neutral: 'border-white/10 bg-white/5 text-subtle',
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
      <span>
        <span className="block text-xs font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] text-muted">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500"
      />
    </label>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [repositories, setRepositories] = useState([])
  const [unread, setUnread] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [repositoryId, setRepositoryId] = useState('')
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

  const load = useCallback(async () => {
    try {
      const [result, countResult] = await Promise.all([
        notificationsApi.list({
          limit: 100,
          ...(unreadOnly ? { unreadOnly: 'true' } : {}),
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
  }, [repositoryId, unreadOnly])

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

  const markRead = async (notificationId) => {
    try {
      await notificationsApi.readOne(notificationId)
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not mark notification as read', message: getErrorMessage(error) })
    }
  }

  const markAllRead = async () => {
    setSaving(true)
    try {
      const result = await notificationsApi.readAll(repositoryId || undefined)
      setToast({
        type: 'success',
        title: 'Notifications updated',
        message: `${result.modified || 0} notification${result.modified === 1 ? '' : 's'} marked as read.`,
      })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not mark all as read', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (notificationId) => {
    try {
      await notificationsApi.delete(notificationId)
      setToast({ type: 'success', title: 'Notification deleted' })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not delete notification', message: getErrorMessage(error) })
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const result = await notificationsApi.updatePreferences(preferences)
      setPreferences(result.preferences)
      setToast({ type: 'success', title: 'Preferences saved' })
      await load()
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

  const typeEntries = Object.entries(typeMeta)
  const repoName = (id) => {
    const match = repositories.find((repo) => String(repo._id) === String(id))
    return match ? (match.fullName || match.name) : ''
  }

  return (
    <div>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Real in-app events from scans, advisories, AI jobs and recommendation changes. Notifications never modify analysis evidence."
        actions={
          <Button
            variant="secondary"
            leftIcon={LuSettings}
            onClick={() => setShowPreferences((value) => !value)}
          >
            {showPreferences ? 'Hide preferences' : 'Preferences'}
          </Button>
        }
      />

      {showPreferences ? (
        <Card className="mb-5">
          <div className="mb-4 flex items-center gap-2">
            <LuSettings className="h-4 w-4 text-brandlight" />
            <h2 className="text-sm font-semibold text-ink">Notification preferences</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Toggle
                label="In-app notifications"
                description="Store events in this notifications inbox."
                checked={preferences.inApp}
                onChange={(value) => setPreferences({ ...preferences, inApp: value })}
              />
              <Toggle
                label="Email notifications"
                description="Email delivery is not configured in this deployment; this preference is recorded only."
                checked={preferences.email}
                onChange={(value) => setPreferences({ ...preferences, email: value })}
              />
            </div>
            <div className="space-y-2">
              <p className="label-caps">Event types</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {typeEntries.map(([type, meta]) => (
                  <Toggle
                    key={type}
                    label={meta.label}
                    checked={preferences.types?.[type] !== false}
                    onChange={(value) => toggleType(type, value)}
                  />
                ))}
              </div>
            </div>
          </div>
          {repositories.length ? (
            <div className="mt-4">
              <p className="label-caps mb-2">Muted repositories</p>
              <div className="flex flex-wrap gap-2">
                {repositories.map((repo) => (
                  <button
                    key={String(repo._id)}
                    type="button"
                    onClick={() => toggleMuted(repo._id, !(preferences.mutedRepositories || []).map(String).includes(String(repo._id)))}
                    className={`rounded-full border px-3 py-1 text-[11px] transition ${
                      (preferences.mutedRepositories || []).map(String).includes(String(repo._id))
                        ? 'border-warning/30 bg-warning/10 text-warning'
                        : 'border-line bg-canvas/40 text-subtle hover:text-ink'
                    }`}
                  >
                    {(preferences.mutedRepositories || []).map(String).includes(String(repo._id)) ? 'Muted · ' : ''}
                    {repo.fullName || repo.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end">
            <Button leftIcon={LuCheck} loading={saving} onClick={savePreferences}>Save preferences</Button>
          </div>
        </Card>
      ) : null}

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={unread ? 'violet' : 'neutral'} icon={LuBell}>
            {unread} unread
          </Badge>
          <label className="flex items-center gap-2 text-xs text-subtle">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            Unread only
          </label>
          <select
            aria-label="Filter notifications by repository"
            className="h-9 rounded-lg border border-line bg-canvas/60 px-2.5 text-xs text-ink outline-none focus:border-brandlight/60"
            value={repositoryId}
            onChange={(event) => setRepositoryId(event.target.value)}
          >
            <option value="">All repositories</option>
            {repositories.map((repo) => (
              <option key={String(repo._id)} value={repo._id}>{repo.fullName || repo.name}</option>
            ))}
          </select>
        </div>
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
      </Card>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : notifications.length ? (
        <div className="space-y-2">
          {notifications.map((item) => {
            const meta = typeMeta[item.type] || { label: item.type || 'Event', tone: 'neutral', icon: LuBell }
            const Icon = meta.icon
            const isUnread = !item.readAt
            return (
              <Card key={String(item._id)} padded={false} className={`flex flex-wrap items-start gap-3 p-4 ${isUnread ? 'glow-border' : ''}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${iconToneClass[meta.tone] || iconToneClass.neutral}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{item.title}</span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {isUnread ? <Badge tone="violet" dot>New</Badge> : null}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-subtle">{item.message}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                    <span>{formatDate(item.createdAt, true)}</span>
                    {repoName(item.repositoryId) ? <span>{repoName(item.repositoryId)}</span> : null}
                    {item.data?.packageName ? <span>{item.data.packageName}</span> : null}
                    {item.readAt ? <span>Read {formatDate(item.readAt, true)}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={() => markRead(item._id)}
                      aria-label="Mark as read"
                      title="Mark as read"
                      className="rounded-lg p-1.5 text-muted transition hover:bg-success/10 hover:text-success"
                    >
                      <LuCheck className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(item._id)}
                    aria-label="Delete notification"
                    title="Delete notification"
                    className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={LuInbox}
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description={unreadOnly
            ? 'You are all caught up. New scan, advisory and AI events will appear here.'
            : 'Real events from scans, advisories, AI jobs and recommendation changes will appear here.'}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
