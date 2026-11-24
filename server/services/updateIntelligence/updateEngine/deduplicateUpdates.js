import mongoose from 'mongoose'
import Dependency from '../../../models/Dependency.js'
import DependencyResearch from '../../../models/DependencyResearch.js'
import DependencyUpdate from '../../../models/DependencyUpdate.js'
import Repository from '../../../models/Repository.js'
import { dependencyKeyFor } from './dependencyIdentity.js'

function idMatch(value) {
  if (!value) return null
  const text = String(value)
  const objectId =
    value instanceof mongoose.Types.ObjectId
      ? value
      : mongoose.Types.ObjectId.isValid(text)
        ? new mongoose.Types.ObjectId(text)
        : value
  return { $in: [objectId, text] }
}

function recency(document) {
  const value = document.lastCheckedAt || document.researchedAt || document.updatedAt || document.createdAt
  return value ? new Date(value).getTime() : 0
}

function groupByKey(rows, currentDependencyById) {
  const groups = new Map()
  for (const row of rows) {
    // Prefer the key of the live dependency over a stale embedded copy.
    const current = currentDependencyById?.get(String(row.dependencyId))
    const key = dependencyKeyFor(current || row)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return groups
}

/**
 * Rescans recreate Dependency documents with new ObjectIds. Update and research
 * rows keyed only by dependencyId therefore pile up and inflate every count.
 * Collapse them to one row per stable dependency identity and relink to the
 * current Dependency document.
 */
export async function deduplicateRepositoryUpdates({ userId, repositoryId }) {
  const userMatch = idMatch(userId)
  const repoMatch = idMatch(repositoryId)
  if (!userMatch || !repoMatch) return { removedUpdates: 0, removedResearch: 0, relinked: 0 }

  const match = { userId: userMatch, repositoryId: repoMatch }
  const [dependencies, updates, research] = await Promise.all([
    Dependency.find(match).lean(),
    DependencyUpdate.find(match).lean(),
    DependencyResearch.find(match).lean(),
  ])

  const currentDependencyById = new Map(dependencies.map((dep) => [String(dep._id), dep]))
  const currentDependencyByKey = new Map()
  for (const dep of dependencies) {
    const key = dependencyKeyFor(dep)
    if (!key) continue
    const existing = currentDependencyByKey.get(key)
    if (!existing || recency(dep) > recency(existing)) currentDependencyByKey.set(key, dep)
  }

  let removedUpdates = 0
  let removedResearch = 0
  let relinked = 0

  const updateDeleteIds = []
  const updateOps = []
  for (const [key, rows] of groupByKey(updates, currentDependencyById)) {
    if (rows.length < 2 && !rows[0]?.dependencyKey) continue
    rows.sort((a, b) => recency(b) - recency(a))
    const keep = rows[0]
    updateDeleteIds.push(...rows.slice(1).map((row) => row._id))
    removedUpdates += rows.length - 1

    const set = { dependencyKey: key }
    const current = currentDependencyByKey.get(key)
    if (current && String(keep.dependencyId) !== String(current._id)) {
      set.dependencyId = current._id
      relinked += 1
    }
    if (set.dependencyId || keep.dependencyKey !== key) {
      updateOps.push({
        updateOne: { filter: { _id: keep._id }, update: { $set: set } },
      })
    }
  }

  const researchDeleteIds = []
  const researchOps = []
  for (const [key, rows] of groupByKey(research, currentDependencyById)) {
    if (rows.length < 2 && !rows[0]?.dependencyKey) continue
    rows.sort((a, b) => recency(b) - recency(a))
    const keep = rows[0]
    researchDeleteIds.push(...rows.slice(1).map((row) => row._id))
    removedResearch += rows.length - 1

    const set = { dependencyKey: key }
    const current = currentDependencyByKey.get(key)
    if (current && String(keep.dependencyId) !== String(current._id)) {
      set.dependencyId = current._id
      relinked += 1
    }
    if (set.dependencyId || keep.dependencyKey !== key) {
      researchOps.push({
        updateOne: { filter: { _id: keep._id }, update: { $set: set } },
      })
    }
  }

  // Delete first so relinking cannot collide with the unique dependencyId index.
  await Promise.all([
    updateDeleteIds.length
      ? DependencyUpdate.deleteMany({ _id: { $in: updateDeleteIds } })
      : Promise.resolve(),
    researchDeleteIds.length
      ? DependencyResearch.deleteMany({ _id: { $in: researchDeleteIds } })
      : Promise.resolve(),
  ])
  if (updateOps.length) await DependencyUpdate.bulkWrite(updateOps, { ordered: false })
  if (researchOps.length) await DependencyResearch.bulkWrite(researchOps, { ordered: false })

  return { removedUpdates, removedResearch, relinked }
}

/** Create one baseline update row per stable dependency, without duplicates. */
export async function ensureBaselineUpdateRecords({ userId, repositoryId }) {
  const userMatch = idMatch(userId)
  const repoMatch = idMatch(repositoryId)
  if (!userMatch || !repoMatch) return 0

  const dependencies = await Dependency.find({
    userId: userMatch,
    repositoryId: repoMatch,
    packageName: { $not: /^@/ },
  }).lean()
  if (!dependencies.length) return 0

  const ops = dependencies.map((dep) => {
    const key = dependencyKeyFor(dep)
    const or = key ? [{ dependencyKey: key }] : []
    const dependencyId = idMatch(dep._id)
    if (dependencyId) or.push({ dependencyId })
    return {
      updateOne: {
        filter: { userId: userMatch, repositoryId: repoMatch, $or: or },
        update: {
          $set: {
            userId: dep.userId || userId,
            repositoryId: dep.repositoryId || repositoryId,
            dependencyId: dep._id,
            dependencyKey: key,
            ecosystem: dep.ecosystem,
            packageName: dep.packageName,
            installedVersion: dep.resolvedVersion || dep.declaredVersion || '',
            declaredVersion: dep.declaredVersion || '',
            resolvedVersion: dep.resolvedVersion || '',
            latestVersion: dep.resolvedVersion || dep.declaredVersion || '',
            latestStableVersion: dep.resolvedVersion || dep.declaredVersion || '',
            updateStatus: 'UNKNOWN',
            updateType: 'NONE',
            securityStatus: 'UNKNOWN',
            researchStatus: 'NOT_RESEARCHED',
            classification: dep.classification || 'SUPPORTING',
            isDevelopmentDependency: Boolean(dep.isDevelopmentDependency),
            popularityScore: Number(dep.popularityScore) || 0,
            popularityDownloads: Number(dep.popularityDownloads) || 0,
            popularitySource: dep.popularitySource || 'heuristic',
            popularityRank: Number(dep.popularityRank) || 0,
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }
  })

  await DependencyUpdate.bulkWrite(ops, { ordered: false })
  return dependencies.length
}

/**
 * Startup recovery for data written before the stable-dependencyKey fix.
 * Runs after Mongo connects and never blocks the HTTP listener.
 */
export async function deduplicateAllUpdates() {
  if (mongoose.connection.readyState !== 1) {
    return { repositories: 0, removedUpdates: 0, removedResearch: 0, relinked: 0 }
  }

  const repositories = await Repository.find({}).select('_id userId').lean()
  const totals = { repositories: 0, removedUpdates: 0, removedResearch: 0, relinked: 0 }

  for (const repository of repositories) {
    try {
      const result = await deduplicateRepositoryUpdates({
        userId: repository.userId,
        repositoryId: repository._id,
      })
      if (result.removedUpdates || result.removedResearch || result.relinked) totals.repositories += 1
      totals.removedUpdates += result.removedUpdates || 0
      totals.removedResearch += result.removedResearch || 0
      totals.relinked += result.relinked || 0
    } catch (error) {
      // One bad repository must not prevent recovery of the others.
      console.warn('[dedupe] Repository cleanup deferred:', error?.message || error)
    }
  }

  return totals
}
