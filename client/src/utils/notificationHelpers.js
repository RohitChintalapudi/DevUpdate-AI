const DAY_MS = 24 * 60 * 60 * 1000

const SECURITY_TYPES = new Set(['SECURITY_VULNERABILITY', 'VULNERABILITY_FIXED'])
const UPDATE_TYPES = new Set(['MAJOR_UPDATE', 'DEPRECATED_PACKAGE'])
const AI_TYPES = new Set([
  'AI_ANALYSIS_COMPLETED',
  'AI_ANALYSIS_FAILED',
  'RECOMMENDATION_CHANGED',
])

export const NOTIFICATION_CATEGORIES = [
  { id: 'all', label: 'All activity' },
  { id: 'unread', label: 'Unread' },
  { id: 'security', label: 'Security' },
  { id: 'updates', label: 'Updates' },
  { id: 'ai', label: 'AI insights' },
  { id: 'system', label: 'System' },
]

export function categoryForType(type) {
  if (SECURITY_TYPES.has(type)) return 'security'
  if (UPDATE_TYPES.has(type)) return 'updates'
  if (AI_TYPES.has(type)) return 'ai'
  return 'system'
}

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return '—'
  const date = new Date(value)
  const timestamp = date.getTime()
  if (Number.isNaN(timestamp)) return '—'

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 45) return 'just now'
  if (seconds < 90) return '1 min ago'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < DAY_MS / 1000) {
    const hours = Math.round(seconds / 3600)
    return `${hours} hr${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(seconds / (DAY_MS / 1000))
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}),
  })
}

function dayKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDayLabel(value, now = Date.now()) {
  const key = dayKey(value)
  if (key === 'unknown') return 'Earlier'
  if (key === dayKey(now)) return 'Today'
  if (key === dayKey(now - DAY_MS)) return 'Yesterday'

  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(new Date(value).getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}),
  })
}

export function groupNotificationsByDay(items = [], now = Date.now()) {
  const groups = []
  for (const item of items) {
    const key = dayKey(item.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.items.push(item)
    } else {
      groups.push({ key, label: formatDayLabel(item.createdAt, now), items: [item] })
    }
  }
  return groups
}

export function getNotificationDestination(item) {
  if (!item) return { path: '/dashboard/notifications', label: 'Open inbox' }
  if (item.analysisId) {
    return { path: `/dashboard/ai/analysis/${item.analysisId}`, label: 'View analysis' }
  }
  if (item.dependencyId) {
    return { path: `/dashboard/updates/${item.dependencyId}`, label: 'View update' }
  }
  if (SECURITY_TYPES.has(item.type)) {
    return { path: '/dashboard/vulnerabilities', label: 'View advisories' }
  }
  if (AI_TYPES.has(item.type)) {
    return { path: '/dashboard/recommendations', label: 'View recommendations' }
  }
  if (item.repositoryId) {
    return { path: `/dashboard/repositories/${item.repositoryId}`, label: 'View repository' }
  }
  return { path: '/dashboard/notifications', label: 'Open inbox' }
}

export function getNotificationSearchText(item, repositoryName = '') {
  return [item?.title, item?.message, item?.type, item?.data?.packageName, repositoryName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function matchesNotificationFilters(item, filters = {}, repositoryName = '') {
  const search = String(filters.search || '').trim().toLowerCase()
  if (search && !getNotificationSearchText(item, repositoryName).includes(search)) return false
  if (filters.unreadOnly && item.readAt) return false
  if (filters.repositoryId && String(item.repositoryId || '') !== String(filters.repositoryId)) return false
  if (filters.category && filters.category !== 'all') {
    if (filters.category === 'unread') {
      if (item.readAt) return false
    } else if (categoryForType(item.type) !== filters.category) {
      return false
    }
  }
  return true
}
