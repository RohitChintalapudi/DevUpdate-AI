import DiscoveredDependency from '../../../models/DiscoveredDependency.js'

/**
 * Replaces the raw discovery list for a repository. The popular study set is
 * pruned aggressively, but this archive keeps every unique package identity so
 * the AI popularity layer can re-rank from the full list later.
 */
export async function archiveDiscoveredDependencies({ userId, repositoryId, dependencies = [] }) {
  const unique = new Map()
  for (const dependency of dependencies) {
    const key = dependency?.popularityKey || dependency?.dependencyKey || ''
    if (!key || !dependency?.packageName || !dependency?.ecosystem) continue
    if (!unique.has(key)) unique.set(key, dependency)
  }

  await DiscoveredDependency.deleteMany({ userId, repositoryId })

  const records = [...unique.entries()].map(([popularityKey, dependency]) => ({
    userId,
    repositoryId,
    popularityKey,
    packageName: dependency.packageName,
    ecosystem: dependency.ecosystem,
    groupId: dependency.groupId || '',
    artifactId: dependency.artifactId || '',
    dependencyType: dependency.dependencyType || '',
    isDevelopmentDependency: Boolean(dependency.isDevelopmentDependency),
    versionType: dependency.versionType || 'unknown',
    sourceManifest: dependency.sourceManifest || '',
    declaredVersion: dependency.declaredVersion || '',
    resolvedVersion: dependency.resolvedVersion || '',
    extractedAt: dependency.extractedAt || new Date(),
  }))

  if (records.length) {
    await DiscoveredDependency.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { userId, repositoryId, popularityKey: record.popularityKey },
          update: { $set: record, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      })),
      { ordered: false },
    )
  }

  return { archived: records.length }
}
