import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LuGitBranch, LuGithub, LuRefreshCw, LuSearch, LuSlidersHorizontal } from 'react-icons/lu'
import { motion } from 'framer-motion'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import { RepositoryCardSkeleton } from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import GitHubConnect from '../../components/dashboard/GitHubConnect'
import GitHubDisconnectModal from '../../components/dashboard/GitHubDisconnectModal'
import RepositoryCard from '../../components/dashboard/RepositoryCard'
import useDebounce from '../../hooks/useDebounce'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage, githubApi, repositoriesApi } from '../../services/api'

function selectClass() {
  return 'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'
}

export default function Repositories() {
  const navigate = useNavigate()
  const location = useLocation()
  const callbackHandled = useRef(false)

  const { user } = useAuth()
  const [connection, setConnection] = useState(() => {
    if (user?.github?.connected) {
      return {
        connected: true,
        status: user.github.status || 'CONNECTED',
        profile: {
          username: user.github.username,
          avatarUrl: user.github.avatarUrl,
        },
        repositoryCount: 0,
      }
    }
    return null
  })
  const [checkingConnection, setCheckingConnection] = useState(true)
  const [phase, setPhase] = useState('idle')
  const [connectionError, setConnectionError] = useState('')
  const [repositories, setRepositories] = useState([])
  const [languages, setLanguages] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [slowWait, setSlowWait] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
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
      setConnectionError(data?.message || '')
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

  // Keep the latest loader available without restarting connection verification
  // every time a filter changes.
  const loadRepositoriesRef = useRef(loadRepositories)
  useEffect(() => {
    loadRepositoriesRef.current = loadRepositories
  }, [loadRepositories])

  // Verify the token and keep the spinner up while the server finishes its
  // background repository sync. No artificial delay — we wait only as long as
  // GitHub actually needs.
  const verifyAndLoad = useCallback(
    async (isActive = () => true) => {
      setCheckingConnection(true)
      setSlowWait(false)
      try {
        let data = await loadConnection()
        while (data?.syncing && isActive()) {
          await new Promise((resolve) => setTimeout(resolve, 1800))
          data = await loadConnection()
        }
        if (!isActive()) return

        if (data?.connected) {
          await loadRepositoriesRef.current()
        } else if (data) {
          setRepositories([])
          setLoading(false)
        }
        // A failed status request returns null. Keep the saved connection and
        // repository list intact instead of treating a network hiccup as a
        // disconnection.
      } catch (error) {
        console.error('Failed to initialize GitHub state:', error)
      } finally {
        if (isActive()) {
          setCheckingConnection(false)
          setSlowWait(false)
        }
      }
    },
    [loadConnection],
  )

  useEffect(() => {
    let active = true
    // Defer out of the effect body so the initial load stays cancelable
    // without triggering a synchronous state update during render commit.
    const timer = setTimeout(() => verifyAndLoad(() => active), 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [verifyAndLoad])

  // Show a reassuring note if verification/sync is taking a while.
  useEffect(() => {
    if (!checkingConnection) return undefined
    const timer = setTimeout(() => setSlowWait(true), 8000)
    return () => clearTimeout(timer)
  }, [checkingConnection])

  // Filter and pagination change listener
  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (!active || checkingConnection) return
      if (!connection?.connected) {
        setLoading(false)
        setRepositories([])
        return
      }
      await loadRepositories()
    }
    run()
    return () => {
      active = false
    }
  }, [debouncedSearch, language, visibility, status, sort, page, connection?.connected, checkingConnection, loadRepositories])

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
        await verifyAndLoad()
      } else {
        setPhase('failed')
        setConnectionError(message)
        notify({ type: 'error', title: 'GitHub connection failed', message })
      }
      navigate(location.pathname, { replace: true })
    }
    handleCallback()
  }, [location.pathname, location.search, verifyAndLoad, navigate, notify])

  const handleConnect = async () => {
    setPhase('connecting')
    setConnectionError('')
    try {
      const data = await githubApi.connect({
        origin: window.location.origin,
        returnTo: '/dashboard/repositories',
      })
      window.location.assign(data.url)
    } catch (error) {
      setPhase('failed')
      setConnectionError(getErrorMessage(error))
      notify({ type: 'error', title: 'Could not start GitHub connection', message: getErrorMessage(error) })
    }
  }

  const confirmDisconnect = async () => {
    setDisconnecting(true)
    try {
      await githubApi.disconnect()
      setDisconnectOpen(false)
      setConnection(null)
      setRepositories([])
      setConnectionError('')
      notify({
        type: 'success',
        title: 'GitHub disconnected',
        message: 'Cleanup is running in the background. Your local scan data is being removed.',
      })
    } catch (error) {
      notify({ type: 'error', title: 'Disconnect failed', message: getErrorMessage(error) })
    } finally {
      setDisconnecting(false)
    }
  }

  const handleAnalyze = async (repository) => {
    setBusyRepo(repository._id)
    try {
      const data = await repositoriesApi.analyze(repository._id)
      notify({
        type: 'success',
        title: 'Scan queued',
        message: data?.message || `${repository.name} is being scanned in the background.`,
      })
      navigate(`/dashboard/repositories/${repository._id}`)
    } catch (error) {
      // A repeated click can race the first request. Reuse the existing job
      // instead of showing two misleading toasts and reloading the list.
      if (error?.response?.status === 409 && error.response.data?.scanJob) {
        notify({
          type: 'info',
          title: 'Scan already running',
          message: 'Opened the existing scan progress for this repository.',
        })
        navigate(`/dashboard/repositories/${repository._id}`)
        return
      }
      notify({ type: 'error', title: 'Could not start scan', message: getErrorMessage(error) })
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
        checking={checkingConnection}
        syncing={syncing}
        slowWait={slowWait}
        phase={phase}
        error={connectionError}
        onConnect={handleConnect}
        onDisconnect={() => setDisconnectOpen(true)}
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
        {checkingConnection ? (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-8 sm:p-12 text-center shadow-xs">
            {/* Ambient subtle sky blue aura */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-sky-200/35 blur-3xl" />
            <div className="relative mx-auto flex max-w-md flex-col items-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md">
                <LuGithub className="h-8 w-8" />
                <span className="absolute -inset-1 rounded-2xl border-2 border-sky-400/40 animate-ping opacity-60" />
                <span className="absolute -inset-2.5 rounded-3xl border border-sky-300/30 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">
                Establishing GitHub Connection
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Verifying your connected GitHub account, accessible repositories, and project dependency trees…
              </p>
              {/* Animated Progress Bar */}
              <div className="mt-5 h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-400"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                />
              </div>
              <p className="mt-3 text-[11px] font-medium text-slate-400">
                Securing repository integration…
              </p>
              {slowWait ? (
                <p className="mt-2 text-[11px] font-medium text-amber-600">
                  Still working… GitHub can be slow sometimes. Please keep this page open.
                </p>
              ) : null}
            </div>
            {/* Skeletons preview underneath */}
            <div className="mt-8 grid gap-4 opacity-50 md:grid-cols-2 xl:grid-cols-3">
              <RepositoryCardSkeleton />
              <RepositoryCardSkeleton />
              <RepositoryCardSkeleton />
            </div>
          </div>
        ) : loading ? (
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

      <GitHubDisconnectModal
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={confirmDisconnect}
        busy={disconnecting}
        username={connection?.profile?.username}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
