import mongoose from 'mongoose'
import Dependency from '../../../models/Dependency.js'
import DependencyUpdate from '../../../models/DependencyUpdate.js'
import Repository from '../../../models/Repository.js'
import UpdateHistory from '../../../models/UpdateHistory.js'
import UpdateJob from '../../../models/UpdateJob.js'
import { AppError } from '../../../utils/errors.js'
import { isValidObjectId, mapLimit, sanitizeError } from '../../../utils/sanitize.js'
import { analyzeDependency } from './dependencyAnalyzer.js'
import { detectChanges, snapshotFrom } from './historyService.js'
import { notifyUpdateChanges } from '../../notifications/notificationService.js'

function toObjectId(id) {
  if (!id) return id
  if (id instanceof mongoose.Types.ObjectId) return id
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    try {
      return new mongoose.Types.ObjectId(id)
    } catch {
      return id
    }
  }
  return id
}

const MAX_CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.UPDATE_MAX_CONCURRENCY) || 5))

async function updateProgress(jobId, progress) {
  await UpdateJob.updateOne({ _id: jobId }, { $set: { progress } })
}

async function refreshRepositoryCounters(userId, repositoryId, completedAt) {
  const userMatch = { $in: [toObjectId(userId), String(userId)] }
  const repoMatch = { $in: [toObjectId(repositoryId), String(repositoryId)] }

  const [outdatedCount, vulnerableCount] = await Promise.all([
    DependencyUpdate.countDocuments({
      userId: userMatch,
      repositoryId: repoMatch,
      updateStatus: { $in: ['OUTDATED', 'UPDATE_AVAILABLE', 'SECURITY_RISK'] },
    }),
    DependencyUpdate.countDocuments({ userId: userMatch, repositoryId: repoMatch, securityStatus: 'VULNERABLE' }),
  ])

  await Repository.updateOne(
    { _id: repoMatch, userId: userMatch },
    {
      $set: {
        lastUpdateCheckAt: completedAt,
        updateCheckStatus: 'COMPLETED',
        outdatedCount,
        vulnerableCount,
      },
    },
  )
}

export async function persistUpdateRecord(record) {
  const userMatch = { $in: [toObjectId(record.userId), String(record.userId)] }
  const depMatch = { $in: [toObjectId(record.dependencyId), String(record.dependencyId)] }

  const existing = await DependencyUpdate.findOne({
    userId: userMatch,
    $or: [{ dependencyId: depMatch }, { _id: depMatch }],
  }).lean()
  const changes = detectChanges(existing, record)

  const saved = await DependencyUpdate.findOneAndUpdate(
    {
      userId: userMatch,
      $or: [{ dependencyId: depMatch }, { _id: depMatch }],
    },
    { $set: record, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  if (changes.length) {
    await UpdateHistory.create({
      userId: record.userId,
      repositoryId: record.repositoryId,
      dependencyId: record.dependencyId,
      updateRecordId: saved._id,
      checkedAt: record.lastCheckedAt || new Date(),
      changes,
      previous: existing ? snapshotFrom(existing) : null,
      current: snapshotFrom(record),
    })

    try {
      await notifyUpdateChanges({
        userId: record.userId,
        repositoryId: record.repositoryId,
        dependencyId: record.dependencyId,
        packageName: record.packageName,
        previous: existing,
        current: saved,
        changes,
      })
    } catch (error) {
      console.warn('[updates] Could not create update notifications:', sanitizeError(error))
    }
  }

  return { record: saved, changes }
}

async function analyzeSafely(dependency) {
  try {
    return await analyzeDependency(dependency)
  } catch (error) {
    const checkedAt = new Date()
    return {
      dependencyId: dependency._id,
      userId: dependency.userId,
      repositoryId: dependency.repositoryId,
      ecosystem: dependency.ecosystem,
      packageName: dependency.packageName,
      declaredVersion: dependency.declaredVersion || '',
      resolvedVersion: dependency.resolvedVersion || '',
      installedVersion: dependency.resolvedVersion || dependency.declaredVersion || '',
      lastCheckedAt: checkedAt,
      nextCheckAt: new Date(checkedAt.getTime() + 6 * 60 * 60 * 1000),
      updateStatus: 'REGISTRY_ERROR',
      updateType: 'UNKNOWN',
      rangeStatus: 'UNKNOWN',
      securityStatus: 'UNKNOWN',
      vulnerabilities: [],
      registryError: sanitizeError(error),
      securityError: 'Security check was not completed.',
      metadata: {
        description: '',
        homepage: '',
        repositoryUrl: '',
        source: '',
        distTags: {},
        coordinates: {},
        versionHistory: [],
        extras: {},
      },
    }
  }
}

export async function runUpdateJob(jobId) {
  const job = await UpdateJob.findById(jobId)
  if (!job) return null

  const repository = await Repository.findOne({ _id: job.repositoryId, userId: job.userId })
  if (!repository) throw new AppError('Repository not found for this update job.', 404)

  await UpdateJob.updateOne(
    { _id: jobId },
    { $set: { status: 'SCANNING', startedAt: new Date(), error: '', 'progress.message': 'Checking registry and advisory data.' } },
  )
  await Repository.updateOne(
    { _id: repository._id, userId: job.userId },
    { $set: { updateCheckStatus: 'SCANNING' } },
  )

  const userMatch = { $in: [toObjectId(job.userId), String(job.userId)] }
  const repoMatch = { $in: [toObjectId(repository._id), String(repository._id)] }
  let dependencies = await Dependency.find({ userId: userMatch, repositoryId: repoMatch }).lean()
  if (!dependencies.length) {
    const rawUpdates = await DependencyUpdate.find({ userId: userMatch, repositoryId: repoMatch }).lean()
    if (rawUpdates.length) {
      dependencies = rawUpdates.map((u) => ({
        _id: u.dependencyId || u._id,
        userId: toObjectId(job.userId),
        repositoryId: toObjectId(repository._id),
        packageName: u.packageName,
        ecosystem: u.ecosystem,
        declaredVersion: u.declaredVersion || u.installedVersion || '',
        resolvedVersion: u.resolvedVersion || u.installedVersion || '',
        isDevelopmentDependency: Boolean(u.isDevelopmentDependency),
        classification: u.classification || 'INTERNAL',
      }))
    }
  }
  const total = dependencies.length
  let processed = 0
  let successful = 0
  let failed = 0

  await updateProgress(jobId, {
    total,
    processed: 0,
    successful: 0,
    failed: 0,
    message: total ? `Checking ${total} dependencies.` : 'No dependencies to check.',
  })

  await mapLimit(dependencies, MAX_CONCURRENCY, async (dependency) => {
    const record = await analyzeSafely(dependency)
    if (record.registryError) failed += 1
    else successful += 1
    await persistUpdateRecord(record)
    processed += 1
    await updateProgress(jobId, {
      total,
      processed,
      successful,
      failed,
      message: `Checked ${processed} of ${total} dependencies.`,
    })
  })

  const completedAt = new Date()
  await UpdateJob.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'COMPLETED',
        active: false,
        completedAt,
        progress: {
          total,
          processed,
          successful,
          failed,
          message: `Checked ${processed} dependencies (${failed} registry issues).`,
        },
      },
    },
  )
  await refreshRepositoryCounters(job.userId, repository._id, completedAt)
  return { jobId, total, successful, failed }
}

export async function checkDependencyNow({ userId, dependencyId }) {
  const dependency = await Dependency.findOne({ _id: dependencyId, userId }).lean()
  if (!dependency) throw new AppError('Dependency not found.', 404)

  const record = await analyzeSafely(dependency)
  const result = await persistUpdateRecord(record)
  await refreshRepositoryCounters(userId, dependency.repositoryId, new Date())
  return result
}
