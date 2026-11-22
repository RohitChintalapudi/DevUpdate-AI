import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LuRefreshCw, LuSearch, LuShieldAlert } from 'react-icons/lu'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import PageHeader from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import UpdateTable from '../../components/dashboard/UpdateTable'
import useDebounce from '../../hooks/useDebounce'
import { getErrorMessage, updatesApi } from '../../services/api'

const selectClass =
  'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'

const ECOSYSTEMS = ['npm', 'PyPI', 'Maven', 'Cargo', 'Composer', 'RubyGems', 'Go', 'NuGet']
const UPDATE_TYPES = ['MAJOR', 'MINOR', 'PATCH', 'PRERELEASE', 'UNKNOWN', 'NONE']
const SECURITY_STATUSES = [
  ['VULNERABLE', 'Vulnerable'],
  ['NO_KNOWN_VULNERABILITY', 'No known vulnerabilities'],
  ['SECURITY_DATA_UNAVAILABLE', 'Security data unavailable'],
  ['UNKNOWN', 'Security unknown'],
]

export default function DependencyUpdates() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 300)
  const [ecosystem, setEcosystem] = useState('')
  const [repositoryId, setRepositoryId] = useState(searchParams.get('repositoryId') || '')
  const [updateType, setUpdateType] = useState('')
  const [securityStatus, setSecurityStatus] = useState('')
  const [sort, setSort] = useState('checked')
  const [page, setPage] = useState(1)

  const [data, setData] = useState({
    updates: [],
    repositories: [],
    pagination: { page: 1, pages: 1, total: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await updatesApi.list({
        search: debouncedSearch,
        ecosystem,
        repositoryId,
        updateType,
        securityStatus,
        sort,
        page,
        limit: 20,
      })
      setData(response)
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not load dependency updates',
        message: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, ecosystem, repositoryId, updateType, securityStatus, sort, page])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await load()
    }
    run()
    return () => {
      active = false
    }
  }, [load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleCheckAll = async () => {
    setChecking(true)
    try {
      const response = await updatesApi.checkAll()
      setToast({
        type: 'success',
        title: 'Update checks queued',
        message: response.message || 'Repository checks are running in the background.',
      })
      await load()
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not start update checks',
        message: getErrorMessage(error),
      })
    } finally {
      setChecking(false)
    }
  }

  const resetPage = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dependency intelligence"
        title="Dependency Updates"
        description="Compare extracted dependencies with official package registries and live security advisories."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={LuRefreshCw}
            loading={checking}
            onClick={handleCheckAll}
          >
            Check all repositories
          </Button>
        }
      />

      <SectionTabs section="updates" />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card/60 p-4 lg:flex-row lg:items-center">
        <Input
          icon={LuSearch}
          placeholder="Search package names…"
          value={search}
          onChange={(event) => resetPage(setSearch)(event.target.value)}
          className="lg:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by ecosystem"
            className={selectClass}
            value={ecosystem}
            onChange={(event) => resetPage(setEcosystem)(event.target.value)}
          >
            <option value="">All ecosystems</option>
            {ECOSYSTEMS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Filter by repository"
            className={selectClass}
            value={repositoryId}
            onChange={(event) => resetPage(setRepositoryId)(event.target.value)}
          >
            <option value="">All repositories</option>
            {data.repositories.map((repository) => (
              <option key={String(repository._id)} value={repository._id}>
                {repository.fullName || repository.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by update type"
            className={selectClass}
            value={updateType}
            onChange={(event) => resetPage(setUpdateType)(event.target.value)}
          >
            <option value="">All update types</option>
            {UPDATE_TYPES.map((item) => (
              <option key={item} value={item}>{item.toLowerCase()}</option>
            ))}
          </select>
          <select
            aria-label="Filter by security status"
            className={selectClass}
            value={securityStatus}
            onChange={(event) => resetPage(setSecurityStatus)(event.target.value)}
          >
            <option value="">All security states</option>
            {SECURITY_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            aria-label="Sort updates"
            className={selectClass}
            value={sort}
            onChange={(event) => resetPage(setSort)(event.target.value)}
          >
            <option value="checked">Recently checked</option>
            <option value="name">Package name</option>
            <option value="ecosystem">Ecosystem</option>
            <option value="status">Update status</option>
            <option value="type">Update type</option>
            <option value="security">Security status</option>
          </select>
        </div>
        <span className="text-xs text-muted lg:ml-auto">
          {data.pagination.total} {data.pagination.total === 1 ? 'record' : 'records'}
        </span>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-2xl border border-line bg-card/60">
            <TableSkeleton rows={8} />
          </div>
        ) : data.updates.length ? (
          <UpdateTable updates={data.updates} />
        ) : (
          <EmptyState
            icon={LuShieldAlert}
            title="No update records match these filters"
            description="Run an update check on a scanned repository, or adjust the filters above."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setEcosystem('')
                  setRepositoryId('')
                  setUpdateType('')
                  setSecurityStatus('')
                  setPage(1)
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </div>

      <Pagination
        pagination={data.pagination}
        page={page}
        onPageChange={(value) => {
          setPage(value)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
