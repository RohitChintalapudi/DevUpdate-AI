const tones = {
  violet: 'bg-brand/12 text-brandlight border-brand/25',
  cyan: 'bg-accent/10 text-accent border-accent/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  neutral: 'bg-white/[0.05] text-subtle border-line',
  outline: 'bg-transparent text-subtle border-white/15',
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
