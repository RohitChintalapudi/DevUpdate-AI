import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowUpCircle, CheckCircle2, Package, ShieldAlert, Search } from 'lucide-react'
import DemoLabel from '../../components/common/DemoLabel'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import DependencyTable from '../../components/dashboard/DependencyTable'
import { dependencies } from '../../data/mockData'

const statuses = ['All', 'Up to date', 'Minor update', 'Major update', 'Security risk']

export default function Dependencies() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState('All')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return dependencies.filter(
      (dependency) =>
        (status === 'All' || dependency.status === status) &&
        (!term || dependency.name.toLowerCase().includes(term)),
    )
  }, [search, status])

  return (
    <div>
      <PageHeader
        eyebrow="Project management"
        title="Dependencies"
        description="Browse a sample dependency inventory. All records below are clearly labelled demonstration data."
        actions={<DemoLabel />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Total dependencies" value="128" description="Across all sample projects" icon={Package} tone="violet" />
        <StatCard index={1} label="Up to date" value="96" description="No newer version detected" icon={CheckCircle2} tone="success" />
        <StatCard index={2} label="Outdated" value="28" description="Minor or major updates available" icon={ArrowUpCircle} tone="cyan" />
        <StatCard index={3} label="Security risks" value="04" description="Advisories needing a review" icon={ShieldAlert} tone="danger" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search packages..."
            aria-label="Search packages"
            className="h-10 w-full rounded-xl border border-line bg-card/70 pr-4 pl-10 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brandlight/50 focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-slim pb-1 lg:pb-0">
          {statuses.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-medium transition ${
                status === option
                  ? 'border-brand/40 bg-brand/12 text-brandlight'
                  : 'border-line text-subtle hover:border-white/15 hover:text-ink'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <DependencyTable dependencies={filtered} />
      <p className="mt-3 text-[11px] text-muted">
        Showing {filtered.length} of {dependencies.length} illustrative records. Live package
        registry lookups are planned for a later phase.
      </p>
    </div>
  )
}
