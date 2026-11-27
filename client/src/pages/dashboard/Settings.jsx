import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LuCalendarDays,
  LuCheck,
  LuCopy,
  LuFingerprint,
  LuKeyRound,
  LuLockKeyhole,
  LuMail,
  LuMonitor,
  LuMoon,
  LuSave,
  LuShield,
  LuSun,
  LuUserRound,
} from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import Toast from '../../components/common/Toast'
import SettingRow from '../../components/settings/SettingRow'
import SettingsNav from '../../components/settings/SettingsNav'
import SettingsSection from '../../components/settings/SettingsSection'
import { isSettingsTab } from '../../constants/settingsTabs'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/updateHelpers'

const themes = [
  { id: 'daylight', label: 'Daylight', description: 'The current DevUpdate AI look', icon: LuSun, active: true },
  { id: 'midnight', label: 'Midnight', description: 'Planned for a future phase', icon: LuMoon, active: false },
  { id: 'system', label: 'System', description: 'Planned for a future phase', icon: LuMonitor, active: false },
]

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const [tab, setTab] = useState(isSettingsTab(requested) ? requested : 'profile')
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)
  const [notifications, setNotifications] = useState({ updates: true, security: true, weekly: false })

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

  const selectTab = (id) => {
    setTab(id)
    setToast(null)
    setSearchParams(id === 'profile' ? {} : { tab: id }, { replace: true })
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
                description="Choose how DevUpdate AI looks on this device."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      disabled={!theme.active}
                      className={`relative rounded-xl border p-4 text-left transition ${
                        theme.active
                          ? 'border-sky-300 bg-sky-50/60'
                          : 'border-slate-200 bg-slate-50/60 opacity-60'
                      }`}
                    >
                      <theme.icon className={`h-5 w-5 ${theme.active ? 'text-sky-600' : 'text-slate-400'}`} />
                      <p className="mt-3 text-[13px] font-semibold text-slate-900">{theme.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{theme.description}</p>
                      {theme.active ? <LuCheck className="absolute top-3 right-3 h-4 w-4 text-sky-600" /> : null}
                    </button>
                  ))}
                </div>
              </SettingsSection>
            ) : null}

            {tab === 'notifications' ? (
              <SettingsSection
                eyebrow="Delivery"
                title="Notifications"
                description="Choose which events matter to you. Full preferences live in the notification inbox."
              >
                <div className="space-y-2">
                  {[
                    { key: 'updates', label: 'New dependency updates', detail: 'Alerts when a tracked package has a new version.' },
                    { key: 'security', label: 'Security advisories', detail: 'Prioritise advisories affecting your projects.' },
                    { key: 'weekly', label: 'Weekly health digest', detail: 'A summary of dependency health across workspaces.' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="switch"
                      aria-checked={notifications[item.key]}
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                      className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300"
                    >
                      <span>
                        <span className="block text-[13px] font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{item.detail}</span>
                      </span>
                      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${notifications[item.key] ? 'bg-sky-600' : 'bg-slate-200'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${notifications[item.key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </span>
                    </button>
                  ))}
                </div>
              </SettingsSection>
            ) : null}

            {tab === 'security' ? (
              <SettingsSection
                eyebrow="Protection"
                title="Security"
                description="Session and account protection details."
              >
                <div className="divide-y divide-slate-100">
                  <SettingRow icon={LuShield} title="HTTP-only session cookie" description="Protected from client-side JavaScript access">
                    <Badge tone="success" dot>Active</Badge>
                  </SettingRow>
                  <SettingRow icon={LuKeyRound} title="Password change" description="Password rotation will be available in a later phase.">
                    <Badge tone="neutral">Unavailable</Badge>
                  </SettingRow>
                  <SettingRow icon={LuLockKeyhole} title="CSRF protection" description="State-changing requests require a verified header.">
                    <Badge tone="success" dot>Enabled</Badge>
                  </SettingRow>
                </div>
              </SettingsSection>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
