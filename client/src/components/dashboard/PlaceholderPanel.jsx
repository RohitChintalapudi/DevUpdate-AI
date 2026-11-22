import { LuConstruction, LuSparkles } from 'react-icons/lu'
import Badge from '../common/Badge'

export default function PlaceholderPanel({ icon: Icon, title, description, children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-brand/25 bg-brand/[0.035] p-6">
      <div className="radial-glow pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 opacity-60" />
      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brandlight">
          {Icon ? <Icon className="h-5 w-5" /> : <LuConstruction className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <Badge tone="violet" icon={LuSparkles}>Upcoming phase</Badge>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-subtle">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
