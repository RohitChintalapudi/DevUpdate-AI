import { LuCircleArrowUp, LuFileSearch, LuRadar, LuShieldAlert } from 'react-icons/lu'
import { recentActivity } from '../../data/mockData'

const iconMap = { LuCircleArrowUp, LuFileSearch, LuRadar, LuShieldAlert }
const toneMap = {
  violet: 'bg-violet-50 text-violet-600 ring-violet-200/60',
  cyan: 'bg-sky-50 text-sky-600 ring-sky-200/60',
  danger: 'bg-rose-50 text-rose-600 ring-rose-200/60',
  warning: 'bg-amber-50 text-amber-600 ring-amber-200/60',
}

export default function ActivityTimeline({ items = recentActivity }) {
  return (
    <div className="relative">
      {items.map((item, index) => {
        const Icon = iconMap[item.icon] || LuRadar
        return (
          <div key={item.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {index !== items.length - 1 ? (
              <span className="absolute top-10 bottom-0 left-[17px] w-px bg-slate-200" />
            ) : null}
            <span
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneMap[item.tone] || toneMap.violet}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold leading-snug text-slate-900">{item.title}</p>
              <p className="mt-1 truncate text-[11px] text-slate-500">{item.detail}</p>
            </div>
            <span className="hidden shrink-0 pt-1 text-[10px] text-slate-400 sm:block">{item.time}</span>
          </div>
        )
      })}
    </div>
  )
}
