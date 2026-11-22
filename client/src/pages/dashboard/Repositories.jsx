import { useMemo, useState } from 'react'
import { Github, GitBranch, Search, SlidersHorizontal } from 'lucide-react'
import Button from '../../components/common/Button'
import DemoLabel from '../../components/common/DemoLabel'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import RepositoryCard from '../../components/dashboard/RepositoryCard'
import { repositories } from '../../data/mockData'

const filters = ['All', 'Active', 'Pending']

export default function Repositories() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return repositories.filter(
      (repo) =>
        (status === 'All' || repo.status === status) &&
        (!term || repo.name.toLowerCase().includes(term) || repo.language.toLowerCase().includes(term)),
    )
  }, [search, status])

  return (
    <div>
      <PageHeader
        eyebrow="Project management"
        title="My Repositories"
        description="A preview of how connected projects will appear. Repository cards below use demonstration data only."
        actions={<DemoLabel />}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search repositories..."
            aria-label="Search repositories"
            className="h-11 w-full rounded-xl border border-line bg-card/70 pr-4 pl-10 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brandlight/50 focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-slim pb-1 sm:pb-0">
          <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-muted sm:block" />
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatus(filter)}
              className={`shrink-0 rounded-lg border px-3.5 py-2 text-[12px] font-medium transition ${
                status === filter
                  ? 'border-brand/40 bg-brand/12 text-brandlight'
                  : 'border-line text-subtle hover:border-white/15 hover:text-ink'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((repository, index) => (
            <RepositoryCard key={repository.id} repository={repository} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GitBranch}
          title="No repositories match your filters"
          description="Try a different search term or choose another status filter."
        />
      )}

      <div className="mt-8">
        <p className="label-caps mb-3">Live connection</p>
        <EmptyState
          icon={Github}
          title="No repositories connected yet"
          description="GitHub authorisation and repository scanning will be available in Phase 2. The cards above are illustrative examples, not live repository data."
          action={
            <Button variant="secondary" disabled leftIcon={Github}>
              Connect GitHub — Coming in Phase 2
            </Button>
          }
        />
      </div>
    </div>
  )
}
