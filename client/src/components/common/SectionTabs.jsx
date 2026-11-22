import { NavLink } from 'react-router-dom'
import {
  LuActivity,
  LuBookOpen,
  LuBot,
  LuBoxes,
  LuBrain,
  LuChartNoAxesCombined,
  LuCircleArrowUp,
  LuClock3,
  LuGitBranch,
  LuMessageSquare,
  LuShieldAlert,
  LuSparkles,
  LuThumbsUp,
} from 'react-icons/lu'

const SECTION_TABS = {
  repositories: [
    { label: 'Repositories', path: '/dashboard/repositories', icon: LuGitBranch },
    { label: 'Dependencies', path: '/dashboard/dependencies', icon: LuBoxes },
  ],
  updates: [
    { label: 'All Updates', path: '/dashboard/updates', icon: LuCircleArrowUp },
    { label: 'Intelligence', path: '/dashboard/intelligence', icon: LuActivity },
    { label: 'Security & Advisories', path: '/dashboard/vulnerabilities', icon: LuShieldAlert },
    { label: 'Reports', path: '/dashboard/reports', icon: LuChartNoAxesCombined },
  ],
  ai: [
    { label: 'Overview', path: '/dashboard/ai', icon: LuSparkles },
    { label: 'Recommendations', path: '/dashboard/recommendations', icon: LuBot },
    { label: 'Research Library', path: '/dashboard/ai/research', icon: LuBookOpen },
    { label: 'Repository Chat', path: '/dashboard/ai/chat', icon: LuMessageSquare },
  ],
  memento: [
    { label: 'Project Memory', path: '/dashboard/memory', icon: LuBrain },
    { label: 'Change History', path: '/dashboard/history', icon: LuClock3 },
    { label: 'Decisions & Feedback', path: '/dashboard/feedback', icon: LuThumbsUp },
  ],
}

export default function SectionTabs({ section, className = '' }) {
  const tabs = SECTION_TABS[section]
  if (!tabs?.length) return null

  return (
    <div className={`mb-6 -mt-2 flex items-center overflow-x-auto pb-1 ${className}`}>
      <nav
        className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface/80 p-1 backdrop-blur-md"
        aria-label="Section navigation"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={
              tab.path === '/dashboard/updates' ||
              tab.path === '/dashboard/ai' ||
              tab.path === '/dashboard/repositories' ||
              tab.path === '/dashboard/memory'
            }
            className={({ isActive }) =>
              [
                'group relative inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
                isActive
                  ? 'border border-brandlight/25 bg-brand/15 text-brandlight shadow-2xs font-semibold'
                  : 'border border-transparent text-subtle hover:bg-white/[0.04] hover:text-ink',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    isActive ? 'text-brandlight' : 'text-muted group-hover:text-subtle'
                  }`}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
