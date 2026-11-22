import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuBookOpenText, LuBot, LuPackageSearch, LuSparkles } from 'react-icons/lu'
import Button from '../common/Button'
import { aiApi, getErrorMessage, updatesApi } from '../../services/api'

const selectClass =
  'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'

export default function AiActionsPanel({
  repositories = [],
  selectedRepository = '',
  onRepositoryChange,
  onJobStarted,
}) {
  const [updates, setUpdates] = useState([])
  const [loadingUpdates, setLoadingUpdates] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const loadUpdates = useCallback(async () => {
    if (!selectedRepository) {
      setUpdates([])
      return
    }
    setLoadingUpdates(true)
    try {
      const response = await updatesApi.list({ repositoryId: selectedRepository, limit: 30, sort: 'checked' })
      setUpdates(response.updates || [])
      setError('')
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load package updates for this repository.'))
    } finally {
      setLoadingUpdates(false)
    }
  }, [selectedRepository])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await loadUpdates()
    }
    run()
    return () => {
      active = false
    }
  }, [loadUpdates])

  const start = async (key, task) => {
    setBusy(key)
    setError('')
    try {
      const result = await task()
      if (onJobStarted) onJobStarted(result, key)
    } catch (startError) {
      setError(getErrorMessage(startError, 'Could not start the AI job.'))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Start an analysis</p>
          <h2 className="mt-1 text-base font-semibold text-ink">Repository-aware intelligence</h2>
        </div>
        <Link
          to={selectedRepository ? `/dashboard/ai/chat?repositoryId=${selectedRepository}` : '/dashboard/ai/chat'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brandlight transition hover:text-accent"
        >
          <LuBot className="h-3.5 w-3.5" aria-hidden="true" /> Ask this repository
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <select
          aria-label="Repository for AI analysis"
          className={selectClass}
          value={selectedRepository}
          onChange={(event) => onRepositoryChange(event.target.value)}
        >
          <option value="">Select a repository</option>
          {repositories.map((repository) => (
            <option key={String(repository._id || repository.repositoryId)} value={repository._id || repository.repositoryId}>
              {repository.fullName || repository.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          leftIcon={LuSparkles}
          loading={busy === 'repository'}
          disabled={!selectedRepository || Boolean(busy)}
          onClick={() => start('repository', () => aiApi.analyzeRepository(selectedRepository))}
        >
          Analyze repository
        </Button>
      </div>

      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-ink">Dependency analyses</p>
          <span className="text-[11px] text-muted">
            {loadingUpdates ? 'Loading…' : `${updates.length} checked package${updates.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {!selectedRepository ? (
          <p className="mt-4 text-xs text-muted">Select a repository to see packages with real Phase 3 update data.</p>
        ) : updates.length ? (
          <div className="scrollbar-slim mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {updates.slice(0, 15).map((update) => {
              const dependencyId = String(update.dependencyId?._id || update.dependencyId || '')
              const target = update.latestStableVersion || update.latestVersion || update.installedVersion
              return (
                <div
                  key={String(update._id)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{update.packageName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {update.installedVersion || '?'} → {target || '?'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="xs"
                      leftIcon={LuPackageSearch}
                      loading={busy === `analyze-${update._id}`}
                      disabled={!dependencyId || Boolean(busy)}
                      onClick={() =>
                        start(`analyze-${update._id}`, () =>
                          aiApi.analyzeDependency(selectedRepository, dependencyId),
                        )
                      }
                    >
                      Analyze
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      leftIcon={LuBookOpenText}
                      loading={busy === `research-${update._id}`}
                      disabled={!dependencyId || Boolean(busy)}
                      onClick={() =>
                        start(`research-${update._id}`, () =>
                          aiApi.researchDependency(selectedRepository, dependencyId),
                        )
                      }
                    >
                      Research
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">
            No Phase 3 update records yet. Run a dependency update check first.
          </p>
        )}
      </div>
    </div>
  )
}
