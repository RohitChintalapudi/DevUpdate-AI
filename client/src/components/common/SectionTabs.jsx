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
}

export default function SectionTabs({ section, className = '' }) {
  const tabs = SECTION_TABS[section]
  if (!tabs?.length) return null

  return (
    <div className={`mb-6 -mt-2 flex items-center overflow-x-auto pb-1 ${className}`}>
      <nav
        className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-2xs backdrop-blur-md"
        aria-label="Section navigation"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={
              tab.path === '/dashboard/updates' ||
              tab.path === '/dashboard/repositories' ||
              tab.path === '/dashboard/memory'
            }
            className={({ isActive }) =>
              [
                'group relative inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-slate-950 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-700'
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
