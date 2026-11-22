import { useState } from 'react'
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, Search, Settings, UserRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import Dropdown from '../common/Dropdown'
import { useAuth } from '../../context/AuthContext'

const routeNames = {
  '/dashboard': 'Dashboard',
  '/dashboard/repositories': 'My Repositories',
  '/dashboard/dependencies': 'Dependencies',
  '/dashboard/intelligence': 'Update Intelligence',
  '/dashboard/recommendations': 'AI Recommendations',
  '/dashboard/memory': 'Memento Memory',
  '/dashboard/reports': 'Reports',
  '/dashboard/settings': 'Settings',
}

export default function Topbar({ onOpenMobileNav }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [search, setSearch] = useState('')
  const current = routeNames[location.pathname] || 'Dashboard'
  const initials = (user?.name || 'DU')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-subtle transition hover:bg-white/5 hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 items-center gap-2 text-[13px] md:flex">
        <span className="text-muted">Workspace</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted/60" />
        <span className="truncate font-medium text-ink">{current}</span>
      </div>

      <form
        className="relative ml-auto hidden w-full max-w-[300px] sm:block"
        onSubmit={(event) => {
          event.preventDefault()
          navigate(`/dashboard/dependencies?search=${encodeURIComponent(search.trim())}`)
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search packages..."
          aria-label="Search dependencies"
          className="h-9 w-full rounded-lg border border-line bg-surface/80 pr-3 pl-9 text-[13px] text-ink outline-none transition placeholder:text-muted/70 hover:border-white/15 focus:border-brandlight/50 focus:ring-4 focus:ring-brand/10"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <Dropdown
          trigger={
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface/60 text-subtle transition hover:border-white/15 hover:text-ink"
            >
              <Bell className="h-[17px] w-[17px]" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brandlight ring-2 ring-canvas" />
            </button>
          }
          items={[
            {
              label: '3 sample alerts in preview',
              icon: Bell,
              onClick: () => navigate('/dashboard/intelligence'),
            },
            {
              label: 'View AI recommendations',
              icon: Settings,
              onClick: () => navigate('/dashboard/recommendations'),
            },
          ]}
        />

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <Dropdown
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg p-1 pr-1.5 transition hover:bg-white/5"
              aria-label="Open profile menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent text-[11px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden max-w-28 truncate text-[13px] font-medium text-ink sm:block">
                {user?.name?.split(' ')[0] || 'Developer'}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted sm:block" />
            </button>
          }
          items={[
            {
              label: 'Profile settings',
              icon: UserRound,
              onClick: () => navigate('/dashboard/settings'),
            },
            {
              label: 'Account settings',
              icon: Settings,
              onClick: () => navigate('/dashboard/settings?tab=account'),
            },
            { divider: true },
            { label: 'Log out', icon: LogOut, danger: true, onClick: handleLogout },
          ]}
        />
      </div>
    </header>
  )
}
