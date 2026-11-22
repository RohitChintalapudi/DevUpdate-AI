import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LuBoxes, LuDatabase, LuGitBranch, LuPackage, LuSearch } from 'react-icons/lu'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeleton'
import StatCard from '../../components/common/StatCard'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import DependencyTable from '../../components/dashboard/DependencyTable'
import useDebounce from '../../hooks/useDebounce'
import { dependenciesApi, getErrorMessage } from '../../services/api'

function selectClass() {
  return 'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'
}

export default function Dependencies() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 300)
  const [ecosystem, setEcosystem] = useState('')
  const [repositoryId, setRepositoryId] = useState('')
  const [scope, setScope] = useState('')
  const [sort, setSort] = useState('extracted')
  const [page, setPage] = useState(1)

  const [data, setData] = useState({
    dependencies: [],
    ecosystems: [],
    repositories: [],
    pagination: { page: 1, pages: 1, total: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const loadDependencies = useCallback(async () => {
    setLoading(true)
    try {
      const response = await dependenciesApi.list({
        search: debouncedSearch,
        ecosystem,
        repositoryId,
        scope,
        sort,
        page,
        limit: 20,
      })
      setData(response)
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load dependencies', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, ecosystem, repositoryId, scope, sort, page])

  useEffect(() => {
    let active = true
    const load = async () => {
      await Promise.resolve()
      if (active) await loadDependencies()
    }
    load()
    return () => {
      active = false
    }
  }, [loadDependencies])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const hasFilters = Boolean(search || ecosystem || repositoryId || scope)
  const total = data.pagination.total
  const ecosystemCount = data.ecosystems.length
  const sourceFileCount = new Set(data.dependencies.map((item) => item.sourceManifest)).size

  return (
    <div>
      <PageHeader
        eyebrow="Dependency intelligence"
        title="Dependencies"
        description="Every package extracted from your connected repositories, with declared and resolved versions kept separate."
        actions={
          <Link to="/dashboard/repositories">
            <Button variant="secondary" size="sm" leftIcon={LuGitBranch}>Manage repositories</Button>
          </Link>
        }
      />

      <SectionTabs section="repositories" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dependencies" value={total} description="Matching extracted packages" icon={LuPackage} tone="violet" index={0} />
        <StatCard label="Ecosystems" value={ecosystemCount} description="Package managers represented" icon={LuBoxes} tone="cyan" index={1} />
        <StatCard label="Source files" value={sourceFileCount} description="Manifests on this page" icon={LuGitBranch} tone="warning" index={2} />
        <StatCard label="Repositories" value={data.repositories.length} description="Connected repositories available to scan" icon={LuDatabase} tone="success" index={3} />
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          icon={LuSearch}
          placeholder="Search packages or source files…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by ecosystem"
            className={selectClass()}
            value={ecosystem}
            onChange={(event) => {
              setEcosystem(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All ecosystems</option>
            {data.ecosystems.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Filter by repository"
            className={selectClass()}
            value={repositoryId}
            onChange={(event) => {
              setRepositoryId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All repositories</option>
            {data.repositories.map((repo) => (
              <option key={repo._id} value={repo._id}>{repo.name}</option>
            ))}
          </select>
          <select
            aria-label="Filter by dependency scope"
            className={selectClass()}
            value={scope}
            onChange={(event) => {
              setScope(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All dependencies</option>
            <option value="production">Production</option>
            <option value="development">Development</option>
          </select>
          <select
            aria-label="Sort dependencies"
            className={selectClass()}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setPage(1)
            }}
          >
            <option value="extracted">Recently extracted</option>
            <option value="name">Package name</option>
            <option value="ecosystem">Ecosystem</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{total} dependency records found</span>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setEcosystem('')
              setRepositoryId('')
              setScope('')
              setPage(1)
            }}
            className="font-semibold text-brandlight transition hover:text-ink"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border border-line bg-card/60"><TableSkeleton rows={7} /></div>
        ) : total === 0 && !hasFilters ? (
          <EmptyState
            icon={LuDatabase}
            title="No dependencies extracted yet"
            description="Connect a repository and run your first dependency scan."
            action={
              <Link to="/dashboard/repositories">
                <Button leftIcon={LuGitBranch}>Go to repositories</Button>
              </Link>
            }
          />
        ) : (
          <DependencyTable dependencies={data.dependencies} />
        )}
      </div>

      {data.pagination.pages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted">
            Page {data.pagination.page} of {data.pagination.pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage((value) => Math.min(data.pagination.pages, value + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
