import { motion } from 'framer-motion'
import { ArrowUpRight, BrainCircuit, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../common/buttonStyles'

export default function AIInsightCard() {
  return (
    <div className="glow-border relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand/[0.14] via-elevated to-accent/[0.06] p-6 sm:p-7">
      <div className="radial-glow pointer-events-none absolute -top-20 -right-16 h-56 w-56" />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-brand/30 bg-brand/15 text-brandlight">
        <BrainCircuit className="h-5 w-5" />
      </div>
      <p className="label-caps relative mt-5 text-brandlight">Phase 1 preview</p>
      <h3 className="relative mt-1.5 text-xl font-bold tracking-[-0.03em] text-ink">
        AI Dependency Intelligence
      </h3>
      <p className="relative mt-3 text-[13px] leading-relaxed text-subtle">
        Your intelligent upgrade advisor is being prepared. RAG, LangGraph and Memento-based project
        memory will power it in a later phase.
      </p>
      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        <Link
          to="/dashboard/recommendations"
          className={buttonStyles({ size: 'sm', variant: 'secondary' })}
        >
          <Sparkles className="h-3.5 w-3.5 text-brandlight" /> Explore Intelligence
        </Link>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="inline-flex items-center gap-1 text-[11px] text-muted"
        >
          Coming soon <ArrowUpRight className="h-3 w-3" />
        </motion.span>
      </div>
    </div>
  )
}
