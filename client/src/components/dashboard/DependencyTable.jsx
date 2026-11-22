import { LuPackage } from 'react-icons/lu'
import Badge from '../common/Badge'
import EmptyState from '../common/EmptyState'

const ecosystemTone = {
  npm: 'danger',
  PyPI: 'cyan',
  Maven: 'warning',
  Gradle: 'warning',
  Cargo: 'violet',
  Composer: 'violet',
  RubyGems: 'danger',
  Go: 'cyan',
  NuGet: 'success',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DependencyTable({ dependencies = [], showRepository = true }) {
  if (!dependencies.length) {
    return (
      <EmptyState
        icon={LuPackage}
        title="No dependencies found"
        description="Try a different search term or filter, or scan a repository to extract its dependencies."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card/60">
      <div className="scrollbar-slim overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-white/[0.02] text-[10px] font-semibold tracking-wider text-muted uppercase">
              <th className="px-5 py-3.5">Package name</th>
              <th className="px-5 py-3.5">Ecosystem</th>
              {showRepository ? <th className="px-5 py-3.5">Repository</th> : null}
              <th className="px-5 py-3.5">Declared</th>
              <th className="px-5 py-3.5">Resolved</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">Source file</th>
              <th className="px-5 py-3.5">Extracted</th>
            </tr>
          </thead>
          <tbody>
            {dependencies.map((dependency) => (
              <tr
                key={dependency._id || `${dependency.repositoryId?._id || dependency.repositoryId}-${dependency.packageName}-${dependency.sourceManifest}`}
                className="border-b border-line/50 transition-colors last:border-0 hover:bg-white/[0.025]"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-brandlight">
                      <LuPackage className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-ink">{dependency.packageName}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge tone={ecosystemTone[dependency.ecosystem] || 'neutral'}>
                    {dependency.ecosystem}
                  </Badge>
                </td>
                {showRepository ? (
                  <td className="px-5 py-4 text-subtle">
                    {dependency.repositoryId?.name || dependency.repositoryName || '—'}
                  </td>
                ) : null}
                <td className="px-5 py-4 font-mono text-[12px] text-subtle">
                  {dependency.declaredVersion || '—'}
                </td>
                <td className="px-5 py-4 font-mono text-[12px] text-ink">
                  {dependency.resolvedVersion || '—'}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={dependency.isDevelopmentDependency ? 'warning' : 'success'}>
                      {dependency.isDevelopmentDependency ? 'dev' : 'prod'}
                    </Badge>
                    <span className="text-[11px] capitalize text-muted">{dependency.dependencyType}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-[11px] text-muted">
                  {dependency.sourceManifest}
                </td>
                <td className="px-5 py-4 text-[11px] text-muted">
                  {formatDate(dependency.extractedAt || dependency.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
