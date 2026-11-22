import mongoose from 'mongoose'
import {
  ANALYSIS_STATUSES,
  RECOMMENDATIONS,
  RISK_LEVELS,
} from '../constants/aiConstants.js'

const { Schema } = mongoose

const evidenceSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    sourceType: { type: String, default: 'OFFICIAL_DOCS' },
    excerpt: { type: String, default: '' },
    retrievedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED'],
      default: 'UNVERIFIED',
    },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    packageName: { type: String, default: '' },
    version: { type: String, default: '' },
    documentId: { type: Schema.Types.ObjectId, ref: 'ResearchDocument', default: null },
  },
  { _id: false },
)

const findingSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    evidenceIds: { type: [String], default: [] },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED'],
      default: 'UNVERIFIED',
    },
    severity: { type: String, default: 'UNKNOWN' },
  },
  { _id: false },
)

const migrationStepSchema = new Schema(
  {
    id: { type: String, required: true },
    order: { type: Number, required: true },
    action: { type: String, required: true },
    reason: { type: String, default: '' },
    fileArea: { type: String, default: '' },
    documentationUrl: { type: String, default: '' },
    evidenceIds: { type: [String], default: [] },
    validation: { type: String, default: '' },
  },
  { _id: false },
)

const aiAnalysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', required: true, index: true },
    updateRecordId: { type: Schema.Types.ObjectId, ref: 'DependencyUpdate', default: null },
    jobId: { type: Schema.Types.ObjectId, ref: 'AIJob', default: null },
    packageName: { type: String, required: true },
    repositoryFullName: { type: String, default: '' },
    ecosystem: { type: String, default: '' },
    installedVersion: { type: String, default: '' },
    targetVersion: { type: String, default: '' },
    updateType: { type: String, default: 'UNKNOWN' },
    analysisStatus: { type: String, enum: ANALYSIS_STATUSES, default: 'QUEUED', index: true },
    upgradeSummary: { type: String, default: '' },
    releaseIntelligence: {
      importantChanges: { type: [String], default: [] },
      newFeatures: { type: [String], default: [] },
      bugFixes: { type: [String], default: [] },
      deprecatedApis: { type: [String], default: [] },
    },
    breakingChanges: { type: [findingSchema], default: [] },
    projectImpact: { type: [findingSchema], default: [] },
    compatibilityFindings: { type: [findingSchema], default: [] },
    migrationPlan: { type: [migrationStepSchema], default: [] },
    riskLevel: { type: String, enum: RISK_LEVELS, default: 'UNKNOWN', index: true },
    riskReason: { type: String, default: '' },
    recommendation: { type: String, enum: RECOMMENDATIONS, default: 'INSUFFICIENT_EVIDENCE', index: true },
    recommendationReason: { type: String, default: '' },
    evidence: { type: [evidenceSchema], default: [] },
    securitySnapshot: {
      status: { type: String, default: 'UNKNOWN' },
      advisories: {
        type: [
          new Schema(
            {
              id: { type: String, required: true },
              severity: { type: String, default: 'UNKNOWN' },
              summary: { type: String, default: '' },
              fixedVersions: { type: [String], default: [] },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    limitations: { type: [String], default: [] },
    modelMetadata: {
      provider: { type: String, default: '' },
      model: { type: String, default: '' },
      promptVersion: { type: String, default: '' },
      vectorStore: { type: String, default: '' },
      embeddingModel: { type: String, default: '' },
      retrievalCount: { type: Number, default: 0 },
      researchStatus: { type: String, default: '' },
      contextStatus: { type: String, default: '' },
      memoryStatus: { type: String, default: 'SKIPPED' },
      memoryCount: { type: Number, default: 0 },
      historicalComparisonId: { type: String, default: '' },
    },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    error: { type: String, default: '' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

aiAnalysisSchema.index(
  { userId: 1, dependencyId: 1, targetVersion: 1 },
  { unique: true, name: 'ai_analysis_unique_target' },
)
aiAnalysisSchema.index({ userId: 1, repositoryId: 1, createdAt: -1 })
aiAnalysisSchema.index({ userId: 1, recommendation: 1 })
aiAnalysisSchema.index({ userId: 1, riskLevel: 1 })
aiAnalysisSchema.index({ userId: 1, analysisStatus: 1 })

aiAnalysisSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('AIAnalysis', aiAnalysisSchema)
