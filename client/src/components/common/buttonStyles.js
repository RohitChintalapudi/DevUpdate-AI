const variants = {
  primary:
    'bg-gradient-to-r from-brand to-brandlight text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.8)] hover:shadow-[0_14px_36px_-10px_rgba(139,92,246,0.95)] hover:brightness-110',
  cyan: 'bg-gradient-to-r from-brand via-violet-500 to-accent text-white shadow-[0_10px_30px_-12px_rgba(34,211,238,0.7)] hover:brightness-110',
  secondary:
    'bg-elevated text-ink border border-line hover:border-brandlight/40 hover:bg-elevated/80',
  outline:
    'border border-white/15 text-ink hover:border-brandlight/50 hover:bg-white/[0.04]',
  ghost: 'text-subtle hover:text-ink hover:bg-white/[0.06]',
  danger: 'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/20',
}

const sizes = {
  xs: 'h-8 px-3 text-[11px] rounded-lg gap-1.5',
  sm: 'h-9 px-3.5 text-[13px] rounded-lg gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-xl gap-2.5',
  icon: 'h-10 w-10 rounded-xl justify-center',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  disabled = false,
} = {}) {
  return [
    'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 select-none',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    variants[variant] ?? variants.primary,
    sizes[size] ?? sizes.md,
    fullWidth ? 'w-full' : '',
    disabled ? '' : 'active:scale-[0.98]',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
