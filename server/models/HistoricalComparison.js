import mongoose from 'mongoose'

const { Schema } = mongoose

const historicalComparisonSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', default: null, index: true },
    previousAnalysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis', default: null },
    currentAnalysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis', default: undefined, index: true },
    previousAnalysisDate: { type: Date, default: null },
    currentAnalysisDate: { type: Date, default: null },
    changes: { type: Schema.Types.Mixed, default: {} },
    summary: { type: String, default: '' },
  },
  { timestamps: true },
)

historicalComparisonSchema.index(
  { userId: 1, currentAnalysisId: 1 },
  { unique: true, sparse: true, name: 'historical_comparison_unique_current' },
)
historicalComparisonSchema.index({ userId: 1, repositoryId: 1, createdAt: -1 })
historicalComparisonSchema.index({ userId: 1, dependencyId: 1, createdAt: -1 })

historicalComparisonSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('HistoricalComparison', historicalComparisonSchema)
