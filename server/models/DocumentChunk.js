import mongoose from 'mongoose'

const { Schema } = mongoose

const documentChunkSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'ResearchDocument', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', default: null, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', default: null, index: true },
    packageName: { type: String, default: '', index: true },
    ecosystem: { type: String, default: '', index: true },
    version: { type: String, default: '', index: true },
    sourceUrl: { type: String, default: '' },
    sourceType: { type: String, default: 'OFFICIAL_DOCS', index: true },
    publishedAt: { type: Date, default: null },
    retrievedAt: { type: Date, default: Date.now },
    repositorySource: { type: Boolean, default: false },
    contentHash: { type: String, required: true, index: true },
    chunkIndex: { type: Number, required: true },
    chunkText: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    embeddingModel: { type: String, default: '' },
    vectorId: { type: String, default: '', index: true },
    indexed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true })
documentChunkSchema.index({ userId: 1, packageName: 1, version: 1 })
documentChunkSchema.index({ userId: 1, repositoryId: 1 })

documentChunkSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('DocumentChunk', documentChunkSchema)
