import Repository from '../models/Repository.js'
import { asyncHandler } from '../utils/errors.js'
import { optionalObjectId, requireObjectId } from '../utils/sanitize.js'
import {
  createMemory,
  deleteMemory,
  expireStaleMemories,
  getMemory,
  getMemoryServiceStatus,
  listRepositoryMemory,
  rebuildRepositoryMemory,
  retrieveMemoryContext,
  updateMemory,
} from '../services/memory/memoryService.js'
import { getMementoStatus } from '../services/memory/mementoAdapter.js'
import {
  getDecisionOptions,
  listRepositoryDecisions,
  recordDecision,
} from '../services/feedback/feedbackService.js'
import {
  compareCurrentAnalysis,
  getDependencyComparison,
  listDependencyHistory,
  listRepositoryComparisons,
} from '../services/history/historicalComparisonService.js'
import {
  deleteReport,
  exportReport,
  generateReport,
  getReport,
  getReportOptions,
  listReports,
} from '../services/reports/reportService.js'
import {
  createNotification,
  deleteNotification,
  getNotificationPreferences,
  getRecentNotifications,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  updateNotificationPreferences,
} from '../services/notifications/notificationService.js'

function pageFrom(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))
  return { page, limit }
}

async function assertOwnedRepository(userId, repositoryId) {
  const exists = await Repository.exists({ _id: repositoryId, userId })
  if (!exists) {
    const error = new Error('Repository not found.')
    error.statusCode = 404
    throw error
  }
}

// Memory --------------------------------------------------------------------

export const memoryStatus = asyncHandler(async (req, res) => {
  const [service, memento] = await Promise.all([getMemoryServiceStatus(), getMementoStatus()])
  res.json({ success: true, ...service, memento })
})

export const memoryList = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  await assertOwnedRepository(req.user._id, repositoryId)
  const { page, limit } = pageFrom(req.query, 50)
  const data = await listRepositoryMemory({
    userId: req.user._id,
    repositoryId,
    category: req.query.category,
    status: req.query.status || 'ACTIVE',
    dependencyId: optionalObjectId(req.query.dependencyId, 'dependency id'),
    page,
    limit,
  })
  res.json({ success: true, ...data })
})

export const memoryContext = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  await assertOwnedRepository(req.user._id, repositoryId)
  const data = await retrieveMemoryContext({
    userId: req.user._id,
    repositoryId,
    dependencyId: optionalObjectId(req.query.dependencyId, 'dependency id') || null,
    query: req.query.query || '',
    categories: req.query.categories ? String(req.query.categories).split(',') : null,
    limit: Number(req.query.limit) || undefined,
  })
  res.json({ success: true, ...data })
})

export const memoryDetail = asyncHandler(async (req, res) => {
  const memory = await getMemory({
    userId: req.user._id,
    memoryId: requireObjectId(req.params.memoryId, 'memory id'),
  })
  res.json({ success: true, memory })
})

export const memoryUpdate = asyncHandler(async (req, res) => {
  const memory = await updateMemory({
    userId: req.user._id,
    memoryId: requireObjectId(req.params.memoryId, 'memory id'),
    title: req.body?.title,
    content: req.body?.content,
    verificationStatus: req.body?.verificationStatus,
    actor: req.user._id,
  })
  res.json({ success: true, memory })
})

export const memoryDelete = asyncHandler(async (req, res) => {
  const result = await deleteMemory({
    userId: req.user._id,
    memoryId: requireObjectId(req.params.memoryId, 'memory id'),
    actor: req.user._id,
  })
  res.json({ success: true, ...result })
})

export const memoryRebuild = asyncHandler(async (req, res) => {
  const result = await rebuildRepositoryMemory({
    userId: req.user._id,
    repositoryId: requireObjectId(req.params.repositoryId, 'repository id'),
    actor: req.user._id,
  })
  res.json({ success: true, ...result })
})

export const memoryExpire = asyncHandler(async (req, res) => {
  const result = await expireStaleMemories()
  res.json({ success: true, ...result })
})

export const memoryCreate = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  await assertOwnedRepository(req.user._id, repositoryId)
  const result = await createMemory({
    ...req.body,
    userId: req.user._id,
    repositoryId,
    updatedBy: req.user._id,
  }, { actor: String(req.user._id) })
  res.status(result.created ? 201 : 200).json({ success: true, ...result })
})

// Feedback ------------------------------------------------------------------

export const decisionOptions = asyncHandler(async (req, res) => {
  res.json({ success: true, decisions: getDecisionOptions() })
})

export const decisionList = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  await assertOwnedRepository(req.user._id, repositoryId)
  const { page, limit } = pageFrom(req.query, 50)
  const data = await listRepositoryDecisions({ userId: req.user._id, repositoryId, page, limit })
  res.json({ success: true, ...data })
})

export const decisionRecord = asyncHandler(async (req, res) => {
  const result = await recordDecision({
    userId: req.user._id,
    analysisId: requireObjectId(req.params.analysisId, 'analysis id'),
    decision: req.body?.decision,
    explanation: req.body?.explanation || '',
    notes: req.body?.notes || '',
  })
  res.status(201).json({ success: true, ...result })
})

// Historical intelligence ---------------------------------------------------

export const historyComparisons = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  await assertOwnedRepository(req.user._id, repositoryId)
  const { page, limit } = pageFrom(req.query, 50)
  const data = await listRepositoryComparisons({ userId: req.user._id, repositoryId, page, limit })
  res.json({ success: true, ...data })
})

export const historyDependency = asyncHandler(async (req, res) => {
  const { page, limit } = pageFrom(req.query, 50)
  const data = await listDependencyHistory({
    userId: req.user._id,
    dependencyId: requireObjectId(req.params.dependencyId, 'dependency id'),
    page,
    limit,
  })
  res.json({ success: true, ...data })
})

export const historyComparisonDetail = asyncHandler(async (req, res) => {
  const comparison = await getDependencyComparison({
    userId: req.user._id,
    dependencyId: requireObjectId(req.params.dependencyId, 'dependency id'),
    currentAnalysisId: optionalObjectId(req.query.analysisId, 'analysis id') || null,
  })
  res.json({ success: true, comparison })
})

export const historyCompare = asyncHandler(async (req, res) => {
  const result = await compareCurrentAnalysis({
    userId: req.user._id,
    analysisId: requireObjectId(req.params.analysisId, 'analysis id'),
  })
  res.json({ success: true, ...result })
})

// Reports -------------------------------------------------------------------

export const reportOptions = asyncHandler(async (req, res) => {
  res.json({ success: true, ...getReportOptions() })
})

export const reportGenerate = asyncHandler(async (req, res) => {
  const report = await generateReport({
    userId: req.user._id,
    repositoryId: optionalObjectId(req.body?.repositoryId, 'repository id') || null,
    reportType: req.body?.reportType,
    title: req.body?.title,
    actor: req.user._id,
  })
  res.status(201).json({ success: true, report })
})

export const reportList = asyncHandler(async (req, res) => {
  const { page, limit } = pageFrom(req.query, 20)
  const data = await listReports({
    userId: req.user._id,
    repositoryId: optionalObjectId(req.query.repositoryId, 'repository id'),
    reportType: req.query.reportType,
    page,
    limit,
  })
  res.json({ success: true, ...data })
})

export const reportDetail = asyncHandler(async (req, res) => {
  const report = await getReport({
    userId: req.user._id,
    reportId: requireObjectId(req.params.reportId, 'report id'),
  })
  res.json({ success: true, report })
})

export const reportExport = asyncHandler(async (req, res) => {
  const result = await exportReport({
    userId: req.user._id,
    reportId: requireObjectId(req.params.reportId, 'report id'),
    format: String(req.query.format || 'JSON').toUpperCase(),
  })
  res.setHeader('Content-Type', result.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.setHeader('Cache-Control', 'no-store')
  res.send(result.body)
})

export const reportDelete = asyncHandler(async (req, res) => {
  const result = await deleteReport({
    userId: req.user._id,
    reportId: requireObjectId(req.params.reportId, 'report id'),
  })
  res.json({ success: true, ...result })
})

// Notifications -------------------------------------------------------------

export const notificationList = asyncHandler(async (req, res) => {
  const { page, limit } = pageFrom(req.query, 20)
  const data = await listNotifications({
    userId: req.user._id,
    repositoryId: optionalObjectId(req.query.repositoryId, 'repository id'),
    unreadOnly: req.query.unreadOnly === 'true' || req.query.unreadOnly === '1',
    page,
    limit,
  })
  res.json({ success: true, ...data })
})

export const notificationRecent = asyncHandler(async (req, res) => {
  const items = await getRecentNotifications({ userId: req.user._id, limit: Number(req.query.limit) || 5 })
  res.json({ success: true, notifications: items })
})

export const notificationUnreadCount = asyncHandler(async (req, res) => {
  const count = await getUnreadNotificationCount({
    userId: req.user._id,
    repositoryId: optionalObjectId(req.query.repositoryId, 'repository id'),
  })
  res.json({ success: true, count })
})

export const notificationPreferences = asyncHandler(async (req, res) => {
  const preferences = await getNotificationPreferences(req.user._id)
  res.json({ success: true, preferences })
})

export const notificationPreferencesUpdate = asyncHandler(async (req, res) => {
  const preferences = await updateNotificationPreferences(req.user._id, req.body || {})
  res.json({ success: true, preferences })
})

export const notificationRead = asyncHandler(async (req, res) => {
  const result = await markNotificationsRead({
    userId: req.user._id,
    notificationIds: Array.isArray(req.body?.notificationIds) ? req.body.notificationIds : [],
  })
  res.json({ success: true, ...result })
})

export const notificationReadAll = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsRead({
    userId: req.user._id,
    repositoryId: optionalObjectId(req.body?.repositoryId, 'repository id'),
  })
  res.json({ success: true, ...result })
})

export const notificationDetailRead = asyncHandler(async (req, res) => {
  const result = await markNotificationsRead({
    userId: req.user._id,
    notificationIds: [requireObjectId(req.params.notificationId, 'notification id')],
  })
  res.json({ success: true, ...result })
})

export const notificationDelete = asyncHandler(async (req, res) => {
  const result = await deleteNotification({
    userId: req.user._id,
    notificationId: requireObjectId(req.params.notificationId, 'notification id'),
  })
  res.json({ success: true, ...result })
})

// Exported for event hooks that intentionally operate without a request.
export const createSystemNotification = createNotification
