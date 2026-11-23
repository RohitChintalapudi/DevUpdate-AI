import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LuBrain,
  LuCircleArrowUp,
  LuCircleHelp,
  LuGitBranch,
  LuLayoutDashboard,
  LuLogOut,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuRadio,
  LuSettings,
  LuSparkles,
  LuX,
} from 'react-icons/lu'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogoMark } from '../common/Logo'
import { useAuth } from '../../context/AuthContext'
import HelpModal from './HelpModal'

const PRIMARY_NAV_ITEMS = [
  {
    label: 'Overview',
    path: '/dashboard',
    icon: LuLayoutDashboard,
    isMatch: (pathname) => pathname === '/dashboard',
  },
  {
    label: 'Repositories',
    path: '/dashboard/repositories',
    icon: LuGitBranch,
    isMatch: (pathname) =>
      pathname === '/dashboard/repositories' ||
      pathname.startsWith('/dashboard/repositories/') ||
      pathname.startsWith('/dashboard/dependencies'),
  },
  {
    label: 'Updates',
    path: '/dashboard/updates',
    icon: LuCircleArrowUp,
    isMatch: (pathname) =>
      pathname.startsWith('/dashboard/updates') ||
      pathname.startsWith('/dashboard/intelligence') ||
      pathname.startsWith('/dashboard/vulnerabilities') ||
      pathname.startsWith('/dashboard/reports'),
  },
  {
    label: 'AI Intelligence',
    path: '/dashboard/ai',
    icon: LuSparkles,
    isMatch: (pathname) =>
      pathname.startsWith('/dashboard/ai') ||
      pathname.startsWith('/dashboard/recommendations'),
  },
  {
    label: 'Release Radar',
    path: '/dashboard/radar',
    icon: LuRadio,
    badge: '6M',
    isMatch: (pathname) => pathname.startsWith('/dashboard/radar'),
  },
  {
    label: 'Memento',
    path: '/dashboard/memory',
    icon: LuBrain,
    isMatch: (pathname) =>
      pathname.startsWith('/dashboard/memory') ||
      pathname.startsWith('/dashboard/history') ||
      pathname.startsWith('/dashboard/feedback'),
  },
]

function NavButton({ item, isActive, collapsed, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={[
        'group relative flex h-10 items-center rounded-xl text-[13px] font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
        isActive
          ? 'bg-slate-950 text-white shadow-xs font-semibold'
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950',
      ].join(' ')}
    >
      {isActive ? (
        <motion.span
          layoutId="sidebar-active"
          className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-sky-400"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      ) : null}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors ${
          isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-700'
        }`}
        aria-hidden="true"
      />
      {!collapsed ? (
        <span className="flex flex-1 items-center justify-between gap-1 truncate">
          <span className="truncate">{item.label}</span>
          {item.badge ? (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold tracking-wider ${
                isActive ? 'bg-sky-400/20 text-sky-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {item.badge}
            </span>
          ) : null}
        </span>
      ) : null}

      {/* Floating tooltip for collapsed view */}
      {collapsed ? (
        <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 text-white px-2.5 py-1 text-xs font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {item.label}
        </div>
      ) : null}
    </NavLink>
  )
}

function SidebarContent({
  collapsed,
  onCollapse,
  onNavigate,
  showCollapse,
  onOpenHelp,
  onOpenLogout,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const pathname = location.pathname

  const initials = (user?.name || 'Developer')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'DU'

  const handleLogout = () => {
    if (onOpenLogout) {
      onOpenLogout()
    } else {
      logout().then(() => navigate('/login', { replace: true }))
    }
  }

  const isSettingsActive = pathname.startsWith('/dashboard/settings')

  return (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/80">
      {/* Top Header & Brand */}
      <div
        className={`flex h-[72px] shrink-0 items-center border-b border-slate-200/80 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          className={`flex items-center outline-none ${collapsed ? '' : 'gap-2.5'}`}
        >
          <LogoMark className="h-8 w-8 shrink-0" />
          {!collapsed ? (
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-[-0.03em] text-slate-950">
                DevUpdate <span className="text-sky-600">AI</span>
              </p>
              <p className="text-[10px] text-slate-400">Dependency intelligence</p>
            </div>
          ) : null}
        </NavLink>

        {showCollapse && !collapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none"
          >
            <LuPanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Main Workspace Navigation */}
      <div className="scrollbar-slim flex-1 overflow-y-auto px-3 py-4">
        {/* Workspace Category Label */}
        <div className="mb-2 px-3">
          <p
            className={`text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase ${
              collapsed ? 'text-center' : ''
            }`}
          >
            {collapsed ? '•' : 'WORKSPACE'}
          </p>
        </div>

        {/* 5 Primary Navigation Items */}
        <nav className="space-y-1" aria-label="Workspace navigation">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              isActive={item.isMatch(pathname)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      {/* Bottom Section: Settings, Help & Support, Profile */}
      <div className="shrink-0 border-t border-slate-200/80 p-3 space-y-1">
        {/* Settings */}
        <NavLink
          to="/dashboard/settings"
          onClick={onNavigate}
          className={[
            'group relative flex h-10 items-center rounded-xl text-[13px] font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
            isSettingsActive
              ? 'bg-slate-950 text-white shadow-xs font-semibold'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950',
          ].join(' ')}
        >
          {isSettingsActive ? (
            <motion.span
              layoutId="sidebar-active"
              className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-sky-400"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          ) : null}
          <LuSettings
            className={`h-[18px] w-[18px] shrink-0 transition-colors ${
              isSettingsActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-700'
            }`}
            aria-hidden="true"
          />
          {!collapsed ? <span className="truncate">Settings</span> : null}
          {collapsed ? (
            <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 text-white px-2.5 py-1 text-xs font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Settings
            </div>
          ) : null}
        </NavLink>

        {/* Help & Support */}
        <button
          type="button"
          onClick={onOpenHelp}
          className={[
            'group relative flex h-10 w-full items-center rounded-xl text-[13px] font-medium transition-all duration-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
          ].join(' ')}
        >
          <LuCircleHelp
            className="h-[18px] w-[18px] shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors"
            aria-hidden="true"
          />
          {!collapsed ? <span className="truncate">Help & Support</span> : null}
          {collapsed ? (
            <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 text-white px-2.5 py-1 text-xs font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Help & Support
            </div>
          ) : null}
        </button>

        {/* User Profile Card */}
        <div className="pt-2">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white text-xs font-bold shadow-2xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-slate-950">
                    {user?.name || 'Developer'}
                  </p>
                </div>
                <span className="inline-block rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 px-1.5 py-0.2 text-[9.5px] font-semibold">
                  Free Workspace
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                aria-label="Log out"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                <LuLogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                aria-label="Log out"
              >
                <LuLogOut className="h-4 w-4" />
                <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 text-white px-2.5 py-1 text-xs font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  Log out
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onOpenLogout,
}) {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-line lg:block"
        style={{ width: collapsed ? 72 : 240 }}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapse={() => setCollapsed(true)}
          showCollapse
          onOpenHelp={() => setHelpOpen(true)}
          onOpenLogout={onOpenLogout}
        />
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="absolute top-[86px] -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elevated text-subtle shadow-lg transition hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <LuPanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-60 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-[260px] max-w-[85vw] border-r border-line shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute top-5 right-3 z-10 rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <LuX className="h-5 w-5" />
              </button>
              <SidebarContent
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
                onOpenHelp={() => {
                  setMobileOpen(false)
                  setHelpOpen(true)
                }}
                onOpenLogout={() => {
                  setMobileOpen(false)
                  onOpenLogout?.()
                }}
              />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
