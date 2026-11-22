import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../common/buttonStyles'
import Reveal from '../common/Reveal'

export default function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal>
          <div className="glow-border relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand/[0.12] via-surface to-accent/[0.05] px-6 py-16 text-center sm:px-12">
            <div className="radial-glow pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2" />
            <motion.div
              animate={{ rotate: [0, 8, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="relative mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/15 text-brandlight"
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
            <h2 className="relative text-[34px] leading-tight font-bold tracking-[-0.045em] text-ink sm:text-[48px]">
              Stop Guessing. Start Upgrading Smarter.
            </h2>
            <p className="relative mt-4 text-[15px] text-subtle">
              Give your projects the intelligence they deserve.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link
                to="/signup"
                className={buttonStyles({ size: 'lg', className: 'btn-shine w-full sm:w-auto' })}
              >
                Get Started for Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
