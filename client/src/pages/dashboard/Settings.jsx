import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LuArrowUpRight,
  LuCalendarDays,
  LuCheck,
  LuCopy,
  LuFingerprint,
  LuGithub,
  LuKeyRound,
  LuLockKeyhole,
  LuLogOut,
  LuMail,
  LuMonitor,
  LuMoon,
  LuRefreshCw,
  LuSave,
  LuSun,
  LuUserRound,
} from 'react-icons/lu'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import { NOTIFICATION_META } from '../../components/notifications/notificationMeta'
import SettingRow from '../../components/settings/SettingRow'
import SettingSwitch from '../../components/settings/SettingSwitch'
import SettingsNav from '../../components/settings/SettingsNav'
import SettingsSection from '../../components/settings/SettingsSection'
import { isSettingsTab } from '../../constants/settingsTabs'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage, githubApi, notificationsApi, repositoriesApi } from '../../services/api'
import { ACCENTS, readAppearance, saveAppearance } from '../../utils/appearanceSettings'
import { notifyNotificationsChanged } from '../../utils/notificationEvents'
import { formatDate } from '../../utils/updateHelpers'

const themeOptions = [
  { id: 'daylight', label: 'Daylight', description: 'Clean light surfaces with high-contrast text.', icon: LuSun, active: true },
  { id: 'midnight', label: 'Midnight', description: 'Planned for a future release.', icon: LuMoon, active: false },
  { id: 'system', label: 'System', description: 'Planned for a future release.', icon: LuMonitor, active: false },
]

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateProfile, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const [tab, setTab] = useState(isSettingsTab(requested) ? requested : 'profile')
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)
  const [preferences, setPreferences] = useState({ inApp: true, email: false, types: {}, mutedRepositories: [] })
  const [repositories, setRepositories] = useState([])
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [preferencesDirty, setPreferencesDirty] = useState(false)
  const [preferencesSaving, setPreferencesSaving] = useState(false)
  const [appearance, setAppearance] = useState(() => readAppearance())
  const [githubStatus, setGithubStatus] = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubRefreshKey, setGithubRefreshKey] = useState(0)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    let active = true
    const loadPreferences = async () => {
      await Promise.resolve()
      if (active) setPreferencesLoading(true)
      try {
        const [repoResult, prefResult] = await Promise.all([
          repositoriesApi.list({ limit: 50 }),
          notificationsApi.preferences(),
        ])
        if (!active) return
        setRepositories(repoResult.repositories || [])
        if (prefResult.preferences) setPreferences(prefResult.preferences)
      } catch (error) {
        if (active) setToast({ type: 'error', title: 'Could not load preferences', message: getErrorMessage(error) })
      } finally {
        if (active) setPreferencesLoading(false)
      }
    }
    loadPreferences()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (tab !== 'security') return undefined
    let active = true
    const loadGithubStatus = async () => {
      setGithubLoading(true)
      try {
        const data = await githubApi.status()
        if (active) setGithubStatus(data)
      } catch (error) {
        if (active) {
          setToast({ type: 'error', title: 'Could not load GitHub status', message: getErrorMessage(error) })
        }
      } finally {
        if (active) setGithubLoading(false)
      }
    }
    loadGithubStatus()
    return () => { active = false }
  }, [tab, githubRefreshKey])

  const selectTab = (id) => {
    setTab(id)
    setToast(null)
    setSearchParams(id === 'profile' ? {} : { tab: id }, { replace: true })
  }

  const updateAppearance = (patch) => {
    setAppearance((current) => saveAppearance({ ...current, ...patch }))
  }

  const updatePreference = (patch) => {
    setPreferences((current) => ({ ...current, ...patch }))
    setPreferencesDirty(true)
  }

  const toggleNotificationType = (type, enabled) => {
    updatePreference({ types: { ...(preferences.types || {}), [type]: enabled } })
  }

  const toggleMutedRepository = (id, enabled) => {
    const values = new Set((preferences.mutedRepositories || []).map(String))
    if (enabled) values.add(String(id))
    else values.delete(String(id))
    updatePreference({ mutedRepositories: [...values] })
  }

  const saveNotificationPreferences = async () => {
    setPreferencesSaving(true)
    try {
      const result = await notificationsApi.updatePreferences(preferences)
      setPreferences(result.preferences)
      setPreferencesDirty(false)
      notifyNotificationsChanged()
      setToast({ type: 'success', title: 'Preferences saved', message: 'Notification delivery is up to date.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Could not save preferences', message: getErrorMessage(error) })
    } finally {
      setPreferencesSaving(false)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setToast({ type: 'error', title: 'Name is required', message: 'Enter a display name before saving.' })
      return
    }
    setSaving(true)
    try {
      await updateProfile({ name: name.trim() })
      setToast({ type: 'success', title: 'Profile updated', message: 'Your display name has been saved.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Could not save profile', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const copyAccountId = async () => {
    if (!user?._id) return
    try {
      await navigator.clipboard.writeText(String(user._id))
      setCopied(true)
    } catch {
      setToast({ type: 'error', title: 'Could not copy ID', message: 'Clipboard access is unavailable in this browser.' })
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await logout()
      setSignOutOpen(false)
      navigate('/login', { replace: true })
    } catch (error) {
      setToast({ type: 'error', title: 'Could not sign out', message: getErrorMessage(error) })
    } finally {
      setSigningOut(false)
    }
  }

  const githubConnected = Boolean(githubStatus?.connected)
  const githubTone = !githubStatus
    ? 'neutral'
    : githubConnected
      ? githubStatus.tokenValid === false
        ? 'warning'
        : 'success'
      : githubStatus.status === 'EXPIRED'
        ? 'danger'
        : 'neutral'
  const githubLabel = !githubStatus
    ? githubLoading ? 'Checking…' : 'Unavailable'
    : githubConnected
      ? githubStatus.tokenValid === false
        ? 'Access limited'
        : 'Connected'
      : githubStatus.status === 'EXPIRED'
        ? 'Reconnect required'
        : 'Not connected'

  const initials = (user?.name || 'DU')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your identity, display preferences, notification delivery and account security."
      />

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsNav active={tab} onSelect={selectTab} />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 space-y-5"
          >
            {tab === 'profile' ? (
              <SettingsSection
                eyebrow="Identity"
                title="Profile information"
                description="This is how you appear across dashboards, reports and saved analyses."
                actions={<Badge tone="success" dot>Active account</Badge>}
              >
                <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white shadow-sm">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-slate-950">{user?.name || 'Developer'}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email || 'No email on file'}</p>
                  </div>
                  <Badge tone="neutral">Member</Badge>
                </div>

                <form onSubmit={handleSave} className="max-w-xl space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Full name"
                      icon={LuUserRound}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={80}
                    />
                    <Input
                      label="Email address"
                      icon={LuMail}
                      value={user?.email || ''}
                      disabled
                      hint="Email is managed by your account and cannot be changed here."
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <Button type="submit" loading={saving} leftIcon={LuSave}>Save changes</Button>
                    <Button
                      variant="ghost"
                      onClick={() => setName(user?.name || '')}
                      disabled={name === (user?.name || '')}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </SettingsSection>
            ) : null}

            {tab === 'account' ? (
              <SettingsSection
                eyebrow="Overview"
                title="Account details"
                description="Authentication and workspace facts stored on the server."
              >
                <div className="divide-y divide-slate-100">
                  <SettingRow icon={LuUserRound} title="Name" description="Display name on this workspace">
                    <span className="text-[13px] font-semibold text-slate-900">{user?.name || '—'}</span>
                  </SettingRow>
                  <SettingRow icon={LuMail} title="Email" description="Used for sign in and account recovery">
                    <span className="text-[13px] font-semibold text-slate-900">{user?.email || '—'}</span>
                  </SettingRow>
                  <SettingRow icon={LuFingerprint} title="Account ID" description="Unique identifier for your workspace">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={copied ? LuCheck : LuCopy}
                      onClick={copyAccountId}
                    >
                      {copied ? 'Copied' : 'Copy ID'}
                    </Button>
                  </SettingRow>
                  <SettingRow icon={LuCalendarDays} title="Member since" description="When this account was created">
                    <span className="text-[13px] font-semibold text-slate-900">{formatDate(user?.createdAt)}</span>
                  </SettingRow>
                  <SettingRow icon={LuLockKeyhole} title="Authentication" description="How sessions are issued and stored">
                    <Badge tone="violet">JWT + HTTP-only cookie</Badge>
                  </SettingRow>
                </div>
              </SettingsSection>
            ) : null}

            {tab === 'appearance' ? (
              <SettingsSection
                eyebrow="Display"
                title="Appearance"
                description="Preferences are saved on this device and applied instantly across the workspace."
                actions={<Badge tone="cyan">{ACCENTS.find((accent) => accent.id === appearance.accent)?.label} accent</Badge>}
              >
                <div className="space-y-6">
                  <div>
                    <p className="label-caps mb-3">Theme</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {themeOptions.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          disabled={!theme.active}
                          className={`relative rounded-xl border p-4 text-left transition ${
                            theme.active
                              ? 'border-sky-300 bg-sky-50/60'
                              : 'cursor-not-allowed border-slate-200 bg-slate-50/60 opacity-60'
                          }`}
                        >
                          <theme.icon className={`h-5 w-5 ${theme.active ? 'text-sky-600' : 'text-slate-400'}`} />
                          <p className="mt-3 text-[13px] font-semibold text-slate-900">{theme.label}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{theme.description}</p>
                          {theme.active ? <LuCheck className="absolute top-3 right-3 h-4 w-4 text-sky-600" /> : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="label-caps">Accent color</p>
                        <p className="mt-1 text-[11px] text-slate-500">Recolors buttons, links, badges and focus states.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ACCENTS.map((accent) => {
                        const selected = appearance.accent === accent.id
                        return (
                          <button
                            key={accent.id}
                            type="button"
                            onClick={() => updateAppearance({ accent: accent.id })}
                            aria-pressed={selected}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                              selected
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: accent.swatch }} />
                            {accent.label}
                            {selected ? <LuCheck className="h-3 w-3" aria-hidden="true" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <p className="label-caps mb-3">Motion</p>
                    <SettingSwitch
                      label="Reduce motion"
                      description="Minimise animations and transitions, including page changes and hover effects."
                      checked={appearance.reduceMotion}
                      onChange={(value) => updateAppearance({ reduceMotion: value })}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="label-caps mb-3">Preview</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm" leftIcon={LuCheck}>Primary action</Button>
                      <Button size="sm" variant="secondary">Secondary</Button>
                      <Badge tone="cyan" dot>Live status</Badge>
                    </div>
                  </div>
                </div>
              </SettingsSection>
            ) : null}

            {tab === 'notifications' ? (
              <SettingsSection
                eyebrow="Delivery"
                title="Notifications"
                description="These preferences are stored on the server and apply to every device you sign in from."
                actions={
                  <Badge tone={preferencesDirty ? 'warning' : 'success'} dot>
                    {preferencesDirty ? 'Unsaved changes' : 'Saved'}
                  </Badge>
                }
              >
                {preferencesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-24" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="label-caps">Delivery</p>
                      <SettingSwitch
                        label="In-app notifications"
                        description="Store events in the notification inbox and show the unread badge."
                        checked={preferences.inApp}
                        onChange={(value) => updatePreference({ inApp: value })}
                      />
                      <SettingSwitch
                        label="Email notifications"
                        description="Recorded for future delivery; email is not configured in this deployment."
                        badge="Recorded only"
                        checked={preferences.email}
                        onChange={(value) => updatePreference({ email: value })}
                      />
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="label-caps">Event types</p>
                          <p className="mt-1 text-[11px] text-slate-500">Disabled events stop creating new inbox alerts.</p>
                        </div>
                        <Badge tone="neutral">
                          {Object.entries(NOTIFICATION_META).filter(([type]) => preferences.types?.[type] !== false).length} enabled
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(NOTIFICATION_META).map(([type, meta]) => {
                          const enabled = preferences.types?.[type] !== false
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleNotificationType(type, !enabled)}
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

                    <div className="border-t border-slate-100 pt-6">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="label-caps">Muted repositories</p>
                          <p className="mt-1 text-[11px] text-slate-500">Existing alerts stay visible when a repository is muted.</p>
                        </div>
                        <Badge tone="neutral">{(preferences.mutedRepositories || []).length} muted</Badge>
                      </div>
                      {repositories.length ? (
                        <div className="flex flex-wrap gap-2">
                          {repositories.map((repo) => {
                            const muted = (preferences.mutedRepositories || []).map(String).includes(String(repo._id))
                            return (
                              <button
                                key={String(repo._id)}
                                type="button"
                                onClick={() => toggleMutedRepository(repo._id, !muted)}
                                aria-pressed={muted}
                                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                                  muted
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                {muted ? 'Muted · ' : ''}
                                {repo.fullName || repo.name}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Connect GitHub to mute events per repository.</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                      <Link
                        to="/dashboard/notifications"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 transition hover:text-sky-900"
                      >
                        Open notification inbox
                        <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      <Button
                        leftIcon={LuSave}
                        loading={preferencesSaving}
                        disabled={!preferencesDirty}
                        onClick={saveNotificationPreferences}
                      >
                        Save preferences
                      </Button>
                    </div>
                  </div>
                )}
              </SettingsSection>
            ) : null}

            {tab === 'security' ? (
              <>
                <SettingsSection
                  eyebrow="Protection"
                  title="Session security"
                  description="Review how this session is protected, then end it when you are done."
                  actions={<Badge tone="success" dot>Session active</Badge>}
                >
                  <div className="divide-y divide-slate-100">
                    <SettingRow
                      icon={LuMonitor}
                      title="Current session"
                      description="This browser is signed in with the HTTP-only cookie issued by the API."
                      meta={<Badge tone="neutral">This device</Badge>}
                    >
                      <Badge tone="success" dot>Active</Badge>
                    </SettingRow>
                    <SettingRow icon={LuMail} title="Signed in as" description="Account associated with the active session">
                      <span className="max-w-[220px] truncate text-[13px] font-semibold text-slate-900">
                        {user?.email || '—'}
                      </span>
                    </SettingRow>
                    <SettingRow
                      icon={LuFingerprint}
                      title="Token storage"
                      description="No bearer tokens are written to browser local storage."
                    >
                      <Badge tone="violet">Cookie only</Badge>
                    </SettingRow>
                    <SettingRow
                      icon={LuLockKeyhole}
                      title="CSRF protection"
                      description="State-changing requests require a verified CSRF header."
                    >
                      <Badge tone="success" dot>Enabled</Badge>
                    </SettingRow>
                    <SettingRow
                      icon={LuKeyRound}
                      title="Password rotation"
                      description="Password changes are not available in this release."
                    >
                      <Badge tone="neutral">Unavailable</Badge>
                    </SettingRow>
                    <SettingRow
                      icon={LuLogOut}
                      title="End session"
                      description="Sign out of this workspace and return to the sign-in page."
                    >
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={LuLogOut}
                        onClick={() => setSignOutOpen(true)}
                      >
                        Sign out
                      </Button>
                    </SettingRow>
                  </div>
                </SettingsSection>

                <SettingsSection
                  eyebrow="Connections"
                  title="Connected services"
                  description="GitHub access powers repository sync and dependency updates."
                  actions={<Badge tone={githubTone} dot={githubConnected}>{githubLabel}</Badge>}
                >
                  {githubLoading && !githubStatus ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24" />
                      <Skeleton className="h-12" />
                    </div>
                  ) : githubConnected ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {githubStatus.profile?.avatarUrl ? (
                          <img
                            src={githubStatus.profile.avatarUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-11 w-11 rounded-xl border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                            <LuGithub className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-slate-950">
                            {githubStatus.profile?.username || 'GitHub account'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Connected {formatDate(githubStatus.profile?.connectedAt)}
                          </p>
                        </div>
                        <Badge
                          tone={githubStatus.tokenValid === false ? 'warning' : 'success'}
                          dot={githubStatus.tokenValid !== false}
                        >
                          {githubStatus.tokenValid === false ? 'Access limited' : 'Token valid'}
                        </Badge>
                      </div>

                      {githubStatus.message ? (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                          {githubStatus.message}
                        </p>
                      ) : null}

                      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                        <div>
                          <p className="label-caps">Repositories</p>
                          <p className="mt-1 text-[13px] font-semibold text-slate-900">
                            {githubStatus.repositoryCount ?? 0} synced
                          </p>
                        </div>
                        <div>
                          <p className="label-caps">Sync state</p>
                          <p className="mt-1 text-[13px] font-semibold text-slate-900">
                            {githubStatus.syncing
                              ? 'Sync in progress'
                              : githubStatus.status === 'CONNECTED'
                                ? 'Up to date'
                                : githubStatus.status}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                        <Link
                          to="/dashboard/repositories"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 transition hover:text-sky-900"
                        >
                          Open repositories
                          <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={LuRefreshCw}
                          loading={githubLoading}
                          onClick={() => setGithubRefreshKey((value) => value + 1)}
                        >
                          Refresh status
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
                      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
                        <LuGithub className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-[13px] font-semibold text-slate-900">
                        {githubStatus?.status === 'EXPIRED' ? 'GitHub needs reconnecting' : 'GitHub is not connected'}
                      </p>
                      <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-slate-500">
                        {githubStatus?.message ||
                          (githubStatus?.configured === false
                            ? 'GitHub OAuth is not configured in this deployment.'
                            : 'Connect GitHub to sync repositories and generate dependency updates.')}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-4"
                        leftIcon={LuGithub}
                        onClick={() => navigate('/dashboard/repositories')}
                      >
                        Manage connection
                      </Button>
                    </div>
                  )}
                </SettingsSection>

                <Modal
                  open={signOutOpen}
                  onClose={() => { if (!signingOut) setSignOutOpen(false) }}
                  title="Sign out of DevUpdate AI?"
                  description="Your current session will end and you will return to the sign-in page. Appearance preferences stay on this device."
                  footer={
                    <>
                      <Button variant="ghost" onClick={() => setSignOutOpen(false)} disabled={signingOut}>
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        leftIcon={LuLogOut}
                        loading={signingOut}
                        onClick={handleSignOut}
                      >
                        Sign out
                      </Button>
                    </>
                  }
                />
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
