import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LuGitBranch, LuGithub, LuRefreshCw, LuSearch, LuSlidersHorizontal } from 'react-icons/lu'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import { RepositoryCardSkeleton } from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import GitHubConnect from '../../components/dashboard/GitHubConnect'
import RepositoryCard from '../../components/dashboard/RepositoryCard'
import useDebounce from '../../hooks/useDebounce'
import { getErrorMessage, githubApi, repositoriesApi } from '../../services/api'

function selectClass() {
  return 'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'
}

export default function Repositories() {
  const navigate = useNavigate()
  const location = useLocation()
  const callbackHandled = useRef(false)

  const [connection, setConnection] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [connectionError, setConnectionError] = useState('')
  const [repositories, setRepositories] = useState([])
  const [languages, setLanguages] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [busyRepo, setBusyRepo] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [language, setLanguage] = useState('')
  const [visibility, setVisibility] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)

  const notify = useCallback((next) => setToast(next), [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const loadConnection = useCallback(async () => {
    try {
      const data = await githubApi.status()
      setConnection(data)
      return data
    } catch (error) {
      notify({ type: 'error', title: 'Could not load GitHub status', message: getErrorMessage(error) })
      return null
    }
  }, [notify])

  const loadRepositories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await repositoriesApi.list({
        search: debouncedSearch,
        language,
        visibility,
        status,
        sort,
        page,
        limit: 12,
      })
      setRepositories(data.repositories)
      setLanguages(data.languages || [])
      setPagination(data.pagination)
    } catch (error) {
      notify({ type: 'error', title: 'Could not load repositories', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, language, visibility, status, sort, page, notify])

  useEffect(() => {
    let active = true
    const load = async () => {
      await Promise.resolve()
      if (active) await loadConnection()
    }
    load()
    return () => {
      active = false
    }
  }, [loadConnection])

  useEffect(() => {
    let active = true
    const load = async () => {
      await Promise.resolve()
      if (!active) return
      if (!connection?.connected) {
        setLoading(false)
        setRepositories([])
        return
      }
      await loadRepositories()
    }
    load()
    return () => {
      active = false
    }
  }, [connection?.connected, loadRepositories])

  const syncRepositories = useCallback(async () => {
    setSyncing(true)
    try {
      const data = await repositoriesApi.sync()
      notify({
        type: 'success',
        title: 'Repositories synced',
        message: `${data.synced} accessible repositories found.`,
      })
      await Promise.all([loadConnection(), loadRepositories()])
    } catch (error) {
      notify({ type: 'error', title: 'Sync failed', message: getErrorMessage(error) })
    } finally {
      setSyncing(false)
    }
  }, [loadConnection, loadRepositories, notify])

  useEffect(() => {
    if (callbackHandled.current || !location.search) return
    const flag = new URLSearchParams(location.search).get('github')
    if (!flag) return
    callbackHandled.current = true

    const handleCallback = async () => {
      await Promise.resolve()
      const message = new URLSearchParams(location.search).get('message') || ''
      if (flag === 'connected') {
        notify({ type: 'success', title: 'GitHub connected', message })
        const data = await loadConnection()
        if (data?.connected) {
          await repositoriesApi.sync().catch(() => null)
          await loadRepositories()
        }
      } else {
        setPhase('failed')
        setConnectionError(message)
        notify({ type: 'error', title: 'GitHub connection failed', message })
      }
      navigate(location.pathname, { replace: true })
    }
    handleCallback()
  }, [location.pathname, location.search, loadConnection, loadRepositories, navigate, notify])

  const handleConnect = async () => {
    setPhase('connecting')
    setConnectionError('')
    try {
      const data = await githubApi.connect()
      window.location.assign(data.url)
    } catch (error) {
      setPhase('failed')
      setConnectionError(getErrorMessage(error))
      notify({ type: 'error', title: 'Could not start GitHub connection', message: getErrorMessage(error) })
    }
  }

  const handleDisconnect = async () => {
    setPhase('reconnecting')
    try {
      await githubApi.disconnect()
      setConnection(null)
      setRepositories([])
      setPhase('idle')
      notify({ type: 'success', title: 'GitHub disconnected', message: 'Local scan data was removed.' })
    } catch (error) {
      setPhase('idle')
      notify({ type: 'error', title: 'Disconnect failed', message: getErrorMessage(error) })
    }
  }

  const handleAnalyze = async (repository) => {
    setBusyRepo(repository._id)
    try {
      await repositoriesApi.analyze(repository._id)
      notify({
        type: 'success',
        title: 'Scan queued',
        message: `${repository.name} is being scanned in the background.`,
      })
      navigate(`/dashboard/repositories/${repository._id}`)
    } catch (error) {
      notify({ type: 'error', title: 'Could not start scan', message: getErrorMessage(error) })
      loadRepositories()
    } finally {
      setBusyRepo('')
    }
  }

  const hasFilters = Boolean(search || language || visibility || status)

  return (
    <div>
      <PageHeader
        eyebrow="Repository intelligence"
        title="My Repositories"
        description="Connect GitHub, choose the repositories you want to inspect and extract their real dependency manifests."
        actions={
          connection?.connected ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={LuRefreshCw}
              loading={syncing}
              onClick={syncRepositories}
            >
              Refresh from GitHub
            </Button>
          ) : null
        }
      />

      <SectionTabs section="repositories" />

      <GitHubConnect
        status={connection}
        phase={phase}
        error={connectionError}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSync={syncRepositories}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          icon={LuSearch}
          placeholder="Search repositories…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="sm:max-w-md"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <LuSlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </span>
          <select
            aria-label="Filter by language"
            className={selectClass()}
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All languages</option>
            {languages.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Filter by visibility"
            className={selectClass()}
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Any visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <select
            aria-label="Filter by scan status"
            className={selectClass()}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Any status</option>
            <option value="NOT_SCANNED">Not scanned</option>
            <option value="QUEUED">Queued</option>
            <option value="SCANNING">Scanning</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            aria-label="Sort repositories"
            className={selectClass()}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setPage(1)
            }}
          >
            <option value="updated">Recently updated</option>
            <option value="name">Name</option>
            <option value="stars">Stars</option>
            <option value="scanned">Recently scanned</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>
          {connection?.connected ? `${pagination.total} repositories in your workspace` : 'Connect GitHub to begin'}
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setLanguage('')
              setVisibility('')
              setStatus('')
              setPage(1)
            }}
            className="font-semibold text-brandlight transition hover:text-ink"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <RepositoryCardSkeleton key={index} />)}
          </div>
        ) : !connection?.connected ? (
          <EmptyState
            icon={LuGithub}
            title="No GitHub connection yet"
            description="Connect your GitHub account to discover your project dependencies."
            action={
              <Button leftIcon={LuGithub} onClick={handleConnect} disabled={connection?.configured === false}>
                Connect GitHub
              </Button>
            }
          />
        ) : repositories.length === 0 ? (
          <EmptyState
            icon={LuGitBranch}
            title={hasFilters ? 'No repositories match your filters' : 'No accessible repositories'}
            description={
              hasFilters
                ? 'Try changing your search or filters.'
                : 'Grant the GitHub App access to at least one repository, then refresh the list.'
            }
            action={
              !hasFilters ? (
                <Button variant="secondary" leftIcon={LuRefreshCw} onClick={syncRepositories}>
                  Refresh repositories
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {repositories.map((repository, index) => (
              <RepositoryCard
                key={repository._id}
                repository={repository}
                index={index}
                busy={busyRepo === repository._id}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>
        )}
      </div>

      {connection?.connected && pagination.pages > 1 ? (
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
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.pages}
            onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
