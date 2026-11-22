import { ArrowUpCircle, FileSearch, Radar, ShieldAlert } from 'lucide-react'
import { recentActivity } from '../../data/mockData'

const iconMap = { ArrowUpCircle, FileSearch, Radar, ShieldAlert }
const toneMap = {
  violet: 'bg-brand/12 text-brandlight ring-brand/20',
  cyan: 'bg-accent/10 text-accent ring-accent/20',
  danger: 'bg-danger/10 text-danger ring-danger/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
}

export default function ActivityTimeline({ items = recentActivity }) {
  return (
    <div className="relative">
      {items.map((item, index) => {
        const Icon = iconMap[item.icon] || Radar
        return (
          <div key={item.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {index !== items.length - 1 ? (
              <span className="absolute top-10 bottom-0 left-[17px] w-px bg-line" />
            ) : null}
            <span
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneMap[item.tone] || toneMap.violet}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-medium leading-snug text-ink">{item.title}</p>
              <p className="mt-1 truncate text-[11px] text-muted">{item.detail}</p>
            </div>
            <span className="hidden shrink-0 pt-1 text-[10px] text-muted sm:block">{item.time}</span>
          </div>
        )
      })}
    </div>
  )
}
