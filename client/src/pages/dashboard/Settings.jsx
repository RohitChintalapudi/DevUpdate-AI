import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Bell,
  Check,
  CircleCheck,
  LockKeyhole,
  Mail,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  UserRound,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../context/AuthContext'

const tabs = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: LockKeyhole },
]

const themes = [
  { id: 'dark', label: 'Midnight', description: 'Dark theme — the current DevUpdate AI look', icon: Moon, active: true },
  { id: 'light', label: 'Daylight', description: 'Planned for a future phase', icon: Sun, active: false },
  { id: 'system', label: 'System', description: 'Planned for a future phase', icon: Monitor, active: false },
]

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const [tab, setTab] = useState(tabs.some((item) => item.id === requested) ? requested : 'profile')
  const [name, setName] = useState(user?.name || '')
  const email = user?.email || ''
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState({
    updates: true,
    security: true,
    weekly: false,
  })

  const selectTab = (id) => {
    setTab(id)
    setMessage('')
    setError('')
    setSearchParams(id === 'profile' ? {} : { tab: id }, { replace: true })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!name.trim()) {
      setError('Name cannot be empty.')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ name: name.trim() })
      setMessage('Profile updated successfully.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title="Settings"
        description="Manage your profile and preferences for this workspace."
      />

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex gap-2 overflow-x-auto scrollbar-slim pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium transition ${
                tab === item.id
                  ? 'bg-brand/12 text-brandlight'
                  : 'text-subtle hover:bg-white/5 hover:text-ink'
              }`}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'profile' ? (
              <Card>
                <h2 className="text-base font-semibold text-ink">Profile information</h2>
                <p className="mt-1 text-[12px] text-subtle">Update the details shown across your workspace.</p>
                <form onSubmit={handleSave} className="mt-6 max-w-lg space-y-5">
                  {message ? (
                    <div role="status" className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/[0.07] px-3.5 py-3 text-[13px] text-success">
                      <CircleCheck className="h-4 w-4" /> {message}
                    </div>
                  ) : null}
                  {error ? (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-3 text-[13px] text-danger">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                  ) : null}
                  <Input label="Full name" icon={UserRound} value={name} onChange={(event) => setName(event.target.value)} />
                  <div>
                    <Input label="Email address" icon={Mail} value={email} disabled hint="Email changes are not available in Phase 1." />
                  </div>
                  <Button type="submit" loading={saving} leftIcon={Save}>Save changes</Button>
                </form>
              </Card>
            ) : null}

            {tab === 'account' ? (
              <Card>
                <h2 className="text-base font-semibold text-ink">Account details</h2>
                <p className="mt-1 text-[12px] text-subtle">Your authentication and workspace information.</p>
                <div className="mt-6 divide-y divide-line">
                  {[
                    ['Name', user?.name || '—'],
                    ['Email', user?.email || '—'],
                    ['Account ID', user?._id || '—'],
                    ['Authentication', 'JWT + HTTP-only cookie'],
                    ['Member since', user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[12px] text-muted">{label}</span>
                      <span className="truncate text-[13px] font-medium text-ink">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {tab === 'appearance' ? (
              <Card>
                <h2 className="text-base font-semibold text-ink">Appearance</h2>
                <p className="mt-1 text-[12px] text-subtle">Choose how DevUpdate AI looks on this device.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      disabled={!theme.active}
                      className={`relative rounded-xl border p-4 text-left transition ${
                        theme.active
                          ? 'border-brand/40 bg-brand/[0.08]'
                          : 'border-line bg-canvas/40 opacity-60'
                      }`}
                    >
                      <theme.icon className={`h-5 w-5 ${theme.active ? 'text-brandlight' : 'text-muted'}`} />
                      <p className="mt-3 text-[13px] font-semibold text-ink">{theme.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">{theme.description}</p>
                      {theme.active ? <Check className="absolute top-3 right-3 h-4 w-4 text-brandlight" /> : null}
                    </button>
                  ))}
                </div>
              </Card>
            ) : null}

            {tab === 'notifications' ? (
              <Card>
                <h2 className="text-base font-semibold text-ink">Notifications</h2>
                <p className="mt-1 text-[12px] text-subtle">These toggles are a local UI preview in Phase 1.</p>
                <div className="mt-6 divide-y divide-line">
                  {[
                    { key: 'updates', label: 'New dependency updates', detail: 'Get notified when a tracked package has a new version.' },
                    { key: 'security', label: 'Security advisories', detail: 'Prioritise advisories affecting your projects.' },
                    { key: 'weekly', label: 'Weekly health digest', detail: 'A summary of dependency health across workspaces.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                      <div>
                        <p className="text-[13px] font-medium text-ink">{item.label}</p>
                        <p className="mt-1 text-[11px] text-muted">{item.detail}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifications[item.key]}
                        aria-label={item.label}
                        onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${notifications[item.key] ? 'bg-brand' : 'bg-white/10'}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${notifications[item.key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {tab === 'security' ? (
              <Card>
                <h2 className="text-base font-semibold text-ink">Security</h2>
                <p className="mt-1 text-[12px] text-subtle">Session and account protection details.</p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/40 p-4">
                    <Shield className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-[13px] font-medium text-ink">HTTP-only session cookie</p>
                      <p className="mt-0.5 text-[11px] text-muted">Active · protected from client-side JavaScript access</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/40 p-4">
                    <LockKeyhole className="h-5 w-5 text-brandlight" />
                    <div>
                      <p className="text-[13px] font-medium text-ink">Password change</p>
                      <p className="mt-0.5 text-[11px] text-muted">Password rotation will be available in a later phase.</p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
