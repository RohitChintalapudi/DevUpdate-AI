import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <span
      className={`${className} relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent shadow-[0_6px_20px_-6px_rgba(139,92,246,0.8)]`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" fill="none" className="h-[62%] w-[62%]">
        <path
          d="M8 8.5h7.2c3.3 0 4.4 2.2 4.4 4.6 0 2.5-1.4 4.6-4.7 4.6H12"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path d="M8 8.5v15" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="23.5" cy="8.5" r="2.6" fill="white" fillOpacity="0.95" />
        <circle cx="8" cy="23.5" r="2.6" fill="white" fillOpacity="0.95" />
      </svg>
    </span>
  )
}

export default function Logo({ compact = false, to = '/', className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 group ${className}`}>
      <LogoMark className={compact ? 'h-8 w-8' : 'h-9 w-9'} />
      {!compact ? (
        <span className="text-[17px] font-bold tracking-[-0.03em] text-ink transition-colors group-hover:text-white">
          DevUpdate <span className="text-gradient">AI</span>
        </span>
      ) : null}
    </Link>
  )
}
