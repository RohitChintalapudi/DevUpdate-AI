import mongoose from 'mongoose'
import {
  MEMORY_CATEGORIES,
  MEMORY_ORIGINS,
  MEMORY_STATUSES,
  MEMORY_VERIFICATION_STATUSES,
} from '../constants/phase5Constants.js'

const { Schema } = mongoose

const evidenceRefSchema = new Schema(
  {
    id: { type: String, default: '' },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    sourceType: { type: String, default: '' },
    verificationStatus: {
      type: String,
      enum: MEMORY_VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
    },
  },
  { _id: false },
)

const externalRefSchema = new Schema(
  {
    provider: { type: String, default: '' },
    tool: { type: String, default: '' },
    reference: { type: String, default: '' },
    url: { type: String, default: '' },
    status: { type: String, default: '' },
    syncedAt: { type: Date, default: null },
    error: { type: String, default: '' },
  },
  { _id: false },
)

const projectMemorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', default: null, index: true },
    analysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis', default: null, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'AIConversation', default: null },
    category: { type: String, enum: MEMORY_CATEGORIES, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    source: { type: String, default: '' },
    origin: { type: String, enum: MEMORY_ORIGINS, default: 'AI_ANALYSIS', index: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    verificationStatus: {
      type: String,
      enum: MEMORY_VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      index: true,
    },
    memoryStatus: { type: String, enum: MEMORY_STATUSES, default: 'ACTIVE', index: true },
    dedupeKey: { type: String, default: undefined },
    tags: { type: [String], default: [] },
    evidenceRefs: { type: [evidenceRefSchema], default: [] },
    external: { type: [externalRefSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: null, index: true },
    lastAccessedAt: { type: Date, default: null },
    supersededAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

projectMemorySchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, sparse: true, name: 'project_memory_unique_dedupe' },
)
projectMemorySchema.index({ userId: 1, repositoryId: 1, category: 1, memoryStatus: 1, updatedAt: -1 })
projectMemorySchema.index({ userId: 1, repositoryId: 1, dependencyId: 1, memoryStatus: 1 })
projectMemorySchema.index({ userId: 1, repositoryId: 1, analysisId: 1 })
projectMemorySchema.index({ userId: 1, memoryStatus: 1, expiresAt: 1 })

projectMemorySchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('ProjectMemory', projectMemorySchema)
