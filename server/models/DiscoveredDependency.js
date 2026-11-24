import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * Raw dependency identities extracted from a repository scan. This is kept
 * separate from the popular study set so the AI selector can always see the
 * full discovery list, even after the long tail is pruned from Dependency,
 * DependencyUpdate and DependencyResearch.
 */
const discoveredDependencySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    popularityKey: { type: String, default: '', index: true },
    packageName: { type: String, required: true },
    ecosystem: { type: String, required: true },
    groupId: { type: String, default: '' },
    artifactId: { type: String, default: '' },
    dependencyType: { type: String, default: '' },
    isDevelopmentDependency: { type: Boolean, default: false },
    versionType: { type: String, default: 'unknown' },
    sourceManifest: { type: String, default: '' },
    declaredVersion: { type: String, default: '' },
    resolvedVersion: { type: String, default: '' },
    extractedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

discoveredDependencySchema.index(
  { userId: 1, repositoryId: 1, popularityKey: 1 },
  { unique: true, name: 'discovered_dependency_dedupe' },
)
discoveredDependencySchema.index({ userId: 1, repositoryId: 1 })

export default mongoose.model('DiscoveredDependency', discoveredDependencySchema)
