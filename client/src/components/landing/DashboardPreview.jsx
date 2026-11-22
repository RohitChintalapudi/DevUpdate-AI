import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LuActivity,
  LuArrowUpRight,
  LuChevronRight,
  LuGitBranch,
  LuPackage,
  LuShieldAlert,
  LuSparkles,
} from 'react-icons/lu'
import { Link } from 'react-router-dom'

const tabs = [
  { id: 'intelligence', label: 'Update Intelligence' },
  { id: 'compatibility', label: 'AI Risk Analysis' },
  { id: 'security', label: 'CVE Advisories' },
  { id: 'changelogs', label: 'Synthesized Changelogs' },
]

const sampleDependencies = [
  {
    name: 'react',
    current: '18.3.1',
    latest: '19.0.0',
    risk: 'Low Risk',
    riskColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    summary: 'React 19 Server Components support; zero breaking changes in client hooks.',
    time: '2h ago',
  },
  {
    name: 'fastify',
    current: '4.28.1',
    latest: '5.1.2',
    risk: 'Automated PR Ready',
    riskColor: 'bg-sky-50 text-sky-700 border-sky-200/80',
    summary: 'Routing performance improved by 14%; schema validator upgrade verified.',
    time: '4h ago',
  },
  {
    name: 'lodash',
    current: '4.17.20',
    latest: '4.17.21',
    risk: 'CVE Patch',
    riskColor: 'bg-amber-50 text-amber-700 border-amber-200/80',
    summary: 'Fixes Prototype Pollution vulnerability (CVE-2021-23337). Immediate update recommended.',
    time: 'Yesterday',
  },
  {
    name: 'prisma',
    current: '5.19.0',
    latest: '6.0.0',
    risk: 'Major Version',
    riskColor: 'bg-purple-50 text-purple-700 border-purple-200/80',
    summary: 'New schema engine; review database connection pool configuration before deploy.',
    time: '2d ago',
  },
]

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState('intelligence')

  return (
    <section className="relative overflow-hidden bg-slate-50/60 py-24 sm:py-32">
      {/* Background Soft Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-sky-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <span className="inline-block rounded-full border border-sky-200/70 bg-sky-50 px-3.5 py-1 text-[11px] font-bold tracking-[0.16em] uppercase text-sky-600">
            Live Workspace Preview
          </span>
          <h2 className="mt-3 text-[32px] font-bold tracking-[-0.035em] text-slate-950 sm:text-[42px]">
            Your Dependency Intelligence Command Center.
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-slate-500">
            Experience real-time repository scanning, automated CVE triage, and AI-synthesized
            upgrade roadmaps designed for production teams.
          </p>
        </div>

        {/* Clean Light Browser Frame */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-5xl rounded-3xl border border-slate-200/90 bg-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          {/* Top Browser Bar */}
          <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs text-slate-500 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px]">app.devupdate.ai/dashboard/overview</span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/signup"
                className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-slate-800 transition"
              >
                Launch App <LuArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Sub Navigation Bar inside Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-3.5 bg-white">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-white">
                <LuPackage className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-slate-900">acme-frontend-core</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">
                main branch
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-slate-950 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4 bg-slate-50/40">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Repositories</span>
                <LuGitBranch className="h-4 w-4 text-slate-700" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">4</p>
              <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">All manifests synchronized</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Monitored Packages</span>
                <LuPackage className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">148</p>
              <p className="mt-0.5 text-[11px] text-slate-500">npm, PyPI & Cargo</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Updates Available</span>
                <LuActivity className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">16</p>
              <p className="mt-0.5 text-[11px] text-amber-600 font-medium">12 safe to upgrade today</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Security Score</span>
                <LuShieldAlert className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">99.4%</p>
              <p className="mt-0.5 text-[11px] text-slate-500">0 critical CVE vulnerabilities</p>
            </div>
          </div>

          {/* Interactive Intelligence Feed */}
          <div className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Upgrade Intelligence</h3>
                <p className="text-xs text-slate-500">Real-time analysis stream across connected dependencies</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <LuSparkles className="h-3.5 w-3.5 text-sky-600" /> AI confidence: 99%
              </span>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
              {sampleDependencies.map((dep) => (
                <div
                  key={dep.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-mono font-bold text-slate-700">
                      {dep.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{dep.name}</span>
                        <span className="text-xs font-mono text-slate-400">
                          {dep.current} → <span className="font-semibold text-slate-800">{dep.latest}</span>
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${dep.riskColor}`}
                        >
                          {dep.risk}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{dep.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className="text-[11px] text-slate-400">{dep.time}</span>
                    <Link
                      to="/signup"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      Inspect <LuChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
