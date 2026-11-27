import { motion } from 'framer-motion'
import { LuCheck, LuFileText, LuPackage, LuSearch, LuShieldCheck } from 'react-icons/lu'
import Reveal from '../common/Reveal'

export default function WorkspaceBanner() {
  return (
    <section className="relative overflow-hidden bg-canvas py-24 sm:py-32">
      {/* Background soft ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[850px] rounded-full bg-sky-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[34px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[46px] leading-[1.12]">
            Your all-in-one dependency
            <br />
            intelligence workspace
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Audit repositories, prioritize CVE patches, and coordinate upgrades in one simple platform.
            Keep your engineering team aligned and ensure every release ships with confidence.
          </p>
        </div>

        {/* Floating UI Elements Showcase matching the image */}
        <Reveal delay={0.15}>
          <div className="relative mx-auto mt-16 max-w-4xl min-h-[380px] sm:min-h-[420px] rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)]">
            {/* Top Search Bar & File Attachment Card */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-xl rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-slate-400 text-sm">
                  <LuSearch className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-500 font-medium text-[13.5px]">
                    Search 148 packages across 4 connected repositories...
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 shrink-0">
                  <LuFileText className="h-3.5 w-3.5 text-sky-600" />
                  <span>package.json</span>
                  <span className="text-[10px] text-slate-400 font-normal">4.2 KB</span>
                </div>
              </div>
            </motion.div>

            {/* Floating Project Upgrade Card (Middle Left) */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-6 sm:absolute sm:top-24 sm:left-10 w-full sm:w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <LuPackage className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold text-slate-900">React 19.0.0 Migration</span>
                </div>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600 border border-sky-100">
                  In Progress
                </span>
              </div>

              <p className="mt-2 text-[11.5px] text-slate-500 leading-relaxed">
                Client hooks & actions audited. Server components compatibility verified.
              </p>

              <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-sky-500 text-white font-bold text-[9px] flex items-center justify-center">
                    WC
                  </div>
                  <span className="font-medium text-slate-700">Wei Chen</span>
                </div>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <LuCheck className="h-3 w-3" /> Zero risks
                </span>
              </div>
            </motion.div>

            {/* Floating Security Patch Card (Middle Right) */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-4 sm:absolute sm:top-36 sm:right-10 w-full sm:w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <LuShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold text-slate-900">Fastify v5.1 CVE Patch</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                  Approved
                </span>
              </div>

              <p className="mt-2 text-[11.5px] text-slate-500 leading-relaxed">
                ReDoS vulnerability in regex parser resolved. Fixed in 5.1.0.
              </p>

              <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center">
                    MJ
                  </div>
                  <span className="font-medium text-slate-700">Matthew Johnson</span>
                </div>
                <span className="text-slate-400 font-medium">SecEng Team</span>
              </div>
            </motion.div>

            {/* Bottom Status Pill */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="mt-4 sm:absolute sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 inline-flex items-center gap-3 rounded-full border border-slate-200/90 bg-white px-5 py-2.5 shadow-md"
            >
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-800">
                All 4 repositories synchronized with live package registries
              </span>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
