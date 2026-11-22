import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { LuCheck, LuGitPullRequest, LuSparkles } from 'react-icons/lu'
import Reveal from '../common/Reveal'

const tabs = ['Tracking', 'Scheduling', 'Visibility']

export default function SplitWorkflow() {
  const [activeTab, setActiveTab] = useState('Tracking')

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Centered Top Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[34px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[46px] leading-[1.12]">
            Manage updates faster
            <br />
            with your team
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Review releases, collaborate with your team, and stay on top of security advisories
            with a powerful yet easy-to-use dependency intelligence solution.
          </p>

          {/* Pill Tabs matching image (Tracking, Scheduling, Visibility) */}
          <div className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 p-1.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Split Layout below */}
        <div className="mt-20 grid items-center gap-12 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* Left Column: Headline + Copy + CTA Buttons */}
          <Reveal>
            <div className="max-w-lg">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700">
                <LuSparkles className="h-3 w-3" />
                Continuous Sync
              </span>

              <h3 className="mt-4 text-[32px] font-bold tracking-tight text-slate-950 sm:text-[40px] leading-[1.15]">
                Simplify dependency upgrades
                <br />
                for modern teams
              </h3>

              <p className="mt-5 text-[15px] leading-relaxed text-slate-500">
                Break down complex upgrades into manageable tasks, track semver breaking changes
                in real-time, and keep your engineering team shipping with focus and zero downtime.
              </p>

              {/* Black Pill + White Pill Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to="/signup"
                  className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full bg-slate-950 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Get started free
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Talk to sales team
                </a>
              </div>
            </div>
          </Reveal>

          {/* Right Column: Stack of Floating Activity / Comment Cards over Blue Glow */}
          <Reveal delay={0.15}>
            <div className="relative mx-auto w-full max-w-lg">
              {/* Ethereal Soft Blue Glow */}
              <div className="pointer-events-none absolute -inset-6 rounded-full bg-sky-200/35 blur-3xl" />

              {/* Stacked Cards */}
              <div className="relative z-10 space-y-3.5">
                {/* Card 1: Comment with Quote bubble */}
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100">
                      LP
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">
                        Laura Perez <span className="font-normal text-slate-500">commented on React 19 PR</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        2 hours ago · Wei Chen assigned this
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[12.5px] font-medium text-slate-700">
                    "Awesome! All 42 integration tests passed with zero codemod errors. Let's merge! 🚀"
                  </div>
                </motion.div>

                {/* Card 2: Merged PR Notification */}
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_10px_28px_-6px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100">
                        AK
                      </div>
                      <div>
                        <p className="text-[12.5px] font-bold text-slate-900">
                          Albert K. <span className="font-normal text-slate-500">merged Fastify v5.1 patch</span>
                        </p>
                        <p className="text-[11px] text-slate-400">3 hours ago · Lead SecEng</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-100">
                      <LuCheck className="h-3 w-3" /> Merged
                    </span>
                  </div>
                </motion.div>

                {/* Card 3: Slack/Integration Bot notification */}
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <LuGitPullRequest className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">
                        DevUpdate Bot opened automated PR #148
                      </p>
                      <p className="text-[10.5px] text-slate-400">via GitHub & Slack Integration</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
