import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Reveal from '../common/Reveal'
import { SlackLogo, LinearLogo, GitHubLogo } from './BrandLogos'

const integrations = [
  {
    logo: SlackLogo,
    name: 'Slack',
    desc: 'Collaborate instantly and keep every team member alerted to critical zero-day CVEs in real-time across channels.',
  },
  {
    logo: GitHubLogo,
    name: 'GitHub OAuth & Actions',
    desc: 'Sync repositories, parse lockfiles automatically, and trigger automated upgrade pull requests without manual steps.',
  },
  {
    logo: LinearLogo,
    name: 'Linear',
    desc: 'Convert dependency upgrade roadmaps into prioritized sprint tasks and keep projects moving forward with clarity.',
  },
]

export default function IntegrationSpotlight() {
  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* Left Column: Heading + Description + Buttons + User Avatars Proof */}
          <Reveal>
            <div className="max-w-lg">
              <h2 className="text-[34px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[46px] leading-[1.12]">
                Organize work and boost
                <br />
                team productivity
              </h2>

              <p className="mt-5 text-[15px] leading-relaxed text-slate-500">
                From small libraries to complex monorepos, manage every dependency in one place and keep
                your team moving forward with clarity and focus.
              </p>

              {/* Action Buttons matching image */}
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

              {/* User Proof: Stacked Avatars + Rating Label */}
              <div className="mt-10 flex items-center gap-3.5 border-t border-slate-100 pt-6">
                <div className="flex -space-x-2">
                  <div className="h-8 w-8 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white">
                    WC
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white">
                    MJ
                  </div>
                  <div className="h-8 w-8 rounded-full bg-purple-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white">
                    LP
                  </div>
                  <div className="h-8 w-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white">
                    AK
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Trusted by 20,000+ teams</p>
                  <p className="text-[11px] text-slate-400">worldwide for daily dependency security</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right Column: Vertical Stack of Integration Cards matching image */}
          <Reveal delay={0.15}>
            <div className="space-y-4">
              {integrations.map((item) => (
                <motion.div
                  key={item.name}
                  whileHover={{ x: 6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:border-slate-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
                    <item.logo className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
