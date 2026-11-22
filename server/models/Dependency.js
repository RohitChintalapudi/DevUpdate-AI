import mongoose from 'mongoose'

const { Schema } = mongoose

const dependencySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    packageName: { type: String, required: true },
    ecosystem: { type: String, required: true },
    declaredVersion: { type: String, default: '' },
    resolvedVersion: { type: String, default: '' },
    dependencyType: {
      type: String,
      enum: ['runtime', 'development', 'build', 'unknown'],
      default: 'runtime',
    },
    sourceManifest: { type: String, required: true },
    groupId: { type: String, default: '' },
    artifactId: { type: String, default: '' },
    isDevelopmentDependency: { type: Boolean, default: false },
    versionType: {
      type: String,
      enum: ['exact', 'range', 'wildcard', 'unknown'],
      default: 'unknown',
    },
    extractedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

dependencySchema.index(
  {
    userId: 1,
    repositoryId: 1,
    ecosystem: 1,
    packageName: 1,
    dependencyType: 1,
    sourceManifest: 1,
    declaredVersion: 1,
    resolvedVersion: 1,
  },
  { unique: true, name: 'dependency_dedupe' },
)
dependencySchema.index({ userId: 1, ecosystem: 1 })
dependencySchema.index({ userId: 1, packageName: 1 })
dependencySchema.index({ repositoryId: 1, extractedAt: -1 })

dependencySchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('Dependency', dependencySchema)
