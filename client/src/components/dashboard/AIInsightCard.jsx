import { LuCircleArrowUp, LuSparkles } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../common/buttonStyles'

export default function AIInsightCard() {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600 shadow-2xs">
        <LuCircleArrowUp className="h-5 w-5" />
      </div>
      <div className="relative mt-5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-sky-700 bg-sky-50 border border-sky-200/80 uppercase">
          <LuSparkles className="h-3 w-3 text-sky-600" /> Firecrawl & Gemini Active
        </span>
      </div>
      <h3 className="relative mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">
        Dependency Update Intelligence
      </h3>
      <p className="relative mt-2.5 text-[13px] leading-relaxed text-slate-600">
        Get authoritative package registry verification, Firecrawl changelog & migration research, and Gemini AI upgrade impact analysis for your repositories.
      </p>
      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        <Link
          to="/dashboard/updates"
          className={buttonStyles({ size: 'sm', variant: 'primary' })}
        >
          <LuSparkles className="h-3.5 w-3.5" /> View Dependency Updates
        </Link>
      </div>
    </div>
  )
}
