import mongoose from 'mongoose'

const { Schema } = mongoose

const researchDocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', default: null, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', default: null, index: true },
    scope: { type: String, enum: ['PACKAGE', 'REPOSITORY'], default: 'PACKAGE', index: true },
    packageName: { type: String, default: '', index: true },
    ecosystem: { type: String, default: '', index: true },
    version: { type: String, default: '', index: true },
    sourceUrl: { type: String, required: true },
    finalUrl: { type: String, default: '' },
    sourceDomain: { type: String, default: '', index: true },
    sourceType: { type: String, default: 'OFFICIAL_DOCS', index: true },
    title: { type: String, default: '' },
    contentHash: { type: String, required: true, index: true },
    content: { type: String, required: true },
    summary: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    official: { type: Boolean, default: false },
    retrievedAt: { type: Date, default: Date.now, index: true },
    publishedAt: { type: Date, default: null },
    retrievalStatus: { type: String, default: 'COMPLETED', index: true },
    retrievalError: { type: String, default: '' },
  },
  { timestamps: true },
)

researchDocumentSchema.index(
  { userId: 1, contentHash: 1, sourceUrl: 1 },
  { unique: true, name: 'research_document_unique_hash_url' },
)
researchDocumentSchema.index({
  userId: 1,
  repositoryId: 1,
  packageName: 1,
  sourceType: 1,
})

researchDocumentSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('ResearchDocument', researchDocumentSchema)
