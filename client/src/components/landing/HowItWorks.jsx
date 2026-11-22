import { motion } from 'framer-motion'
import { ArrowRight, Bot, GitBranch, PackageSearch, Radar } from 'lucide-react'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const steps = [
  {
    number: '01',
    icon: GitBranch,
    title: 'Connect GitHub',
    description: 'Authorize your repositories and let the platform discover your projects.',
  },
  {
    number: '02',
    icon: PackageSearch,
    title: 'Analyze Dependencies',
    description: 'Extract manifests across ecosystems and build a clear dependency map.',
  },
  {
    number: '03',
    icon: Radar,
    title: 'Discover New Updates',
    description: 'Monitor releases, advisories and changelogs for the packages you use.',
  },
  {
    number: '04',
    icon: Bot,
    title: 'Get AI Recommendations',
    description: 'Turn release intelligence into practical, project-aware upgrade actions.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-surface/30" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="The workflow"
          title="From Repo to Recommendation."
          description="A simple four-step path envisioned for DevUpdate AI. Steps 1–4 are part of the planned platform architecture and are shown here as a product preview."
        />

        <div className="relative mt-16">
          {/* desktop connector line */}
          <div className="pointer-events-none absolute top-9 right-[10%] left-[10%] hidden h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent lg:block">
            <motion.div
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent/70 to-transparent"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-4 lg:gap-5">
            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.1}>
                <div className="relative flex gap-5 lg:flex-col lg:gap-0">
                  <div className="relative shrink-0">
                    <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-line bg-elevated shadow-[0_16px_30px_-20px_rgba(139,92,246,0.8)]">
                      <step.icon className="h-7 w-7 text-brandlight" />
                      <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-brand/30 bg-canvas text-[10px] font-bold text-brandlight">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* mobile vertical line */}
                  {index < steps.length - 1 ? (
                    <div className="absolute top-[72px] bottom-[-32px] left-[35px] w-px bg-gradient-to-b from-brand/40 to-transparent lg:hidden" />
                  ) : null}

                  <div className="pt-1 lg:mt-7 lg:pt-0">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink">{step.title}</h3>
                    <p className="mt-2.5 max-w-xs text-[13px] leading-relaxed text-subtle">
                      {step.description}
                    </p>
                  </div>
                  {index < steps.length - 1 ? (
                    <ArrowRight className="absolute top-6 -right-3 hidden h-4 w-4 text-brandlight/50 lg:block" />
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
