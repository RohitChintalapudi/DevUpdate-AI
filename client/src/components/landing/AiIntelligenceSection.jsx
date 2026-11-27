import { motion } from 'framer-motion'
import {
  LuBookCheck,
  LuBrainCircuit,
  LuCheck,
  LuFileCode,
  LuListOrdered,
  LuSparkles,
  LuTriangleAlert,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const pillars = [
  {
    icon: LuTriangleAlert,
    iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
    title: 'Understand Breaking Changes',
    desc: 'Discover documented API changes, deprecated functionality, and migration requirements.',
  },
  {
    icon: LuFileCode,
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    title: 'Analyze Project Impact',
    desc: 'Identify relevant files, imports, framework usage, and code patterns that may require attention.',
  },
  {
    icon: LuBrainCircuit,
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    title: 'Assess Upgrade Risks',
    desc: 'Understand potential compatibility concerns and the evidence behind each risk assessment.',
  },
  {
    icon: LuListOrdered,
    iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
    title: 'Generate Migration Plans',
    desc: 'Receive structured steps to help developers prepare for and validate an upgrade.',
  },
  {
    icon: LuBookCheck,
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    title: 'Explain Every Recommendation',
    desc: 'Explore supporting documentation and evidence instead of relying on unexplained AI answers.',
  },
]

export default function AiIntelligenceSection() {
  return (
    <section className="relative overflow-hidden bg-canvas py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="BEYOND VERSION NUMBERS"
          title="Your AI Upgrade Advisor Understands the Context."
          description="A newer version doesn't automatically mean a better upgrade decision. DevUpdate AI combines release intelligence with your repository's technical context to provide more meaningful recommendations."
          theme="light"
        />

        <div className="mt-16 grid items-start gap-10 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* Left Column: 5 Pillars */}
          <div className="space-y-4">
            {pillars.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <motion.div
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.iconBg}`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>

          {/* Right Column: Example AI Analysis Card matching exact user specification */}
          <Reveal delay={0.15}>
            <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <LuSparkles className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live Example AI Analysis
                  </span>
                </div>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-100">
                  Major Update
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Package:</span>
                  <span className="font-bold text-slate-900 font-mono">React</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Installed Version:</span>
                  <span className="font-mono text-slate-600">18.3.1</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Target Version:</span>
                  <span className="font-mono font-bold text-sky-600">19.1.0</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Update Type:</span>
                  <span className="font-semibold text-purple-600">Major Semver</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  AI Context Analysis:
                </p>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-start gap-1.5">
                    <LuCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    Review relevant breaking changes.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <LuCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    Inspect potentially affected React APIs.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <LuCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    Identify project files requiring attention.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <LuCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    Review the official migration guide.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <LuCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    Prepare a migration and testing checklist.
                  </li>
                </ul>
              </div>

              <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                  Recommendation:
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-800">
                  Review compatibility findings before proceeding with the upgrade.
                </p>
              </div>

              <p className="mt-3 text-[11px] italic text-slate-400 text-center">
                *Illustrative example. Actual findings depend on the repository and verified documentation.*
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
