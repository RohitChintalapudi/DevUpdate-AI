import mongoose from 'mongoose'
import { AI_JOB_STATUSES, AI_JOB_TYPES, WORKFLOW_STAGES } from '../constants/aiConstants.js'

const { Schema } = mongoose

const aiJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', default: null, index: true },
    updateRecordId: { type: Schema.Types.ObjectId, ref: 'DependencyUpdate', default: null },
    analysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis', default: null },
    type: { type: String, enum: AI_JOB_TYPES, required: true, index: true },
    status: { type: String, enum: AI_JOB_STATUSES, default: 'QUEUED', index: true },
    activeKey: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 2 },
    cancelRequested: { type: Boolean, default: false },
    progress: {
      stage: { type: String, enum: [...WORKFLOW_STAGES, 'INIT', 'DONE'], default: 'INIT' },
      percent: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      message: { type: String, default: 'Queued.' },
      completedStages: { type: [String], default: [] },
    },
    result: { type: Schema.Types.Mixed, default: {} },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    error: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

aiJobSchema.index({ activeKey: 1, active: 1 })
aiJobSchema.index({ userId: 1, createdAt: -1 })
aiJobSchema.index({ userId: 1, repositoryId: 1, status: 1 })

aiJobSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('AIJob', aiJobSchema)
