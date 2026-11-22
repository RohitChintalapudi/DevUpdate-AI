import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LuGitBranch,
  LuLayers,
  LuPackage,
  LuShieldAlert,
  LuSparkles,
} from 'react-icons/lu'
import {
  JavascriptOriginal,
  TypescriptOriginal,
  ReactOriginal,
  NodejsOriginal,
  PythonOriginal,
  RustOriginal,
  GoOriginal,
  DockerOriginal,
  GithubOriginal,
  NpmOriginalWordmark,
  NextjsOriginal,
  PostgresqlOriginal,
} from 'devicons-react'
import {
  GoogleLogo,
  TrustpilotStar,
  AirbnbMonoLogo,
  CoinbaseMonoLogo,
  NotionMonoLogo,
  GumroadMonoLogo,
  PaypalMonoLogo,
  UpworkMonoLogo,
  ShopifyMonoLogo,
  StripeMonoLogo,
  ZoomMonoLogo,
} from './BrandLogos'

// Official developer stack badges from devicons-react
// Positioned with precision radii from horizontal center (50%)
// Center text column max-w-3xl = 768px (half-width 384px)
// All left badges: calc(50% - 460px to 680px) -> ALWAYS >= 76px outside text column
// All right badges: calc(50% + 410px to 640px) -> ALWAYS >= 26px outside text column (and at headline top 240px: Docker is at 440px, 104px outside headline)
const developerBadges = [
  // Outer Ring (Radius ~720px) - Visible on large desktop
  {
    id: 'js',
    label: 'JavaScript',
    desc: 'npm ecosystem & ECMAScript feature tracking',
    component: JavascriptOriginal,
    top: '140px',
    left: 'calc(50% - 660px)',
    delay: 0.1,
    floatDuration: 6.2,
    yDelta: -8,
  },
  {
    id: 'ts',
    label: 'TypeScript',
    desc: 'Type definition & compiler breaking changes',
    component: TypescriptOriginal,
    top: '140px',
    left: 'calc(50% + 590px)',
    delay: 0.2,
    floatDuration: 6.8,
    yDelta: 9,
  },
  {
    id: 'python',
    label: 'Python',
    desc: 'PyPI packages, pip, Poetry & runtime audits',
    component: PythonOriginal,
    top: '390px',
    left: 'calc(50% - 680px)',
    delay: 0.3,
    floatDuration: 7.4,
    yDelta: -10,
  },
  {
    id: 'rust',
    label: 'Rust',
    desc: 'Cargo crates & memory-safety advisory tracking',
    component: RustOriginal,
    top: '390px',
    left: 'calc(50% + 610px)',
    delay: 0.4,
    floatDuration: 7.1,
    yDelta: 8,
  },
  {
    id: 'npm',
    label: 'npm Registry',
    desc: 'Live package versions, lockfiles & registries',
    component: NpmOriginalWordmark,
    top: '640px',
    left: 'calc(50% - 630px)',
    delay: 0.45,
    floatDuration: 7.5,
    yDelta: -8,
  },
  {
    id: 'go',
    label: 'Go',
    desc: 'Go modules & dependency vulnerability scanning',
    component: GoOriginal,
    top: '640px',
    left: 'calc(50% + 560px)',
    delay: 0.5,
    floatDuration: 6.5,
    yDelta: 8,
  },

  // Middle Ring (Radius ~540px)
  {
    id: 'react',
    label: 'React',
    desc: 'React 19 Server Components & hook audits',
    component: ReactOriginal,
    top: '240px',
    left: 'calc(50% - 500px)',
    delay: 0.25,
    floatDuration: 6.6,
    yDelta: -9,
  },
  {
    id: 'docker',
    label: 'Docker',
    desc: 'Base images, tags & CVE container verification',
    component: DockerOriginal,
    top: '240px',
    left: 'calc(50% + 440px)',
    delay: 0.6,
    floatDuration: 6.9,
    yDelta: 9,
  },
  {
    id: 'node',
    label: 'Node.js',
    desc: 'LTS releases, native APIs & engine compatibility',
    component: NodejsOriginal,
    top: '490px',
    left: 'calc(50% - 480px)',
    delay: 0.35,
    floatDuration: 7.0,
    yDelta: 8,
  },
  {
    id: 'github',
    label: 'GitHub OAuth',
    desc: 'Automated PR generation & manifest extraction',
    component: GithubOriginal,
    top: '490px',
    left: 'calc(50% + 410px)',
    delay: 0.55,
    floatDuration: 6.7,
    yDelta: -8,
  },

  // Lower Flanks (Flanking the card stack, completely outside the 512px max-w-lg card)
  {
    id: 'nextjs',
    label: 'Next.js',
    desc: 'Full-stack framework upgrade intelligence',
    component: NextjsOriginal,
    top: '740px',
    left: 'calc(50% - 410px)',
    delay: 0.65,
    floatDuration: 7.2,
    yDelta: -7,
  },
  {
    id: 'postgres',
    label: 'PostgreSQL',
    desc: 'ORM drivers, pool clients & migration scripts',
    component: PostgresqlOriginal,
    top: '740px',
    left: 'calc(50% + 340px)',
    delay: 0.75,
    floatDuration: 6.4,
    yDelta: 7,
  },
]

// Visual status labels
const heroVisualLabels = [
  { icon: LuGitBranch, label: 'Repository Connected', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  { icon: LuLayers, label: 'Dependencies Analyzed', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { icon: LuPackage, label: 'Updates Discovered', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { icon: LuShieldAlert, label: 'Breaking Changes Detected', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { icon: LuSparkles, label: 'AI Recommendations Ready', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
]

export default function Hero() {
  const [activeTooltip, setActiveTooltip] = useState(null)

  return (
    <section className="relative min-h-[960px] overflow-hidden bg-white pt-28 pb-16 sm:pt-36 sm:pb-20">
      {/* =========================================================
       * Concentric Orbital Rings Background matching Deflexai
       * ========================================================= */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 1600 1100"
          fill="none"
          className="h-[1100px] w-[1600px] max-w-none shrink-0"
        >
          {/* Subtle concentric circles */}
          <circle cx="800" cy="500" r="240" stroke="#F1F5F9" strokeWidth="1.2" strokeDasharray="4 4" />
          <circle cx="800" cy="500" r="380" stroke="#E2E8F0" strokeWidth="1.2" />
          <circle cx="800" cy="500" r="540" stroke="#E2E8F0" strokeWidth="1.2" />
          <circle cx="800" cy="500" r="720" stroke="#E2E8F0" strokeWidth="1.2" />
          <circle cx="800" cy="500" r="920" stroke="#F1F5F9" strokeWidth="1.2" />

          {/* Accent colored arcs along orbital paths matching Deflexai */}
          <path
            d="M 260 500 A 540 540 0 0 1 430 140"
            stroke="url(#blue-arc)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 1170 140 A 540 540 0 0 1 1340 500"
            stroke="url(#orange-arc)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 1260 680 A 540 540 0 0 1 1120 860"
            stroke="url(#indigo-arc)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="blue-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id="orange-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            <linearGradient id="indigo-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* =========================================================
       * Floating Official npm devicons-react Badges
       * Positioned strictly along outer orbits, never overlapping text
       * ========================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden hidden xl:block">
        {developerBadges.map((badge) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, badge.yDelta, 0],
            }}
            transition={{
              opacity: { duration: 0.6, delay: badge.delay },
              scale: { duration: 0.6, delay: badge.delay },
              y: {
                duration: badge.floatDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            style={{
              position: 'absolute',
              top: badge.top,
              left: badge.left,
            }}
            className="pointer-events-auto z-20"
            onMouseEnter={() => setActiveTooltip(badge.id)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <div className="group relative">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] transition-all duration-200 group-hover:scale-120 group-hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.16)] group-hover:border-slate-300">
                <badge.component size={26} />
              </div>

              {/* Tooltip on Hover */}
              {activeTooltip === badge.id ? (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12)] z-30"
                >
                  <p className="text-xs font-bold text-slate-900">{badge.label}</p>
                  <p className="mt-0.5 text-[10.5px] text-slate-500 leading-tight">{badge.desc}</p>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>

      {/* =========================================================
       * Hero Main Content Area (Centered & Constrained)
       * ========================================================= */}
      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8">
        {/* Eyebrow & Ratings Bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {/* Eyebrow Pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-bold tracking-[0.16em] uppercase text-sky-700 shadow-2xs">
            <LuSparkles className="h-3.5 w-3.5 text-sky-600" />
            AI-POWERED DEPENDENCY INTELLIGENCE PLATFORM
          </span>

          {/* Ratings Pill */}
          <div className="inline-flex items-center gap-3.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <GoogleLogo className="h-3.5 w-3.5" />
              <span>4.6</span>
              <span className="font-normal text-slate-500">Google</span>
            </div>
            <span className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <TrustpilotStar className="h-3.5 w-3.5" />
              <span>4.9</span>
              <span className="font-normal text-slate-500">Trustpilot</span>
            </div>
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 text-[42px] font-extrabold tracking-[-0.04em] text-slate-950 sm:text-[56px] lg:text-[68px] leading-[1.08]"
        >
          Know What Changed.
          <br />
          Understand What Matters.
        </motion.h1>

        {/* Subtitle & Value Proposition */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-5 max-w-2xl space-y-2.5 text-slate-600 text-[15px] sm:text-[16px] leading-relaxed"
        >
          <p className="font-semibold text-slate-800">
            Your dependencies evolve every day. Your project shouldn&apos;t fall behind.
          </p>
          <p className="text-[14px] sm:text-[15px] text-slate-500 font-normal">
            DevUpdate AI analyzes your GitHub repositories, discovers outdated dependencies,
            researches release changes, identifies potential compatibility risks, and generates
            intelligent upgrade recommendations tailored to your actual codebase.
          </p>
          <p className="text-[13px] font-medium text-slate-400 pt-1">
            Make dependency updates smarter, safer, and easier to understand.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
        >
          <Link
            to="/signup"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
          >
            Get Started Free
          </Link>
          <a
            href="#features"
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
          >
            Explore Features
          </a>
        </motion.div>

        {/* Supporting text */}
        <p className="mt-3 text-xs text-slate-400">
          Connect your GitHub repository and let AI help you understand your dependencies.
        </p>

        {/* Hero Visual Status Labels */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
          {heroVisualLabels.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${item.color} shadow-2xs`}
            >
              <item.icon className="h-3 w-3" />
              {item.label}
            </span>
          ))}
        </div>

        {/* =========================================================
         * Center Floating Activity Stack over Blue Glow
         * Using official devicons-react components
         * ========================================================= */}
        <div className="relative mx-auto mt-12 max-w-lg">
          <div className="pointer-events-none absolute -inset-x-12 top-0 bottom-4 rounded-full bg-sky-400/25 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 -top-6 h-36 rounded-full bg-indigo-500/15 blur-2xl" />

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="relative z-10 space-y-[-14px]"
          >
            {/* Top Card: React 19 Upgrade with official ReactOriginal logo */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="relative z-30 mx-auto w-full rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 shadow-2xs">
                    <ReactOriginal size={24} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">
                      React 19.1.0 Upgrade Verified
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Zero breaking changes in client hooks · acme-dashboard
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-100">
                  Ready
                </span>
              </div>
            </motion.div>

            {/* Middle Card: Node.js Security Advisory with official NodejsOriginal logo */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="relative z-20 mx-auto w-[94%] rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 shadow-2xs">
                    <NodejsOriginal size={22} />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-slate-900">
                      Node.js v22 LTS Engine & CVE Resolved
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      38/38 end-to-end tests passing · Lead SecEng
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Approved
                </span>
              </div>
            </motion.div>

            {/* Bottom Card: Automated PR with official GithubOriginal logo */}
            <div className="relative z-10 mx-auto w-[88%] rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2.5 text-left">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                  <GithubOriginal size={18} />
                </div>
                <div className="truncate">
                  <p className="truncate text-[11.5px] font-semibold text-slate-800">
                    Automated GitHub PR #142 Ready to Merge
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    Dependabot + DevUpdate AI Context Analysis
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* =========================================================
       * Social Proof "Trusted by" Logo Bar
       * ========================================================= */}
      <div className="relative z-10 mt-16 border-t border-slate-100 bg-white pt-10">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
          <p className="text-[12.5px] font-medium text-slate-500 tracking-tight">
            Trusted by 200,000+ developers & teams worldwide
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-slate-400 transition-colors">
            <GoogleLogo className="h-5 w-auto grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer" />
            <AirbnbMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <CoinbaseMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <NotionMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <GumroadMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <PaypalMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <UpworkMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <ShopifyMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <StripeMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
            <ZoomMonoLogo className="opacity-70 hover:opacity-100 hover:text-slate-800 transition-all cursor-pointer" />
          </div>
        </div>
      </div>
    </section>
  )
}
