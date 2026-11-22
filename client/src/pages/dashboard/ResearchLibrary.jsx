import { useCallback, useEffect, useState } from 'react'
import { LuExternalLink, LuFileText, LuSearch, LuShieldCheck } from 'react-icons/lu'
import AiActionsPanel from '../../components/ai/AiActionsPanel'
import AiStatusBadge from '../../components/ai/AiStatusBadge'
import Badge from '../../components/common/Badge'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import useDebounce from '../../hooks/useDebounce'
import { formatDate } from '../../utils/updateHelpers'
import { aiApi, getErrorMessage, repositoriesApi } from '../../services/api'

const selectClass =
  'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'

export default function ResearchLibrary() {
  const [repositories, setRepositories] = useState([])
  const [selectedRepository, setSelectedRepository] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 60 }
      if (selectedRepository) params.repositoryId = selectedRepository
      if (debouncedSearch) params.packageName = debouncedSearch
      const response = await aiApi.researchDocuments(params)
      setDocuments(response.documents || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load research library', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, selectedRepository])

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
    let active = true
    repositoriesApi.list({ limit: 50 }).then((result) => {
      if (!active) return
      const rows = result.repositories || []
      setRepositories(rows)
      setSelectedRepository((current) => (current && rows.some((row) => String(row._id) === current) ? current : ''))
    }).catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <div>
      <PageHeader
        eyebrow="Retrieved documentation"
        title="Research Library"
        description="Official package pages, release notes and migration guides retrieved by Firecrawl and indexed for repository-aware retrieval."
      />

      <SectionTabs section="ai" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <AiActionsPanel
          repositories={repositories}
          selectedRepository={selectedRepository}
          onRepositoryChange={setSelectedRepository}
          onJobStarted={(result, kind) => {
            setToast({
              type: 'success',
              title: kind === 'repository' ? 'Repository analysis queued' : 'AI job queued',
              message: 'Research and analysis jobs appear in progress on the AI overview page.',
            })
            if (result?.jobId) {
              setTimeout(load, 2500)
            }
          }}
        />

        <div className="rounded-2xl border border-line bg-card/70 p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Source rules</p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-subtle">
            <li>• Only official registry, documentation and repository domains are accepted.</li>
            <li>• Pages with prompt-injection indicators are rejected before storage.</li>
            <li>• Documents are chunked, embedded and scoped to your user namespace.</li>
            <li>• Retrieved text is treated as untrusted evidence, never as instructions.</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card/60 p-4">
        <Input
          icon={LuSearch}
          placeholder="Search package name…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="lg:max-w-xs"
        />
        <select
          aria-label="Filter documents by repository"
          className={selectClass}
          value={selectedRepository}
          onChange={(event) => setSelectedRepository(event.target.value)}
        >
          <option value="">All repositories</option>
          {repositories.map((repository) => (
            <option key={String(repository._id)} value={repository._id}>
              {repository.fullName || repository.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted">{documents.length} document{documents.length === 1 ? '' : 's'}</span>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-44 rounded-2xl" />)}
          </div>
        ) : documents.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {documents.map((document) => (
              <article key={String(document._id)} className="rounded-2xl border border-line bg-card/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                      <LuFileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-ink">{document.title || document.packageName}</h2>
                      <p className="mt-1 text-[11px] text-muted">
                        {document.packageName} {document.version ? `· ${document.version}` : ''} · {document.sourceDomain}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {document.official ? <AiStatusBadge value="VERIFIED" label="Official" /> : <Badge tone="neutral">Unverified</Badge>}
                    <Badge tone="neutral">{String(document.sourceType || 'OFFICIAL_DOCS').replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-subtle">
                  {document.summary || 'No summary was extracted from this document.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <LuShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Retrieved {formatDate(document.retrievedAt, true)}
                  </span>
                  <a
                    href={document.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 font-semibold text-brandlight transition hover:text-accent"
                  >
                    Open source <LuExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={LuFileText}
            title="No research documents yet"
            description="Run documentation research on a dependency with a completed Phase 3 update check. Retrieved sources will appear here."
          />
        )}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
