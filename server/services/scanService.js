import GitHubConnection from '../models/GitHubConnection.js'
import Repository from '../models/Repository.js'
import Dependency from '../models/Dependency.js'
import DependencyUpdate from '../models/DependencyUpdate.js'
import ScanJob from '../models/ScanJob.js'
import { AppError } from '../utils/errors.js'
import {
  mapLimit,
  sanitizeError,
  sanitizeText,
  isValidObjectId,
  withTimeout,
} from '../utils/sanitize.js'
import { decryptAccessToken } from '../utils/tokenCrypto.js'
import {
  matchManifest,
  MAX_CONCURRENT_REQUESTS,
  MAX_MANIFESTS_PER_SCAN,
  MAX_MANIFEST_BYTES,
} from '../constants/manifests.js'
import {
  getRepositoryMetadata,
  getRepositoryTree,
  getFileContent,
} from './githubService.js'
import { parseDependencyFiles } from './dependencyParserService.js'
import { notifyScanFailed } from './notifications/notificationService.js'

const STALE_SCAN_MS = 20 * 60 * 1000
export const SCAN_TIMEOUT_MS = 110_000 // Guarantee scan completes under 120s
const activeJobs = new Set()

function validateBranch(branch) {
  if (!branch) return ''
  const value = sanitizeText(branch, 200)
  if (!/^[A-Za-z0-9._/-]+$/.test(value) || value.includes('..') || value.startsWith('/')) {
    throw new AppError('Invalid branch name.', 400)
  }
  return value
}

function dependencySignature(dependency) {
  return [
    dependency.ecosystem,
    dependency.packageName,
    dependency.dependencyType,
    dependency.sourceManifest,
    dependency.declaredVersion,
    dependency.resolvedVersion,
  ].join('::')
}

async function ownedRepository(userId, repositoryId) {
  if (!isValidObjectId(repositoryId)) throw new AppError('Invalid repository id.', 400)
  const repository = await Repository.findOne({ _id: repositoryId, userId })
  if (!repository) throw new AppError('Repository not found.', 404)
  return repository
}

async function updateProgress(jobId, progress) {
  await ScanJob.updateOne({ _id: jobId }, { $set: { progress } })
}

export async function recoverStaleScans() {
  const cutoff = new Date(Date.now() - STALE_SCAN_MS)
  const stale = await ScanJob.updateMany(
    { status: { $in: ['QUEUED', 'SCANNING'] }, updatedAt: { $lt: cutoff } },
    {
      $set: {
        status: 'FAILED',
        error: 'Scan interrupted by a server restart.',
        completedAt: new Date(),
      },
    },
  )
  if (stale.modifiedCount) {
    const jobs = await ScanJob.find({
      status: 'FAILED',
      error: 'Scan interrupted by a server restart.',
      completedAt: { $gte: cutoff },
    }).select('repositoryId')
    await Repository.updateMany(
      { _id: { $in: jobs.map((job) => job.repositoryId) }, scanStatus: { $in: ['QUEUED', 'SCANNING'] } },
      { $set: { scanStatus: 'FAILED', lastScanError: 'Scan interrupted by a server restart.' } },
    )
  }
}

export async function queueScan({ userId, repositoryId, branch }) {
  const repository = await ownedRepository(userId, repositoryId)
  const connection = await GitHubConnection.findOne({ userId, status: 'CONNECTED' })
  if (!connection) throw new AppError('Connect GitHub before scanning a repository.', 409)

  const active = await ScanJob.findOne({
    userId,
    repositoryId: repository._id,
    status: { $in: ['QUEUED', 'SCANNING'] },
    updatedAt: { $gte: new Date(Date.now() - STALE_SCAN_MS) },
  })
  if (active) {
    const error = new AppError('This repository is already being scanned.', 409)
    error.scanJob = active
    throw error
  }

  const selectedBranch = validateBranch(branch) || repository.branch || repository.defaultBranch
  const job = await ScanJob.create({
    userId,
    repositoryId: repository._id,
    branch: selectedBranch,
    status: 'QUEUED',
    progress: {
      filesDiscovered: 0,
      manifestsProcessed: 0,
      dependenciesExtracted: 0,
      message: 'Queued for scanning.',
    },
  })

  await Repository.updateOne(
    { _id: repository._id, userId },
    {
      $set: {
        selectedForAnalysis: true,
        branch: selectedBranch,
        scanStatus: 'QUEUED',
        lastScanId: job._id,
        lastScanError: '',
      },
    },
  )

  // The job is deliberately detached from the request. Closing the browser
  // cannot cancel it because progress lives in MongoDB.
  setImmediate(() => {
    runScan(job._id.toString()).catch((error) => {
      activeJobs.delete(job._id.toString())
      console.error('[scan] Unhandled scan failure:', sanitizeError(error))
    })
  })

  return job
}

async function failScan(jobId, repositoryId, error, userId = null, repositoryName = '') {
  const message = sanitizeError(error)
  await ScanJob.updateOne(
    { _id: jobId },
    { $set: { status: 'FAILED', error: message, completedAt: new Date() } },
  )
  if (repositoryId) {
    await Repository.updateOne(
      { _id: repositoryId },
      { $set: { scanStatus: 'FAILED', lastScanError: message } },
    )
  }
  if (userId) {
    try {
      await notifyScanFailed({ userId, repositoryId, repositoryName, error: message })
    } catch (notificationError) {
      console.warn('[scan] Could not create failure notification:', sanitizeError(notificationError))
    }
  }
}

async function persistDependencies({ userId, repositoryId, dependencies }) {
  // Purge any legacy dependencies starting with '@' for this repository
  await Promise.allSettled([
    Dependency.deleteMany({ userId, repositoryId, packageName: /^@/ }),
    DependencyUpdate.deleteMany({ userId, repositoryId, packageName: /^@/ }),
  ])

  const cleanDependencies = (dependencies || []).filter((d) => d.packageName && !d.packageName.startsWith('@'))
  const signatures = new Set(cleanDependencies.map(dependencySignature))
  const existing = await Dependency.find({ userId, repositoryId }).select('_id').lean()
  const staleIds = []
  for (const record of existing) {
    const signature = [
      record.ecosystem || '',
      record.packageName || '',
      record.dependencyType || '',
      record.sourceManifest || '',
      record.declaredVersion || '',
      record.resolvedVersion || '',
    ].join('::')
    if (!signatures.has(signature)) staleIds.push(record._id)
  }
  if (staleIds.length) await Dependency.deleteMany({ _id: { $in: staleIds }, userId, repositoryId })

  const unique = new Map()
  for (const dependency of cleanDependencies) unique.set(dependencySignature(dependency), dependency)
  if (!unique.size) return 0

  await Dependency.bulkWrite(
    [...unique.values()].map((dependency) => ({
      updateOne: {
        filter: {
          userId,
          repositoryId,
          ecosystem: dependency.ecosystem,
          packageName: dependency.packageName,
          dependencyType: dependency.dependencyType,
          sourceManifest: dependency.sourceManifest,
          declaredVersion: dependency.declaredVersion,
          resolvedVersion: dependency.resolvedVersion,
        },
        update: {
          $set: {
            groupId: dependency.groupId || '',
            artifactId: dependency.artifactId || '',
            isDevelopmentDependency: dependency.isDevelopmentDependency,
            versionType: dependency.versionType,
            extractedAt: new Date(dependency.extractedAt || Date.now()),
          },
          $setOnInsert: {
            userId,
            repositoryId,
            ecosystem: dependency.ecosystem,
            packageName: dependency.packageName,
            dependencyType: dependency.dependencyType,
            sourceManifest: dependency.sourceManifest,
            declaredVersion: dependency.declaredVersion,
            resolvedVersion: dependency.resolvedVersion,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  )

  return unique.size
}

export async function runScan(jobId) {
  if (activeJobs.has(jobId)) return null
  activeJobs.add(jobId)
  const job = await ScanJob.findById(jobId)
  if (!job) {
    activeJobs.delete(jobId)
    return null
  }

  let repository = null
  try {
    repository = await Repository.findOne({ _id: job.repositoryId, userId: job.userId })
    const connection = await GitHubConnection.findOne({ userId: job.userId, status: 'CONNECTED' })
    if (!repository || !connection) throw new AppError('Repository or GitHub connection is unavailable.', 409)

    await ScanJob.updateOne(
      { _id: jobId },
      { $set: { status: 'SCANNING', startedAt: new Date(), error: '' } },
    )
    await Repository.updateOne(
      { _id: repository._id, userId: job.userId },
      { $set: { scanStatus: 'SCANNING', lastScanError: '' } },
    )

    await withTimeout(
      (async () => {
        const accessToken = decryptAccessToken(connection.accessToken)
        const ref = job.branch || repository.branch || repository.defaultBranch

        // Concurrently fetch repository metadata and git tree
        const [metadata, tree] = await Promise.all([
          getRepositoryMetadata(accessToken, repository.owner, repository.name),
          getRepositoryTree(accessToken, repository.owner, repository.name, ref),
        ])

        const manifests = tree.files
          .filter((file) => file.size <= MAX_MANIFEST_BYTES && matchManifest(file.path))
          .sort((a, b) => {
            const depthA = (a.path.match(/\//g) || []).length
            const depthB = (b.path.match(/\//g) || []).length
            return depthA - depthB
          })
          .slice(0, MAX_MANIFESTS_PER_SCAN)
          .map((file) => ({ ...file, matcher: matchManifest(file.path) }))

        await updateProgress(jobId, {
          filesDiscovered: tree.files.length,
          manifestsProcessed: 0,
          dependenciesExtracted: 0,
          message: `Discovered ${tree.files.length} files and ${manifests.length} manifest files.`,
        })

        let processed = 0
        const contents = await mapLimit(manifests, MAX_CONCURRENT_REQUESTS, async (manifest) => {
          try {
            const content = await getFileContent(
              accessToken,
              repository.owner,
              repository.name,
              manifest.path,
              ref,
            )
            return {
              path: manifest.path,
              parser: manifest.matcher.parser,
              ecosystem: manifest.matcher.ecosystem,
              content: content && content.length <= MAX_MANIFEST_BYTES ? content : '',
            }
          } finally {
            processed += 1
            await updateProgress(jobId, {
              filesDiscovered: tree.files.length,
              manifestsProcessed: processed,
              dependenciesExtracted: 0,
              message: `Processed ${processed} of ${manifests.length} manifest files.`,
            })
          }
        })

        const dependencies = parseDependencyFiles(contents.filter((file) => file.content))
        const count = await persistDependencies({
          userId: job.userId,
          repositoryId: repository._id,
          dependencies,
        })

        const completedAt = new Date()
        await ScanJob.updateOne(
          { _id: jobId },
          {
            $set: {
              status: 'COMPLETED',
              completedAt,
              progress: {
                filesDiscovered: tree.files.length,
                manifestsProcessed: manifests.length,
                dependenciesExtracted: count,
                message: `Extracted ${count} dependencies from ${manifests.length} manifests.`,
              },
            },
          },
        )
        await Repository.updateOne(
          { _id: repository._id, userId: job.userId },
          {
            $set: {
              ...metadata,
              branch: ref,
              scanStatus: 'COMPLETED',
              lastScannedAt: completedAt,
              lastScanError: '',
              dependencyCount: count,
              manifestFiles: manifests.map((manifest) => manifest.path),
            },
          },
        )
      })(),
      SCAN_TIMEOUT_MS,
      'Scan exceeded maximum allowed time (110s).',
    )
    return { jobId }
  } catch (error) {
    await failScan(jobId, job.repositoryId, error, job.userId, repository?.fullName || '')
    throw error
  } finally {
    activeJobs.delete(jobId)
  }
}
