import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-9 w-9', theme = 'dark' }) {
  const isLight = theme === 'light'

  return (
    <span
      className={`${className} relative inline-flex shrink-0 items-center justify-center rounded-xl ${
        isLight
          ? 'bg-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-white'
          : 'bg-slate-900 border border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.4)] text-white'
      } transition-transform hover:scale-105`}
      aria-hidden="true"
    >
      {/* Unified 4-lobed geometric dependency node clover symbol matching favicon */}
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[58%] w-[58%]">
        <circle cx="8" cy="8" r="3.2" fill="#FFFFFF" />
        <circle cx="16" cy="8" r="3.2" fill="#FFFFFF" />
        <circle cx="8" cy="16" r="3.2" fill="#FFFFFF" />
        <circle cx="16" cy="16" r="3.2" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="1.8" fill="#38BDF8" />
      </svg>
    </span>
  )
}

export default function Logo({ compact = false, to = '/', className = '', theme = 'dark' }) {
  const isLight = theme === 'light'

  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 group ${className}`}>
      <LogoMark className={compact ? 'h-8 w-8' : 'h-8.5 w-8.5'} theme={theme} />
      {!compact ? (
        <span
          className={`text-[17px] font-bold tracking-[-0.03em] transition-colors ${
            isLight
              ? 'text-slate-950 group-hover:text-black'
              : 'text-ink group-hover:text-white'
          }`}
        >
          DevUpdate{' '}
          <span className={isLight ? 'font-semibold text-slate-500' : 'text-sky-400 font-semibold'}>
            AI
          </span>
        </span>
      ) : null}
    </Link>
  )
}
