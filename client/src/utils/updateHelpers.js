export const ecosystemTone = {
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

export const updateStatusTone = {
  UP_TO_DATE: 'success',
  OUTDATED: 'danger',
  UPDATE_AVAILABLE: 'warning',
  NO_STABLE_RELEASE: 'neutral',
  DEPRECATED: 'warning',
  YANKED: 'danger',
  NOT_FOUND: 'neutral',
  REGISTRY_ERROR: 'danger',
  UNKNOWN_VERSION: 'neutral',
  SECURITY_RISK: 'danger',
}

export const updateStatusLabel = {
  UP_TO_DATE: 'Up to date',
  OUTDATED: 'Outdated',
  UPDATE_AVAILABLE: 'Update available',
  NO_STABLE_RELEASE: 'No stable release',
  DEPRECATED: 'Deprecated',
  YANKED: 'Yanked',
  NOT_FOUND: 'Not found',
  REGISTRY_ERROR: 'Registry error',
  UNKNOWN_VERSION: 'Unknown version',
  SECURITY_RISK: 'Security risk',
}

export const updateTypeTone = {
  MAJOR: 'danger',
  MINOR: 'warning',
  PATCH: 'cyan',
  PRERELEASE: 'violet',
  UNKNOWN: 'neutral',
  NONE: 'success',
}

export const securityStatusTone = {
  NO_KNOWN_VULNERABILITY: 'success',
  VULNERABLE: 'danger',
  SECURITY_DATA_UNAVAILABLE: 'warning',
  UNKNOWN: 'neutral',
}

export const securityStatusLabel = {
  NO_KNOWN_VULNERABILITY: 'No known vulnerabilities',
  VULNERABLE: 'Vulnerable',
  SECURITY_DATA_UNAVAILABLE: 'Security data unavailable',
  UNKNOWN: 'Security unknown',
}

export const severityTone = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'cyan',
  UNKNOWN: 'neutral',
}

export const researchStatusTone = {
  NOT_RESEARCHED: 'neutral',
  QUEUED: 'warning',
  RESEARCHING: 'cyan',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  FAILED: 'danger',
}

export const researchStatusLabel = {
  NOT_RESEARCHED: 'Not Researched',
  QUEUED: 'Queued',
  RESEARCHING: 'Researching…',
  COMPLETED: 'Completed',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
}

export const classificationTone = {
  CORE: 'cyan',
  SUPPORTING: 'neutral',
  DEVELOPMENT: 'violet',
  TRANSITIVE: 'warning',
  UNKNOWN: 'neutral',
}

export const classificationLabel = {
  CORE: 'Core',
  SUPPORTING: 'Supporting',
  DEVELOPMENT: 'Dev',
  TRANSITIVE: 'Transitive',
  UNKNOWN: 'Unknown',
}

export const recommendationTone = {
  UPGRADE_RECOMMENDED: 'success',
  UPGRADE_WITH_CAUTION: 'warning',
  REVIEW_BEFORE_UPGRADE: 'cyan',
  DEFER_UPGRADE: 'danger',
  INSUFFICIENT_EVIDENCE: 'neutral',
}

export const recommendationLabel = {
  UPGRADE_RECOMMENDED: 'Upgrade Recommended',
  UPGRADE_WITH_CAUTION: 'Upgrade with Caution',
  REVIEW_BEFORE_UPGRADE: 'Review Before Upgrade',
  DEFER_UPGRADE: 'Defer Upgrade',
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
}

export function formatDate(value, includeTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

export function formatVersion(value) {
  if (!value) return '—'
  return String(value)
}

export function filterUpdates(updates = [], filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase()
  return updates.filter((update) => {
    if (search && !String(update.packageName || '').toLowerCase().includes(search)) return false
    if (filters.ecosystem && update.ecosystem !== filters.ecosystem) return false
    if (filters.repositoryId && String(update.repositoryId?._id || update.repositoryId) !== String(filters.repositoryId)) return false
    if (filters.updateType && update.updateType !== filters.updateType) return false
    if (filters.securityStatus && update.securityStatus !== filters.securityStatus) return false
    return true
  })
}

const sortAccessors = {
  name: (item) => String(item.packageName || '').toLowerCase(),
  ecosystem: (item) => String(item.ecosystem || '').toLowerCase(),
  status: (item) => String(item.updateStatus || ''),
  security: (item) => String(item.securityStatus || ''),
  checked: (item) => new Date(item.lastCheckedAt || 0).getTime(),
}

export function sortUpdates(updates = [], sortKey = 'checked') {
  const accessor = sortAccessors[sortKey] || sortAccessors.checked
  const direction = ['status', 'security', 'checked'].includes(sortKey) ? -1 : 1
  return [...updates].sort((a, b) => {
    const left = accessor(a)
    const right = accessor(b)
    if (left < right) return -1 * direction
    if (left > right) return 1 * direction
    return 0
  })
}

export function paginate(items = [], page = 1, limit = 20) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.max(1, Number(limit) || 20)
  const start = (safePage - 1) * safeLimit
  return {
    items: items.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      pages: Math.max(1, Math.ceil(items.length / safeLimit)),
    },
  }
}
