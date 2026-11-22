import mongoose from 'mongoose'
import { REPORT_TYPES } from '../constants/phase5Constants.js'

const { Schema } = mongoose

const reportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', default: null, index: true },
    reportType: { type: String, enum: REPORT_TYPES, required: true, index: true },
    title: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
    generatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
)

reportSchema.index({ userId: 1, repositoryId: 1, reportType: 1, generatedAt: -1 })

reportSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('Report', reportSchema)
