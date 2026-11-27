import { motion } from 'framer-motion'
import {
  LuBookOpen,
  LuClock,
  LuHistory,
  LuRefreshCw,
  LuSparkles,
  LuTriangleAlert,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const problems = [
  {
    icon: LuRefreshCw,
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
    title: 'Constantly Changing Dependencies',
    description:
      'New package versions, patches, and releases appear continuously. Keeping track of them manually takes valuable development time.',
  },
  {
    icon: LuTriangleAlert,
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200/80',
    title: 'Hidden Breaking Changes',
    description:
      'A major version update can introduce API changes, remove existing functionality, or affect how your application behaves.',
  },
  {
    icon: LuBookOpen,
    iconBg: 'bg-purple-50 text-purple-600 border-purple-200/80',
    title: 'Time-Consuming Research',
    description:
      'Developers often need to visit multiple documentation pages, GitHub releases, changelogs, and migration guides just to understand one update.',
  },
  {
    icon: LuClock,
    iconBg: 'bg-sky-50 text-sky-600 border-sky-200/80',
    title: 'Project Compatibility Risks',
    description:
      'A package update that works in one application might cause problems in another. Generic update information cannot fully explain the impact on your specific codebase.',
  },
  {
    icon: LuHistory,
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    title: 'No Historical Context',
    description:
      'Previous upgrade decisions, compatibility issues, and migration experiences are easily forgotten or lost across development sessions.',
  },
  {
    icon: LuSparkles,
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
    title: 'Actionable Guidance Needed',
    description:
      'Developers need more than another outdated-package notification. They need context, intelligence, and actionable guidance tailored directly to their codebase.',
  },
]

export default function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-canvas py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="THE PROBLEM"
          title="Keeping Dependencies Updated Shouldn't Be a Guessing Game."
          description="Modern software projects rely on dozens or even hundreds of external packages. Keeping them updated is more complicated than checking whether a newer version exists."
          theme="light"
        />

        {/* 6 Problem Cards in a Completely Uniform 3x2 Responsive Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {problems.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300"
              >
                <div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${item.iconBg} mb-6`}
                  >
                    <item.icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-bold tracking-tight text-slate-950">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* Closing statement */}
        <Reveal delay={0.2}>
          <div className="mt-14 mx-auto max-w-3xl rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-2xs">
            <p className="text-[15.5px] font-bold text-slate-900 leading-relaxed">
              Developers need more than another outdated-package notification.{' '}
              <span className="text-sky-600 font-extrabold">
                They need context, intelligence, and actionable guidance.
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
