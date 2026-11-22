import mongoose from 'mongoose'

const { Schema } = mongoose

const memoryAuditSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', default: null, index: true },
    memoryId: { type: Schema.Types.ObjectId, ref: 'ProjectMemory', default: null, index: true },
    action: { type: String, required: true, index: true },
    actor: { type: String, default: 'SYSTEM' },
    details: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
)

memoryAuditSchema.index({ userId: 1, repositoryId: 1, createdAt: -1 })

export default mongoose.model('MemoryAudit', memoryAuditSchema)
