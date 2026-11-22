import { motion } from 'framer-motion'
import {
  LuBrainCircuit,
  LuFileSearch,
  LuGitBranch,
  LuHistory,
  LuPackageSearch,
  LuRadar,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const steps = [
  {
    number: '01',
    icon: LuGitBranch,
    title: 'Connect Your Repository',
    description:
      'Authorize GitHub access and select the repositories you want DevUpdate AI to analyze.',
  },
  {
    number: '02',
    icon: LuPackageSearch,
    title: 'Discover Dependencies',
    description:
      'DevUpdate AI scans supported package manifests and lockfiles to identify dependencies and their installed versions.',
  },
  {
    number: '03',
    icon: LuRadar,
    title: 'Detect Available Updates',
    description:
      'The update intelligence engine checks package registries, compares versions, classifies updates, and retrieves available security information.',
  },
  {
    number: '04',
    icon: LuFileSearch,
    title: "Research What's Changed",
    description:
      'Firecrawl collects relevant release notes, changelogs, migration guides, and official documentation.',
  },
  {
    number: '05',
    icon: LuBrainCircuit,
    title: 'Understand Project Impact',
    description:
      'The AI analyzes repository context, retrieves relevant documentation, identifies potential compatibility concerns, and creates upgrade recommendations.',
  },
  {
    number: '06',
    icon: LuHistory,
    title: 'Remember and Improve',
    description:
      'Memento preserves relevant project knowledge and developer decisions so future analyses can benefit from historical context.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="SIMPLE WORKFLOW"
          title="From Repository to Recommendation in Six Steps."
          description="A continuous, connected workflow engineered to transform raw registry signals into actionable codebase intelligence."
          theme="light"
        />

        {/* 6 Steps Grid with Numbers */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-2xs">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-2xl font-black text-slate-200">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-6 text-[17px] font-bold tracking-tight text-slate-950">
                    Step {step.number} — {step.title}
                  </h3>

                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* Closing statement */}
        <Reveal delay={0.2}>
          <div className="mt-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              One connected workflow. From dependency discovery to informed upgrade decisions.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
