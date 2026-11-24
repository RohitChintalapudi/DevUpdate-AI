import mongoose from 'mongoose'

const { Schema } = mongoose

const repositorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    githubRepositoryId: { type: Number, required: true },
    owner: { type: String, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    description: { type: String, default: '' },
    htmlUrl: { type: String, default: '' },
    defaultBranch: { type: String, default: 'main' },
    branch: { type: String, default: '' },
    language: { type: String, default: '' },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    stars: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: null },
    selectedForAnalysis: { type: Boolean, default: false },
    scanStatus: {
      type: String,
      enum: ['NOT_SCANNED', 'QUEUED', 'SCANNING', 'COMPLETED', 'FAILED'],
      default: 'NOT_SCANNED',
    },
    lastScannedAt: { type: Date, default: null },
    lastScanId: { type: Schema.Types.ObjectId, ref: 'ScanJob', default: null },
    lastScanError: { type: String, default: '' },
    dependencyCount: { type: Number, default: 0 },
    discoveredDependencyCount: { type: Number, default: 0 },
    manifestFiles: { type: [String], default: [] },
    lastUpdateCheckAt: { type: Date, default: null },
    updateCheckStatus: {
      type: String,
      enum: ['NOT_CHECKED', 'QUEUED', 'SCANNING', 'COMPLETED', 'FAILED'],
      default: 'NOT_CHECKED',
    },
    outdatedCount: { type: Number, default: 0 },
    vulnerableCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

repositorySchema.index({ userId: 1, githubRepositoryId: 1 }, { unique: true })
repositorySchema.index({ userId: 1, scanStatus: 1 })
repositorySchema.index({ userId: 1, fullName: 1 })

repositorySchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('Repository', repositorySchema)
