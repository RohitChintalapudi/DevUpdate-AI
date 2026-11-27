const tones = {
  violet: 'bg-violet-50 text-violet-700 border-violet-200/80',
  cyan: 'bg-sky-50 text-sky-700 border-sky-200/80',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  neutral: 'bg-elevated text-subtle border-line',
  outline: 'bg-elevated text-subtle border-line shadow-2xs',
}

export default function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className = '',
  icon: Icon,
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tones[tone] ?? tones.neutral} ${className}`}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}
