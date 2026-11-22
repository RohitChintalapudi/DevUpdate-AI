import { motion } from 'framer-motion'
import {
  Bot,
  BrainCircuit,
  FileBarChart2,
  GitBranch,
  PackageSearch,
  ScanSearch,
} from 'lucide-react'
import Card from '../common/Card'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const features = [
  {
    icon: GitBranch,
    title: 'GitHub Integration',
    description: 'Connect repositories and discover project dependencies.',
    glow: 'from-brand/20 to-brand/0',
    iconClass: 'text-brandlight bg-brand/12 border-brand/25',
    tag: 'Planned · Phase 2',
  },
  {
    icon: PackageSearch,
    title: 'Dependency Monitoring',
    description: 'Track new versions of packages used in your projects.',
    glow: 'from-accent/18 to-accent/0',
    iconClass: 'text-accent bg-accent/10 border-accent/25',
    tag: 'Planned',
  },
  {
    icon: ScanSearch,
    title: 'AI-Powered Analysis',
    description: 'Understand release notes and identify important changes.',
    glow: 'from-violet-500/20 to-transparent',
    iconClass: 'text-violet-300 bg-violet-500/10 border-violet-400/25',
    tag: 'Planned',
  },
  {
    icon: Bot,
    title: 'Smart Upgrade Recommendations',
    description: 'Evaluate compatibility risks and suggest upgrade actions.',
    glow: 'from-cyan-500/18 to-transparent',
    iconClass: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/25',
    tag: 'Planned',
  },
  {
    icon: BrainCircuit,
    title: 'Historical Project Memory',
    description: 'Remember previous upgrade decisions and project issues.',
    glow: 'from-fuchsia-500/18 to-transparent',
    iconClass: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/25',
    tag: 'Planned',
  },
  {
    icon: FileBarChart2,
    title: 'Intelligent Reports',
    description: 'Generate clear reports about dependency health.',
    glow: 'from-emerald-500/18 to-transparent',
    iconClass: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/25',
    tag: 'Planned',
  },
]

export default function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute top-1/4 left-[-200px] h-[400px] w-[400px] rounded-full bg-brand/[0.06] blur-[100px]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Platform capabilities"
          title="Everything Your Dependencies Need."
          description="One focused workspace for the signals that matter — designed to turn noisy release data into clear decisions. Feature workflows shown here are planned for upcoming phases."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.06}>
              <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.25 }}>
                <Card
                  hover
                  className="group relative h-full overflow-hidden p-6"
                >
                  <div
                    className={`pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-gradient-to-br ${feature.glow} blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                  />
                  <div className="relative flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border ${feature.iconClass}`}
                    >
                      <feature.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                    </div>
                    <span className="rounded-full border border-line bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-muted">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="relative mt-6 text-[17px] font-semibold tracking-[-0.02em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="relative mt-2.5 text-[13px] leading-relaxed text-subtle">
                    {feature.description}
                  </p>
                  <div className="relative mt-5 h-px w-full bg-gradient-to-r from-brand/40 via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Card>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
