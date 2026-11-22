import { motion } from 'framer-motion'
import { LuArrowUpRight } from 'react-icons/lu'

const tones = {
  violet: { icon: 'text-violet-600', bg: 'bg-violet-50', ring: 'border-violet-200/90', glow: 'from-violet-400/20' },
  cyan: { icon: 'text-sky-600', bg: 'bg-sky-50', ring: 'border-sky-200/90', glow: 'from-sky-400/20' },
  success: { icon: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'border-emerald-200/90', glow: 'from-emerald-400/20' },
  danger: { icon: 'text-rose-600', bg: 'bg-rose-50', ring: 'border-rose-200/90', glow: 'from-rose-400/20' },
  warning: { icon: 'text-amber-600', bg: 'bg-amber-50', ring: 'border-amber-200/90', glow: 'from-amber-400/20' },
  purple: { icon: 'text-purple-600', bg: 'bg-purple-50', ring: 'border-purple-200/90', glow: 'from-purple-400/20' },
  neutral: { icon: 'text-slate-700', bg: 'bg-slate-100', ring: 'border-slate-200/90', glow: 'from-slate-400/20' },
}

export default function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'violet',
  trend,
  index = 0,
  square = false,
  className = '',
  onClick,
}) {
  const theme = tones[tone] ?? tones.violet
  const Wrapper = onClick ? motion.button : motion.div

  if (square) {
    return (
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
        whileHover={onClick ? { y: -2 } : undefined}
        className={`group relative aspect-square min-h-0 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 text-left transition-all duration-300 hover:border-sky-300 hover:shadow-md flex flex-col justify-between ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div
          className={`pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br ${theme.glow} to-transparent opacity-40`}
        />
        <div className="min-w-0">
          <div className="relative flex items-center justify-between">
            <div
              className={`flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-lg border ${theme.bg} ${theme.ring} shadow-xs transition-transform duration-200 group-hover:scale-105`}
            >
              {Icon ? <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme.icon} stroke-[2.2]`} aria-hidden="true" /> : null}
            </div>
            {trend ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200/70 px-1 py-0.2 text-[9px] font-semibold text-emerald-700">
                <LuArrowUpRight className="h-2 w-2" />
                {trend}
              </span>
            ) : null}
          </div>
          <p
            className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-400 uppercase relative mt-1 sm:mt-1.5 truncate"
            title={label}
          >
            {label}
          </p>
          <div className="relative mt-0.5 flex items-baseline">
            <span className="text-[17px] sm:text-[20px] font-bold tracking-tight text-slate-950 leading-none">
              {value}
            </span>
          </div>
        </div>
        <p
          className="relative text-[9px] sm:text-[10px] leading-tight text-slate-400 truncate mt-0.5 sm:mt-1"
          title={description}
        >
          {description}
        </p>
      </Wrapper>
    )
  }

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -3 } : undefined}
      className={`group relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left transition-all duration-300 hover:border-sky-300 hover:shadow-md sm:p-6 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div
        className={`pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br ${theme.glow} to-transparent opacity-40`}
      />
      <div>
        <div className="relative flex items-start justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border ${theme.bg} ${theme.ring} shadow-xs transition-transform duration-200 group-hover:scale-105`}
          >
            {Icon ? <Icon className={`h-6 w-6 ${theme.icon} stroke-[2.2]`} aria-hidden="true" /> : null}
          </div>
          {trend ? (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <LuArrowUpRight className="h-3 w-3" />
              {trend}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase relative mt-4 truncate">{label}</p>
        <div className="relative mt-1 flex items-end gap-3">
          <span className="text-[30px] sm:text-[34px] leading-none font-bold tracking-tight text-slate-950">{value}</span>
        </div>
      </div>
      <p className="relative mt-2 text-xs leading-relaxed text-slate-500 line-clamp-1">{description}</p>
    </Wrapper>
  )
}
