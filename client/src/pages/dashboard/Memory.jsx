import { useCallback, useEffect, useState } from 'react'
import {
  LuBrain,
  LuBrainCircuit,
  LuCircleCheck,
  LuClock3,
  LuDatabase,
  LuHistory,
  LuInfo,
  LuLayers,
  LuLightbulb,
  LuRefreshCw,
  LuShieldCheck,
  LuSparkles,
  LuThumbsUp,
  LuTrash2,
  LuTriangleAlert,
} from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import SectionTabs from '../../components/common/SectionTabs'
import Skeleton from '../../components/common/Skeleton'
import StatCard from '../../components/common/StatCard'
import Toast from '../../components/common/Toast'
import { formatDate } from '../../utils/updateHelpers'
import { feedbackApi, getErrorMessage, historyApi, memoryApi, repositoriesApi } from '../../services/api'

const categoryTone = {
  PROJECT: 'violet',
  DEPENDENCY: 'cyan',
  DECISION: 'success',
  ANALYSIS: 'warning',
  CONVERSATION: 'neutral',
}

const decisionTone = {
  ACCEPTED: 'success',
  REJECTED: 'danger',
  POSTPONED: 'warning',
  COMPLETED: 'violet',
  INCORRECT: 'danger',
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
  const [decisions, setDecisions] = useState([])
  const [comparisons, setComparisons] = useState([])
  const [activeTab, setActiveTab] = useState('rules') // 'rules' | 'decisions' | 'history'
  const [category, setCategory] = useState('')
  const [memoryStatus, setMemoryStatus] = useState('ACTIVE')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(timer)
  }, [toast])

  // Initial load: repositories and memory service status
  useEffect(() => {
    let active = true
    Promise.all([
      repositoriesApi.list({ limit: 50 }),
      memoryApi.status(),
    ])
      .then(([repoResult, statusResult]) => {
        if (!active) return
        const rows = repoResult.repositories || []
        setRepositories(rows)
        setRepositoryId((current) =>
          current && rows.some((row) => String(row._id) === current)
            ? current
            : rows[0]?._id || '',
        )
        setStatus(statusResult)
      })
      .catch((error) => {
        if (active) setToast({ type: 'error', title: 'Could not load Memento data', message: getErrorMessage(error) })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Consolidated load: memories, decisions, and history for the selected repository
  const loadConsolidatedData = useCallback(async () => {
    if (!repositoryId) {
      setItems([])
      setDecisions([])
      setComparisons([])
      return
    }
    try {
      const [memResult, decResult, histResult] = await Promise.all([
        memoryApi.list(repositoryId, {
          category: category || undefined,
          status: memoryStatus,
          limit: 100,
        }).catch(() => ({ items: [] })),
        feedbackApi.list(repositoryId, { limit: 50 }).catch(() => ({ items: [] })),
        historyApi.comparisons(repositoryId, { limit: 50 }).catch(() => ({ items: [] })),
      ])
      setItems(memResult.items || [])
      setDecisions(decResult.items || decResult.decisions || [])
      setComparisons(histResult.items || histResult.comparisons || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Could not load repository memory', message: getErrorMessage(error) })
    }
  }, [repositoryId, category, memoryStatus])

  useEffect(() => {
    let active = true
    const run = async () => {
      await Promise.resolve()
      if (active) await loadConsolidatedData()
    }
    run()
    return () => {
      active = false
    }
  }, [loadConsolidatedData])

  // Quick template filler for presentations and quick setup
  const applyTemplate = (tmpl) => {
    if (tmpl === 'node20') {
      setForm({
        title: 'Node.js 20 LTS Runtime Requirement',
        category: 'PROJECT',
        content: 'All server dependencies and Docker containers must target Node.js 20 LTS. Packages requiring Node 22+ must be postponed until next infrastructure cycle.',
      })
    } else if (tmpl === 'tailwind') {
      setForm({
        title: 'Tailwind CSS v3 Pinned Policy',
        category: 'DEPENDENCY',
        content: 'Keep Tailwind CSS pinned to v3.x. Postpone upgrading to v4 until our company UI component library completes its CSS stylesheet refactor.',
      })
    } else if (tmpl === 'security') {
      setForm({
        title: 'Mandatory Security Upgrade Rule',
        category: 'DECISION',
        content: 'Any package with Critical or High severity CVEs must be upgraded immediately regardless of release cycle. Non-breaking patch releases are pre-approved.',
      })
    }
  }

  // Save new memory
  const save = async (event) => {
    event.preventDefault()
    if (!repositoryId || !form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const result = await memoryApi.create(repositoryId, form)
      setForm(emptyForm)
      setToast({
        type: 'success',
        title: result.created ? 'Memory stored in Memento' : 'Memory rule updated',
        message: 'Saved to MongoDB and synchronized with Memento AI context engine.',
      })
      await loadConsolidatedData()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not store memory', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  // Rebuild memory context from repository manifests
  const rebuild = async () => {
    if (!repositoryId) return
    setSaving(true)
    try {
      const result = await memoryApi.rebuild(repositoryId)
      setToast({
        type: 'success',
        title: result.created ? 'Repository context rebuilt' : 'Repository memory refreshed',
        message: 'Architectural context derived from current manifests and stored in Memento.',
      })
      await loadConsolidatedData()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not rebuild context', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  // Delete memory
  const remove = async (memoryId) => {
    try {
      await memoryApi.delete(memoryId)
      setToast({ type: 'success', title: 'Memory rule removed', message: 'The knowledge record was deleted from Memento.' })
      await loadConsolidatedData()
    } catch (error) {
      setToast({ type: 'error', title: 'Could not remove memory', message: getErrorMessage(error) })
    }
  }

  const memento = status?.memento
  const selectedRepo = repositories.find((r) => String(r._id) === String(repositoryId))

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        eyebrow="Persistent repository intelligence"
        title="Memento Context Engine"
        description="The long-term memory engine that prevents AI amnesia. Preserves architectural constraints, developer decisions, and dependency policies across scans."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={LuRefreshCw}
              loading={saving}
              disabled={!repositoryId}
              onClick={rebuild}
              title="Automatically derive architectural rules from repository manifests"
            >
              Rebuild AI Context
            </Button>
          </div>
        }
      />

      <SectionTabs section="memento" />

      {/* Presentation Explainer Hero Banner */}
      <div className="mb-6 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-white p-5 shadow-xs relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <LuBrain className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-950">
                  What is Memento? (Presentation Summary)
                </h3>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                  AI Long-Term Memory
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-3xl">
                Standard AI models have <strong>amnesia</strong>—they forget past team decisions and repository rules every scan.
                <strong> Memento</strong> is DevUpdate AI&apos;s persistent memory system. It remembers your team&apos;s architectural guidelines,
                past upgrade decisions (Accepted, Postponed, or Rejected), and injects this context into future Firecrawl research so recommendations
                never violate your project&apos;s rules.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <LuLightbulb className="h-3.5 w-3.5 text-amber-500" />
              {showGuide ? 'Hide Presentation Pillars' : 'View Presentation Pillars'}
            </button>
          </div>
        </div>

        {/* 3 Presentation Pillars */}
        {showGuide && (
          <div className="mt-4 pt-4 border-t border-sky-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/80 bg-white/70 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-sky-700 font-bold text-xs">
                <LuLayers className="h-4 w-4" />
                <span>1. Prevents AI Amnesia</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Stores your environment rules (e.g., &ldquo;Docker requires Node 20 LTS&rdquo; or &ldquo;Pin React 18&rdquo;) so AI scans never suggest breaking upgrades.
              </p>
            </div>

            <div className="rounded-xl border border-white/80 bg-white/70 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <LuThumbsUp className="h-4 w-4" />
                <span>2. Remembers Team Decisions</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Logs developer decisions (Accepted, Postponed, or Rejected). The AI will not repeatedly nag your team about upgrades you have already reviewed.
              </p>
            </div>

            <div className="rounded-xl border border-white/80 bg-white/70 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-violet-700 font-bold text-xs">
                <LuSparkles className="h-4 w-4" />
                <span>3. Live Context Injection</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Before Firecrawl deep-crawls packages, Memento provides the top 12 relevant memories to the AI to customize migration steps specifically for this repository.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top 4 Stat Cards in One Clean Line */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <StatCard
          square
          index={0}
          label="Knowledge Rules"
          value={items.length}
          description="Stored in Memento"
          icon={LuBrainCircuit}
          tone="purple"
        />
        <StatCard
          square
          index={1}
          label="Authoritative Store"
          value={status?.authoritativeStore || 'MongoDB'}
          description="Isolated per repo"
          icon={LuDatabase}
          tone="neutral"
        />
        <StatCard
          square
          index={2}
          label="AI Context Mirror"
          value={memento?.connected ? 'Synchronized' : 'Ready'}
          description="MCP Vector Engine"
          icon={LuSparkles}
          tone={memento?.connected ? 'success' : 'cyan'}
        />
        <StatCard
          square
          index={3}
          label="Team Decisions"
          value={decisions.length}
          description="Enforced policies"
          icon={LuThumbsUp}
          tone="warning"
        />
      </div>

      {/* Repository Switcher and Status Card */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
            <LuDatabase className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Repository</span>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                {selectedRepo?.fullName || selectedRepo?.name || 'Select repository'}
              </h4>
              <Badge tone="violet" dot>{items.length} Rules Active</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            aria-label="Select repository"
            className="h-9 w-full sm:w-72 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:border-sky-500 focus:outline-hidden"
            value={repositoryId}
            onChange={(e) => setRepositoryId(e.target.value)}
          >
            {repositories.map((repo) => (
              <option key={String(repo._id)} value={repo._id}>
                {repo.fullName || repo.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Single-Screen Workspace */}
      {loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : !repositories.length ? (
        <div className="mt-6">
          <EmptyState
            icon={LuBrainCircuit}
            title="No connected repositories"
            description="Connect your GitHub account and scan a repository before creating persistent memory."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* Left Column: Knowledge Input & Presentation Cheat Sheet */}
          <div className="space-y-6">
            {/* Form Card: Teach AI a Rule */}
            <Card className="border border-slate-200/80 p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LuSparkles className="h-4 w-4 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900">Teach AI a Rule</h3>
                </div>
                <span className="text-[10px] font-medium text-slate-400">Stores in Memento</span>
              </div>

              {/* Quick Template Buttons */}
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Quick Examples (Click to Fill)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyTemplate('node20')}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition cursor-pointer"
                  >
                    Node 20 Rule
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('tailwind')}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition cursor-pointer"
                  >
                    Pin Tailwind v3
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('security')}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition cursor-pointer"
                  >
                    CVE Policy
                  </button>
                </div>
              </div>

              <form className="space-y-3.5" onSubmit={save}>
                <div>
                  <label htmlFor="memory-title" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Rule Title
                  </label>
                  <input
                    id="memory-title"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-sky-500 shadow-2xs"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Node.js 20 LTS Runtime Constraint"
                    maxLength={240}
                  />
                </div>

                <div>
                  <label htmlFor="memory-category" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Knowledge Category
                  </label>
                  <select
                    id="memory-category"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-sky-500 shadow-2xs"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="PROJECT">PROJECT (Runtime & architecture constraints)</option>
                    <option value="DEPENDENCY">DEPENDENCY (Pinned versions & package rules)</option>
                    <option value="DECISION">DECISION (Team upgrade acceptance policies)</option>
                    <option value="ANALYSIS">ANALYSIS (Security audit findings & notes)</option>
                    <option value="CONVERSATION">CONVERSATION (Developer chat context)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="memory-content" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Rule Details (Prompt Context)
                  </label>
                  <textarea
                    id="memory-content"
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-sky-500 shadow-2xs resize-none"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Describe the constraint or rule so the AI knows how to apply it during update recommendations..."
                    maxLength={12000}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="sm"
                  leftIcon={LuShieldCheck}
                  loading={saving}
                  disabled={!repositoryId || !form.title.trim() || !form.content.trim()}
                >
                  Save to Memento Memory
                </Button>
              </form>
            </Card>

            {/* Presentation Cheat Sheet Card */}
            <Card className="border border-slate-200/80 bg-slate-900 p-5 text-white shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <LuInfo className="h-4 w-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Presentation Key Points
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>
                    <strong>Zero Duplicate Alerts:</strong> The AI consults Memento before making recommendations, honoring team decisions.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                  <span>
                    <strong>Contextual Guidance:</strong> Firecrawl research combined with Memento produces migration steps tailored specifically to this codebase.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                  <span>
                    <strong>Dual Storage:</strong> High-integrity MongoDB ensures persistence; MCP vector mirrors speed up semantic context retrieval.
                  </span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Right Column: Consolidated Memory Hub (3 Unified Views on the Same Screen) */}
          <div className="space-y-4">
            {/* View Switcher Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'rules'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <LuBrain className="h-3.5 w-3.5" />
                  <span>Active Knowledge Rules</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === 'rules' ? 'bg-sky-400/20 text-sky-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {items.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('decisions')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'decisions'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <LuThumbsUp className="h-3.5 w-3.5" />
                  <span>Recorded Decisions</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === 'decisions' ? 'bg-sky-400/20 text-sky-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {decisions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <LuClock3 className="h-3.5 w-3.5" />
                  <span>Scan Change History</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === 'history' ? 'bg-sky-400/20 text-sky-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {comparisons.length}
                  </span>
                </button>
              </div>

              {/* Sub-filters for Rules view */}
              {activeTab === 'rules' && (
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Filter by category"
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-sky-500"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {(status?.categories || ['PROJECT', 'DEPENDENCY', 'DECISION', 'ANALYSIS', 'CONVERSATION']).map(
                      (val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ),
                    )}
                  </select>

                  <select
                    aria-label="Filter by status"
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-sky-500"
                    value={memoryStatus}
                    onChange={(e) => setMemoryStatus(e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUPERSEDED">Superseded</option>
                    <option value="ALL">All</option>
                  </select>
                </div>
              )}
            </div>

            {/* TAB 1: ACTIVE KNOWLEDGE RULES */}
            {activeTab === 'rules' && (
              <div className="space-y-3">
                {items.length ? (
                  items.map((memory) => (
                    <Card
                      key={String(memory._id)}
                      className="border border-slate-200/80 bg-white p-4.5 shadow-2xs transition hover:border-slate-300 hover:shadow-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{memory.title}</h4>
                            <Badge tone={categoryTone[memory.category] || 'neutral'}>
                              {memory.category}
                            </Badge>
                            <Badge tone={verificationTone[memory.verificationStatus] || 'neutral'}>
                              {memory.verificationStatus?.replace('_', ' ') || 'VERIFIED'}
                            </Badge>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600 font-sans">
                            {memory.content}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(memory._id)}
                          aria-label={`Delete ${memory.title}`}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Delete memory rule"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Metadata Footer */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <LuHistory className="h-3 w-3 text-slate-400" />
                            Updated {formatDate(memory.updatedAt || memory.createdAt, true)}
                          </span>
                          <span>Confidence: <strong>{Math.round((memory.confidence || 0.95) * 100)}%</strong></span>
                          <span>Origin: <span className="font-mono text-slate-700">{memory.origin || 'developer'}</span></span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            memory.external?.some((item) => item.status === 'MIRRORED')
                              ? 'text-emerald-700'
                              : 'text-sky-700'
                          }`}
                        >
                          <LuCircleCheck className="h-3 w-3" />
                          {memory.external?.some((item) => item.status === 'MIRRORED')
                            ? 'Memento MCP Mirrored'
                            : 'MongoDB Authoritative'}
                        </span>
                      </div>
                    </Card>
                  ))
                ) : (
                  <EmptyState
                    icon={LuBrainCircuit}
                    title="No active memory rules for this repository"
                    description="Click 'Rebuild AI Context' above or use the form on the left to teach the AI your repository's architectural and dependency rules."
                  />
                )}
              </div>
            )}

            {/* TAB 2: RECORDED UPGRADE DECISIONS */}
            {activeTab === 'decisions' && (
              <div className="space-y-3">
                {decisions.length ? (
                  decisions.map((dec, idx) => (
                    <Card
                      key={dec._id || idx}
                      className="border border-slate-200/80 bg-white p-4.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {dec.packageName || 'Package Decision'}
                            </h4>
                            {dec.targetVersion && (
                              <span className="font-mono text-xs text-slate-500">
                                Target: {dec.targetVersion}
                              </span>
                            )}
                            <Badge tone={decisionTone[dec.decision] || 'neutral'}>
                              {dec.decision}
                            </Badge>
                          </div>
                          {dec.explanation && (
                            <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                              <strong>Decision Reason:</strong> {dec.explanation}
                            </p>
                          )}
                          {dec.notes && (
                            <p className="mt-1 text-xs text-slate-500">
                              <strong>Notes:</strong> {dec.notes}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(dec.createdAt || dec.updatedAt, true)}
                        </span>
                      </div>
                    </Card>
                  ))
                ) : (
                  <EmptyState
                    icon={LuThumbsUp}
                    title="No upgrade decisions recorded yet"
                    description="When developers accept, reject, or postpone recommended upgrades, decisions are logged in Memento to establish team upgrade policy."
                  />
                )}
              </div>
            )}

            {/* TAB 3: SCAN HISTORY & EVOLUTION */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {comparisons.length ? (
                  comparisons.map((comp, idx) => (
                    <Card
                      key={comp._id || idx}
                      className="border border-slate-200/80 bg-white p-4.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {comp.title || `Scan Evolution Snapshot #${comparisons.length - idx}`}
                          </h4>
                          <p className="mt-1 text-xs text-slate-600">
                            {comp.summary || 'Historical comparison captured dependency version transitions and vulnerability mitigations.'}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(comp.createdAt || comp.timestamp, true)}
                        </span>
                      </div>
                    </Card>
                  ))
                ) : (
                  <EmptyState
                    icon={LuClock3}
                    title="No historical comparisons yet"
                    description="As repository scans and Firecrawl deep-crawls run over time, Memento tracks dependency version evolution and security resolution."
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
