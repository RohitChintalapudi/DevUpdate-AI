const variants = {
  primary:
    'bg-slate-950 text-white rounded-full hover:bg-slate-800 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0',
  cyan: 'bg-sky-600 text-white rounded-full hover:bg-sky-700 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs rounded-full transition-all',
  outline:
    'border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-950 rounded-full transition-all',
  ghost: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-full transition-all',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-full transition-all',
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
