import { LuCheck, LuX } from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const traditional = [
  'Identify outdated packages.',
  'Display available versions.',
  'Provide basic update notifications.',
  'Often require manual documentation research.',
  'Provide limited repository-specific explanations.',
  'May not retain developer upgrade decisions.',
]

const devupdate = [
  'Discovers dependencies across repositories.',
  'Tracks versions and security intelligence.',
  'Researches official release documentation.',
  'Analyzes project-specific code context.',
  'Explains potential breaking changes.',
  'Generates actionable migration plans.',
  'Preserves useful historical project knowledge.',
]

export default function WhyDevUpdate() {
  return (
    <section id="why" className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="THE DIFFERENCE"
          title="Not Just What to Update. Why, When, and How."
          description="Move beyond raw version alerts. Discover how DevUpdate AI replaces manual guesswork with context-aware intelligence."
          theme="light"
        />

        {/* Side by side comparison cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
          {/* Traditional Tools Card */}
          <Reveal>
            <div className="h-full rounded-3xl border border-slate-200/90 bg-[#F8FAFC] p-8 sm:p-10 shadow-2xs">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                TRADITIONAL DEPENDENCY TOOLS
              </span>
              <h3 className="mt-1 text-xl font-bold text-slate-800">
                Passive Notifications
              </h3>

              <ul className="mt-6 space-y-4">
                {traditional.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <LuX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* DevUpdate AI Card */}
          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-slate-900 bg-slate-950 p-8 sm:p-10 text-white shadow-xl">
              <span className="text-[11px] font-bold tracking-wider uppercase text-sky-400">
                DEVUPDATE AI PLATFORM
              </span>
              <h3 className="mt-1 text-xl font-bold text-white">
                Intelligent Upgrade Decisions
              </h3>

              <ul className="mt-6 space-y-4">
                {devupdate.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-200 font-medium">
                    <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Closing statement */}
        <Reveal delay={0.15}>
          <div className="mt-12 text-center">
            <p className="text-base font-bold text-slate-900">
              Move beyond update notifications. Make informed dependency decisions.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
