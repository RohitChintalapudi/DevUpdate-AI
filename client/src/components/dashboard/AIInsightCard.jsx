import { motion } from 'framer-motion'
import { LuArrowUpRight, LuBrainCircuit, LuSparkles } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../common/buttonStyles'

export default function AIInsightCard() {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
        <LuBrainCircuit className="h-5 w-5" />
      </div>
      <p className="label-caps relative mt-5 text-sky-600">Phase 1 preview</p>
      <h3 className="relative mt-1.5 text-xl font-bold tracking-[-0.03em] text-slate-950">
        AI Dependency Intelligence
      </h3>
      <p className="relative mt-3 text-[13px] leading-relaxed text-slate-600">
        Your intelligent upgrade advisor is being prepared. RAG, LangGraph and Memento-based project
        memory will power it in a later phase.
      </p>
      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        <Link
          to="/dashboard/recommendations"
          className={buttonStyles({ size: 'sm', variant: 'secondary' })}
        >
          <LuSparkles className="h-3.5 w-3.5 text-sky-600" /> Explore Intelligence
        </Link>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400"
        >
          Coming soon <LuArrowUpRight className="h-3 w-3" />
        </motion.span>
      </div>
    </div>
  )
}
