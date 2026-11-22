import { motion } from 'framer-motion'
import { ArrowRight, CircleDot, GitBranch, LockKeyhole, Sparkles } from 'lucide-react'
import Logo from '../components/common/Logo'

const nodes = [
  { cx: 90, cy: 110, r: 8, delay: 0 },
  { cx: 250, cy: 60, r: 5, delay: 0.4 },
  { cx: 330, cy: 190, r: 11, delay: 0.8 },
  { cx: 160, cy: 240, r: 6, delay: 1.2 },
  { cx: 395, cy: 315, r: 6, delay: 0.6 },
  { cx: 220, cy: 370, r: 9, delay: 1.6 },
  { cx: 65, cy: 330, r: 4, delay: 1 },
]

const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [2, 4],
  [4, 5],
  [5, 3],
  [3, 6],
  [6, 5],
]

function DependencyGraph() {
  return (
    <svg viewBox="0 0 460 420" fill="none" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="nodeGlow">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.15" />
        </radialGradient>
        <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#8B5CF6" stopOpacity="0.65" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="230" cy="210" r="170" fill="url(#nodeGlow)" opacity="0.08" />
      {edges.map(([from, to], index) => (
        <line
          key={index}
          x1={nodes[from].cx}
          y1={nodes[from].cy}
          x2={nodes[to].cx}
          y2={nodes[to].cy}
          stroke="url(#edgeGrad)"
          strokeWidth="1.2"
          className="animate-dash"
        />
      ))}
      {nodes.map((node, index) => (
        <motion.g
          key={index}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: node.delay }}
          style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
        >
          <circle cx={node.cx} cy={node.cy} r={node.r * 2.6} fill="#8B5CF6" opacity="0.07" />
          <circle
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill="#111827"
            stroke={index % 3 === 0 ? '#22D3EE' : '#A78BFA'}
            strokeWidth="1.6"
          />
          <circle cx={node.cx} cy={node.cy} r={node.r * 0.35} fill={index % 3 === 0 ? '#22D3EE' : '#A78BFA'} />
        </motion.g>
      ))}
      <motion.g
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="286" y="96" width="118" height="38" rx="10" fill="#151C2D" stroke="rgba(167,139,250,0.35)" />
        <text x="302" y="120" fill="#F8FAFC" fontSize="12" fontFamily="Inter, sans-serif" fontWeight="600">
          v2.4.0 available
        </text>
      </motion.g>
    </svg>
  )
}

export default function AuthLayout({ title, description, children, footer, badge }) {
  return (
    <div className="relative flex min-h-screen bg-canvas">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[520px] w-[520px] rounded-full bg-brand/10 blur-[120px]" />

      {/* Brand panel */}
      <div className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden border-r border-line bg-surface/50 p-10 xl:p-14 lg:flex">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
        <div className="relative">
          <Logo />
        </div>

        <div className="relative max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-brandlight uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            {badge || 'Dependency intelligence'}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[42px] leading-[1.08] font-bold tracking-[-0.045em] text-ink xl:text-[50px]"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-[15px] leading-relaxed text-subtle"
          >
            {description}
          </motion.p>
          <div className="mt-8 h-[280px] w-full opacity-90 xl:h-[330px]">
            <DependencyGraph />
          </div>
        </div>

        <div className="relative flex items-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-brandlight" /> Connected projects</span>
          <span className="flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5 text-accent" /> Release insights</span>
          <span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-success" /> Private by design</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col">
        <div className="relative flex items-center justify-between px-6 py-6 lg:hidden">
          <Logo />
          <ArrowRight className="h-4 w-4 text-muted" />
        </div>
        <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 lg:hidden">
              <h1 className="text-[32px] leading-tight font-bold tracking-[-0.04em] text-ink">{title}</h1>
              <p className="mt-3 text-sm text-subtle">{description}</p>
            </div>
            {children}
          </div>
        </div>
        {footer ? <div className="relative px-6 pb-8 text-center">{footer}</div> : null}
      </div>
    </div>
  )
}
