import Dependency from '../models/Dependency.js'
import DependencyUpdate from '../models/DependencyUpdate.js'
import DependencyResearch from '../models/DependencyResearch.js'
import AIAnalysis from '../models/AIAnalysis.js'
import Repository from '../models/Repository.js'
import UpdateHistory from '../models/UpdateHistory.js'
import UpdateJob from '../models/UpdateJob.js'
import { normalizeEcosystem } from '../constants/updateEcosystems.js'
import { asyncHandler } from '../utils/errors.js'
import { isValidObjectId, requireObjectId, sanitizeText } from '../utils/sanitize.js'
import { checkDependencyNow } from '../services/updateIntelligence/updateEngine/repositoryAnalyzer.js'
import {
  queueAllUpdates,
  queueRepositoryUpdate,
} from '../services/updateIntelligence/updateEngine/updateScheduler.js'
import {
  getRepositoryResearchStatus,
  interpretResearchWithAI,
  queueRepositoryResearch,
  researchSingleDependency,
} from '../services/updateIntelligence/research/dependencyResearchService.js'

function pagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sortValue(query, allowed, fallback) {
  const value = typeof query.sort === 'string' ? query.sort : fallback
  return allowed[value] ? allowed[value] : fallback
}

function countField(field, value) {
  return { $sum: { $cond: [{ $eq: [`$${field}`, value] }, 1, 0] } }
}

async function repositorySummaries(userId, query = {}) {
  const [stats, repositories, depStats, researchStats] = await Promise.all([
    DependencyUpdate.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$repositoryId',
          total: { $sum: 1 },
          outdated: countField('updateStatus', 'OUTDATED'),
          updateAvailable: countField('updateStatus', 'UPDATE_AVAILABLE'),
          majorUpdates: countField('updateType', 'MAJOR'),
          minorUpdates: countField('updateType', 'MINOR'),
          patchUpdates: countField('updateType', 'PATCH'),
          vulnerable: countField('securityStatus', 'VULNERABLE'),
          deprecated: { $sum: { $cond: [{ $eq: ['$deprecated', true] }, 1, 0] } },
          researchCompleted: { $sum: { $cond: [{ $eq: ['$researchStatus', 'COMPLETED'] }, 1, 0] } },
          researchPending: { $sum: { $cond: [{ $in: ['$researchStatus', ['QUEUED', 'RESEARCHING']] }, 1, 0] } },
          researchFailed: { $sum: { $cond: [{ $eq: ['$researchStatus', 'FAILED'] }, 1, 0] } },
          lastCheckedAt: { $max: '$lastCheckedAt' },
        },
      },
    ]),
    Repository.find({ userId })
      .select('fullName name owner htmlUrl language visibility updateCheckStatus lastUpdateCheckAt lastScannedAt')
      .lean(),
    Dependency.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$repositoryId',
          totalDeps: { $sum: 1 },
          coreDeps: { $sum: { $cond: [{ $eq: ['$isDevelopmentDependency', false] }, 1, 0] } },
        },
      },
    ]),
    DependencyResearch.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$repositoryId',
          researchedCount: { $sum: 1 },
          lastResearchedAt: { $max: '$researchedAt' },
        },
      },
    ]),
  ])

  const statsById = new Map(stats.map((item) => [String(item._id), item]))
  const depStatsById = new Map(depStats.map((item) => [String(item._id), item]))
  const researchStatsById = new Map(researchStats.map((item) => [String(item._id), item]))
  const search = sanitizeText(query.search, 120).toLowerCase()

  let rows = repositories.map((repository) => {
    const item = statsById.get(String(repository._id)) || {}
    const depItem = depStatsById.get(String(repository._id)) || {}
    const resItem = researchStatsById.get(String(repository._id)) || {}
    const totalDeps = depItem.totalDeps || item.total || 0
    const coreDeps = depItem.coreDeps !== undefined ? depItem.coreDeps : Math.max(0, totalDeps - (item.devDeps || 0))
    const availableUpdates = (item.updateAvailable || 0) + (item.outdated || 0)
    const completedResearch = item.researchCompleted || resItem.researchedCount || 0
    const pendingResearch = item.researchPending || 0
    const failedResearch = item.researchFailed || 0

    let researchStatus = 'NOT_RESEARCHED'
    const liveStatus = getRepositoryResearchStatus(repository._id)
    if (liveStatus?.status === 'RUNNING' || pendingResearch > 0) {
      researchStatus = 'RESEARCHING'
    } else if (completedResearch > 0 && totalDeps > 0 && completedResearch >= totalDeps) {
      researchStatus = 'COMPLETED'
    } else if (completedResearch > 0) {
      researchStatus = 'PARTIAL'
    } else if (failedResearch > 0) {
      researchStatus = 'FAILED'
    }

    return {
      repositoryId: repository._id,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      htmlUrl: repository.htmlUrl,
      language: repository.language,
      visibility: repository.visibility,
      updateCheckStatus: repository.updateCheckStatus,
      lastUpdateCheckAt: repository.lastUpdateCheckAt || item.lastCheckedAt || null,
      lastAnalyzedAt: resItem.lastResearchedAt || repository.lastScannedAt || null,
      totalDependencies: totalDeps,
      coreDependencies: coreDeps,
      availableUpdates,
      vulnerabilityCount: item.vulnerable || 0,
      total: item.total || totalDeps,
      outdated: item.outdated || 0,
      updateAvailable: item.updateAvailable || 0,
      majorUpdates: item.majorUpdates || 0,
      minorUpdates: item.minorUpdates || 0,
      patchUpdates: item.patchUpdates || 0,
      vulnerable: item.vulnerable || 0,
      deprecated: item.deprecated || 0,
      researchStatus,
      researchStats: {
        completed: completedResearch,
        total: totalDeps,
      },
      lastCheckedAt: item.lastCheckedAt || null,
    }
  })

  if (search) {
    rows = rows.filter((row) => row.fullName.toLowerCase().includes(search))
  }

  const sort = sortValue(
    query,
    {
      outdated: 'availableUpdates',
      vulnerable: 'vulnerabilityCount',
      name: 'name',
      checked: 'lastUpdateCheckAt',
    },
    'availableUpdates',
  )
  rows.sort((a, b) => {
    if (sort === 'name') return String(a.name).localeCompare(String(b.name))
    const aValue = a[sort] ? new Date(a[sort]).getTime() || Number(a[sort]) || 0 : 0
    const bValue = b[sort] ? new Date(b[sort]).getTime() || Number(b[sort]) || 0 : 0
    return sort === 'lastUpdateCheckAt' ? bValue - aValue : bValue - aValue
  })

  const { page, limit, skip } = pagination(query, 12, 50)
  return {
    repositories: rows.slice(skip, skip + limit),
    pagination: { page, limit, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / limit)) },
  }
}

async function resolveDependency(userId, dependencyId) {
  requireObjectId(dependencyId, 'dependency id')
  const dependency = await Dependency.findOne({ _id: dependencyId, userId }).lean()
  if (dependency) return dependency

  const update = await DependencyUpdate.findOne({
    _id: dependencyId,
    userId,
  }).select('dependencyId').lean()
  if (update) {
    const linked = await Dependency.findOne({ _id: update.dependencyId, userId }).lean()
    if (linked) return linked
  }
  throw new Error('NOT_FOUND')
}

export const overview = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const [facets, repositoriesAnalyzed, lastChecked, activeJob] = await Promise.all([
    DependencyUpdate.aggregate([
      { $match: { userId } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                upToDate: countField('updateStatus', 'UP_TO_DATE'),
                outdated: countField('updateStatus', 'OUTDATED'),
                updateAvailable: countField('updateStatus', 'UPDATE_AVAILABLE'),
                major: countField('updateType', 'MAJOR'),
                minor: countField('updateType', 'MINOR'),
                patch: countField('updateType', 'PATCH'),
                vulnerable: countField('securityStatus', 'VULNERABLE'),
                deprecated: { $sum: { $cond: [{ $eq: ['$deprecated', true] }, 1, 0] } },
                registryErrors: {
                  $sum: {
                    $cond: [{ $in: ['$updateStatus', ['REGISTRY_ERROR', 'NOT_FOUND']] }, 1, 0],
                  },
                },
              },
            },
          ],
          statuses: [{ $group: { _id: '$updateStatus', count: { $sum: 1 } } }],
          severities: [
            { $match: { securityStatus: 'VULNERABLE' } },
            { $unwind: '$vulnerabilities' },
            { $group: { _id: '$vulnerabilities.severity.level', count: { $sum: 1 } } },
          ],
        },
      },
    ]),
    DependencyUpdate.distinct('repositoryId', { userId }),
    DependencyUpdate.findOne({ userId }).sort({ lastCheckedAt: -1 }).select('lastCheckedAt').lean(),
    UpdateJob.findOne({ userId, status: { $in: ['QUEUED', 'SCANNING'] } })
      .sort({ createdAt: -1 })
      .lean(),
  ])

  const totals = facets[0]?.totals?.[0] || {}
  const [repositorySummary] = await Promise.all([repositorySummaries(userId, { limit: 6, sort: 'outdated' })])
  const recentUpdates = await DependencyUpdate.find({
    userId,
    updateStatus: { $in: ['OUTDATED', 'UPDATE_AVAILABLE', 'SECURITY_RISK'] },
  })
    .sort({ lastCheckedAt: -1 })
    .limit(8)
    .populate('repositoryId', 'name fullName')
    .lean()

  res.json({
    success: true,
    stats: {
      repositoriesAnalyzed: repositoriesAnalyzed.length,
      totalDependencies: totals.total || 0,
      upToDate: totals.upToDate || 0,
      outdated: totals.outdated || 0,
      updateAvailable: totals.updateAvailable || 0,
      majorUpdates: totals.major || 0,
      minorUpdates: totals.minor || 0,
      patchUpdates: totals.patch || 0,
      vulnerableDependencies: totals.vulnerable || 0,
      deprecatedPackages: totals.deprecated || 0,
      registryErrors: totals.registryErrors || 0,
      lastCheckedAt: lastChecked?.lastCheckedAt || null,
    },
    distribution: (facets[0]?.statuses || []).map((item) => ({
      status: item._id,
      count: item.count,
    })),
    severityDistribution: (facets[0]?.severities || []).map((item) => ({
      severity: item._id || 'UNKNOWN',
      count: item.count,
    })),
    repositorySummary: repositorySummary.repositories,
    recentUpdates,
    progress: activeJob
      ? {
          jobId: activeJob._id,
          status: activeJob.status,
          progress: activeJob.progress,
        }
      : null,
  })
})

export const listRepositories = asyncHandler(async (req, res) => {
  const result = await repositorySummaries(req.user._id, req.query)
  res.json({ success: true, ...result })
})

export const listUpdates = asyncHandler(async (req, res) => {
  const match = { userId: req.user._id }
  const search = sanitizeText(req.query.search, 120)
  if (search) match.packageName = { $regex: escapeRegex(search), $options: 'i' }

  const ecosystem = normalizeEcosystem(req.query.ecosystem)
  if (ecosystem) match.ecosystem = { $regex: `^${ecosystem.label}$`, $options: 'i' }
  if (req.query.updateType) match.updateType = sanitizeText(req.query.updateType, 30).toUpperCase()
  if (req.query.updateStatus) match.updateStatus = sanitizeText(req.query.updateStatus, 40).toUpperCase()
  if (req.query.securityStatus) match.securityStatus = sanitizeText(req.query.securityStatus, 40).toUpperCase()

  if (req.query.repositoryId && isValidObjectId(req.query.repositoryId)) {
    const owned = await Repository.findOne({
      _id: req.query.repositoryId,
      userId: req.user._id,
    }).select('_id')
    if (!owned) {
      res.status(404)
      throw new Error('Repository not found.')
    }
    match.repositoryId = owned._id
  }

  const sort = sortValue(
    req.query,
    {
      name: { packageName: 1 },
      ecosystem: { ecosystem: 1, packageName: 1 },
      status: { updateStatus: 1, packageName: 1 },
      type: { updateType: 1, packageName: 1 },
      security: { securityStatus: 1, packageName: 1 },
      checked: { lastCheckedAt: -1 },
    },
    { lastCheckedAt: -1 },
  )
  const { page, limit, skip } = pagination(req.query, 20, 100)
  const [updates, total, repositories] = await Promise.all([
    DependencyUpdate.find(match)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('repositoryId', 'name fullName')
      .lean(),
    DependencyUpdate.countDocuments(match),
    Repository.find({ userId: req.user._id })
      .select('name fullName')
      .sort({ fullName: 1 })
      .lean(),
  ])

  res.json({
    success: true,
    updates,
    repositories,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})

export const repositoryDetails = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const repository = await Repository.findOne({ _id: repositoryId, userId: req.user._id }).lean()
  if (!repository) {
    res.status(404)
    throw new Error('Repository not found.')
  }

  // Ensure baseline DependencyUpdate records exist for all scanned dependencies
  const existingUpdateCount = await DependencyUpdate.countDocuments({ userId: req.user._id, repositoryId })
  const depTotalCount = await Dependency.countDocuments({ userId: req.user._id, repositoryId })
  if (existingUpdateCount === 0 && depTotalCount > 0) {
    const rawDeps = await Dependency.find({ userId: req.user._id, repositoryId }).lean()
    if (rawDeps.length > 0) {
      const records = rawDeps.map((d) => ({
        userId: req.user._id,
        repositoryId,
        dependencyId: d._id,
        ecosystem: d.ecosystem,
        packageName: d.packageName,
        installedVersion: d.resolvedVersion || d.declaredVersion || '',
        declaredVersion: d.declaredVersion || '',
        resolvedVersion: d.resolvedVersion || '',
        latestVersion: d.resolvedVersion || d.declaredVersion || '',
        latestStableVersion: d.resolvedVersion || d.declaredVersion || '',
        updateStatus: 'UNKNOWN',
        updateType: 'NONE',
        securityStatus: 'UNKNOWN',
        researchStatus: 'NOT_RESEARCHED',
        classification: d.classification || 'INTERNAL',
        isDevelopmentDependency: Boolean(d.isDevelopmentDependency),
      }))
      await DependencyUpdate.insertMany(records, { ordered: false }).catch(() => null)
    }

    // Auto-queue authoritative version verification if repository has never been checked
    if (
      !repository.lastUpdateCheckAt &&
      repository.updateCheckStatus !== 'SCANNING' &&
      repository.updateCheckStatus !== 'QUEUED'
    ) {
      queueRepositoryUpdate({ userId: req.user._id, repositoryId }).catch(() => null)
    }
  }

  const match = { userId: req.user._id, repositoryId }
  const search = sanitizeText(req.query.search, 120)
  if (search) match.packageName = { $regex: escapeRegex(search), $options: 'i' }
  const ecosystem = normalizeEcosystem(req.query.ecosystem)
  if (ecosystem) match.ecosystem = { $regex: `^${ecosystem.label}$`, $options: 'i' }
  if (req.query.updateStatus) match.updateStatus = sanitizeText(req.query.updateStatus, 40)
  if (req.query.securityStatus) match.securityStatus = sanitizeText(req.query.securityStatus, 40)
  if (req.query.researchStatus) match.researchStatus = sanitizeText(req.query.researchStatus, 40).toUpperCase()
  if (req.query.classification) match.classification = sanitizeText(req.query.classification, 40).toUpperCase()

  const sort = sortValue(
    req.query,
    {
      name: { packageName: 1 },
      status: { updateStatus: 1, packageName: 1 },
      security: { securityStatus: 1, packageName: 1 },
      research: { researchStatus: 1, packageName: 1 },
      updated: { lastCheckedAt: -1 },
    },
    { packageName: 1 },
  )
  const { page, limit, skip } = pagination(req.query, 20, 100)
  const [updates, total, summaries, depCount, coreDepCount, latestJob, connectedRepositories] = await Promise.all([
    DependencyUpdate.find(match).sort(sort).skip(skip).limit(limit).populate('researchId').lean(),
    DependencyUpdate.countDocuments(match),
    DependencyUpdate.aggregate([
      { $match: { userId: req.user._id, repositoryId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          upToDate: countField('updateStatus', 'UP_TO_DATE'),
          outdated: countField('updateStatus', 'OUTDATED'),
          updateAvailable: countField('updateStatus', 'UPDATE_AVAILABLE'),
          majorUpdates: countField('updateType', 'MAJOR'),
          minorUpdates: countField('updateType', 'MINOR'),
          patchUpdates: countField('updateType', 'PATCH'),
          vulnerable: countField('securityStatus', 'VULNERABLE'),
          deprecated: { $sum: { $cond: [{ $eq: ['$deprecated', true] }, 1, 0] } },
          researchCompleted: { $sum: { $cond: [{ $eq: ['$researchStatus', 'COMPLETED'] }, 1, 0] } },
          researchPending: { $sum: { $cond: [{ $in: ['$researchStatus', ['QUEUED', 'RESEARCHING']] }, 1, 0] } },
          researchFailed: { $sum: { $cond: [{ $eq: ['$researchStatus', 'FAILED'] }, 1, 0] } },
        },
      },
    ]),
    Dependency.countDocuments({ userId: req.user._id, repositoryId }),
    Dependency.countDocuments({ userId: req.user._id, repositoryId, isDevelopmentDependency: false }),
    UpdateJob.findOne({ userId: req.user._id, repositoryId }).sort({ createdAt: -1 }).lean(),
    Repository.find({ userId: req.user._id })
      .select('name fullName owner language')
      .sort({ fullName: 1 })
      .lean(),
  ])

  const s = summaries[0] || {}
  const totalDeps = depCount || s.total || 0
  const activeResearchJob = getRepositoryResearchStatus(repositoryId)

  res.json({
    success: true,
    repository: {
      id: repository._id,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      language: repository.language,
      htmlUrl: repository.htmlUrl,
      updateCheckStatus: repository.updateCheckStatus,
      lastUpdateCheckAt: repository.lastUpdateCheckAt,
      lastScannedAt: repository.lastScannedAt,
    },
    connectedRepositories,
    stats: {
      total: totalDeps,
      totalDependencies: totalDeps,
      coreDependencies: coreDepCount,
      upToDate: s.upToDate || 0,
      updateAvailable: (s.updateAvailable || 0) + (s.outdated || 0),
      outdated: s.outdated || 0,
      majorUpdates: s.majorUpdates || 0,
      minorUpdates: s.minorUpdates || 0,
      patchUpdates: s.patchUpdates || 0,
      vulnerable: s.vulnerable || 0,
      vulnerableDependencies: s.vulnerable || 0,
      deprecated: s.deprecated || 0,
      researchCompleted: s.researchCompleted || 0,
      researchPending: s.researchPending || 0,
      researchFailed: s.researchFailed || 0,
    },
    activeResearchJob,
    updates,
    latestJob,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})

export const dependencyDetails = asyncHandler(async (req, res) => {
  const dependencyId = requireObjectId(req.params.dependencyId, 'dependency id')
  let update = await DependencyUpdate.findOne({ _id: dependencyId, userId: req.user._id }).lean()
  if (!update) {
    update = await DependencyUpdate.findOne({
      dependencyId,
      userId: req.user._id,
    }).lean()
  }
  if (!update) {
    res.status(404)
    throw new Error('No update intelligence found for this dependency. Run an update check first.')
  }

  const [history, repository] = await Promise.all([
    UpdateHistory.find({ userId: req.user._id, dependencyId: update.dependencyId })
      .sort({ checkedAt: -1 })
      .limit(10)
      .lean(),
    Repository.findOne({ _id: update.repositoryId, userId: req.user._id })
      .select('name fullName htmlUrl')
      .lean(),
  ])

  res.json({ success: true, update, repository, history })
})

export const checkRepository = asyncHandler(async (req, res) => {
  const job = await queueRepositoryUpdate({
    userId: req.user._id,
    repositoryId: req.params.repositoryId,
  })
  res.status(202).json({ success: true, updateJob: job, message: 'Update check queued.' })
})

export const checkAll = asyncHandler(async (req, res) => {
  const result = await queueAllUpdates(req.user._id)
  res.status(202).json({
    success: true,
    ...result,
    message: `Queued update checks for ${result.queued} repositories.`,
  })
})

export const checkDependency = asyncHandler(async (req, res) => {
  try {
    const dependency = await resolveDependency(req.user._id, req.params.dependencyId)
    const result = await checkDependencyNow({
      userId: req.user._id,
      dependencyId: dependency._id,
    })
    res.json({
      success: true,
      update: result.record,
      changes: result.changes,
      message: 'Dependency rechecked.',
    })
  } catch (error) {
    if (error?.message === 'NOT_FOUND') {
      res.status(404)
      throw new Error('Dependency not found.')
    }
    throw error
  }
})

export const history = asyncHandler(async (req, res) => {
  let dependencyId
  try {
    const dependency = await resolveDependency(req.user._id, req.params.dependencyId)
    dependencyId = dependency._id
  } catch (error) {
    if (error?.message === 'NOT_FOUND') {
      res.status(404)
      throw new Error('Dependency not found.')
    }
    throw error
  }

  const { page, limit, skip } = pagination(req.query, 20, 100)
  const [snapshots, total] = await Promise.all([
    UpdateHistory.find({ userId: req.user._id, dependencyId })
      .sort({ checkedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UpdateHistory.countDocuments({ userId: req.user._id, dependencyId }),
  ])

  res.json({
    success: true,
    history: snapshots,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})

export const vulnerabilities = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const before = { userId, vulnerabilities: { $exists: true, $ne: [] } }
  if (req.query.repositoryId && isValidObjectId(req.query.repositoryId)) {
    const owned = await Repository.findOne({ _id: req.query.repositoryId, userId }).select('_id')
    if (!owned) {
      res.status(404)
      throw new Error('Repository not found.')
    }
    before.repositoryId = owned._id
  }
  const ecosystem = normalizeEcosystem(req.query.ecosystem)
  if (ecosystem) before.ecosystem = { $regex: `^${ecosystem.label}$`, $options: 'i' }

  const after = {}
  if (req.query.severity) after['vulnerabilities.severity.level'] = sanitizeText(req.query.severity, 30).toUpperCase()
  const search = sanitizeText(req.query.search, 120)
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' }
    after.$or = [
      { packageName: regex },
      { 'vulnerabilities.id': regex },
      { 'vulnerabilities.summary': regex },
      { 'vulnerabilities.aliases': regex },
    ]
  }

  const sort = sortValue(
    req.query,
    {
      package: { packageName: 1 },
      severity: { 'vulnerabilities.severity.level': -1, packageName: 1 },
      checked: { lastCheckedAt: -1 },
    },
    { 'vulnerabilities.severity.level': -1, packageName: 1 },
  )
  const { page, limit, skip } = pagination(req.query, 20, 100)
  const result = await DependencyUpdate.aggregate([
    { $match: before },
    { $unwind: '$vulnerabilities' },
    {
      $lookup: {
        from: 'repositories',
        localField: 'repositoryId',
        foreignField: '_id',
        as: 'repository',
      },
    },
    { $addFields: { repository: { $arrayElemAt: ['$repository', 0] } } },
    { $match: after },
    {
      $project: {
        _id: 0,
        updateId: '$_id',
        dependencyId: 1,
        packageName: 1,
        ecosystem: 1,
        repositoryId: 1,
        repositoryName: { $ifNull: ['$repository.fullName', ''] },
        installedVersion: 1,
        advisory: '$vulnerabilities',
        lastCheckedAt: 1,
      },
    },
    {
      $facet: {
        items: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
        count: [{ $count: 'total' }],
      },
    },
  ])

  const items = result[0]?.items || []
  const total = result[0]?.count?.[0]?.total || 0
  res.json({
    success: true,
    vulnerabilities: items,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})

export const status = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const repository = await Repository.findOne({ _id: repositoryId, userId: req.user._id })
    .select('updateCheckStatus lastUpdateCheckAt outdatedCount vulnerableCount')
    .lean()
  if (!repository) {
    res.status(404)
    throw new Error('Repository not found.')
  }
  const job = await UpdateJob.findOne({ userId: req.user._id, repositoryId }).sort({ createdAt: -1 }).lean()
  res.json({ success: true, repository, job })
})

export const triggerRepositoryResearch = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const repository = await Repository.findOne({ _id: repositoryId, userId: req.user._id }).lean()
  if (!repository) {
    res.status(404)
    throw new Error('Repository not found.')
  }

  const job = await queueRepositoryResearch({
    userId: req.user._id,
    repositoryId,
    dependencyIds: Array.isArray(req.body?.dependencyIds) ? req.body.dependencyIds : [],
  })

  res.status(202).json({
    success: true,
    job,
    message: 'Official Firecrawl research queued for repository dependencies.',
  })
})

export const getRepositoryResearchStatusEndpoint = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const activeJob = getRepositoryResearchStatus(repositoryId)

  const counts = await DependencyUpdate.aggregate([
    { $match: { userId: req.user._id, repositoryId } },
    { $group: { _id: '$researchStatus', count: { $sum: 1 } } },
  ])

  const statusMap = Object.fromEntries(counts.map((c) => [c._id, c.count]))
  res.json({
    success: true,
    job: activeJob,
    counts: {
      COMPLETED: statusMap.COMPLETED || 0,
      RESEARCHING: statusMap.RESEARCHING || 0,
      QUEUED: statusMap.QUEUED || 0,
      PARTIAL: statusMap.PARTIAL || 0,
      FAILED: statusMap.FAILED || 0,
      NOT_RESEARCHED: statusMap.NOT_RESEARCHED || 0,
    },
  })
})

export const repositoryDependencies = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const repository = await Repository.findOne({ _id: repositoryId, userId: req.user._id }).lean()
  if (!repository) {
    res.status(404)
    throw new Error('Repository not found.')
  }

  // Ensure baseline DependencyUpdate records exist for all scanned dependencies
  const existingUpdateCount = await DependencyUpdate.countDocuments({ userId: req.user._id, repositoryId })
  const depTotalCount = await Dependency.countDocuments({ userId: req.user._id, repositoryId })
  if (existingUpdateCount === 0 && depTotalCount > 0) {
    const rawDeps = await Dependency.find({ userId: req.user._id, repositoryId }).lean()
    if (rawDeps.length > 0) {
      const records = rawDeps.map((d) => ({
        userId: req.user._id,
        repositoryId,
        dependencyId: d._id,
        ecosystem: d.ecosystem,
        packageName: d.packageName,
        installedVersion: d.resolvedVersion || d.declaredVersion || '',
        declaredVersion: d.declaredVersion || '',
        resolvedVersion: d.resolvedVersion || '',
        latestVersion: d.resolvedVersion || d.declaredVersion || '',
        latestStableVersion: d.resolvedVersion || d.declaredVersion || '',
        updateStatus: 'UNKNOWN',
        updateType: 'NONE',
        securityStatus: 'UNKNOWN',
        researchStatus: 'NOT_RESEARCHED',
        classification: d.classification || 'INTERNAL',
        isDevelopmentDependency: Boolean(d.isDevelopmentDependency),
      }))
      await DependencyUpdate.insertMany(records, { ordered: false }).catch(() => null)
    }

    // Auto-queue authoritative version verification if repository has never been checked
    if (
      !repository.lastUpdateCheckAt &&
      repository.updateCheckStatus !== 'SCANNING' &&
      repository.updateCheckStatus !== 'QUEUED'
    ) {
      queueRepositoryUpdate({ userId: req.user._id, repositoryId }).catch(() => null)
    }
  }

  const match = { userId: req.user._id, repositoryId }
  if (req.query.search) {
    match.packageName = { $regex: escapeRegex(req.query.search), $options: 'i' }
  }
  if (req.query.researchStatus) {
    match.researchStatus = sanitizeText(req.query.researchStatus, 40).toUpperCase()
  }

  const { page, limit, skip } = pagination(req.query, 50, 200)
  const [updates, total] = await Promise.all([
    DependencyUpdate.find(match)
      .sort({ packageName: 1 })
      .skip(skip)
      .limit(limit)
      .populate('researchId')
      .lean(),
    DependencyUpdate.countDocuments(match),
  ])

  res.json({
    success: true,
    dependencies: updates,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})

export const triggerDependencyResearch = asyncHandler(async (req, res) => {
  const dependencyId = requireObjectId(req.params.dependencyId, 'dependency id')
  const dependency = await resolveDependency(req.user._id, dependencyId)

  const result = await researchSingleDependency({
    userId: req.user._id,
    repositoryId: dependency.repositoryId,
    dependencyId: dependency._id,
    force: Boolean(req.body?.force),
  })

  res.json({
    success: true,
    research: result.research,
    analysis: result.analysis,
    message: 'Official Firecrawl documentation research completed.',
  })
})

export const getDependencyResearchEndpoint = asyncHandler(async (req, res) => {
  const dependencyId = requireObjectId(req.params.dependencyId, 'dependency id')
  let dependency = null
  try {
    dependency = await resolveDependency(req.user._id, dependencyId)
  } catch {
    // might be raw update ID
  }

  const targetDepId = dependency?._id || dependencyId
  const [research, update, aiAnalysis] = await Promise.all([
    DependencyResearch.findOne({
      userId: req.user._id,
      $or: [{ dependencyId: targetDepId }, { updateId: dependencyId }],
    })
      .sort({ researchedAt: -1 })
      .lean(),
    DependencyUpdate.findOne({
      userId: req.user._id,
      $or: [{ _id: dependencyId }, { dependencyId: targetDepId }],
    })
      .populate('researchId')
      .lean(),
    AIAnalysis.findOne({
      userId: req.user._id,
      $or: [{ dependencyId: targetDepId }, { targetId: targetDepId }],
    })
      .sort({ createdAt: -1 })
      .lean(),
  ])

  res.json({
    success: true,
    research,
    update,
    analysis: aiAnalysis,
    dependency,
  })
})

export const triggerDependencyAnalysisEndpoint = asyncHandler(async (req, res) => {
  const dependencyId = requireObjectId(req.params.dependencyId, 'dependency id')
  const dependency = await resolveDependency(req.user._id, dependencyId)

  const [update, research, repository] = await Promise.all([
    DependencyUpdate.findOne({ dependencyId: dependency._id, userId: req.user._id }),
    DependencyResearch.findOne({ dependencyId: dependency._id, userId: req.user._id }).sort({ researchedAt: -1 }),
    Repository.findOne({ _id: dependency.repositoryId, userId: req.user._id }).lean(),
  ])

  const analysis = await interpretResearchWithAI({
    userId: req.user._id,
    repositoryId: dependency.repositoryId,
    dependencyId: dependency._id,
    research: research || { findings: [], breakingChanges: [] },
    dependency,
    update,
    repository,
  })

  res.json({
    success: true,
    analysis,
    message: 'AI interpretation completed.',
  })
})

export const getDependencyAnalysisEndpoint = asyncHandler(async (req, res) => {
  const dependencyId = requireObjectId(req.params.dependencyId, 'dependency id')
  let dependency = null
  try {
    dependency = await resolveDependency(req.user._id, dependencyId)
  } catch {
    // ignore
  }

  const targetDepId = dependency?._id || dependencyId
  const analysis = await AIAnalysis.findOne({
    userId: req.user._id,
    $or: [{ dependencyId: targetDepId }, { targetId: targetDepId }],
  })
    .sort({ createdAt: -1 })
    .lean()

  res.json({
    success: true,
    analysis,
  })
})
