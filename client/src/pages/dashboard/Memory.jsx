import { motion } from 'framer-motion'
import { BadgeCheck, BrainCircuit, FileSearch, History, Unplug } from 'lucide-react'
import DemoLabel from '../../components/common/DemoLabel'
import PageHeader from '../../components/common/PageHeader'
import PlaceholderPanel from '../../components/dashboard/PlaceholderPanel'
import { memoryEntries } from '../../data/mockData'

const iconMap = { History, Unplug, FileSearch, BadgeCheck }
const toneClasses = {
  violet: 'text-brandlight bg-brand/12 border-brand/25',
  danger: 'text-danger bg-danger/10 border-danger/25',
  cyan: 'text-accent bg-accent/10 border-accent/25',
  success: 'text-success bg-success/10 border-success/25',
}

export default function Memory() {
  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Memento Memory"
        description="A preview of persistent project memory — the decisions and context future AI analysis will be able to recall."
        actions={<DemoLabel label="Sample memory" />}
      />

      <PlaceholderPanel
        icon={BrainCircuit}
        title="Persistent team memory is planned for a later phase"
        description="MongoDB-backed project memory, decision history and retrieval will be connected with the AI services. Entries below are illustrative examples only."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {memoryEntries.map((entry, index) => {
          const Icon = iconMap[entry.icon]
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="rounded-2xl border border-line bg-card/70 p-5 transition-colors hover:border-brandlight/30"
            >
              <div className="flex items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneClasses[entry.tone]}`}>
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="label-caps">{entry.type}</p>
                  <h3 className="mt-1.5 text-[15px] font-semibold text-ink">{entry.title}</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-subtle">{entry.detail}</p>
                  <p className="mt-4 text-[11px] text-muted">{entry.date}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
