import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  LuArrowRight,
  LuBookOpen,
  LuCalendar,
  LuClock,
  LuExternalLink,
  LuFlame,
  LuFolderGit2,
  LuGitBranch,
  LuLayers,
  LuPackage,
  LuRefreshCw,
  LuSearch,
  LuShieldAlert,
  LuSparkles,
  LuTriangleAlert,
} from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import PageHeader from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import UpdateTable from '../../components/dashboard/UpdateTable'
import DependencyResearchDrawer from '../../components/dashboard/DependencyResearchDrawer'
import useDebounce from '../../hooks/useDebounce'
import { getErrorMessage, updatesApi } from '../../services/api'
import {
  formatDate,
  researchStatusLabel,
  researchStatusTone,
} from '../../utils/updateHelpers'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'repositories'
  const [viewTab, setViewTab] = useState(initialTab) // 'repositories' | 'all-updates'

  // Repository view state
  const [repoSearch, setRepoSearch] = useState('')
  const debouncedRepoSearch = useDebounce(repoSearch, 300)
  const [repoSort, setRepoSort] = useState('outdated')
  const [repoPage, setRepoPage] = useState(1)
  const [repoData, setRepoData] = useState({
    repositories: [],
    pagination: { page: 1, pages: 1, total: 0 },
  })
  const [repoLoading, setRepoLoading] = useState(true)

  // Global inventory view state
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 300)
  const [ecosystem, setEcosystem] = useState('')
  const [repositoryId, setRepositoryId] = useState(searchParams.get('repositoryId') || '')
  const [updateType, setUpdateType] = useState('')
  const [securityStatus, setSecurityStatus] = useState('')
  const [sort, setSort] = useState('checked')
  const [page, setPage] = useState(1)
  const [inventoryData, setInventoryData] = useState({
    updates: [],
    repositories: [],
    pagination: { page: 1, pages: 1, total: 0 },
  })
  const [inventoryLoading, setInventoryLoading] = useState(false)

  // Drawer & action state
  const [selectedDependency, setSelectedDependency] = useState(null)
  const [checking, setChecking] = useState(false)
  const [toast, setToast] = useState(null)

  // Load repositories for landing view
  const loadRepositories = useCallback(async () => {
    setRepoLoading(true)
    try {
      const response = await updatesApi.repositories({
        search: debouncedRepoSearch,
        sort: repoSort,
        page: repoPage,
        limit: 12,
      })
      setRepoData(response)
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not load repositories',
        message: getErrorMessage(error),
      })
    } finally {
      setRepoLoading(false)
    }
  }, [debouncedRepoSearch, repoSort, repoPage])

  // Load global inventory updates
  const loadInventory = useCallback(async () => {
    setInventoryLoading(true)
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
      setInventoryData(response)
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not load dependency updates',
        message: getErrorMessage(error),
      })
    } finally {
      setInventoryLoading(false)
    }
  }, [debouncedSearch, ecosystem, repositoryId, updateType, securityStatus, sort, page])

  useEffect(() => {
    if (viewTab === 'repositories') {
      loadRepositories()
    } else {
      loadInventory()
    }
  }, [viewTab, loadRepositories, loadInventory])

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
      if (viewTab === 'repositories') await loadRepositories()
      else await loadInventory()
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

  const handleTabChange = (tab) => {
    setViewTab(tab)
    setSearchParams({ tab })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dependency intelligence center"
        title="Dependency Updates"
        description="Select a connected repository to verify authoritative package versions, research official release notes with Firecrawl, and analyze update impact with AI."
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

      {/* View Switcher: Repositories vs All Inventory */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('repositories')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              viewTab === 'repositories'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <LuFolderGit2 className="h-4 w-4" />
            Connected Repositories ({repoData.pagination?.total || repoData.repositories?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('all-updates')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              viewTab === 'all-updates'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <LuPackage className="h-4 w-4" />
            All Updates Inventory
          </button>
        </div>

        {viewTab === 'repositories' && (
          <div className="flex items-center gap-2">
            <Input
              icon={LuSearch}
              placeholder="Filter repositories…"
              value={repoSearch}
              onChange={(e) => {
                setRepoSearch(e.target.value)
                setRepoPage(1)
              }}
              className="w-56"
            />
            <select
              aria-label="Sort repositories"
              className={selectClass}
              value={repoSort}
              onChange={(e) => {
                setRepoSort(e.target.value)
                setRepoPage(1)
              }}
            >
              <option value="outdated">Most Updates Available</option>
              <option value="vulnerable">Most Vulnerabilities</option>
              <option value="name">Repository Name</option>
              <option value="checked">Recently Checked</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: REPOSITORIES CARDS SELECTION INTERFACE */}
      {viewTab === 'repositories' && (
        <div>
          {repoLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xs" />
              ))}
            </div>
          ) : !repoData.repositories?.length ? (
            <EmptyState
              icon={LuFolderGit2}
              title="No connected repositories found"
              description="Connect a GitHub repository to track authoritative package versions, official Firecrawl research, and AI intelligence."
              action={
                <Link to="/dashboard/repositories">
                  <Button variant="primary">Connect GitHub Repositories</Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {repoData.repositories.map((repo) => {
                  const rStatus = repo.researchStatus || 'NOT_RESEARCHED'
                  return (
                    <div
                      key={String(repo.repositoryId)}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div>
                        {/* Header: Repo Name & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {repo.language && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                  {repo.language}
                                </span>
                              )}
                              <Badge tone={researchStatusTone[rStatus] || 'neutral'} dot>
                                {researchStatusLabel[rStatus] || rStatus}
                              </Badge>
                            </div>
                            <h3 className="mt-2 truncate text-base font-bold text-slate-900 group-hover:text-sky-600 transition">
                              {repo.name}
                            </h3>
                            <p className="truncate text-xs text-slate-500">
                              {repo.fullName || `${repo.owner}/${repo.name}`}
                            </p>
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Dependencies
                            </span>
                            <p className="mt-0.5 text-sm font-bold text-slate-900">
                              {repo.totalDependencies || repo.total || 0}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {repo.coreDependencies || 0} core packages
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Updates Available
                            </span>
                            <p className={`mt-0.5 text-sm font-bold ${repo.availableUpdates > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                              {repo.availableUpdates || 0}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {repo.majorUpdates ? `${repo.majorUpdates} major` : 'All types'}
                            </span>
                          </div>

                          <div className="border-t border-slate-200/60 pt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Vulnerabilities
                            </span>
                            <p className={`mt-0.5 text-sm font-bold ${repo.vulnerabilityCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {repo.vulnerabilityCount || 0}
                            </p>
                          </div>

                          <div className="border-t border-slate-200/60 pt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Research
                            </span>
                            <p className="mt-0.5 text-xs font-semibold text-slate-700">
                              {repo.researchStats?.completed || 0}/{repo.totalDependencies || repo.total || 0}
                            </p>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div className="mt-3.5 space-y-1 text-[11px] text-slate-400">
                          <div className="flex items-center justify-between">
                            <span>Last update check:</span>
                            <span className="text-slate-600">{formatDate(repo.lastUpdateCheckAt || repo.lastCheckedAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Last analyzed:</span>
                            <span className="text-slate-600">{formatDate(repo.lastAnalyzedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action: View Update Intelligence */}
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <Link
                          to={`/dashboard/updates/repository/${repo.repositoryId}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-600 hover:shadow"
                        >
                          <span>View Update Intelligence</span>
                          <LuArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {repoData.pagination?.pages > 1 && (
                <div className="mt-6">
                  <Pagination
                    page={repoData.pagination.page}
                    pages={repoData.pagination.pages}
                    onPageChange={setRepoPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW 2: GLOBAL UPDATES INVENTORY TABLE */}
      {viewTab === 'all-updates' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card/60 p-4 lg:flex-row lg:items-center">
            <Input
              icon={LuSearch}
              placeholder="Search package names…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="lg:max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Filter by ecosystem"
                className={selectClass}
                value={ecosystem}
                onChange={(event) => {
                  setEcosystem(event.target.value)
                  setPage(1)
                }}
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
                onChange={(event) => {
                  setRepositoryId(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">All repositories</option>
                {(inventoryData.repositories || []).map((repo) => (
                  <option key={repo._id} value={repo._id}>
                    {repo.fullName || repo.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by update type"
                className={selectClass}
                value={updateType}
                onChange={(event) => {
                  setUpdateType(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">All update types</option>
                {UPDATE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                aria-label="Filter by security status"
                className={selectClass}
                value={securityStatus}
                onChange={(event) => {
                  setSecurityStatus(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">All security statuses</option>
                {SECURITY_STATUSES.map(([status, label]) => (
                  <option key={status} value={status}>{label}</option>
                ))}
              </select>

              <select
                aria-label="Sort updates"
                className={selectClass}
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value)
                  setPage(1)
                }}
              >
                <option value="checked">Recently checked</option>
                <option value="name">Package name</option>
                <option value="status">Update status</option>
                <option value="type">Update type</option>
                <option value="security">Security status</option>
                <option value="ecosystem">Ecosystem</option>
              </select>
            </div>
          </div>

          {inventoryLoading ? (
            <TableSkeleton rows={8} />
          ) : (
            <>
              <UpdateTable
                updates={inventoryData.updates}
                showRepository={true}
                onSelectDependency={(update) => setSelectedDependency(update)}
              />

              {inventoryData.pagination?.pages > 1 && (
                <Pagination
                  page={inventoryData.pagination.page}
                  pages={inventoryData.pagination.pages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Intelligence Detail Drawer */}
      <DependencyResearchDrawer
        dependencyId={selectedDependency?.dependencyId || selectedDependency?._id}
        repositoryId={selectedDependency?.repositoryId?._id || selectedDependency?.repositoryId}
        open={Boolean(selectedDependency)}
        onClose={() => setSelectedDependency(null)}
        onResearchUpdated={() => {
          if (viewTab === 'repositories') loadRepositories()
          else loadInventory()
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}