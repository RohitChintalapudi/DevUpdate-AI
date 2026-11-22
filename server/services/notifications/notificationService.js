import Notification from '../../models/Notification.js'
import NotificationPreference from '../../models/NotificationPreference.js'
import { NOTIFICATION_TYPES, PHASE5_LIMITS } from '../../constants/phase5Constants.js'
import { sanitizeError, sanitizeText } from '../../utils/sanitize.js'

function preferenceToObject(preference) {
  if (!preference) return null
  const rawTypes = preference.types instanceof Map
    ? Object.fromEntries(preference.types.entries())
    : (preference.types || {})
  return {
    inApp: preference.inApp !== false,
    email: Boolean(preference.email),
    types: Object.fromEntries(
      NOTIFICATION_TYPES.map((type) => [type, rawTypes[type] !== false]),
    ),
    mutedRepositories: (preference.mutedRepositories || []).map(String),
  }
}

function sanitizeData(data = {}) {
  return Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [
      sanitizeText(key, 80),
      typeof value === 'string' ? sanitizeText(value, 1000) : value,
    ]),
  )
}

export async function getNotificationPreferences(userId) {
  let preference = await NotificationPreference.findOne({ userId }).lean()
  if (!preference) {
    preference = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean()
  }
  return preferenceToObject(preference)
}

export async function updateNotificationPreferences(userId, input = {}) {
  const set = {}
  if (typeof input.inApp === 'boolean') set.inApp = input.inApp
  if (typeof input.email === 'boolean') set.email = input.email

  if (input.types && typeof input.types === 'object') {
    const types = {}
    for (const type of NOTIFICATION_TYPES) {
      if (typeof input.types[type] === 'boolean') types[type] = input.types[type]
    }
    if (Object.keys(types).length) set.types = types
  }

  if (Array.isArray(input.mutedRepositories)) {
    set.mutedRepositories = input.mutedRepositories
      .filter((value) => typeof value === 'string' && value.length <= 200)
      .slice(0, 200)
  }

  const preference = await NotificationPreference.findOneAndUpdate(
    { userId },
    { $set: set, $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()
  return preferenceToObject(preference)
}

function isAllowed(preference, { type, repositoryId }) {
  if (!preference || preference.inApp === false) return false
  if (preference.types?.[type] === false) return false
  if (repositoryId && preference.mutedRepositories?.includes(String(repositoryId))) return false
  return true
}

/**
 * Creates an in-app notification. All callers supply real, scoped events; there
 * is no mock or sample notification path. Duplicate events collapse by key.
 */
export async function createNotification(input = {}, options = {}) {
  const userId = input.userId
  const repositoryId = input.repositoryId || null
  const type = input.type
  const title = sanitizeText(input.title, 240)
  const message = sanitizeText(input.message, 1600)
  const deduplicationKey = sanitizeText(input.deduplicationKey, 500)

  if (!userId || !NOTIFICATION_TYPES.includes(type) || !title || !message || !deduplicationKey) return null

  const preference = options.preference || await getNotificationPreferences(userId)
  if (!isAllowed(preference, { type, repositoryId })) return null

  const result = await Notification.updateOne(
    { userId, deduplicationKey },
    {
      $setOnInsert: {
        userId,
        repositoryId,
        dependencyId: input.dependencyId || null,
        analysisId: input.analysisId || null,
        type,
        title,
        message,
        data: sanitizeData(input.data),
        deduplicationKey,
        readAt: null,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  )

  return { created: Boolean(result.upsertedCount), deduplicationKey }
}

export async function listNotifications({
  userId,
  repositoryId,
  unreadOnly = false,
  page = 1,
  limit = 20,
} = {}) {
  const query = { userId }
  if (repositoryId) query.repositoryId = repositoryId
  if (unreadOnly) query.readAt = null
  const size = Math.min(PHASE5_LIMITS.maxNotificationsPerPage, Math.max(1, Number(limit) || 20))
  const current = Math.max(1, Number(page) || 1)
  const [items, total, unread] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip((current - 1) * size).limit(size).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, readAt: null }),
  ])
  return {
    items,
    total,
    unread,
    page: current,
    limit: size,
    pages: Math.ceil(total / size),
  }
}

export async function getUnreadNotificationCount({ userId, repositoryId } = {}) {
  const query = { userId, readAt: null }
  if (repositoryId) query.repositoryId = repositoryId
  return Notification.countDocuments(query)
}

export async function getRecentNotifications({ userId, limit = 5 } = {}) {
  return Notification.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(20, Math.max(1, Number(limit) || 5))).lean()
}

export async function markNotificationsRead({ userId, notificationIds = [] }) {
  const ids = notificationIds.filter(Boolean).slice(0, 200)
  if (!ids.length) return { modified: 0 }
  const result = await Notification.updateMany(
    { userId, _id: { $in: ids }, readAt: null },
    { $set: { readAt: new Date() } },
  )
  return { modified: result.modifiedCount || 0 }
}

export async function markAllNotificationsRead({ userId, repositoryId } = {}) {
  const query = { userId, readAt: null }
  if (repositoryId) query.repositoryId = repositoryId
  const result = await Notification.updateMany(query, { $set: { readAt: new Date() } })
  return { modified: result.modifiedCount || 0 }
}

export async function deleteNotification({ userId, notificationId }) {
  const result = await Notification.deleteOne({ userId, _id: notificationId })
  if (!result.deletedCount) return { deleted: false }
  return { deleted: true }
}

export async function deleteRepositoryNotifications({ userId, repositoryId }) {
  const result = await Notification.deleteMany({ userId, repositoryId })
  await NotificationPreference.updateMany(
    { userId, mutedRepositories: repositoryId },
    { $pull: { mutedRepositories: repositoryId } },
  )
  return { deleted: result.deletedCount || 0 }
}

export function advisorySummary(advisories = []) {
  return advisories
    .slice(0, 5)
    .map((advisory) => `${advisory.id}${advisory.severity && advisory.severity !== 'UNKNOWN' ? ` (${advisory.severity})` : ''}`)
    .join(', ')
}

/** Pure mapping from real Phase 3 change records to deduplicated notification inputs. */
export function buildUpdateNotificationInputs({
  userId,
  repositoryId,
  dependencyId,
  packageName = '',
  previous = null,
  current = {},
  changes = [],
}) {
  if (!userId || !dependencyId || !changes.length) return []
  if (changes.includes('First update intelligence snapshot')) return []

  const base = { userId, repositoryId, dependencyId, packageName }
  const inputs = []
  const currentStatus = current.securityStatus || 'UNKNOWN'

  if (
    changes.includes('vulnerabilities') &&
    currentStatus === 'VULNERABLE'
  ) {
    const advisories = current.vulnerabilities || []
    const ids = advisories.map((item) => String(item.id)).filter(Boolean)
    inputs.push({
      ...base,
      type: 'SECURITY_VULNERABILITY',
      title: `Security advisory update: ${packageName}`,
      message: `Phase 3 advisory data reports vulnerabilities for ${packageName}${advisorySummary(advisories) ? `: ${advisorySummary(advisories)}` : '.'}`,
      data: { advisoryIds: ids, securityStatus: currentStatus },
      deduplicationKey: `security:${userId}:${dependencyId}:${ids.join(',') || currentStatus}`,
    })
  }

  if (
    changes.includes('securityStatus') &&
    previous?.securityStatus === 'VULNERABLE' &&
    currentStatus === 'NO_KNOWN_VULNERABILITY'
  ) {
    inputs.push({
      ...base,
      type: 'VULNERABILITY_FIXED',
      title: `Advisories resolved for ${packageName}`,
      message: `A fresh Phase 3 advisory check no longer reports vulnerabilities for the installed version of ${packageName}.`,
      data: { previousStatus: previous.securityStatus, currentStatus },
      deduplicationKey: `security-fixed:${userId}:${dependencyId}:${current.installedVersion || ''}`,
    })
  }

  if (changes.includes('deprecated') && current.deprecated === true) {
    inputs.push({
      ...base,
      type: 'DEPRECATED_PACKAGE',
      title: `Package deprecated: ${packageName}`,
      message: `Registry metadata now marks ${packageName} as deprecated.`,
      data: { latestVersion: current.latestStableVersion || current.latestVersion || '' },
      deduplicationKey: `deprecated:${userId}:${dependencyId}:${packageName}`,
    })
  }

  if (
    changes.includes('updateType') &&
    current.updateType === 'MAJOR' &&
    (current.latestStableVersion || current.latestVersion)
  ) {
    const target = current.latestStableVersion || current.latestVersion
    inputs.push({
      ...base,
      type: 'MAJOR_UPDATE',
      title: `Major release available: ${packageName}`,
      message: `A major release of ${packageName} is available (${current.installedVersion || 'installed version unknown'} → ${target}).`,
      data: { installedVersion: current.installedVersion || '', targetVersion: target },
      deduplicationKey: `major:${userId}:${dependencyId}:${target}`,
    })
  }

  return inputs
}

/** Maps real Phase 3 change records into explicit, deduplicated notifications. */
export async function notifyUpdateChanges(input) {
  const inputs = buildUpdateNotificationInputs(input)
  if (!inputs.length) return []
  const preference = await getNotificationPreferences(input.userId)
  const created = []
  for (const notification of inputs) {
    created.push(await createNotification(notification, { preference }))
  }
  return created.filter(Boolean)
}

export async function notifyAiAnalysisCompleted({
  userId,
  repositoryId,
  analysisId,
  packageName = '',
  recommendation = 'INSUFFICIENT_EVIDENCE',
  riskLevel = 'UNKNOWN',
  status = 'COMPLETED',
}) {
  return createNotification({
    userId,
    repositoryId,
    analysisId,
    type: 'AI_ANALYSIS_COMPLETED',
    title: `AI analysis finished for ${packageName || 'a dependency'}`,
    message: `Result: ${recommendation}. Risk: ${riskLevel}. ${status === 'INSUFFICIENT_EVIDENCE' ? 'Evidence was insufficient for a final upgrade recommendation.' : 'Review the evidence-backed recommendation.'}`,
    data: { analysisId: String(analysisId || ''), recommendation, riskLevel, status },
    deduplicationKey: `ai-complete:${userId}:${analysisId}:${status}`,
  })
}

export async function notifyAiAnalysisFailed({ userId, repositoryId, analysisId, packageName = '', error = '' }) {
  return createNotification({
    userId,
    repositoryId,
    analysisId,
    type: 'AI_ANALYSIS_FAILED',
    title: `AI analysis failed for ${packageName || 'a dependency'}`,
    message: `The background analysis did not finish. ${sanitizeText(error, 400)}`.trim(),
    data: { analysisId: String(analysisId || ''), error: sanitizeError(error) },
    deduplicationKey: `ai-failed:${userId}:${analysisId || repositoryId || 'unknown'}`,
  })
}

export async function notifyScanFailed({ userId, repositoryId, repositoryName = '', error = '' }) {
  return createNotification({
    userId,
    repositoryId,
    type: 'SCAN_FAILED',
    title: `Repository scan failed${repositoryName ? `: ${repositoryName}` : ''}`,
    message: `The GitHub scan could not complete. ${sanitizeText(error, 400)}`.trim(),
    data: { repositoryName: sanitizeText(repositoryName, 300), error: sanitizeError(error) },
    deduplicationKey: `scan-failed:${userId}:${repositoryId}:${new Date().toISOString().slice(0, 13)}`,
  })
}

export async function notifyRecommendationChanged({
  userId,
  repositoryId,
  analysisId,
  packageName = '',
  previous = '',
  current = '',
}) {
  if (!previous || !current || previous === current) return null
  return createNotification({
    userId,
    repositoryId,
    analysisId,
    type: 'RECOMMENDATION_CHANGED',
    title: `Recommendation changed for ${packageName || 'a dependency'}`,
    message: `Previous recommendation: ${previous}. Current recommendation: ${current}.`,
    data: { analysisId: String(analysisId || ''), previous, current },
    deduplicationKey: `recommendation-changed:${userId}:${analysisId}:${previous}:${current}`,
  })
}
