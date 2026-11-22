import { motion } from 'framer-motion'
import { LuCheck, LuClock, LuShieldCheck, LuUsers } from 'react-icons/lu'
import Reveal from '../common/Reveal'

const metrics = [
  {
    icon: LuUsers,
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    title: 'Entire team aligned',
    description:
      'Keep everyone on the same page with clear dependency upgrade roadmaps, shared breaking-change risks, and real-time pull request updates. Your entire engineering team stays aligned.',
  },
  {
    icon: LuClock,
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    title: '5+ hours/week saved',
    description:
      'Automate routine changelog scrolling, manual version diffing, and security audits to save valuable engineering hours every week so your team can focus on shipping features.',
  },
  {
    icon: LuShieldCheck,
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    title: 'Zero breaking surprises',
    description:
      'Context-aware compatibility scoring flags deprecated APIs and lockfile mismatches before you merge. Deliver consistent, regression-free production releases.',
  },
  {
    icon: LuCheck,
    iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
    title: '100% manifest coverage',
    description:
      'Continuous deep scanning across npm, PyPI, Cargo, Go Modules, and Docker images ensures no hidden transitive dependency or vulnerable package slips through unnoticed.',
  },
]

export default function MetricsGrid() {
  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[34px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[46px] leading-[1.12]">
            Simplify dependency management
            <br />
            for modern teams
          </h2>
        </div>

        {/* 2x2 Grid matching image */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 max-w-5xl mx-auto">
          {metrics.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center rounded-3xl border border-slate-100/90 bg-white p-8 sm:p-10 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_35px_-6px_rgba(0,0,0,0.08)] transition-all duration-300"
              >
                {/* Centered Circular Icon Badge */}
                <div
                  className={`flex h-13 w-13 items-center justify-center rounded-full border ${item.iconBg} shadow-2xs mb-6`}
                >
                  <item.icon className="h-6 w-6" />
                </div>

                <h3 className="text-[20px] font-bold tracking-tight text-slate-950">
                  {item.title}
                </h3>

                <p className="mt-3 text-[14px] leading-relaxed text-slate-500 max-w-md">
                  {item.description}
                </p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
