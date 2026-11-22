import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LuBot, LuCircleAlert, LuExternalLink, LuMessageSquarePlus, LuSend, LuTrash2, LuUserRound } from 'react-icons/lu'
import AiStatusBadge from '../../components/ai/AiStatusBadge'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import SectionTabs from '../../components/common/SectionTabs'
import Skeleton from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import { formatDate } from '../../utils/updateHelpers'
import { aiApi, getErrorMessage, repositoriesApi } from '../../services/api'

const selectClass =
  'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'

export default function RepositoryChat() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [repositories, setRepositories] = useState([])
  const [repositoryId, setRepositoryId] = useState(searchParams.get('repositoryId') || '')
  const [conversations, setConversations] = useState([])
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    let active = true
    repositoriesApi.list({ limit: 50 }).then((result) => {
      if (!active) return
      const rows = result.repositories || []
      setRepositories(rows)
      setRepositoryId((current) => {
        if (current && rows.some((row) => String(row._id) === current)) return current
        const fromQuery = searchParams.get('repositoryId')
        const initial = fromQuery && rows.some((row) => String(row._id) === fromQuery) ? fromQuery : (rows[0]?._id || '')
        return initial
      })
    }).catch(() => {})
    return () => {
      active = false
    }
  }, [searchParams])

  const loadConversations = useCallback(async () => {
    if (!repositoryId) {
      setConversations([])
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await aiApi.conversations(repositoryId)
      setConversations(response.conversations || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load conversations', message: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [repositoryId])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await loadConversations()
    }
    run()
    return () => {
      active = false
    }
  }, [loadConversations])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const openConversation = async (id) => {
    setConversationId(id)
    setMessages([])
    try {
      const response = await aiApi.conversation(repositoryId, id)
      setMessages(response.conversation?.messages || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not open conversation', message: getErrorMessage(error) })
    }
  }

  const startNew = () => {
    setConversationId('')
    setMessages([])
    setQuestion('')
  }

  const handleRepositoryChange = (value) => {
    setRepositoryId(value)
    setConversationId('')
    setMessages([])
    const next = new URLSearchParams(searchParams)
    if (value) next.set('repositoryId', value)
    else next.delete('repositoryId')
    setSearchParams(next, { replace: true })
  }

  const send = async (event) => {
    event.preventDefault()
    const clean = question.trim()
    if (!clean || !repositoryId || sending) return
    setSending(true)
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', content: clean, evidence: [], insufficientEvidence: false }])
    try {
      const response = await aiApi.chat(repositoryId, {
        question: clean,
        ...(conversationId ? { conversationId } : {}),
      })
      setConversationId(response.conversationId)
      setMessages((current) => [
        ...current.slice(0, -1),
        { role: 'user', content: clean, evidence: [], insufficientEvidence: false },
        {
          role: 'assistant',
          content: response.answer,
          evidence: response.evidence || [],
          insufficientEvidence: response.insufficientEvidence,
          modelMetadata: response.modelMetadata,
        },
      ])
      await loadConversations()
    } catch (error) {
      setMessages((current) => current.slice(0, -1))
      setQuestion(clean)
      setToast({ type: 'error', title: 'Could not send message', message: getErrorMessage(error) })
    } finally {
      setSending(false)
    }
  }

  const removeConversation = async (id) => {
    try {
      await aiApi.deleteConversation(id)
      if (conversationId === id) startNew()
      await loadConversations()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not delete conversation', message: getErrorMessage(error) })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Repository chat"
        title="Ask Your Repository"
        description="Answers are grounded in indexed documentation and stored analysis evidence for the selected repository. Unsupported questions return an explicit insufficient-evidence response."
      />

      <SectionTabs section="ai" />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-line bg-card/70 p-4">
          <label htmlFor="chat-repository" className="label-caps mb-2 block">Repository</label>
          <select
            id="chat-repository"
            className={`${selectClass} w-full`}
            value={repositoryId}
            onChange={(event) => handleRepositoryChange(event.target.value)}
          >
            <option value="">Select a repository</option>
            {repositories.map((repository) => (
              <option key={String(repository._id)} value={repository._id}>
                {repository.fullName || repository.name}
              </option>
            ))}
          </select>

          <div className="mt-5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Conversations</p>
            <button
              type="button"
              onClick={startNew}
              title="New conversation"
              className="rounded-lg p-1.5 text-subtle transition hover:bg-white/[0.06] hover:text-ink"
            >
              <LuMessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="scrollbar-slim mt-3 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-14 rounded-xl" />)
            ) : conversations.length ? (
              conversations.map((item) => (
                <div
                  key={String(item._id)}
                  className={`group flex items-center gap-1 rounded-xl border px-2.5 py-2 transition ${
                    conversationId === String(item._id)
                      ? 'border-brandlight/30 bg-brand/10'
                      : 'border-line bg-white/[0.02] hover:border-white/15'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openConversation(String(item._id))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[12px] font-semibold text-ink">{item.title || 'Conversation'}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{formatDate(item.updatedAt, true)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeConversation(String(item._id))}
                    title="Delete conversation"
                    className="rounded-md p-1 text-muted transition hover:bg-danger/10 hover:text-danger"
                  >
                    <LuTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))
            ) : (
              <p className="px-1 py-3 text-[11px] leading-relaxed text-muted">
                No conversations yet. Ask a question to start one.
              </p>
            )}
          </div>
        </aside>

        <section className="flex min-h-[600px] flex-col rounded-2xl border border-line bg-card/60">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brandlight">
                <LuBot className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink">Repository assistant</p>
                <p className="text-[11px] text-muted">
                  {repositoryId ? repositories.find((repo) => String(repo._id) === repositoryId)?.fullName || 'Selected repository' : 'No repository selected'}
                </p>
              </div>
            </div>
            {conversationId ? <Badge tone="violet">Saved conversation</Badge> : <Badge tone="neutral">New conversation</Badge>}
          </div>

          <div className="scrollbar-slim flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length ? (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    message.role === 'user'
                      ? 'border-accent/20 bg-accent/10 text-accent'
                      : 'border-brand/20 bg-brand/10 text-brandlight'
                  }`}>
                    {message.role === 'user'
                      ? <LuUserRound className="h-4 w-4" aria-hidden="true" />
                      : <LuBot className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
                    message.role === 'user'
                      ? 'border-accent/20 bg-accent/[0.06]'
                      : 'border-line bg-white/[0.02]'
                  }`}>
                    {message.insufficientEvidence ? (
                      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-warning">
                        <LuCircleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Insufficient evidence
                      </p>
                    ) : null}
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{message.content}</p>
                    {message.evidence?.length ? (
                      <div className="mt-3 space-y-2 border-t border-line pt-3">
                        {message.evidence.map((item) => (
                          <div key={String(item.id)} className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold text-subtle">{item.title}</p>
                              <p className="font-mono text-[10px] text-muted">{item.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AiStatusBadge value={item.verificationStatus || 'UNVERIFIED'} />
                              {item.url ? (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  title="Open source"
                                  className="text-brandlight transition hover:text-accent"
                                >
                                  <LuExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={LuBot}
                title="Ask about this repository's dependencies"
                description="Try: Which packages have documented breaking changes in their latest versions? Answers cite the exact evidence used."
              />
            )}
            {sending ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <LuBot className="h-4 w-4 animate-pulse text-brandlight" aria-hidden="true" /> Retrieving evidence and generating answer…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="border-t border-line p-4">
            <div className="flex items-end gap-3">
              <textarea
                aria-label="Question"
                rows={2}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a repository-specific dependency question…"
                className="scrollbar-slim max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-canvas/60 px-3.5 py-3 text-[13px] text-ink outline-none transition placeholder:text-muted focus:border-brandlight/60"
              />
              <Button type="submit" size="icon" leftIcon={LuSend} loading={sending} disabled={!repositoryId || !question.trim()} aria-label="Send question" />
            </div>
            <p className="mt-2 text-[10px] text-muted">
              Evidence-only mode: the assistant cannot install packages, edit files or open pull requests.
            </p>
          </form>
        </section>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
