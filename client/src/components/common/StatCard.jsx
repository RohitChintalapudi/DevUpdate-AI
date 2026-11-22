import { motion } from 'framer-motion'
import { LuArrowUpRight } from 'react-icons/lu'
const tones = {
  violet: { icon: 'text-violet-600', bg: 'bg-violet-50', ring: 'border-violet-100' },
  cyan: { icon: 'text-sky-600', bg: 'bg-sky-50', ring: 'border-sky-100' },
  success: { icon: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'border-emerald-100' },
  danger: { icon: 'text-rose-600', bg: 'bg-rose-50', ring: 'border-rose-100' },
  warning: { icon: 'text-amber-600', bg: 'bg-amber-50', ring: 'border-amber-100' },
}

export default function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'violet',
  trend,
  index = 0,
  onClick,
}) {
  const theme = tones[tone] ?? tones.violet
  const Wrapper = onClick ? motion.button : motion.div

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -4 } : undefined}
      className="group relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left transition-all duration-300 hover:border-slate-300 hover:shadow-xs sm:p-6"
    >
      <div
        className={`pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${theme.bg} opacity-50`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${theme.bg} ${theme.ring}`}
        >
          {Icon ? <Icon className={`h-[21px] w-[21px] ${theme.icon}`} aria-hidden="true" /> : null}
        </div>
        {trend ? (
          <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <LuArrowUpRight className="h-3 w-3" />
            {trend}
          </span>
        ) : null}
      </div>
      <p className="label-caps relative mt-5 text-slate-500">{label}</p>
      <div className="relative mt-1.5 flex items-end gap-3">
        <span className="text-[32px] leading-none font-bold tracking-tight text-slate-950">{value}</span>
      </div>
      <p className="relative mt-2.5 text-xs leading-relaxed text-slate-500">{description}</p>
    </Wrapper>
  )
}
