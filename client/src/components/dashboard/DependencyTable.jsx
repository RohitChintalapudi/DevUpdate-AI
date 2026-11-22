import { useState } from 'react'
import { ArrowUpRight, Package } from 'lucide-react'
import Badge from '../common/Badge'
import Button from '../common/Button'
import EmptyState from '../common/EmptyState'
import Modal from '../common/Modal'

export default function DependencyTable({ dependencies }) {
  const [selected, setSelected] = useState(null)

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line bg-card/60">
        <div className="scrollbar-slim overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-white/[0.02] text-[10px] font-semibold tracking-wider text-muted uppercase">
                <th className="px-5 py-3.5">Package name</th>
                <th className="px-5 py-3.5">Ecosystem</th>
                <th className="px-5 py-3.5">Current</th>
                <th className="px-5 py-3.5">Latest</th>
                <th className="px-5 py-3.5">Update status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {dependencies.map((dependency) => (
                <tr
                  key={dependency.name}
                  className="border-b border-line/50 transition-colors last:border-0 hover:bg-white/[0.025]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-brandlight">
                        <Package className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-ink">{dependency.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-subtle">{dependency.ecosystem}</td>
                  <td className="px-5 py-4 font-mono text-[12px] text-subtle">{dependency.current}</td>
                  <td className="px-5 py-4 font-mono text-[12px] text-ink">{dependency.latest}</td>
                  <td className="px-5 py-4">
                    <Badge tone={dependency.statusTone} dot>{dependency.status}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(dependency)}
                      className="inline-flex items-center gap-1 font-medium text-brandlight transition hover:text-ink"
                    >
                      View <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dependencies.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No dependencies found"
            description="Try a different search term or status filter."
            className="m-4 border-0"
          />
        ) : null}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} · ${selected.current} → ${selected.latest}` : ''}
        description="Illustrative dependency record — sample data only."
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected ? (
          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-muted">Ecosystem</span>
              <span className="text-ink">{selected.ecosystem}</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-muted">Update status</span>
              <Badge tone={selected.statusTone} dot>{selected.status}</Badge>
            </div>
            <p className="rounded-lg border border-line bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted">
              Release notes, security advisories and AI analysis for this package will become
              available when the intelligence services are connected in later phases.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
