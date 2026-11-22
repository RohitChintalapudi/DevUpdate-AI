import mongoose from 'mongoose'
import { NOTIFICATION_TYPES } from '../constants/phase5Constants.js'

const { Schema } = mongoose

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', default: null, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', default: null },
    analysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null, index: true },
    deduplicationKey: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
)

notificationSchema.index(
  { userId: 1, deduplicationKey: 1 },
  { unique: true, name: 'notification_unique_dedupe' },
)
notificationSchema.index({ userId: 1, repositoryId: 1, readAt: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 })

notificationSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('Notification', notificationSchema)
