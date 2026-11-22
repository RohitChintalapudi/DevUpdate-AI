import mongoose from 'mongoose'
import { DECISION_TYPES } from '../constants/phase5Constants.js'

const { Schema } = mongoose

const dependencyDecisionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', required: true, index: true },
    analysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis', required: true, index: true },
    decision: { type: String, enum: DECISION_TYPES, required: true, index: true },
    explanation: { type: String, default: '' },
    notes: { type: String, default: '' },
    packageName: { type: String, default: '' },
    targetVersion: { type: String, default: '' },
    memoryId: { type: Schema.Types.ObjectId, ref: 'ProjectMemory', default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

dependencyDecisionSchema.index(
  { userId: 1, analysisId: 1 },
  { unique: true, name: 'dependency_decision_unique_analysis' },
)
dependencyDecisionSchema.index({ userId: 1, repositoryId: 1, createdAt: -1 })
dependencyDecisionSchema.index({ userId: 1, repositoryId: 1, dependencyId: 1, createdAt: -1 })
dependencyDecisionSchema.index({ userId: 1, decision: 1 })

dependencyDecisionSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('DependencyDecision', dependencyDecisionSchema)
