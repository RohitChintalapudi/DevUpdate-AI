import { motion } from 'framer-motion'
import { GitCompareArrows, Radar, Rocket, ShieldCheck, TriangleAlert } from 'lucide-react'
import Badge from '../../components/common/Badge'
import DemoLabel from '../../components/common/DemoLabel'
import PageHeader from '../../components/common/PageHeader'
import PlaceholderPanel from '../../components/dashboard/PlaceholderPanel'
import { intelligenceCards } from '../../data/mockData'

const iconMap = { Rocket, TriangleAlert, ShieldCheck, GitCompareArrows }
const toneClasses = {
  violet: 'text-brandlight bg-brand/12 border-brand/25',
  warning: 'text-warning bg-warning/10 border-warning/25',
  danger: 'text-danger bg-danger/10 border-danger/25',
  cyan: 'text-accent bg-accent/10 border-accent/25',
}

const pipeline = [
  'Collect release notes',
  'Normalise version data',
  'Identify important changes',
  'Surface actionable signals',
]

export default function UpdateIntelligence() {
  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Update Intelligence"
        description="A preview of how release intelligence will turn changelogs and advisories into clear signals. Live monitoring is not available yet."
        actions={<DemoLabel label="Upcoming feature" />}
      />

      <PlaceholderPanel
        icon={Radar}
        title="Live release monitoring is coming in a later phase"
        description="GitHub, Firecrawl and package registry connections are not implemented in Phase 1. Everything on this page uses illustrative examples."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {intelligenceCards.map((card, index) => {
          const Icon = iconMap[card.icon]
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="group rounded-2xl border border-line bg-card/70 p-5 transition-all hover:-translate-y-1 hover:border-brandlight/30"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${toneClasses[card.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-[15px] font-semibold text-ink">{card.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-subtle">{card.description}</p>
              <div className="mt-5 border-t border-line pt-4">
                <Badge tone={card.tone} dot>{card.example}</Badge>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card/60 p-6">
        <p className="label-caps">Planned pipeline</p>
        <h2 className="mt-1.5 text-lg font-semibold text-ink">How release intelligence will work</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {pipeline.map((step, index) => (
            <div key={step} className="relative rounded-xl border border-line bg-canvas/40 p-4">
              <span className="text-[11px] font-bold text-brandlight">0{index + 1}</span>
              <p className="mt-2 text-[13px] font-medium text-ink">{step}</p>
              {index < pipeline.length - 1 ? (
                <span className="absolute top-1/2 -right-2 hidden h-px w-4 bg-brand/40 md:block" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
