import { motion } from 'framer-motion'
import {
  JavascriptOriginal,
  TypescriptOriginal,
  PythonOriginal,
  JavaOriginal,
  RustOriginal,
  PhpOriginal,
  RubyOriginal,
  GoOriginal,
  DotNetOriginal,
} from 'devicons-react'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const ecosystems = [
  {
    language: 'JavaScript / TypeScript',
    managers: 'npm, Yarn, pnpm',
    badge: 'JS / TS',
    icons: [JavascriptOriginal, TypescriptOriginal],
    accentBorder: 'border-amber-200/80',
    accentBg: 'bg-amber-50/60',
  },
  {
    language: 'Python',
    managers: 'pip, Poetry, Pipenv',
    badge: 'Python',
    icons: [PythonOriginal],
    accentBorder: 'border-sky-200/80',
    accentBg: 'bg-sky-50/60',
  },
  {
    language: 'Java',
    managers: 'Maven, Gradle',
    badge: 'Java',
    icons: [JavaOriginal],
    accentBorder: 'border-red-200/80',
    accentBg: 'bg-red-50/60',
  },
  {
    language: 'Rust',
    managers: 'Cargo',
    badge: 'Rust',
    icons: [RustOriginal],
    accentBorder: 'border-orange-200/80',
    accentBg: 'bg-orange-50/60',
  },
  {
    language: 'PHP',
    managers: 'Composer',
    badge: 'PHP',
    icons: [PhpOriginal],
    accentBorder: 'border-indigo-200/80',
    accentBg: 'bg-indigo-50/60',
  },
  {
    language: 'Ruby',
    managers: 'RubyGems',
    badge: 'Ruby',
    icons: [RubyOriginal],
    accentBorder: 'border-rose-200/80',
    accentBg: 'bg-rose-50/60',
  },
  {
    language: 'Go',
    managers: 'Go Modules',
    badge: 'Go',
    icons: [GoOriginal],
    accentBorder: 'border-cyan-200/80',
    accentBg: 'bg-cyan-50/60',
  },
  {
    language: '.NET',
    managers: 'NuGet',
    badge: '.NET / C#',
    icons: [DotNetOriginal],
    accentBorder: 'border-purple-200/80',
    accentBg: 'bg-purple-50/60',
  },
]

export default function SupportedEcosystems() {
  return (
    <section id="ecosystems" className="relative overflow-hidden bg-[#F8FAFC] py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="MULTI-ECOSYSTEM SUPPORT"
          title="One Platform. Multiple Development Ecosystems."
          description="DevUpdate AI is designed to analyze dependencies across popular programming languages and package managers."
          theme="light"
        />

        {/* 8 Ecosystem Cards Grid */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {ecosystems.map((eco, index) => (
            <Reveal key={eco.language} delay={index * 0.05}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-between h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {eco.icons.map((IconComp, i) => (
                        <div
                          key={i}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 p-2 shadow-2xs"
                        >
                          <IconComp size={22} />
                        </div>
                      ))}
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      {eco.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">{eco.language}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Managers: <span className="text-slate-800 font-semibold">{eco.managers}</span>
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* Supporting text & disclaimer */}
        <div className="mt-12 text-center max-w-xl mx-auto">
          <p className="text-sm font-semibold text-slate-700">
            Discover dependencies across different ecosystems from a unified repository intelligence dashboard.
          </p>
          <p className="mt-2 text-xs text-slate-400 italic">
            *Availability and supported manifest formats depend on the implemented integrations.*
          </p>
        </div>
      </div>
    </section>
  )
}
