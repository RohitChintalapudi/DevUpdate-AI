import AIAnalysis from '../../models/AIAnalysis.js'
import DependencyDecision from '../../models/DependencyDecision.js'
import HistoricalComparison from '../../models/HistoricalComparison.js'
import Repository from '../../models/Repository.js'
import UpdateHistory from '../../models/UpdateHistory.js'
import { AppError } from '../../utils/errors.js'
import { truncate } from '../../utils/aiText.js'

function identity(item) {
  return String(item?.id || item?.title || item?.action || '')
}

function difference(before = [], after = [], key = identity) {
  const previous = new Map(before.map((item) => [key(item), item]))
  const current = new Map(after.map((item) => [key(item), item]))
  const added = [...current.entries()].filter(([id]) => !previous.has(id)).map(([, item]) => item)
  const removed = [...previous.entries()].filter(([id]) => !current.has(id)).map(([, item]) => item)
  const changed = [...current.entries()]
    .filter(([id, item]) => previous.has(id) && JSON.stringify(previous.get(id)) !== JSON.stringify(item))
    .map(([, item]) => item)
  return { added, removed, changed }
}

function findings(before = [], after = []) {
  const result = difference(before, after)
  return {
    newFindings: result.added.map((item) => ({ id: identity(item), title: item.title || '', description: truncate(item.description || '', 800) })),
    resolvedFindings: result.removed.map((item) => ({ id: identity(item), title: item.title || '', description: truncate(item.description || '', 800) })),
    changedFindings: result.changed.map((item) => ({ id: identity(item), title: item.title || '' })),
  }
}

function advisories(analysis) {
  return analysis?.securitySnapshot?.advisories || []
}

function advisoryDifference(previous, current) {
  const before = advisories(previous)
  const after = advisories(current)
  const beforeIds = new Set(before.map((item) => String(item.id)))
  const afterIds = new Set(after.map((item) => String(item.id)))
  return {
    newSecurityFindings: after.filter((item) => !beforeIds.has(String(item.id))).slice(0, 30),
    resolvedSecurityFindings: before.filter((item) => !afterIds.has(String(item.id))).slice(0, 30),
    previousStatus: previous?.securitySnapshot?.status || 'UNKNOWN',
    currentStatus: current?.securitySnapshot?.status || 'UNKNOWN',
    evidenceLimited: !before.length && !after.length,
  }
}

function migrationDifference(previous, current) {
  const result = difference(previous?.migrationPlan || [], current?.migrationPlan || [], (item) =>
    String(item?.id || `${item?.order || ''}:${item?.action || ''}`),
  )
  return {
    newMigrationSteps: result.added.slice(0, 20),
    removedMigrationSteps: result.removed.slice(0, 20),
    changedMigrationSteps: result.changed.slice(0, 20),
  }
}

export function buildComparison({ previous, current, decisions = [], repository = null }) {
  const version = {
    previousInstalledVersion: previous?.installedVersion || '',
    currentInstalledVersion: current?.installedVersion || '',
    previousTargetVersion: previous?.targetVersion || '',
    currentTargetVersion: current?.targetVersion || '',
    targetVersionChanged: String(previous?.targetVersion || '') !== String(current?.targetVersion || ''),
    installedVersionChanged: String(previous?.installedVersion || '') !== String(current?.installedVersion || ''),
  }

  const breaking = findings(previous?.breakingChanges || [], current?.breakingChanges || [])
  const compatibility = findings(previous?.compatibilityFindings || [], current?.compatibilityFindings || [])
  const impact = findings(previous?.projectImpact || [], current?.projectImpact || [])

  return {
    previousAnalysisDate: previous?.createdAt || null,
    currentAnalysisDate: current?.createdAt || new Date(),
    version,
    newReleaseInformation: version.targetVersionChanged
      ? {
          from: version.previousTargetVersion,
          to: version.currentTargetVersion,
          source: 'AI analysis target versions from Phase 3 registry data',
        }
      : null,
    breakingChanges: breaking,
    compatibilityFindings: compatibility,
    projectImpact: impact,
    security: advisoryDifference(previous, current),
    risk: {
      previous: previous?.riskLevel || 'UNKNOWN',
      current: current?.riskLevel || 'UNKNOWN',
      changed: String(previous?.riskLevel || '') !== String(current?.riskLevel || ''),
    },
    recommendation: {
      previous: previous?.recommendation || 'INSUFFICIENT_EVIDENCE',
      current: current?.recommendation || 'INSUFFICIENT_EVIDENCE',
      changed: String(previous?.recommendation || '') !== String(current?.recommendation || ''),
      previousReason: previous?.recommendationReason || '',
      currentReason: current?.recommendationReason || '',
    },
    migration: migrationDifference(previous, current),
    developerDecisions: decisions.map((item) => ({
      id: String(item._id),
      decision: item.decision,
      explanation: item.explanation || '',
      notes: item.notes || '',
      createdAt: item.createdAt,
    })),
    repositoryChangedSincePreviousAnalysis: Boolean(
      previous?.createdAt && repository?.updatedAt && new Date(repository.updatedAt) > new Date(previous.createdAt),
    ),
    previousAnalysisAvailable: Boolean(previous),
    summary: previous
      ? `Compared ${current?.packageName || 'dependency'} from analysis ${String(previous._id).slice(-6)} to ${String(current?._id).slice(-6)}.`
      : `No earlier completed analysis was available for ${current?.packageName || 'this dependency'}; current findings are not a historical trend.`,
  }
}

async function findPreviousAnalysis({ userId, repositoryId, dependencyId, current }) {
  const query = {
    userId,
    repositoryId,
    dependencyId,
    _id: { $ne: current._id },
    analysisStatus: { $in: ['COMPLETED', 'INSUFFICIENT_EVIDENCE'] },
    createdAt: { $lt: current.createdAt || new Date() },
  }
  return AIAnalysis.findOne(query).sort({ createdAt: -1 }).lean()
}

export async function compareCurrentAnalysis({ userId, analysisId }) {
  const current = await AIAnalysis.findOne({ _id: analysisId, userId }).lean()
  if (!current) throw new AppError('AI analysis not found.', 404)

  const [previous, decisions, repository] = await Promise.all([
    findPreviousAnalysis({ userId, repositoryId: current.repositoryId, dependencyId: current.dependencyId, current }),
    DependencyDecision.find({
      userId,
      repositoryId: current.repositoryId,
      dependencyId: current.dependencyId,
      createdAt: { $gte: previous?.createdAt || new Date(0) },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    Repository.findOne({ _id: current.repositoryId, userId }).select('updatedAt').lean(),
  ])

  const changes = buildComparison({ previous, current, decisions, repository })
  const record = await HistoricalComparison.findOneAndUpdate(
    { userId, currentAnalysisId: current._id },
    {
      $set: {
        repositoryId: current.repositoryId,
        dependencyId: current.dependencyId,
        previousAnalysisId: previous?._id || null,
        previousAnalysisDate: changes.previousAnalysisDate,
        currentAnalysisDate: changes.currentAnalysisDate || current.createdAt,
        changes,
        summary: changes.summary,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  return { comparison: record, previousAnalysisId: previous?._id || null }
}

export async function listRepositoryComparisons({ userId, repositoryId, page = 1, limit = 50 }) {
  const size = Math.min(100, Math.max(1, Number(limit) || 50))
  const current = Math.max(1, Number(page) || 1)
  const query = { userId, repositoryId }
  const [items, total] = await Promise.all([
    HistoricalComparison.find(query).sort({ createdAt: -1 }).skip((current - 1) * size).limit(size).lean(),
    HistoricalComparison.countDocuments(query),
  ])
  return { items, total, page: current, limit: size, pages: Math.ceil(total / size) }
}

export async function listDependencyHistory({ userId, dependencyId, page = 1, limit = 50 }) {
  const size = Math.min(100, Math.max(1, Number(limit) || 50))
  const current = Math.max(1, Number(page) || 1)
  const [updates, comparisons, analyses, decisions] = await Promise.all([
    UpdateHistory.find({ userId, dependencyId }).sort({ checkedAt: -1 }).skip((current - 1) * size).limit(size).lean(),
    HistoricalComparison.find({ userId, dependencyId }).sort({ createdAt: -1 }).limit(size).lean(),
    AIAnalysis.find({ userId, dependencyId }).sort({ createdAt: -1 }).limit(size).lean(),
    DependencyDecision.find({ userId, dependencyId }).sort({ createdAt: -1 }).limit(size).lean(),
  ])
  return { updates, comparisons, analyses, decisions }
}

export async function getDependencyComparison({ userId, dependencyId, currentAnalysisId = null }) {
  const query = { userId, dependencyId }
  if (currentAnalysisId) query.currentAnalysisId = currentAnalysisId
  const comparison = await HistoricalComparison.findOne(query).sort({ createdAt: -1 }).lean()
  if (!comparison) throw new AppError('No historical comparison is available for this dependency.', 404)
  return comparison
}
