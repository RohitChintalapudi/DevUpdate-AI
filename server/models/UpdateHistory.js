import mongoose from 'mongoose'

const { Schema } = mongoose

const historySnapshotSchema = new Schema(
  {
    updateStatus: { type: String, default: '' },
    updateType: { type: String, default: '' },
    rangeStatus: { type: String, default: '' },
    securityStatus: { type: String, default: '' },
    latestVersion: { type: String, default: '' },
    latestStableVersion: { type: String, default: '' },
    deprecated: { type: Boolean, default: false },
    abandoned: { type: Boolean, default: false },
    yanked: { type: Boolean, default: false },
    advisoryIds: { type: [String], default: [] },
  },
  { _id: false },
)

const updateHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', required: true, index: true },
    updateRecordId: { type: Schema.Types.ObjectId, ref: 'DependencyUpdate', default: null },
    checkedAt: { type: Date, default: Date.now },
    changes: { type: [String], default: [] },
    previous: { type: historySnapshotSchema, default: null },
    current: { type: historySnapshotSchema, required: true },
  },
  { timestamps: true },
)

updateHistorySchema.index({ userId: 1, dependencyId: 1, checkedAt: -1 })
updateHistorySchema.index({ userId: 1, createdAt: -1 })

updateHistorySchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('UpdateHistory', updateHistorySchema)
