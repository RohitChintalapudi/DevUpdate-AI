import { useCallback, useEffect, useState } from 'react'
import { LuExternalLink, LuSearch, LuShieldAlert } from 'react-icons/lu'
import Badge from '../../components/common/Badge'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import PageHeader from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeleton'
import Toast from '../../components/common/Toast'
import SectionTabs from '../../components/common/SectionTabs'
import useDebounce from '../../hooks/useDebounce'
import { getErrorMessage, updatesApi } from '../../services/api'
import {
  formatDate,
  formatVersion,
  severityTone,
} from '../../utils/updateHelpers'

const selectClass =
  'h-10 rounded-xl border border-line bg-canvas/60 px-3 text-xs text-ink outline-none transition focus:border-brandlight/60'

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']

function advisoryId(advisory = {}) {
  return advisory.cveIds?.[0] || advisory.ghsaIds?.[0] || advisory.id || '—'
}

function referenceUrl(advisory = {}) {
  return advisory.references?.find((reference) => /advisory|security|CVE|GHSA/i.test(reference.url))?.url
    || advisory.references?.[0]?.url
}

export default function Vulnerabilities() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [severity, setSeverity] = useState('')
  const [repositoryId, setRepositoryId] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({
    vulnerabilities: [],
    repositories: [],
    pagination: { page: 1, pages: 1, total: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vulnerabilities, repositories] = await Promise.all([
        updatesApi.vulnerabilities({ search: debouncedSearch, severity, repositoryId, page, limit: 20 }),
        updatesApi.repositories({ limit: 50 }),
      ])
      setData({
        ...vulnerabilities,
        repositories: repositories.repositories || [],
      })
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Could not load vulnerabilities',
        message: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, severity, repositoryId, page])

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

  return (
    <div>
      <PageHeader
        eyebrow="Security intelligence"
        title="Vulnerabilities"
        description="Advisories matched against installed versions by OSV. Security data failures are never reported as safe."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="danger" dot>{data.pagination.total} matched advisories</Badge>
        </div>
      </PageHeader>

      <SectionTabs section="updates" />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card/60 p-4 lg:flex-row lg:items-center">
        <Input
          icon={LuSearch}
          placeholder="Search package or advisory ID…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="lg:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by severity"
            className={selectClass}
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All severities</option>
            {SEVERITIES.map((item) => (
              <option key={item} value={item}>{item.toLowerCase()}</option>
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
            {data.repositories.map((repository) => (
              <option key={String(repository.repositoryId)} value={repository.repositoryId}>
                {repository.fullName || repository.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-muted lg:ml-auto">
          OSV advisory data
        </span>
      </div>

      <div className="mt-5">
        {loading && !data.vulnerabilities.length ? (
          <div className="rounded-2xl border border-line bg-card/60">
            <TableSkeleton rows={8} />
          </div>
        ) : data.vulnerabilities.length ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-card/60">
            <div className="scrollbar-slim overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-white/[0.02] text-[10px] font-semibold tracking-wider text-muted uppercase">
                    <th className="px-5 py-3.5">Package</th>
                    <th className="px-5 py-3.5">Repository</th>
                    <th className="px-5 py-3.5">Installed</th>
                    <th className="px-5 py-3.5">Severity</th>
                    <th className="px-5 py-3.5">Advisory</th>
                    <th className="px-5 py-3.5">Affected range</th>
                    <th className="px-5 py-3.5">Fixed version</th>
                    <th className="px-5 py-3.5">Reference</th>
                    <th className="px-5 py-3.5">Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vulnerabilities.map((item, index) => {
                    const advisory = item.advisory || {}
                    const url = referenceUrl(advisory)
                    return (
                      <tr
                        key={`${item.updateId || item.dependencyId}-${advisory.id || index}`}
                        className="border-b border-line/50 transition-colors last:border-0 hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-ink">{item.packageName}</p>
                          <p className="mt-0.5 text-[11px] text-muted">{item.ecosystem}</p>
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-4 text-subtle" title={item.repositoryName}>
                          {item.repositoryName || '—'}
                        </td>
                        <td className="px-5 py-4 font-mono text-[12px] text-subtle">
                          {formatVersion(item.installedVersion)}
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone={severityTone[advisory.severity?.level] || 'neutral'} dot>
                            {advisory.severity?.level || 'UNKNOWN'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-mono text-[12px] font-semibold text-ink">{advisoryId(advisory)}</p>
                          <p className="mt-1 max-w-[240px] text-[11px] leading-snug text-muted" title={advisory.summary}>
                            {advisory.summary || 'No summary published'}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px] text-subtle">
                          {advisory.affectedRanges?.map((range) => range.display).filter(Boolean).join('; ') || 'Unavailable'}
                        </td>
                        <td className="px-5 py-4 font-mono text-[12px] text-success">
                          {advisory.fixedVersions?.length ? advisory.fixedVersions.join(', ') : '—'}
                        </td>
                        <td className="px-5 py-4">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-brandlight hover:underline"
                            >
                              Advisory <LuExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted">{formatDate(item.lastCheckedAt, true)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={LuShieldAlert}
            title="No matching advisories"
            description="No OSV advisories match the installed versions in your repositories. This is not a guarantee of safety if advisory data was unavailable."
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
