import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LuBoxes,
  LuCircleCheck,
  LuClock3,
  LuFileJson,
  LuGitBranch,
  LuInfo,
  LuLoaderCircle,
  LuScanSearch,
  LuSparkles,
} from 'react-icons/lu'

const STEPS = [
  { label: 'Connecting', hint: 'Opening the repository and preparing the scan…', icon: LuGitBranch },
  { label: 'Discovering files', hint: 'Walking the repository tree and locating dependency manifests…', icon: LuScanSearch },
  { label: 'Reading manifests', hint: 'Fetching package, lock and build files from GitHub…', icon: LuFileJson },
  { label: 'Extracting dependencies', hint: 'Parsing versions across every supported ecosystem…', icon: LuBoxes },
]

function activeStep(progress, status) {
  if (status === 'QUEUED') return 0
  if ((progress.dependenciesExtracted || 0) > 0) return 3
  if ((progress.manifestsProcessed || 0) > 0) return 2
  if ((progress.filesDiscovered || 0) > 0) return 1
  return 0
}

function percent(progress, status, manifestCount) {
  if (status === 'COMPLETED') return 100
  if (status === 'QUEUED') return 8
  if ((progress.dependenciesExtracted || 0) > 0) return 94
  if ((progress.manifestsProcessed || 0) > 0) {
    const done = progress.manifestsProcessed || 0
    const ratio = manifestCount > 0 ? Math.min(1, done / manifestCount) : Math.min(0.9, done / 10)
    return 50 + Math.round(ratio * 38)
  }
  if ((progress.filesDiscovered || 0) > 0) return 36
  return 16
}

function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function Counter({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="text-sm font-bold tabular-nums text-slate-800">{value || 0}</p>
      </div>
    </div>
  )
}

export default function ScanProgress({ status, progress = {}, manifestCount = 0, repositoryName = '', startedAt }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const step = activeStep(progress, status)
  const percentValue = percent(progress, status, manifestCount)
  const started = startedAt ? new Date(startedAt).getTime() : now
  const elapsed = Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0

  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/70 p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -top-24 right-0 h-60 w-60 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-60 w-60 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <LuScanSearch className="h-7 w-7" />
              <motion.span
                className="absolute -inset-1.5 rounded-3xl border-2 border-sky-400/50"
                animate={{ scale: [1, 1.14, 1], opacity: [0.75, 0.1, 0.75] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-950">
                  Analyzing {repositoryName || 'your repository'}
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold tracking-wide text-sky-700 uppercase">
                  <LuLoaderCircle className="h-3 w-3 animate-spin" />
                  {status === 'QUEUED' ? 'Queued' : 'Scanning'}
                </span>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
                {progress.message || STEPS[step].hint}
              </p>
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-medium tabular-nums text-slate-500">
            <LuClock3 className="h-3.5 w-3.5" /> {formatElapsed(elapsed)}
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{STEPS[step].label}</span>
            <span className="font-semibold tabular-nums text-slate-500">{percentValue}%</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-slate-200/80">
            <motion.div
              className="relative h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500"
              initial={false}
              animate={{ width: `${percentValue}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item, index) => {
            const Icon = index < step ? LuCircleCheck : item.icon
            const state = index < step ? 'done' : index === step ? 'active' : 'pending'
            return (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                  state === 'active'
                    ? 'border-sky-300 bg-sky-50 text-sky-800'
                    : state === 'done'
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
                      : 'border-slate-200/70 bg-white/50 text-slate-400'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${state === 'active' ? 'animate-pulse' : ''}`} />
                <span className="truncate font-semibold">{item.label}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Counter icon={LuGitBranch} label="Files discovered" value={progress.filesDiscovered} />
          <Counter icon={LuFileJson} label="Manifests processed" value={progress.manifestsProcessed} />
          <Counter icon={LuBoxes} label="Dependencies found" value={progress.dependenciesExtracted} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <LuInfo className="h-3.5 w-3.5" />
            This scan runs in the background — you can leave this page.
          </span>
          {elapsed > 15 ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600">
              <LuSparkles className="h-3.5 w-3.5" />
              Still working… large repositories can take a minute.
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}
