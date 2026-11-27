import { useState } from 'react'
import { LuChevronDown, LuChevronRight, LuLogOut, LuMenu, LuSearch, LuSettings, LuUserRound } from 'react-icons/lu'
import { useLocation, useNavigate } from 'react-router-dom'
import Dropdown from '../common/Dropdown'
import NotificationCenter from '../notifications/NotificationCenter'
import { useAuth } from '../../context/AuthContext'

const routeNames = {
  '/dashboard': 'Dashboard',
  '/dashboard/repositories': 'My Repositories',
  '/dashboard/dependencies': 'Dependencies',
  '/dashboard/intelligence': 'Update Intelligence',
  '/dashboard/updates': 'Dependency Updates',
  '/dashboard/vulnerabilities': 'Vulnerabilities',
  '/dashboard/ai': 'AI Overview',
  '/dashboard/ai/research': 'Research Library',
  '/dashboard/ai/chat': 'Repository Chat',
  '/dashboard/recommendations': 'AI Recommendations',
  '/dashboard/memory': 'Repository Memory',
  '/dashboard/history': 'Change History',
  '/dashboard/feedback': 'Decision Feedback',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/reports': 'Reports',
  '/dashboard/settings': 'Settings',
}

export default function Topbar({ onOpenMobileNav, onOpenLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [search, setSearch] = useState('')
  const path = location.pathname
  const current =
    routeNames[path] ||
    (path.startsWith('/dashboard/updates/repository/')
      ? 'Repository Updates'
      : path.startsWith('/dashboard/updates/')
        ? 'Dependency Update'
        : path.startsWith('/dashboard/ai/analysis/')
          ? 'Analysis Detail'
          : 'Dashboard')
  const initials = (user?.name || 'DU')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = () => {
    if (onOpenLogout) {
      onOpenLogout()
    } else {
      logout().then(() => navigate('/login', { replace: true }))
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
      >
        <LuMenu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 items-center gap-2 text-[13px] md:flex">
        <span className="text-slate-400">Workspace</span>
        <LuChevronRight className="h-3.5 w-3.5 text-slate-400/60" />
        <span className="truncate font-semibold text-slate-900">{current}</span>
      </div>

      <form
        className="relative ml-auto hidden w-full max-w-[300px] sm:block"
        onSubmit={(event) => {
          event.preventDefault()
          navigate(`/dashboard/dependencies?search=${encodeURIComponent(search.trim())}`)
        }}
      >
        <LuSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search packages..."
          aria-label="Search dependencies"
          className="h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50 pr-3 pl-9 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <NotificationCenter />

        <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

        <Dropdown
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-1 pr-2 transition hover:bg-slate-100 hover:border-slate-300"
              aria-label="Open profile menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-[11px] font-bold text-white shadow-2xs">
                {initials}
              </span>
              <span className="hidden max-w-28 truncate text-[13px] font-semibold text-slate-900 sm:block">
                {user?.name?.split(' ')[0] || 'Developer'}
              </span>
              <LuChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>
          }
          items={[
            {
              label: 'Profile settings',
              icon: LuUserRound,
              onClick: () => navigate('/dashboard/settings'),
            },
            {
              label: 'Account settings',
              icon: LuSettings,
              onClick: () => navigate('/dashboard/settings?tab=account'),
            },
            { divider: true },
            { label: 'Log out', icon: LuLogOut, danger: true, onClick: handleLogout },
          ]}
        />
      </div>
    </header>
  )
}
