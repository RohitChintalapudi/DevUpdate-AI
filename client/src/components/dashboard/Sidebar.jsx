import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Bot,
  BrainCircuit,
  ChevronLeft,
  FileBarChart2,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftOpen,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogoMark } from '../common/Logo'
import { useAuth } from '../../context/AuthContext'

const navGroups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }],
  },
  {
    label: 'Project management',
    items: [
      { label: 'My Repositories', icon: GitBranch, path: '/dashboard/repositories' },
      { label: 'Dependencies', icon: Package, path: '/dashboard/dependencies' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Update Intelligence', icon: Activity, path: '/dashboard/intelligence' },
      { label: 'AI Recommendations', icon: Bot, path: '/dashboard/recommendations' },
      { label: 'Memento Memory', icon: BrainCircuit, path: '/dashboard/memory' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Reports', icon: FileBarChart2, path: '/dashboard/reports' },
      { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
    ],
  },
]

function NavItems({ collapsed, onNavigate }) {
  return (
    <nav className="scrollbar-slim flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p
            className={`mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-muted uppercase ${collapsed ? 'text-center' : ''}`}
          >
            {collapsed ? '•' : group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  [
                    'group relative flex h-10 items-center rounded-lg text-[13px] font-medium transition-all duration-200',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    isActive
                      ? 'bg-brand/12 text-brandlight'
                      : 'text-subtle hover:bg-white/[0.05] hover:text-ink',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-brandlight"
                      />
                    ) : null}
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function SidebarContent({ collapsed, onCollapse, onNavigate, showCollapse }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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
    <div className="flex h-full flex-col bg-surface/95">
      <div
        className={`flex h-[72px] shrink-0 items-center border-b border-line ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}
      >
        <div className={`flex items-center ${collapsed ? '' : 'gap-2.5'}`}>
          <LogoMark className="h-8 w-8" />
          {!collapsed ? (
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-[-0.03em] text-ink">
                DevUpdate <span className="text-brandlight">AI</span>
              </p>
              <p className="text-[10px] text-muted">Dependency intelligence</p>
            </div>
          ) : null}
        </div>
        {showCollapse && !collapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <NavItems collapsed={collapsed} onNavigate={onNavigate} />

      <div className="shrink-0 border-t border-line p-3">
        {!collapsed ? (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{user?.name || 'Developer'}</p>
              <p className="truncate text-[11px] text-muted">{user?.email || 'demo@devupdate.ai'}</p>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          className={`flex h-10 w-full items-center rounded-lg text-[13px] font-medium text-subtle transition hover:bg-danger/10 hover:text-danger ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {!collapsed ? 'Log out' : null}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 250 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-line lg:block"
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapse={() => setCollapsed(true)}
          showCollapse
        />
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="absolute top-[86px] -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elevated text-subtle shadow-lg transition hover:text-ink"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
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
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-[280px] max-w-[85vw] border-r border-line shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute top-5 right-3 z-10 rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
              />
              <div className="pointer-events-none absolute right-4 bottom-20 flex items-center gap-1.5 text-[10px] text-muted">
                <Sparkles className="h-3 w-3 text-brandlight" /> Phase 1 preview
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
