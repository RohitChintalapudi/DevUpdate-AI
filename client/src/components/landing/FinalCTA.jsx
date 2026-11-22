import { LuArrowRight, LuSparkles } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Reveal from '../common/Reveal'

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAFC] py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white px-6 py-16 text-center sm:px-14 shadow-md">
            {/* Concentric Orbits Graphic Background */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 800 500" fill="none" className="h-[500px] w-[800px] opacity-40">
                <circle cx="400" cy="250" r="140" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="400" cy="250" r="220" stroke="#E2E8F0" strokeWidth="1" />
                <circle cx="400" cy="250" r="300" stroke="#F1F5F9" strokeWidth="1" />
              </svg>
            </div>

            {/* Ambient Cyan/Blue Glow */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-96 rounded-full bg-sky-200/35 blur-3xl" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-700 shadow-2xs">
                <LuSparkles className="h-3.5 w-3.5 text-sky-500" />
                THE FUTURE OF DEPENDENCY MANAGEMENT
              </span>

              <h2 className="mt-6 text-[36px] font-extrabold tracking-[-0.04em] text-slate-950 sm:text-[48px] leading-[1.12]">
                Your Dependencies Are Changing.
                <br />
                Stay Ahead.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-slate-500">
                Stop treating dependency updates as a routine checklist. Understand release changes,
                identify potential risks, and make better upgrade decisions with AI-powered project intelligence.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 sm:w-auto"
                >
                  Get Started Free <LuArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 sm:w-auto"
                >
                  Explore the Platform
                </a>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Connect your repository. Discover your dependencies. Understand every update.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
