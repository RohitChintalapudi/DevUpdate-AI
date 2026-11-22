const SNAPSHOT_FIELDS = [
  'updateStatus',
  'updateType',
  'rangeStatus',
  'securityStatus',
  'latestVersion',
  'latestStableVersion',
  'deprecated',
  'abandoned',
  'yanked',
]

function normalizeValue(value) {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeValue).join('|')
  if (value && typeof value === 'object') {
    return String(value._id || value.id || JSON.stringify(value))
  }
  return value == null ? '' : String(value)
}

export function snapshotFrom(record = {}) {
  return {
    updateStatus: record.updateStatus || '',
    updateType: record.updateType || '',
    rangeStatus: record.rangeStatus || '',
    securityStatus: record.securityStatus || '',
    latestVersion: record.latestVersion || '',
    latestStableVersion: record.latestStableVersion || '',
    deprecated: Boolean(record.deprecated),
    abandoned: Boolean(record.abandoned),
    yanked: Boolean(record.yanked),
    advisoryIds: (record.vulnerabilities || []).map((vuln) => normalizeValue(vuln.id)).filter(Boolean),
  }
}

export function detectChanges(existing, next) {
  if (!existing) return ['First update intelligence snapshot']

  const previous = snapshotFrom(existing)
  const current = snapshotFrom(next)
  const changes = []

  for (const field of SNAPSHOT_FIELDS) {
    if (normalizeValue(previous[field]) !== normalizeValue(current[field])) changes.push(field)
  }
  if (previous.advisoryIds.join('|') !== current.advisoryIds.join('|')) changes.push('vulnerabilities')

  return changes
}
