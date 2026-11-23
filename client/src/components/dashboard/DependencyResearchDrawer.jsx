import { useCallback, useEffect, useState } from 'react'
import {
  LuArrowRight,
  LuBookOpen,
  LuBot,
  LuCalendar,
  LuCircleCheck,
  LuClock,
  LuExternalLink,
  LuFileText,
  LuFlame,
  LuGitBranch,
  LuGitPullRequest,
  LuLayers,
  LuPackage,
  LuRefreshCw,
  LuShieldAlert,
  LuSparkles,
  LuTriangleAlert,
  LuX,
} from 'react-icons/lu'
import Badge from '../common/Badge'
import Button from '../common/Button'
import {
  classificationLabel,
  classificationTone,
  ecosystemTone,
  formatDate,
  formatVersion,
  recommendationLabel,
  recommendationTone,
  researchStatusLabel,
  researchStatusTone,
  securityStatusLabel,
  securityStatusTone,
  severityTone,
  updateStatusLabel,
  updateStatusTone,
  updateTypeTone,
} from '../../utils/updateHelpers'
import { getErrorMessage, updatesApi } from '../../services/api'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LuPackage },
  { id: 'research', label: 'Official Research', icon: LuBookOpen },
  { id: 'versions', label: 'Version Comparison', icon: LuGitBranch },
  { id: 'security', label: 'Security', icon: LuShieldAlert },
  { id: 'ai', label: 'AI Analysis', icon: LuSparkles },
  { id: 'sources', label: 'Sources & Evidence', icon: LuFileText },
]

export default function DependencyResearchDrawer({
  dependencyId,
  repositoryId,
  open,
  onClose,
  onResearchUpdated,
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [researching, setResearching] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!dependencyId) return
    setLoading(true)
    setError('')
    try {
      const response = await updatesApi.getResearch(dependencyId)
      setData(response)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [dependencyId])

  useEffect(() => {
    if (open && dependencyId) {
      loadData()
      setActiveTab('overview')
    } else {
      setData(null)
      setError('')
    }
  }, [open, dependencyId, loadData])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleTriggerResearch = async (force = false) => {
    if (!dependencyId) return
    setResearching(true)
    setError('')
    try {
      await updatesApi.researchDependency(dependencyId, { force })
      await loadData()
      if (onResearchUpdated) onResearchUpdated()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setResearching(false)
    }
  }

  const handleTriggerAnalyze = async () => {
    if (!dependencyId) return
    setAnalyzing(true)
    setError('')
    try {
      await updatesApi.analyzeDependency(dependencyId)
      await loadData()
      if (onResearchUpdated) onResearchUpdated()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setAnalyzing(false)
    }
  }

  if (!open) return null

  const update = data?.update || {}
  const research = data?.research || null
  const analysis = data?.analysis || null
  const dep = data?.dependency || {}

  const packageName = update.packageName || dep.packageName || 'Dependency Details'
  const ecosystem = update.ecosystem || dep.ecosystem || 'Package'
  const classification = update.classification || (dep.isDevelopmentDependency ? 'DEVELOPMENT' : 'CORE')
  const installedVersion = update.installedVersion || dep.resolvedVersion || dep.declaredVersion || '—'
  const latestStableVersion = update.latestStableVersion || update.latestVersion || '—'
  const latestCompatible = update.latestCompatibleVersion || '—'
  const updateStatus = update.updateStatus || 'UNKNOWN_VERSION'
  const updateType = update.updateType || 'UNKNOWN'
  const securityStatus = update.securityStatus || 'UNKNOWN'
  const researchStatus = update.researchStatus || (research ? 'COMPLETED' : 'NOT_RESEARCHED')

  const versionList =
    update.metadata?.versionHistory && update.metadata.versionHistory.length > 0
      ? update.metadata.versionHistory
      : [
          latestStableVersion && latestStableVersion !== '—'
            ? { version: latestStableVersion, publishedAt: update.lastCheckedAt }
            : null,
          latestCompatible && latestCompatible !== '—' && latestCompatible !== latestStableVersion
            ? { version: latestCompatible, publishedAt: update.lastCheckedAt }
            : null,
          installedVersion && installedVersion !== '—' && installedVersion !== latestStableVersion
            ? { version: installedVersion, publishedAt: update.createdAt }
            : null,
        ].filter(Boolean)

  const sourcesList = [
    ...(research?.sourceUrls || []),
    ...(update?.registryUrl && !(research?.sourceUrls || []).some((s) => s.url === update.registryUrl)
      ? [{ sourceType: 'registry', url: update.registryUrl, retrievedAt: update.lastCheckedAt || new Date() }]
      : []),
    ...((research?.packageInfo?.repositoryUrl || update?.metadata?.repositoryUrl) &&
    !(research?.sourceUrls || []).some(
      (s) => s.url === (research?.packageInfo?.repositoryUrl || update?.metadata?.repositoryUrl),
    )
      ? [
          {
            sourceType: 'github',
            url: research?.packageInfo?.repositoryUrl || update?.metadata?.repositoryUrl,
            retrievedAt: update.lastCheckedAt || new Date(),
          },
        ]
      : []),
    ...((research?.packageInfo?.documentationUrl ||
      research?.packageInfo?.homepage ||
      update?.metadata?.homepage) &&
    !(research?.sourceUrls || []).some(
      (s) =>
        s.url ===
        (research?.packageInfo?.documentationUrl ||
          research?.packageInfo?.homepage ||
          update?.metadata?.homepage),
    )
      ? [
          {
            sourceType: 'docs',
            url:
              research?.packageInfo?.documentationUrl ||
              research?.packageInfo?.homepage ||
              update?.metadata?.homepage,
            retrievedAt: update.lastCheckedAt || new Date(),
          },
        ]
      : []),
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-3xl">
          {/* Header */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Badge tone={ecosystemTone[ecosystem] || 'neutral'}>{ecosystem}</Badge>
                  <Badge tone={classificationTone[classification] || 'neutral'}>
                    {classificationLabel[classification] || classification}
                  </Badge>
                  <Badge tone={researchStatusTone[researchStatus] || 'neutral'} dot>
                    {researchStatusLabel[researchStatus] || researchStatus}
                  </Badge>
                </div>
                <h2 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold tracking-tight text-slate-950 truncate" title={packageName}>
                  {packageName}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    Installed: <strong className="font-mono text-slate-700">{formatVersion(installedVersion)}</strong>
                  </span>
                  <span>
                    Latest Stable: <strong className="font-mono text-slate-900">{formatVersion(latestStableVersion)}</strong>
                  </span>
                  {latestCompatible && latestCompatible !== '—' && (
                    <span>
                      Compatible: <strong className="font-mono text-emerald-700">{formatVersion(latestCompatible)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={LuFlame}
                  loading={researching}
                  onClick={() => handleTriggerResearch(true)}
                  title="Discover official release notes and changelogs with Firecrawl"
                  className="text-xs"
                >
                  {research ? 'Re-research' : 'Research with Firecrawl'}
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 sm:p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
                  aria-label="Close drawer"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Smooth touch-scrollable on mobile, clean horizontal on desktop) */}
            <nav className="mt-4 sm:mt-5 flex space-x-1 border-b border-slate-200/60 -mb-4 sm:-mb-5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0" aria-label="Tabs">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center gap-1.5 border-b-2 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs font-semibold shrink-0 whitespace-nowrap transition ${
                      isActive
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Body Content */}
          <div className="scrollbar-slim h-[calc(100dvh-150px)] sm:h-[calc(100vh-140px)] overflow-y-auto p-4 sm:p-6">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                <LuTriangleAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Research Error</p>
                  <p className="mt-0.5 text-rose-700">{error}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <LuRefreshCw className="h-7 w-7 animate-spin text-sky-600" />
                <p className="text-sm font-medium text-slate-600">Retrieving intelligence…</p>
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Status grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Update Status</span>
                        <div className="mt-1.5">
                          <Badge tone={updateStatusTone[updateStatus] || 'neutral'} dot>
                            {updateStatusLabel[updateStatus] || updateStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Update Type</span>
                        <div className="mt-1.5">
                          <Badge tone={updateTypeTone[updateType] || 'neutral'}>
                            {updateType}
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Security</span>
                        <div className="mt-1.5">
                          <Badge tone={securityStatusTone[securityStatus] || 'neutral'} dot>
                            {securityStatusLabel[securityStatus] || securityStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Classification</span>
                        <div className="mt-1.5">
                          <Badge tone={classificationTone[classification] || 'neutral'}>
                            {classificationLabel[classification] || classification}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Metadata attributes */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                        Package Properties
                      </h3>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-500">Package Name</dt>
                          <dd className="mt-0.5 font-semibold text-slate-900">{packageName}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Ecosystem</dt>
                          <dd className="mt-0.5 font-semibold text-slate-900">{ecosystem}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Installed Version</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-slate-900">{installedVersion}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Declared Requirement</dt>
                          <dd className="mt-0.5 font-mono text-slate-700">{update.declaredVersion || dep.declaredVersion || 'Exact / unpinned'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Latest Stable Release</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-sky-700">{latestStableVersion}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Latest Compatible</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-emerald-700">{latestCompatible}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Dependency Scope</dt>
                          <dd className="mt-0.5 font-medium text-slate-800">
                            {dep.isDevelopmentDependency || dep.dependencyType === 'development' ? 'Development Dependency' : 'Runtime / Production Dependency'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Type in Manifest</dt>
                          <dd className="mt-0.5 font-medium text-slate-800">
                            {dep.dependencyType || 'Direct requirement'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Last Registry Check</dt>
                          <dd className="mt-0.5 text-slate-700">{formatDate(update.lastCheckedAt, true)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Last Official Research</dt>
                          <dd className="mt-0.5 text-slate-700">{research ? formatDate(research.researchedAt, true) : 'Not researched yet'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Official Links */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Official Resources
                      </h3>
                      <div className="flex flex-wrap gap-2.5">
                        {update.registryUrl && (
                          <a
                            href={update.registryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <LuPackage className="h-3.5 w-3.5 text-slate-500" />
                            Official Registry
                            <LuExternalLink className="h-3 w-3 text-slate-400" />
                          </a>
                        )}
                        {(research?.packageInfo?.repositoryUrl || update.metadata?.repositoryUrl) && (
                          <a
                            href={research?.packageInfo?.repositoryUrl || update.metadata?.repositoryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <LuGitPullRequest className="h-3.5 w-3.5 text-slate-500" />
                            Source Repository
                            <LuExternalLink className="h-3 w-3 text-slate-400" />
                          </a>
                        )}
                        {(research?.packageInfo?.documentationUrl || research?.packageInfo?.homepage || update.metadata?.homepage) && (
                          <a
                            href={research?.packageInfo?.documentationUrl || research?.packageInfo?.homepage || update.metadata?.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <LuBookOpen className="h-3.5 w-3.5 text-slate-500" />
                            Official Documentation
                            <LuExternalLink className="h-3 w-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: OFFICIAL RESEARCH (FIRECRAWL) */}
                {activeTab === 'research' && (
                  <div className="space-y-6">
                    {!research ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                        <LuFlame className="mx-auto h-9 w-9 text-amber-500/80" />
                        <h3 className="mt-3 text-sm font-bold text-slate-900">Official Documentation Not Researched</h3>
                        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                          Use Firecrawl to automatically discover and extract official release notes, changelogs, breaking changes, and migration guides for this version leap.
                        </p>
                        <div className="mt-5">
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={LuFlame}
                            loading={researching}
                            onClick={() => handleTriggerResearch(false)}
                          >
                            Start Firecrawl Research
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Research Header Summary */}
                        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sky-800">
                              <LuFlame className="h-4 w-4 text-sky-600" />
                              <span className="text-xs font-bold uppercase tracking-wider">Firecrawl Verified Intelligence</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Researched {formatDate(research.researchedAt, true)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-700">
                            {research.releaseIntelligence?.recentReleasesSummary ||
                              research.packageInfo?.description ||
                              'Official release documentation discovered and parsed via Firecrawl.'}
                          </p>
                        </div>

                        {/* Discovered Breaking Changes */}
                        {research.breakingChanges && research.breakingChanges.length > 0 && (
                          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-5">
                            <div className="flex items-center gap-2 text-amber-900 mb-3">
                              <LuTriangleAlert className="h-4 w-4 text-amber-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider">
                                Breaking Changes Detected ({research.breakingChanges.length})
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {research.breakingChanges.map((change, index) => (
                                <div
                                  key={index}
                                  className="rounded-xl border border-amber-200/80 bg-white p-3.5 shadow-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-xs text-slate-900">{change.title}</span>
                                    {change.sourceUrl && (
                                      <a
                                        href={change.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] font-medium text-sky-600 hover:underline inline-flex items-center gap-1"
                                      >
                                        Source <LuExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{change.description}</p>
                                  {change.migrationAdvice && (
                                    <p className="mt-2 text-[11px] font-mono text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-100">
                                      Fix: {change.migrationAdvice}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Official Changelog & Release Findings */}
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                            Official Findings & Changelogs ({research.findings?.length || 0})
                          </h3>
                          {research.findings && research.findings.length > 0 ? (
                            <div className="space-y-3">
                              {research.findings.map((finding, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-900">{finding.title}</span>
                                    <div className="flex items-center gap-2">
                                      {finding.publicationDate && (
                                        <span className="text-[11px] text-slate-400">
                                          {formatDate(finding.publicationDate)}
                                        </span>
                                      )}
                                      {finding.sourceUrl && (
                                        <a
                                          href={finding.sourceUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-slate-400 hover:text-sky-600 transition"
                                          title="View original documentation"
                                        >
                                          <LuExternalLink className="h-3 w-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                                    {finding.description}
                                  </p>
                                  {finding.tags && finding.tags.length > 0 && (
                                    <div className="mt-2.5 flex flex-wrap gap-1">
                                      {finding.tags.map((tag, tIdx) => (
                                        <span
                                          key={tIdx}
                                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                              No explicit changelog findings parsed. Try re-researching.
                            </p>
                          )}
                        </div>

                        {/* Migration Steps from Official Docs */}
                        {research.migrationIntelligence?.steps && research.migrationIntelligence.steps.length > 0 && (
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                              Official Migration Guide Steps
                            </h3>
                            <ol className="space-y-2 text-xs">
                              {research.migrationIntelligence.steps.map((step, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-2.5 text-slate-700">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 font-mono text-[10px] font-bold text-sky-800">
                                    {sIdx + 1}
                                  </span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* TAB 3: VERSION COMPARISON */}
                {activeTab === 'versions' && (
                  <div className="space-y-6">
                    {/* Visual version path */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                        Upgrade Version Path
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200/80 font-mono text-sm font-bold text-slate-700">
                            IN
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase">Installed</span>
                            <p className="font-mono text-base font-bold text-slate-900">{installedVersion}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center text-slate-400">
                          <LuArrowRight className="h-5 w-5" />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 font-mono text-sm font-bold text-sky-700">
                            TO
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase">Latest Stable</span>
                            <p className="font-mono text-base font-bold text-sky-700">{latestStableVersion}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="text-slate-500">Update jump:</span>
                        <Badge tone={updateTypeTone[updateType] || 'neutral'}>{updateType} update</Badge>
                        <Badge tone={updateStatusTone[updateStatus] || 'neutral'}>
                          {updateStatusLabel[updateStatus] || updateStatus}
                        </Badge>
                      </div>
                    </div>

                    {/* Version History from Registry */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Registry Version History
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          Authoritative package versions from {ecosystem}
                        </span>
                      </div>

                      {versionList && versionList.length > 0 ? (
                        <div className="scrollbar-slim max-h-72 space-y-1.5 overflow-y-auto pr-1">
                          {versionList.slice(0, 30).map((v, vIdx) => {
                            const isInstalled = v.version === installedVersion
                            const isLatest = v.version === latestStableVersion
                            return (
                              <div
                                key={vIdx}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                                  isInstalled
                                    ? 'border border-slate-300 bg-slate-100/80 font-bold'
                                    : isLatest
                                    ? 'border border-sky-200 bg-sky-50 font-bold text-sky-900'
                                    : 'border border-transparent bg-slate-50/50 hover:bg-slate-100/60'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{v.version}</span>
                                  {isInstalled && <Badge tone="neutral">Current</Badge>}
                                  {isLatest && <Badge tone="cyan">Target</Badge>}
                                  {v.yanked && <Badge tone="danger">Yanked</Badge>}
                                  {v.deprecated && <Badge tone="warning">Deprecated</Badge>}
                                </div>
                                <span className="text-[11px] text-slate-400">{formatDate(v.publishedAt)}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="py-6 text-center text-xs text-slate-400">
                          Detailed version history list not supplied by registry metadata.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: SECURITY */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <LuShieldAlert className="h-4 w-4 text-slate-700" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Security Advisory Status
                          </h3>
                        </div>
                        <Badge tone={securityStatusTone[securityStatus] || 'neutral'} dot>
                          {securityStatusLabel[securityStatus] || securityStatus}
                        </Badge>
                      </div>

                      {/* Explicit disclaimer as strictly required */}
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                        <LuTriangleAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <span className="leading-relaxed">
                          <strong>Authoritative advisory note:</strong> A missing security result or zero advisories must never be taken as absolute proof that a package is completely safe or free of unannounced vulnerabilities.
                        </span>
                      </div>
                    </div>

                    {/* Vulnerabilities list */}
                    {update.vulnerabilities && update.vulnerabilities.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Discovered Advisories ({update.vulnerabilities.length})
                        </h4>
                        {update.vulnerabilities.map((vuln, vIdx) => {
                          const level = vuln.severity?.level || 'UNKNOWN'
                          const identifier = vuln.cveIds?.[0] || vuln.ghsaIds?.[0] || vuln.id
                          return (
                            <div
                              key={vIdx}
                              className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-4 text-xs shadow-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge tone={severityTone[level] || 'neutral'} dot>
                                    {level}
                                  </Badge>
                                  <span className="font-mono font-bold text-slate-900">{identifier}</span>
                                </div>
                                {vuln.publishedAt && (
                                  <span className="text-[11px] text-slate-500">{formatDate(vuln.publishedAt)}</span>
                                )}
                              </div>
                              <p className="mt-2 text-slate-700 leading-relaxed">{vuln.summary}</p>
                              {vuln.fixedVersions && vuln.fixedVersions.length > 0 && (
                                <p className="mt-2 font-mono text-[11px] text-emerald-700">
                                  Fixed in: <strong>{vuln.fixedVersions.join(', ')}</strong>
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-6 text-center text-xs text-emerald-800">
                        <LuCircleCheck className="mx-auto h-7 w-7 text-emerald-600 mb-2" />
                        <p className="font-bold">No Known Vulnerabilities Found</p>
                        <p className="mt-0.5 text-slate-600">
                          OSV returned 0 CVE or GHSA advisories affecting version <span className="font-mono">{installedVersion}</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: AI ANALYSIS (GEMINI / GROQ) */}
                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    {!analysis ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                        <LuSparkles className="mx-auto h-9 w-9 text-sky-500" />
                        <h3 className="mt-3 text-sm font-bold text-slate-900">AI Upgrade Interpretation</h3>
                        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                          Antigravity AI (Gemini/Groq) analyzes the official Firecrawl findings specifically in the context of this repository to determine breaking changes, migration steps, and risk level.
                        </p>
                        <div className="mt-5">
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={LuSparkles}
                            loading={analyzing}
                            onClick={handleTriggerAnalyze}
                          >
                            Generate AI Interpretation
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Recommendation Card */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              AI Upgrade Recommendation
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge tone={recommendationTone[analysis.recommendation] || 'neutral'}>
                                {recommendationLabel[analysis.recommendation] || analysis.recommendation}
                              </Badge>
                              <Badge tone={severityTone[analysis.riskLevel] || 'neutral'}>
                                Risk: {analysis.riskLevel}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-700">
                            {analysis.summary || analysis.recommendationReason || 'AI interpretation for this package upgrade.'}
                          </p>
                        </div>

                        {/* Project Impact */}
                        {analysis.compatibilityFindings && analysis.compatibilityFindings.length > 0 && (
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                              Repository Impact & Compatibility
                            </h3>
                            <div className="space-y-2.5">
                              {analysis.compatibilityFindings.map((finding, fIdx) => (
                                <div key={fIdx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                                  <p className="font-semibold text-slate-900">{finding.title}</p>
                                  <p className="mt-0.5 text-slate-600 leading-relaxed">{finding.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Migration Steps */}
                        {analysis.migrationPlan && analysis.migrationPlan.length > 0 && (
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                              Suggested Migration Steps
                            </h3>
                            <ol className="space-y-3 text-xs">
                              {analysis.migrationPlan.map((step, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 font-mono text-[10px] font-bold text-sky-800">
                                    {step.order || sIdx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900">{step.action}</p>
                                    {step.reason && <p className="mt-0.5 text-slate-600">{step.reason}</p>}
                                    {step.fileArea && (
                                      <p className="mt-1 font-mono text-[11px] text-slate-500">Area: {step.fileArea}</p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Re-analyze Button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={LuRefreshCw}
                            loading={analyzing}
                            onClick={handleTriggerAnalyze}
                          >
                            Re-analyze with AI
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 6: SOURCES & EVIDENCE */}
                {activeTab === 'sources' && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Discovered Documentation & Sources ({sourcesList.length})
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          Official documentation & registry endpoints
                        </span>
                      </div>

                      {sourcesList.length > 0 ? (
                        <div className="space-y-2">
                          {sourcesList.map((source, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50/60 p-3 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 uppercase">
                                  {source.sourceType || 'docs'}
                                </span>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block truncate font-mono text-[11px] text-sky-700 hover:underline"
                                >
                                  {source.url}
                                </a>
                              </div>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatDate(source.retrievedAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-6 text-center text-xs text-slate-400">
                          No documentation sources stored yet. Run official research to discover documentation URLs.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}