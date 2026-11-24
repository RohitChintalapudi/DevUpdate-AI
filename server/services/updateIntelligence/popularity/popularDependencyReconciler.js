import mongoose from 'mongoose'
import Dependency from '../../../models/Dependency.js'
import DependencyResearch from '../../../models/DependencyResearch.js'
import DependencyUpdate from '../../../models/DependencyUpdate.js'
import DiscoveredDependency from '../../../models/DiscoveredDependency.js'
import Repository from '../../../models/Repository.js'
import {
  dependencyKeyFor,
  dependencySignatureFor,
} from '../updateEngine/dependencyIdentity.js'
import { POPULARITY_LIMIT, rankDependencies } from './dependencyPopularityService.js'

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

/**
 * Replace a repository's dependency set with the ranked popular subset.
 * Related update/research rows for dropped packages are removed as well so no
 * crawl or count ever sees the long tail again.
 */
export async function applyPopularSelection({ userId, repositoryId, selected = [], stats = {} }) {
  const byKey = new Map()
  for (const dependency of selected) {
    const key = dependency.popularityKey || dependencyKeyFor(dependency)
    if (!key) continue
    const existing = byKey.get(key)
    if (!existing || Number(dependency.popularityRank || 0) < Number(existing.popularityRank || 0)) {
      byKey.set(key, dependency)
    }
  }

  const selectedKeys = new Set(byKey.keys())
  const selectedSignatures = new Set([...byKey.values()].map(dependencySignatureFor))
  const existing = await Dependency.find({ userId, repositoryId }).lean()

  const removed = existing.filter((dependency) => {
    const signature = dependencySignatureFor(dependency)
    const key = dependencyKeyFor(dependency)
    return !selectedSignatures.has(signature) || !selectedKeys.has(key)
  })

  const removedIds = removed.map((dependency) => dependency._id)
  if (removedIds.length) {
    await Dependency.deleteMany({ _id: { $in: removedIds }, userId, repositoryId })

    const clauses = [{ dependencyId: { $in: removedIds } }]
    const removedKeys = unique(removed.map((dependency) => dependencyKeyFor(dependency)))
    const removedNames = unique(removed.map((dependency) => dependency.packageName))
    if (removedKeys.length) clauses.push({ dependencyKey: { $in: removedKeys } })
    if (removedNames.length) clauses.push({ packageName: { $in: removedNames } })
    const cleanupMatch = { userId, repositoryId, $or: clauses }
    await Promise.allSettled([
      DependencyUpdate.deleteMany(cleanupMatch),
      DependencyResearch.deleteMany(cleanupMatch),
    ])
  }

  const uniqueSelected = [...byKey.values()]
  if (uniqueSelected.length) {
    const evaluatedAt = new Date()
    await Dependency.bulkWrite(
      uniqueSelected.map((dependency) => {
        const signature = dependencySignatureFor(dependency)
        return {
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
                isDevelopmentDependency: Boolean(dependency.isDevelopmentDependency),
                versionType: dependency.versionType || 'unknown',
                extractedAt: new Date(dependency.extractedAt || evaluatedAt),
                dependencyKey: dependency.popularityKey || dependencyKeyFor(dependency),
                popularityKey: dependency.popularityKey || dependencyKeyFor(dependency),
                popularityScore: Number(dependency.popularityScore) || 0,
                popularityDownloads: Number(dependency.popularityDownloads) || 0,
                popularitySource: dependency.popularitySource || 'heuristic',
                popularityRank: Number(dependency.popularityRank) || 0,
                popularityEvaluatedAt: dependency.popularityEvaluatedAt || evaluatedAt,
                isPopular: true,
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
        }
      }),
      { ordered: false },
    )
  }

  return {
    kept: uniqueSelected.length,
    removed: removedIds.length,
    stats,
  }
}

/**
 * Startup recovery/ranking. Uses the full discovered archive when present so
 * the AI layer can re-rank from every package, and falls back to the stored
 * popular set for older scans. Bounded per repository, detached from listen.
 */
export async function pruneAllRepositoriesToPopularDependencies() {
  if (mongoose.connection.readyState !== 1) {
    return { repositories: 0, removed: 0, kept: 0 }
  }

  const repositories = await Repository.find({})
    .select('_id userId name discoveredDependencyCount')
    .lean()
  const totals = { repositories: 0, removed: 0, kept: 0, aiRepositories: 0 }

  for (const repository of repositories) {
    try {
      const archived = await DiscoveredDependency.find({
        userId: repository.userId,
        repositoryId: repository._id,
      }).lean()
      const dependencies = archived.length
        ? archived
        : await Dependency.find({
            userId: repository.userId,
            repositoryId: repository._id,
            packageName: { $not: /^@/ },
          }).lean()
      if (!dependencies.length) continue

      const { selected, stats } = await rankDependencies(dependencies, { limit: POPULARITY_LIMIT })
      const result = await applyPopularSelection({
        userId: repository.userId,
        repositoryId: repository._id,
        selected,
        stats,
      })
      totals.repositories += 1
      totals.removed += result.removed
      totals.kept += result.kept
      if (stats.selectionSource === 'ai') totals.aiRepositories += 1
      await Repository.updateOne(
        { _id: repository._id, userId: repository.userId },
        {
          $set: {
            dependencyCount: result.kept,
            discoveredDependencyCount: Math.max(
              Number(repository.discoveredDependencyCount) || 0,
              stats.discovered,
            ),
          },
        },
      )
    } catch (error) {
      console.warn('[popularity] Repository ranking deferred:', error?.message || error)
    }
  }

  return totals
}
