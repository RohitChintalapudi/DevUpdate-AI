import { LuArrowUpRight, LuPackage } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Badge from '../common/Badge'
import EmptyState from '../common/EmptyState'
import {
  ecosystemTone,
  formatDate,
  formatVersion,
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

export default function UpdateTable({ updates = [], showRepository = true }) {
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
    <div className="overflow-hidden rounded-2xl border border-line bg-card/60">
      <div className="scrollbar-slim overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-white/[0.02] text-[10px] font-semibold tracking-wider text-muted uppercase">
              <th className="px-5 py-3.5">Package name</th>
              <th className="px-5 py-3.5">Ecosystem</th>
              {showRepository ? <th className="px-5 py-3.5">Repository</th> : null}
              <th className="px-5 py-3.5">Installed</th>
              <th className="px-5 py-3.5">Latest</th>
              <th className="px-5 py-3.5">Update</th>
              <th className="px-5 py-3.5">Security</th>
              <th className="px-5 py-3.5">Last checked</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {updates.map((update) => {
              const detailId = update.dependencyId || update._id
              return (
                <tr
                  key={String(update._id || detailId)}
                  className="border-b border-line/50 transition-colors last:border-0 hover:bg-white/[0.025]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-brandlight">
                        <LuPackage className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{update.packageName}</p>
                        <p
                          className="mt-0.5 truncate font-mono text-[11px] text-muted"
                          title={update.declaredVersion || 'No declared requirement'}
                        >
                          declared {formatVersion(update.declaredVersion)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={ecosystemTone[update.ecosystem] || 'neutral'}>{update.ecosystem}</Badge>
                  </td>
                  {showRepository ? (
                    <td className="max-w-[180px] truncate px-5 py-4 text-subtle" title={repositoryName(update)}>
                      {repositoryName(update)}
                    </td>
                  ) : null}
                  <td className="px-5 py-4 font-mono text-[12px] text-subtle">
                    {formatVersion(update.installedVersion || update.resolvedVersion)}
                  </td>
                  <td className="px-5 py-4 font-mono text-[12px] text-ink">
                    {formatVersion(update.latestStableVersion || update.latestVersion)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={updateTypeTone[update.updateType] || 'neutral'}>
                        {String(update.updateType || 'UNKNOWN').toLowerCase()}
                      </Badge>
                      <Badge tone={updateStatusTone[update.updateStatus] || 'neutral'} dot>
                        {updateStatusLabel[update.updateStatus] || update.updateStatus}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={securityStatusTone[update.securityStatus] || 'neutral'} dot>
                      {securityStatusLabel[update.securityStatus] || update.securityStatus}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">{formatDate(update.lastCheckedAt, true)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to={`/dashboard/updates/${detailId}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brandlight transition hover:bg-brand/10"
                    >
                      Details <LuArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
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
