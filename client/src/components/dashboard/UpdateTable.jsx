import { LuArrowUpRight, LuBookOpen, LuFlame, LuPackage } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Badge from '../common/Badge'
import EmptyState from '../common/EmptyState'
import {
  classificationLabel,
  classificationTone,
  ecosystemTone,
  formatDate,
  formatVersion,
  getCanonicalUpdateStatus,
  researchStatusLabel,
  researchStatusTone,
  securityStatusLabel,
  securityStatusTone,
  updateStatusLabel,
  updateStatusTone,
  updateTypeTone,
} from '../../utils/updateHelpers'

function repositoryName(update) {
  if (typeof update.repositoryId === 'object' && update.repositoryId) {
    return update.repositoryId.fullName || update.repositoryId.name || 'Repository'
  }
  return 'Repository'
}

export default function UpdateTable({
  updates = [],
  showRepository = true,
  onSelectDependency,
  onQuickResearch,
}) {
  if (!updates.length) {
    return (
      <EmptyState
        icon={LuPackage}
        title="No update records found"
        description="Run an update check to compare extracted dependencies with official package registries and advisories."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="scrollbar-slim overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10.5px] font-bold tracking-wider text-slate-500 uppercase">
              <th className="px-5 py-3.5">Dependency Name</th>
              <th className="px-4 py-3.5">Classification</th>
              {showRepository ? <th className="px-4 py-3.5">Repository</th> : null}
              <th className="px-4 py-3.5">Installed</th>
              <th className="px-4 py-3.5">Latest Stable</th>
              <th className="px-4 py-3.5">Compatible</th>
              <th className="px-4 py-3.5">Update Status</th>
              <th className="px-4 py-3.5">Update Type</th>
              <th className="px-4 py-3.5">Security</th>
              <th className="px-4 py-3.5">Research</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {updates.map((update) => {
              const detailId = update.dependencyId || update._id
              const classification = update.classification || 'SUPPORTING'
              const researchStatus = update.researchStatus || (update.researchId ? 'COMPLETED' : 'NOT_RESEARCHED')
              const latestCompatible = update.latestCompatibleVersion || '—'

              return (
                <tr
                  key={String(update._id || detailId)}
                  className="group border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70 cursor-pointer"
                  onClick={() => onSelectDependency && onSelectDependency(update)}
                >
                  {/* 1. Name & Ecosystem */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-600">
                        <LuPackage className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-semibold text-slate-950 group-hover:text-sky-600 transition">
                            {update.packageName}
                          </p>
                          <Badge tone={ecosystemTone[update.ecosystem] || 'neutral'}>
                            {update.ecosystem}
                          </Badge>
                        </div>
                        <p
                          className="mt-0.5 truncate font-mono text-[11px] text-slate-500"
                          title={update.declaredVersion || 'No declared requirement'}
                        >
                          req: {formatVersion(update.declaredVersion || 'unpinned')}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* 2. Classification */}
                  <td className="px-4 py-4">
                    <Badge tone={classificationTone[classification] || 'neutral'}>
                      {classificationLabel[classification] || classification}
                    </Badge>
                  </td>

                  {/* Optional Repository */}
                  {showRepository ? (
                    <td className="max-w-[150px] truncate px-4 py-4 text-slate-600 text-xs" title={repositoryName(update)}>
                      {repositoryName(update)}
                    </td>
                  ) : null}

                  {/* 3. Installed Version */}
                  <td className="px-4 py-4 font-mono text-[12px] text-slate-700">
                    {formatVersion(update.installedVersion || update.resolvedVersion)}
                  </td>

                  {/* 4. Latest Stable Version */}
                  <td className="px-4 py-4 font-mono text-[12px] font-semibold text-slate-900">
                    {formatVersion(update.latestStableVersion || update.latestVersion)}
                  </td>

                  {/* 5. Latest Compatible Version */}
                  <td className="px-4 py-4 font-mono text-[12px] text-emerald-700 font-medium">
                    {latestCompatible}
                  </td>

                  {/* 6. Update Status (Strictly Up to Date, Needs Upgrade, or Outdated) */}
                  <td className="px-4 py-4">
                    {(() => {
                      const canonical = getCanonicalUpdateStatus(update)
                      return (
                        <Badge tone={updateStatusTone[canonical] || 'neutral'} dot>
                          {updateStatusLabel[canonical] || 'Up to Date'}
                        </Badge>
                      )
                    })()}
                  </td>

                  {/* 7. Update Type */}
                  <td className="px-4 py-4">
                    <Badge tone={updateTypeTone[update.updateType] || 'neutral'}>
                      {String(update.updateType || 'UNKNOWN').toLowerCase()}
                    </Badge>
                  </td>

                  {/* 8. Security Status */}
                  <td className="px-4 py-4">
                    <Badge tone={securityStatusTone[update.securityStatus] || 'neutral'} dot>
                      {securityStatusLabel[update.securityStatus] || update.securityStatus}
                    </Badge>
                  </td>

                  {/* 9. Research Status */}
                  <td className="px-4 py-4">
                    <Badge tone={researchStatusTone[researchStatus] || 'neutral'} dot>
                      {researchStatusLabel[researchStatus] || researchStatus}
                    </Badge>
                  </td>

                  {/* 10. Actions */}
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {onQuickResearch && researchStatus === 'NOT_RESEARCHED' ? (
                        <button
                          type="button"
                          onClick={() => onQuickResearch(update)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                          title="Run Firecrawl research"
                        >
                          <LuFlame className="h-3 w-3 text-amber-600" /> Research
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectDependency && onSelectDependency(update)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition"
                        >
                          <LuBookOpen className="h-3 w-3" /> Intelligence
                        </button>
                      )}
                      <Link
                        to={`/dashboard/updates/${detailId}`}
                        className="inline-flex items-center gap-1 rounded-lg p-1 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="View standalone detail page"
                      >
                        <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
