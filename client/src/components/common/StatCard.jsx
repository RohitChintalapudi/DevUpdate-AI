import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const tones = {
  violet: { icon: 'text-brandlight', bg: 'bg-brand/12', ring: 'border-brand/20' },
  cyan: { icon: 'text-accent', bg: 'bg-accent/10', ring: 'border-accent/20' },
  success: { icon: 'text-success', bg: 'bg-success/10', ring: 'border-success/20' },
  danger: { icon: 'text-danger', bg: 'bg-danger/10', ring: 'border-danger/20' },
  warning: { icon: 'text-warning', bg: 'bg-warning/10', ring: 'border-warning/20' },
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
      className="group relative w-full overflow-hidden rounded-2xl border border-line bg-card/80 p-5 text-left transition-colors duration-300 hover:border-white/15 sm:p-6"
    >
      <div
        className={`pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${theme.bg} opacity-40`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${theme.bg} ${theme.ring}`}
        >
          {Icon ? <Icon className={`h-[21px] w-[21px] ${theme.icon}`} aria-hidden="true" /> : null}
        </div>
        {trend ? (
          <span className="inline-flex items-center gap-0.5 rounded-lg bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
            <ArrowUpRight className="h-3 w-3" />
            {trend}
          </span>
        ) : null}
      </div>
      <p className="label-caps relative mt-5">{label}</p>
      <div className="relative mt-1.5 flex items-end gap-3">
        <span className="text-[32px] leading-none font-bold tracking-[-0.04em] text-ink">{value}</span>
      </div>
      <p className="relative mt-3 text-xs leading-relaxed text-muted">{description}</p>
    </Wrapper>
  )
}
