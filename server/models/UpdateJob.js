import mongoose from 'mongoose'

const { Schema } = mongoose

const updateJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    scope: { type: String, enum: ['repository', 'check-all'], default: 'repository' },
    status: {
      type: String,
      enum: ['QUEUED', 'SCANNING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
    },
    activeKey: { type: String, default: '' },
    active: { type: Boolean, default: true },
    progress: {
      total: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      message: { type: String, default: '' },
    },
    error: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

updateJobSchema.index(
  { activeKey: 1 },
  {
    unique: true,
    name: 'active_update_job_unique',
    partialFilterExpression: { active: true },
  },
)
updateJobSchema.index({ userId: 1, status: 1 })
updateJobSchema.index({ repositoryId: 1, status: 1 })
updateJobSchema.index({ userId: 1, createdAt: -1 })

updateJobSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('UpdateJob', updateJobSchema)
