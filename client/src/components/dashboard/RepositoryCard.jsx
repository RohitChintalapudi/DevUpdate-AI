import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, CalendarClock, GitBranch, Package } from 'lucide-react'
import Badge from '../common/Badge'
import Button from '../common/Button'
import Modal from '../common/Modal'

export default function RepositoryCard({ repository, index = 0 }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.06 }}
        whileHover={{ y: -4 }}
        className="group relative flex h-full flex-col rounded-2xl border border-line bg-card/70 p-5 transition-colors hover:border-brandlight/30"
      >
        <div className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-brand/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brandlight">
            <GitBranch className="h-[18px] w-[18px]" />
          </span>
          <Badge tone={repository.status === 'Active' ? 'success' : 'warning'} dot>
            {repository.status}
          </Badge>
        </div>
        <h3 className="relative mt-5 truncate text-[15px] font-semibold text-ink">{repository.name}</h3>
        <p className="relative mt-1.5 line-clamp-2 min-h-[38px] text-[12px] leading-relaxed text-subtle">
          {repository.description}
        </p>

        <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: repository.languageColor }} />
            {repository.language}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> {repository.dependencies} packages
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> {repository.lastScanned}
          </span>
        </div>

        <div className="relative mt-5 flex items-center justify-between border-t border-line pt-4">
          <span className="text-[11px] text-subtle">
            <span className="font-semibold text-warning">{repository.updates}</span> updates available
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-brandlight transition hover:text-ink"
          >
            Details <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={repository.name}
        description="Illustrative repository details — sample data only."
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>}
      >
        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <span className="text-muted">Description</span>
            <span className="text-right text-ink">{repository.description}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <span className="text-muted">Language</span>
            <span className="text-ink">{repository.language}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <span className="text-muted">Dependencies</span>
            <span className="text-ink">{repository.dependencies}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Last scan</span>
            <span className="text-ink">{repository.lastScanned}</span>
          </div>
          <p className="rounded-lg border border-line bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted">
            Real repository scanning and GitHub authorisation will be introduced in Phase 2. No
            external requests are made in this preview.
          </p>
        </div>
      </Modal>
    </>
  )
}
