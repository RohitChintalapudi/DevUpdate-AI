import { motion } from 'framer-motion'
import { ArrowRight, Play, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../common/buttonStyles'
import DashboardPreview from './DashboardPreview'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="radial-glow pointer-events-none absolute top-[-180px] left-1/2 h-[720px] w-[900px] -translate-x-1/2 animate-pulse-glow" />
      <div className="radial-glow-cyan pointer-events-none absolute top-[220px] right-[-160px] h-[480px] w-[480px]" />

      {/* floating decorative elements */}
      <motion.div
        animate={{ y: [0, -14, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute top-40 left-[6%] hidden h-12 w-12 rounded-xl border border-brand/25 bg-brand/[0.06] backdrop-blur-sm xl:block"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full border border-brandlight/60" />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute top-64 right-[7%] hidden h-9 w-9 rotate-45 rounded-lg border border-accent/25 bg-accent/[0.05] xl:block"
      />

      <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-8">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[0.15em] text-brandlight uppercase sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Developer Intelligence
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mx-auto mt-7 max-w-4xl text-[42px] leading-[1.06] font-bold tracking-[-0.05em] text-ink sm:text-[62px] lg:text-[76px]"
          >
            Know What Changed.
            <br />
            <span className="text-gradient">Understand What Matters.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-subtle sm:text-[17px]"
          >
            Your AI-powered dependency intelligence platform. Connect your GitHub repositories,
            monitor software updates and make smarter upgrade decisions.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className={buttonStyles({ size: 'lg', className: 'btn-shine w-full sm:w-auto' })}>
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className={buttonStyles({
                variant: 'outline',
                size: 'lg',
                className: 'w-full backdrop-blur-sm sm:w-auto',
              })}
            >
              <Play className="h-4 w-4" /> Explore Features
            </a>
          </motion.div>

          <motion.p variants={item} className="mt-5 text-xs text-muted">
            Phase 1 preview · GitHub and AI integrations arrive in later phases
          </motion.p>
        </motion.div>

        <DashboardPreview />
      </div>
    </section>
  )
}
