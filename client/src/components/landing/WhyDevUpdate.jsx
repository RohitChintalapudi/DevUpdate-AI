import { Check, CircleAlert, Sparkles, X } from 'lucide-react'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const problems = [
  'Opening multiple package websites and registries',
  'Scrolling through long changelogs and release notes',
  'Guessing which updates are safe for your project',
  'Losing context from earlier upgrade decisions',
]

const solutions = [
  'One workspace for every dependency signal',
  'Release notes distilled into what actually changed',
  'Context-aware guidance for upgrade decisions',
  'A memory of decisions your team can revisit',
]

const comparison = [
  { label: 'Dependency discovery', traditional: 'Manual, repository by repository', devupdate: 'Centralised project view' },
  { label: 'Release notes', traditional: 'Read across many sources', devupdate: 'Collected and summarised' },
  { label: 'Upgrade decisions', traditional: 'Based on intuition and guesswork', devupdate: 'Supported by project context' },
  { label: 'Historical context', traditional: 'Scattered in chats and tickets', devupdate: 'Persistent project memory' },
]

export default function WhyDevUpdate() {
  return (
    <section id="benefits" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute top-1/3 right-[-200px] h-[500px] w-[500px] rounded-full bg-accent/[0.05] blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Why DevUpdate AI"
          title="Dependency Noise Is Expensive."
          description="Developers spend too much time jumping between package websites, reading changelogs and manually trying to understand what software updates actually mean."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-line bg-card/60 p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-danger/25 bg-danger/10 text-danger">
                  <CircleAlert className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-danger uppercase">The problem</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-ink">The traditional workflow</h3>
                </div>
              </div>
              <ul className="space-y-3.5">
                {problems.map((problem) => (
                  <li key={problem} className="flex items-start gap-3 text-sm text-subtle">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-danger/80" />
                    {problem}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="glow-border h-full rounded-2xl bg-gradient-to-br from-brand/[0.07] to-transparent p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/12 text-brandlight">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-brandlight uppercase">The solution</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-ink">The DevUpdate AI workflow</h3>
                </div>
              </div>
              <ul className="space-y-3.5">
                {solutions.map((solution) => (
                  <li key={solution} className="flex items-start gap-3 text-sm text-subtle">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {solution}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface/50">
            <div className="grid grid-cols-3 border-b border-line bg-white/[0.02] px-5 py-4 text-[11px] font-semibold tracking-wider text-muted uppercase sm:px-7">
              <span>Workflow area</span>
              <span>Traditional</span>
              <span className="text-brandlight">DevUpdate AI</span>
            </div>
            {comparison.map((row, index) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 gap-3 px-5 py-4 text-[12px] sm:px-7 sm:text-sm ${index !== comparison.length - 1 ? 'border-b border-line/60' : ''}`}
              >
                <span className="font-medium text-ink">{row.label}</span>
                <span className="text-muted">{row.traditional}</span>
                <span className="text-subtle">{row.devupdate}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
