import { useState } from 'react'
import { motion } from 'framer-motion'
import { LuSparkles } from 'react-icons/lu'
import {
  ReactOriginal,
  TypescriptOriginal,
  PythonOriginal,
  NodejsOriginal,
  GithubOriginal,
  DockerOriginal,
} from 'devicons-react'
import Navbar from '../components/landing/Navbar'

// Official developer stack badges placed on outer orbits flanking the centered card
const authOrbitBadges = [
  // Left Flank
  {
    id: 'react',
    label: 'React',
    desc: 'React 19 hooks & client components',
    component: ReactOriginal,
    top: '22%',
    left: 'calc(50% - 370px)',
    floatDuration: 6.2,
    yDelta: -7,
    delay: 0.1,
  },
  {
    id: 'ts',
    label: 'TypeScript',
    desc: 'Compiler breaking change analysis',
    component: TypescriptOriginal,
    top: '50%',
    left: 'calc(50% - 470px)',
    floatDuration: 7.0,
    yDelta: 8,
    delay: 0.2,
  },
  {
    id: 'python',
    label: 'Python',
    desc: 'PyPI packages & runtime security',
    component: PythonOriginal,
    top: '76%',
    left: 'calc(50% - 360px)',
    floatDuration: 6.6,
    yDelta: -8,
    delay: 0.3,
  },

  // Right Flank
  {
    id: 'node',
    label: 'Node.js',
    desc: 'LTS engine compatibility & CVEs',
    component: NodejsOriginal,
    top: '22%',
    left: 'calc(50% + 320px)',
    floatDuration: 6.8,
    yDelta: 7,
    delay: 0.15,
  },
  {
    id: 'github',
    label: 'GitHub',
    desc: 'Automated PRs & lockfile sync',
    component: GithubOriginal,
    top: '50%',
    left: 'calc(50% + 420px)',
    floatDuration: 6.5,
    yDelta: -7,
    delay: 0.25,
  },
  {
    id: 'docker',
    label: 'Docker',
    desc: 'Base images & container advisories',
    component: DockerOriginal,
    top: '76%',
    left: 'calc(50% + 310px)',
    floatDuration: 7.3,
    yDelta: 8,
    delay: 0.35,
  },
]

export default function AuthLayout({ title, description, children, footer, badge }) {
  const [activeTooltip, setActiveTooltip] = useState(null)

  return (
    <div data-surface="public" className="relative min-h-screen w-full bg-canvas text-ink font-sans antialiased selection:bg-brandlight/30 selection:text-ink flex flex-col justify-center items-center px-4 pt-24 pb-8 sm:pt-28">
      {/* =========================================================
       * 1. Top Navbar (Identical to landing page; logo redirects to '/')
       * ========================================================= */}
      <Navbar />

      {/* =========================================================
       * Concentric Orbital Background & Ethereal Glow
       * ========================================================= */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 1400 900"
          fill="none"
          className="h-[950px] w-[1400px] max-w-none shrink-0"
        >
          {/* Subtle concentric circles */}
          <circle cx="700" cy="450" r="280" stroke="#F1F5F9" strokeWidth="1.2" strokeDasharray="4 4" />
          <circle cx="700" cy="450" r="420" stroke="#E2E8F0" strokeWidth="1.2" />
          <circle cx="700" cy="450" r="580" stroke="#E2E8F0" strokeWidth="1.2" />
          <circle cx="700" cy="450" r="760" stroke="#F1F5F9" strokeWidth="1.2" />

          {/* Elegant colored arcs matching landing hero */}
          <path
            d="M 280 450 A 420 420 0 0 1 450 160"
            stroke="url(#auth-blue-arc)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 1120 450 A 420 420 0 0 1 950 740"
            stroke="url(#auth-indigo-arc)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="auth-blue-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id="auth-indigo-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ambient Soft Cyan & Indigo Blur Aura directly behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[580px] rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[450px] rounded-full bg-indigo-200/20 blur-2xl" />
      </div>

      {/* =========================================================
       * Floating Developer Stack Badges on the Orbits (Flanking)
       * ========================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden hidden lg:block">
        {authOrbitBadges.map((badgeItem) => (
          <motion.div
            key={badgeItem.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, badgeItem.yDelta, 0],
            }}
            transition={{
              opacity: { duration: 0.6, delay: badgeItem.delay },
              scale: { duration: 0.6, delay: badgeItem.delay },
              y: {
                duration: badgeItem.floatDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            style={{
              position: 'absolute',
              top: badgeItem.top,
              left: badgeItem.left,
            }}
            className="pointer-events-auto z-10"
            onMouseEnter={() => setActiveTooltip(badgeItem.id)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <div className="group relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 p-2.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all duration-200 group-hover:scale-120 group-hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.14)] group-hover:border-slate-300">
                <badgeItem.component size={24} />
              </div>

              {/* Tooltip on Hover */}
              {activeTooltip === badgeItem.id ? (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 text-center shadow-lg z-30"
                >
                  <p className="text-xs font-bold text-slate-900">{badgeItem.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">{badgeItem.desc}</p>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>

      {/* =========================================================
       * Main Centered Card Container
       * ========================================================= */}
      <div className="relative z-20 w-full max-w-[450px] shrink-0">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 sm:px-8 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.06)]">
          {/* Card Header */}
          <div className="text-center mb-4">
            {badge ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase text-sky-700 shadow-2xs mb-1.5">
                <LuSparkles className="h-2.5 w-2.5 text-sky-600" />
                {badge}
              </span>
            ) : null}
            <h1 className="text-xl sm:text-[22px] font-bold tracking-tight text-slate-950">{title}</h1>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>

          {/* Form Content */}
          {children}
        </div>

        {/* Footer switch link */}
        {footer ? (
          <div className="mt-2.5 text-center text-xs text-slate-500">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
