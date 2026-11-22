import { useCallback, useEffect, useState } from 'react'
import { LuBrainCircuit, LuDatabase, LuHistory,LuRefreshCw, LuShieldCheck, LuSparkles, LuTrash2 } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import { formatDate } from '../../utils/updateHelpers'
import { getErrorMessage, memoryApi, repositoriesApi } from '../../services/api'

const categoryTone = {
  PROJECT: 'violet',
  DEPENDENCY: 'cyan',
  DECISION: 'success',
  ANALYSIS: 'warning',
  CONVERSATION: 'neutral',
}

const verificationTone = {
  VERIFIED: 'success',
  PARTIALLY_VERIFIED: 'warning',
  UNVERIFIED: 'neutral',
}

const emptyForm = { title: '', content: '', category: 'PROJECT' }

export default function Memory() {
  const [repositories, setRepositories] = useState([])
  const [repositoryId, setRepositoryId] = useState('')
  const [status, setStatus] = useState(null)
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('')
  const [memoryStatus, setMemoryStatus] = useState('ACTIVE')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let active = true
    Promise.all([
      repositoriesApi.list({ limit: 50 }),
      memoryApi.status(),
    ]).then(([repoResult, statusResult]) => {
      if (!active) return
      const rows = repoResult.repositories || []
      setRepositories(rows)
      setRepositoryId((current) => (current && rows.some((row) => String(row._id) === current)
        ? current
        : (rows[0]?._id || '')))
      setStatus(statusResult)
    }).catch((error) => {
      if (active) setToast({ type: 'error', title: 'Could not load memory', message: getErrorMessage(error) })
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const loadMemories = useCallback(async () => {
    if (!repositoryId) {
      setItems([])
      return
    }
    try {
      const result = await memoryApi.list(repositoryId, {
        category: category || undefined,
        status: memoryStatus,
        limit: 100,
      })
      setItems(result.items || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load memories', message: getErrorMessage(error) })
    }
  }, [repositoryId, category, memoryStatus])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await loadMemories()
    }
    run()
    return () => { active = false }
  }, [loadMemories])

  const save = async (event) => {
    event.preventDefault()
    if (!repositoryId || !form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const result = await memoryApi.create(repositoryId, form)
      setForm(emptyForm)
      setToast({
        type: result.created ? 'success' : 'info',
        title: result.created ? 'Memory stored' : 'Memory updated',
        message: result.memory?.external?.[0]?.status === 'MIRRORED'
          ? 'MongoDB and the Memento mirror are in sync.'
          : 'Stored in MongoDB. The Memento mirror may be unavailable; check the status below.',
      })
      await loadMemories()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not store memory', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const rebuild = async () => {
    if (!repositoryId) return
    setSaving(true)
    try {
      const result = await memoryApi.rebuild(repositoryId)
      setToast({
        type: 'success',
        title: result.created ? 'Repository memory rebuilt' : 'Repository memory refreshed',
        message: 'Project context was derived from current repository metadata.',
      })
      await loadMemories()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not rebuild memory', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (memoryId) => {
    try {
      await memoryApi.delete(memoryId)
      setToast({ type: 'success', title: 'Memory removed', message: 'The local record is no longer active.' })
      await loadMemories()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not remove memory', message: getErrorMessage(error) })
    }
  }

  const memento = status?.memento

  return (
    <div>
      <PageHeader
        eyebrow="Persistent intelligence"
        title="Repository Memory"
        description="Decisions, analysis findings and developer context persist per repository. MongoDB is authoritative; Memento is a best-effort mirror with visible status."
        actions={
          <Button variant="secondary" leftIcon={LuRefreshCw} loading={saving} disabled={!repositoryId} onClick={rebuild}>
            Rebuild context
          </Button>
        }
      />

      <SectionTabs section="memento" />

      {loading ? (
        <div className="space-y-5"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
      ) : !repositories.length ? (
        <EmptyState
          icon={LuBrainCircuit}
          title="No connected repositories"
          description="Connect GitHub and scan a repository before creating persistent memory."
        />
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="label-caps mb-1">Memory service</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="violet" icon={LuDatabase}>{status?.authoritativeStore || 'MongoDB'}</Badge>
                <Badge tone={memento?.connected ? 'success' : 'warning'} dot>
                  {memento?.mode || 'UNKNOWN'}
                </Badge>
                {memento?.lastError ? (
                  <span className="text-xs text-warning">{memento.lastError}</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-subtle">
                {status?.maxMemoriesInContext || 12} memories can enter an analysis prompt. Memory is context only and cannot create evidence or override current registry data.
              </p>
            </div>
            <div className="w-full lg:w-64">
              <label htmlFor="memory-repository" className="label-caps mb-2 block">Repository</label>
              <select
                id="memory-repository"
                className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none focus:border-brandlight/60"
                value={repositoryId}
                onChange={(event) => setRepositoryId(event.target.value)}
              >
                {repositories.map((repo) => (
                  <option key={String(repo._id)} value={repo._id}>
                    {repo.fullName || repo.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <LuSparkles className="h-4 w-4 text-brandlight" />
                <h2 className="text-sm font-semibold text-ink">Add a memory</h2>
              </div>
              <form className="space-y-3" onSubmit={save}>
                <div>
                  <label htmlFor="memory-title" className="label-caps mb-1.5 block">Title</label>
                  <input
                    id="memory-title"
                    className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="Deployment constraint"
                    maxLength={240}
                  />
                </div>
                <div>
                  <label htmlFor="memory-category" className="label-caps mb-1.5 block">Category</label>
                  <select
                    id="memory-category"
                    className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm text-ink outline-none focus:border-brandlight/60"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    {(status?.categories || ['PROJECT', 'DEPENDENCY', 'DECISION', 'ANALYSIS', 'CONVERSATION']).map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="memory-content" className="label-caps mb-1.5 block">Content</label>
                  <textarea
                    id="memory-content"
                    className="min-h-28 w-full rounded-xl border border-line bg-canvas/60 p-3 text-sm text-ink outline-none focus:border-brandlight/60"
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                    placeholder="Production deployments must run on Node 20."
                    maxLength={12000}
                  />
                </div>
                <Button type="submit" fullWidth leftIcon={LuShieldCheck} loading={saving} disabled={!repositoryId || !form.title.trim() || !form.content.trim()}>
                  Store memory
                </Button>
              </form>
            </Card>

            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Stored memories</h2>
                  <p className="mt-1 text-xs text-subtle">Scoped to the selected repository and your account.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    aria-label="Filter by category"
                    className="h-9 rounded-lg border border-line bg-canvas/60 px-2.5 text-xs text-ink outline-none focus:border-brandlight/60"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="">All categories</option>
                    {(status?.categories || []).map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <select
                    aria-label="Filter by status"
                    className="h-9 rounded-lg border border-line bg-canvas/60 px-2.5 text-xs text-ink outline-none focus:border-brandlight/60"
                    value={memoryStatus}
                    onChange={(event) => setMemoryStatus(event.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUPERSEDED">Superseded</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="ALL">All</option>
                  </select>
                </div>
              </div>

              {items.length ? (
                <div className="space-y-3">
                  {items.map((memory) => (
                    <div key={String(memory._id)} className="rounded-xl border border-line bg-canvas/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{memory.title}</span>
                            <Badge tone={categoryTone[memory.category] || 'neutral'}>{memory.category}</Badge>
                            <Badge tone={verificationTone[memory.verificationStatus] || 'neutral'}>
                              {memory.verificationStatus?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-subtle">{memory.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(memory._id)}
                          aria-label={`Delete ${memory.title}`}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1"><LuHistory className="h-3 w-3" /> Updated {formatDate(memory.updatedAt, true)}</span>
                        <span>Confidence {Math.round((memory.confidence || 0) * 100)}%</span>
                        <span>Origin {memory.origin}</span>
                        <span className={memory.external?.some((item) => item.status === 'MIRRORED') ? 'text-success' : 'text-warning'}>
                          {memory.external?.some((item) => item.status === 'MIRRORED') ? 'Mirror synced' : 'MongoDB only'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={LuBrainCircuit}
                  title="No memories for this filter"
                  description="Memories are created by scans, analyses, decisions and explicit “remember” requests in repository chat."
                />
              )}
            </Card>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
