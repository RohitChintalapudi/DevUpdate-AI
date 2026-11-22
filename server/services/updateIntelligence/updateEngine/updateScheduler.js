import Dependency from '../../../models/Dependency.js'
import Repository from '../../../models/Repository.js'
import UpdateJob from '../../../models/UpdateJob.js'
import { AppError } from '../../../utils/errors.js'
import { isValidObjectId, sanitizeError } from '../../../utils/sanitize.js'
import { runUpdateJob } from './repositoryAnalyzer.js'

const STALE_JOB_MS = 20 * 60 * 1000
const MAX_CONCURRENT_JOBS = Math.max(1, Math.min(4, Number(process.env.UPDATE_MAX_CONCURRENT_JOBS) || 2))
const pendingJobs = []
const activeJobs = new Set()
let runningJobs = 0

async function ownedRepository(userId, repositoryId) {
  if (!isValidObjectId(repositoryId)) throw new AppError('Invalid repository id.', 400)
  const repository = await Repository.findOne({ _id: repositoryId, userId })
  if (!repository) throw new AppError('Repository not found.', 404)
  return repository
}

async function failJob(jobId, error) {
  const message = sanitizeError(error)
  const job = await UpdateJob.findById(jobId).select('userId repositoryId')
  await UpdateJob.updateOne(
    { _id: jobId },
    { $set: { status: 'FAILED', active: false, error: message, completedAt: new Date() } },
  )
  if (job) {
    await Repository.updateOne(
      { _id: job.repositoryId, userId: job.userId },
      { $set: { updateCheckStatus: 'FAILED' } },
    )
  }
}

function drain() {
  while (runningJobs < MAX_CONCURRENT_JOBS && pendingJobs.length) {
    const jobId = pendingJobs.shift()
    if (!jobId || activeJobs.has(jobId)) continue
    activeJobs.add(jobId)
    runningJobs += 1

    runUpdateJob(jobId)
      .catch((error) => failJob(jobId, error))
      .finally(() => {
        activeJobs.delete(jobId)
        runningJobs -= 1
        drain()
      })
  }
}

export async function queueRepositoryUpdate({ userId, repositoryId, scope = 'repository' }) {
  const repository = await ownedRepository(userId, repositoryId)
  const total = await Dependency.countDocuments({ userId, repositoryId: repository._id })
  if (!total) {
    throw new AppError('Analyze this repository before checking dependency updates.', 409)
  }

  const activeKey = `${userId}:${repository._id}`
  const active = await UpdateJob.findOne({ activeKey, active: true })
  if (active) {
    const error = new AppError('An update check is already running for this repository.', 409)
    error.updateJob = active
    throw error
  }

  let job
  try {
    job = await UpdateJob.create({
      userId,
      repositoryId: repository._id,
      scope,
      status: 'QUEUED',
      active: true,
      activeKey,
      progress: { total, processed: 0, successful: 0, failed: 0, message: 'Queued for update check.' },
    })
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await UpdateJob.findOne({ activeKey, active: true })
      const duplicate = new AppError('An update check is already running for this repository.', 409)
      duplicate.updateJob = existing
      throw duplicate
    }
    throw error
  }

  await Repository.updateOne(
    { _id: repository._id, userId },
    { $set: { updateCheckStatus: 'QUEUED' } },
  )

  pendingJobs.push(job._id.toString())
  drain()
  return job
}

export async function queueAllUpdates(userId) {
  const repositories = await Repository.find({ userId }).select('_id').lean()
  const jobs = []
  let skipped = 0

  for (const repository of repositories) {
    try {
      const job = await queueRepositoryUpdate({
        userId,
        repositoryId: repository._id,
        scope: 'check-all',
      })
      jobs.push(job)
    } catch (error) {
      if (error?.statusCode === 409) skipped += 1
      else throw error
    }
  }

  return { queued: jobs.length, skipped, jobs }
}

export async function recoverStaleUpdateJobs() {
  const cutoff = new Date(Date.now() - STALE_JOB_MS)
  const stale = await UpdateJob.updateMany(
    { active: true, status: { $in: ['QUEUED', 'SCANNING'] }, updatedAt: { $lt: cutoff } },
    {
      $set: {
        status: 'FAILED',
        active: false,
        error: 'Update check interrupted by a server restart.',
        completedAt: new Date(),
      },
    },
  )

  if (stale.modifiedCount) {
    const jobs = await UpdateJob.find({
      active: false,
      error: 'Update check interrupted by a server restart.',
      completedAt: { $gte: cutoff },
    }).select('repositoryId')
    await Repository.updateMany(
      {
        _id: { $in: jobs.map((job) => job.repositoryId) },
        updateCheckStatus: { $in: ['QUEUED', 'SCANNING'] },
      },
      { $set: { updateCheckStatus: 'FAILED' } },
    )
  }
}

export function updateQueueStats() {
  return { running: runningJobs, pending: pendingJobs.length, maxConcurrent: MAX_CONCURRENT_JOBS }
}
