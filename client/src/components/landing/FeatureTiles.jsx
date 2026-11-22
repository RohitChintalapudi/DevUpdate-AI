import { motion } from 'framer-motion'
import { LuCheck, LuFileCheck, LuSlidersHorizontal } from 'react-icons/lu'
import Reveal from '../common/Reveal'
import { SlackLogo, GitHubLogo, NpmLogo } from './BrandLogos'

export default function FeatureTiles() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAFC] py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Centered Top Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[34px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[46px] leading-[1.12]">
            Plan upgrades and track
            <br />
            dependencies effortlessly
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Simplify maintenance with tools that help you audit, prioritize, and collaborate
            so your team can ship more features every sprint.
          </p>
        </div>

        {/* 3 Column Grid with Rich UI Preview Tiles matching the image */}
        <div className="mt-16 grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {/* Card 1: Perfectly Organized */}
          <Reveal delay={0.05}>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-xl transition-all duration-300"
            >
              {/* Top Preview Tile with soft ethereal glow */}
              <div className="relative flex h-52 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-50 to-slate-50 p-4 border border-slate-100 overflow-hidden">
                <div className="pointer-events-none absolute h-32 w-48 rounded-full bg-sky-200/40 blur-2xl" />

                <div className="relative z-10 w-full max-w-[210px] space-y-2">
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs">
                    <NpmLogo className="h-3.5 w-auto" />
                    <span className="text-xs font-semibold text-slate-800">npm packages</span>
                    <span className="ml-auto text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Sync
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs">
                    <GitHubLogo className="h-3.5 w-3.5 text-slate-900" />
                    <span className="text-xs font-semibold text-slate-800">GitHub lockfiles</span>
                    <span className="ml-auto text-[10px] font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                      Live
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">
                    <LuCheck className="h-3 w-3" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-950">Perfect context</h3>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-500">
                  Manage dependencies, collaborate with your team, and stay on top of zero-day vulnerabilities.
                </p>
              </div>
            </motion.div>
          </Reveal>

          {/* Card 2: Available Integrations */}
          <Reveal delay={0.1}>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-xl transition-all duration-300"
            >
              {/* Top Preview Tile: App switcher with toggles */}
              <div className="relative flex h-52 items-center justify-center rounded-2xl bg-gradient-to-b from-indigo-50 to-slate-50 p-4 border border-slate-100 overflow-hidden">
                <div className="pointer-events-none absolute h-32 w-48 rounded-full bg-indigo-200/35 blur-2xl" />

                <div className="relative z-10 w-full max-w-[210px] space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <SlackLogo className="h-4 w-4" />
                      <span className="text-xs font-semibold text-slate-800">Slack Alerts</span>
                    </div>
                    <span className="h-4 w-7 rounded-full bg-slate-950 p-0.5 flex items-center justify-end">
                      <span className="h-3 w-3 rounded-full bg-white" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <GitHubLogo className="h-4 w-4 text-slate-900" />
                      <span className="text-xs font-semibold text-slate-800">Auto PR Hooks</span>
                    </div>
                    <span className="h-4 w-7 rounded-full bg-slate-950 p-0.5 flex items-center justify-end">
                      <span className="h-3 w-3 rounded-full bg-white" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs">
                    <LuSlidersHorizontal className="h-3 w-3" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-950">Available Integrations</h3>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-500">
                  Access the integrated developer tools and notification channels ready for your engineering team.
                </p>
              </div>
            </motion.div>
          </Reveal>

          {/* Card 3: Upload Documents / Audit Reports */}
          <Reveal delay={0.15}>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-xl transition-all duration-300"
            >
              {/* Top Preview Tile: Document Upload / Export card */}
              <div className="relative flex h-52 items-center justify-center rounded-2xl bg-gradient-to-b from-rose-50 to-slate-50 p-4 border border-slate-100 overflow-hidden">
                <div className="pointer-events-none absolute h-32 w-48 rounded-full bg-rose-200/35 blur-2xl" />

                <div className="relative z-10 w-full max-w-[210px] rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <LuFileCheck className="h-4 w-4 text-rose-500" />
                      audit-report.pdf
                    </span>
                    <span className="text-[10px] text-slate-400">100%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-full rounded-full bg-rose-500" />
                  </div>
                  <p className="mt-2 text-[10.5px] text-slate-500 font-medium">
                    SOC2 Compliance Verified
                  </p>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-xs">
                    <LuFileCheck className="h-3 w-3" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-950">Upload Documents</h3>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-500">
                  Export executive compliance reports, SBOM files, and automated roadmaps ready for security audits.
                </p>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
