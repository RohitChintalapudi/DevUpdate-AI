import { motion } from 'framer-motion'
import {
  LuBellRing,
  LuBrainCircuit,
  LuFileSearch,
  LuGitBranch,
  LuHistory,
  LuLayoutDashboard,
  LuPackageCheck,
  LuShieldAlert,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const features = [
  {
    num: '01',
    icon: LuGitBranch,
    iconColor: 'text-sky-600 bg-sky-50 border-sky-100',
    title: 'GitHub Repository Intelligence',
    subtitle: 'Connect your GitHub repositories and automatically discover their dependency ecosystem.',
    items: [
      'GitHub repository integration',
      'Repository metadata synchronization',
      'Dependency manifest detection',
      'Lockfile analysis',
      'Multi-ecosystem dependency extraction',
      'Repository-level dependency tracking',
    ],
  },
  {
    num: '02',
    icon: LuPackageCheck,
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    title: 'Intelligent Version Detection',
    subtitle: 'Know which dependencies are outdated and what versions are available.',
    items: [
      'Latest stable version discovery',
      'Installed versus latest version comparison',
      'Major, minor, and patch classification',
      'Declared versus resolved version tracking',
      'Package release metadata',
      'Dependency update history',
    ],
  },
  {
    num: '03',
    icon: LuShieldAlert,
    iconColor: 'text-rose-600 bg-rose-50 border-rose-100',
    title: 'Security & Vulnerability Intelligence',
    subtitle: 'Understand the security implications of your dependencies.',
    items: [
      'Known vulnerability detection',
      'Security advisory information',
      'CVE and GHSA identification',
      'Severity classification & CVSS',
      'Affected version ranges & fixed versions',
      'Security-focused update prioritization',
    ],
  },
  {
    num: '04',
    icon: LuFileSearch,
    iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    title: 'AI-Powered Release Research',
    subtitle: 'Understand what actually changed between package versions.',
    badge: 'Powered by Firecrawl & AI',
    items: [
      'Automated release documentation research',
      'Changelog analysis & diffing',
      'Official migration guide discovery',
      'Breaking-change identification',
      'Release-note summarization',
      'Documentation source references',
    ],
  },
  {
    num: '05',
    icon: LuBrainCircuit,
    iconColor: 'text-purple-600 bg-purple-50 border-purple-100',
    title: 'Project-Aware AI Recommendations',
    subtitle: 'Get recommendations based on your actual repository rather than generic package information.',
    badge: 'Powered by Gemini, LangChain, LangGraph & RAG',
    items: [
      'Repository context analysis',
      'Dependency usage inspection',
      'Potentially affected file identification',
      'Breaking-change analysis',
      'Upgrade risk assessment',
      'Step-by-step migration guidance',
    ],
  },
  {
    num: '06',
    icon: LuHistory,
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    title: 'Persistent Project Memory',
    subtitle: 'Give your dependency intelligence a historical perspective.',
    badge: 'Powered by Memento Memory',
    items: [
      'Previous upgrade decisions',
      'Historical AI recommendations',
      'Known compatibility issues',
      'Developer feedback & decisions',
      'Repository-specific technical context',
      'Historical analysis comparison',
    ],
  },
  {
    num: '07',
    icon: LuLayoutDashboard,
    iconColor: 'text-teal-600 bg-teal-50 border-teal-100',
    title: 'Dependency Health Dashboard',
    subtitle: 'Understand the state of your entire dependency ecosystem.',
    items: [
      'Dependency health overview',
      'Outdated package tracking',
      'Security status overview',
      'Repository-level intelligence',
      'Update distribution',
      'AI recommendation summaries',
    ],
  },
  {
    num: '08',
    icon: LuBellRing,
    iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    title: 'Intelligent Reports & Notifications',
    subtitle: 'Stay informed about important dependency changes.',
    items: [
      'Repository health reports',
      'Dependency update reports',
      'Security audit reports',
      'AI analysis reports',
      'Historical comparisons',
      'Important update notifications',
    ],
  },
]

export default function Features() {
  return (
    <section id="features" className="relative overflow-hidden bg-[#F8FAFC] py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="POWERFUL CAPABILITIES"
          title="Everything You Need to Understand Your Dependencies."
          description="A comprehensive, multi-layer intelligence platform that goes far beyond version notifications to give engineering teams complete technical clarity."
          theme="light"
        />

        {/* 8 Feature Cards Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.05}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${feature.iconColor}`}
                    >
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-300">
                      {feature.num}
                    </span>
                  </div>

                  <h3 className="mt-5 text-[17px] font-bold text-slate-950 leading-snug">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {feature.subtitle}
                  </p>

                  {feature.badge ? (
                    <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {feature.badge}
                    </span>
                  ) : null}

                  <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[11.5px] text-slate-600">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-sky-500 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
