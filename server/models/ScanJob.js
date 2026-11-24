import mongoose from 'mongoose'

const { Schema } = mongoose

const scanJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    branch: { type: String, default: '' },
    status: {
      type: String,
      enum: ['QUEUED', 'SCANNING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
    },
    progress: {
      filesDiscovered: { type: Number, default: 0 },
      manifestsProcessed: { type: Number, default: 0 },
      dependenciesExtracted: { type: Number, default: 0 },
      dependenciesDiscovered: { type: Number, default: 0 },
      message: { type: String, default: '' },
    },
    error: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

scanJobSchema.index({ userId: 1, status: 1 })
scanJobSchema.index({ repositoryId: 1, status: 1 })

export default mongoose.model('ScanJob', scanJobSchema)
